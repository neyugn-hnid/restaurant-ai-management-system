using Microsoft.AspNetCore.SignalR;
using server.Hubs;
using server.Modal;

namespace server.Services;

public sealed class RealtimeNotifier
{
    private readonly IHubContext<RealtimeHub> _hubContext;

    public RealtimeNotifier(IHubContext<RealtimeHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task BroadcastTableChangedAsync(RestaurantTable table, string action, string source)
    {
        return _hubContext.Clients.All.SendAsync("tableChanged", new
        {
            action,
            source,
            table = new
            {
                id = table.Id,
                name = table.Name,
                zone = table.Zone,
                capacity = table.Capacity,
                status = table.Status,
                updatedAt = table.UpdatedAt
            }
        });
    }

    public Task BroadcastReservationChangedAsync(int reservationId, string action, int tableId)
    {
        return _hubContext.Clients.All.SendAsync("reservationChanged", new
        {
            action,
            reservationId,
            tableId,
            occurredAt = DateTime.UtcNow
        });
    }

    public Task BroadcastOrderChangedAsync(string? orderId, string action, int? tableId)
    {
        return _hubContext.Clients.All.SendAsync("orderChanged", new
        {
            action,
            orderId,
            tableId,
            occurredAt = DateTime.UtcNow
        });
    }
}
