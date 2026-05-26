using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Modal;

namespace server.Services;

public sealed class TableStateCoordinator
{
    private readonly serverContext _context;
    private readonly RealtimeNotifier _notifier;

    public TableStateCoordinator(serverContext context, RealtimeNotifier notifier)
    {
        _context = context;
        _notifier = notifier;
    }

    public async Task<RestaurantTable?> SetExplicitStatusAsync(int tableId, RestaurantTableStatus status, string source)
    {
        var table = await _context.RestaurantTable.FindAsync(tableId);
        if (table == null) return null;

        table.Status = status;
        table.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await SyncReservationStatusForTableAsync(tableId, status);
        await _notifier.BroadcastTableChangedAsync(table, "updated", source);
        return table;
    }

    public async Task<RestaurantTable?> RecalculateAsync(int tableId, string source, RestaurantTableStatus? fallbackStatus = null)
    {
        var table = await _context.RestaurantTable.FindAsync(tableId);
        if (table == null) return null;

        var desiredStatus = await ResolveStatusAsync(tableId, fallbackStatus);
        if (table.Status != desiredStatus)
        {
            table.Status = desiredStatus;
            table.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        await SyncReservationStatusForTableAsync(tableId, desiredStatus);
        await _notifier.BroadcastTableChangedAsync(table, "updated", source);
        return table;
    }

    private async Task<RestaurantTableStatus> ResolveStatusAsync(int tableId, RestaurantTableStatus? fallbackStatus)
    {
        var hasCheckedInReservation = await _context.Reservation.AnyAsync(reservation =>
            reservation.TableId == tableId
            && reservation.Status == ReservationStatus.CheckedIn);

        if (hasCheckedInReservation)
        {
            return RestaurantTableStatus.Occupied;
        }

        var today = DateTime.UtcNow.Date;
        var hasConfirmedReservation = await _context.Reservation.AnyAsync(reservation =>
            reservation.TableId == tableId
            && reservation.Status == ReservationStatus.Confirmed
            && reservation.ReservationDate >= today);

        if (hasConfirmedReservation)
        {
            return RestaurantTableStatus.Reserved;
        }

        var hasActiveOrder = await _context.Order.AnyAsync(order =>
            order.TableId == tableId
            && order.Status != OrderStatus.Completed
            && order.Status != OrderStatus.Cancelled);

        if (hasActiveOrder)
        {
            return RestaurantTableStatus.Occupied;
        }

        return fallbackStatus ?? RestaurantTableStatus.Available;
    }

    private async Task SyncReservationStatusForTableAsync(int tableId, RestaurantTableStatus tableStatus)
    {
        var today = DateTime.UtcNow.Date;
        var reservation = await _context.Reservation
            .Where(item => item.TableId == tableId
                && item.ReservationDate >= today
                && (new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn }).Contains(item.Status))
            .OrderBy(item => item.ReservationDate)
            .ThenBy(item => item.ReservationTime.Hours).ThenBy(item => item.ReservationTime.Minutes)
            .FirstOrDefaultAsync();

        if (reservation == null) return;

        var desiredReservationStatus = tableStatus == RestaurantTableStatus.Occupied
            ? ReservationStatus.CheckedIn
            : ReservationStatus.Confirmed;

        if (reservation.Status != desiredReservationStatus)
        {
            reservation.Status = desiredReservationStatus;
            reservation.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await _notifier.BroadcastReservationChangedAsync(reservation.Id, "updated", tableId);
        }
    }
}
