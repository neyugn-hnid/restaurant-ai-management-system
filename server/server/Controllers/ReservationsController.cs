using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Extensions;
using server.Modal;
using server.Models.Pagination;
using server.Services;

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReservationsController : ControllerBase
    {
        private readonly serverContext _context;
        private readonly TableStateCoordinator _tableStateCoordinator;
        private readonly RealtimeNotifier _realtimeNotifier;

        public ReservationsController(serverContext context, TableStateCoordinator tableStateCoordinator, RealtimeNotifier realtimeNotifier)
        {
            _context = context;
            _tableStateCoordinator = tableStateCoordinator;
            _realtimeNotifier = realtimeNotifier;
        }


        [HttpGet]
        public async Task<ActionResult<PagedResponse<ReservationResponseDto>>> GetReservation([FromQuery] PagedRequest request)
        {
            var query = _context.Reservation
                .AsNoTracking()
                .Include(reservation => reservation.Customer)
                .Include(reservation => reservation.RestaurantTable)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.Trim();
                int? parsedTableId = int.TryParse(searchTerm, out var pid) ? pid : (int?)null;

                query = query.Where(reservation =>
                    (reservation.CustomerId != null && reservation.CustomerId.Contains(searchTerm)) ||
                    (parsedTableId != null && reservation.TableId == parsedTableId) ||
                    (reservation.Notes != null && reservation.Notes.Contains(searchTerm)));
            }

            query = ApplySorting(query, request);

            var pagedResult = await query.ToPagedResponseAsync(request.GetPageNumber(), request.GetPageSize());
            return Ok(MapPagedReservations(pagedResult));
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<ReservationResponseDto>> GetReservation(int id)
        {
            var reservation = await _context.Reservation
                .AsNoTracking()
                .Include(item => item.Customer)
                .Include(item => item.RestaurantTable)
                .FirstOrDefaultAsync(item => item.Id == id);

            if (reservation == null)
            {
                return NotFound();
            }

            return Ok(MapReservation(reservation));
        }



        [HttpPut("{id}")]
        public async Task<IActionResult> PutReservation(int id, Reservation reservation)
        {
            if (id != reservation.Id)
            {
                return BadRequest();
            }

            var existingReservation = await _context.Reservation.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);
            if (existingReservation == null)
            {
                return NotFound();
            }

            _context.Entry(reservation).State = EntityState.Modified;
            reservation.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ReservationExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            await _tableStateCoordinator.RecalculateAsync(existingReservation.TableId, "reservation-updated-old-table");
            if (existingReservation.TableId != reservation.TableId)
            {
                await _tableStateCoordinator.RecalculateAsync(reservation.TableId, "reservation-updated-new-table");
            }
            else
            {
                await _tableStateCoordinator.RecalculateAsync(reservation.TableId, "reservation-updated");
            }

            await _realtimeNotifier.BroadcastReservationChangedAsync(reservation.Id, "updated", reservation.TableId);
            return NoContent();
        }



        [HttpPost]
        public async Task<ActionResult<ReservationResponseDto>> PostReservation(Reservation reservation)
        {
            reservation.UpdatedAt = DateTime.UtcNow;
            _context.Reservation.Add(reservation);
            await _context.SaveChangesAsync();
            await _tableStateCoordinator.RecalculateAsync(reservation.TableId, "reservation-created");
            await _realtimeNotifier.BroadcastReservationChangedAsync(reservation.Id, "created", reservation.TableId);

            var createdReservation = await _context.Reservation
                .AsNoTracking()
                .Include(item => item.Customer)
                .Include(item => item.RestaurantTable)
                .FirstAsync(item => item.Id == reservation.Id);

            return CreatedAtAction("GetReservation", new { id = reservation.Id }, MapReservation(createdReservation));
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReservation(int id)
        {
            var reservation = await _context.Reservation.FindAsync(id);
            if (reservation == null)
            {
                return NotFound();
            }

            _context.Reservation.Remove(reservation);
            await _context.SaveChangesAsync();
            await _tableStateCoordinator.RecalculateAsync(reservation.TableId, "reservation-deleted");
            await _realtimeNotifier.BroadcastReservationChangedAsync(reservation.Id, "deleted", reservation.TableId);

            return NoContent();
        }

        private bool ReservationExists(int id)
        {
            return _context.Reservation.Any(e => e.Id == id);
        }

        private static IQueryable<Reservation> ApplySorting(IQueryable<Reservation> query, PagedRequest request)
        {
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isAscending = request.IsAscending();

            return sortBy switch
            {
                "id" => isAscending ? query.OrderBy(reservation => reservation.Id) : query.OrderByDescending(reservation => reservation.Id),
                "customerid" => isAscending ? query.OrderBy(reservation => reservation.CustomerId) : query.OrderByDescending(reservation => reservation.CustomerId),
                "tableid" => isAscending ? query.OrderBy(reservation => reservation.TableId) : query.OrderByDescending(reservation => reservation.TableId),
                "reservationdate" => isAscending ? query.OrderBy(reservation => reservation.ReservationDate) : query.OrderByDescending(reservation => reservation.ReservationDate),
                "reservationtime" => isAscending ? query.OrderBy(reservation => reservation.ReservationTime) : query.OrderByDescending(reservation => reservation.ReservationTime),
                "guestcount" => isAscending ? query.OrderBy(reservation => reservation.GuestCount) : query.OrderByDescending(reservation => reservation.GuestCount),
                "status" => isAscending ? query.OrderBy(reservation => reservation.Status) : query.OrderByDescending(reservation => reservation.Status),
                "updatedat" => isAscending ? query.OrderBy(reservation => reservation.UpdatedAt) : query.OrderByDescending(reservation => reservation.UpdatedAt),
                _ => isAscending ? query.OrderBy(reservation => reservation.CreatedAt) : query.OrderByDescending(reservation => reservation.CreatedAt)
            };
        }

        private static PagedResponse<ReservationResponseDto> MapPagedReservations(PagedResponse<Reservation> pagedResult)
        {
            return new PagedResponse<ReservationResponseDto>
            {
                Items = pagedResult.Items.Select(MapReservation).ToList(),
                PageNumber = pagedResult.PageNumber,
                PageSize = pagedResult.PageSize,
                TotalItemCount = pagedResult.TotalItemCount,
                PageCount = pagedResult.PageCount,
                HasPreviousPage = pagedResult.HasPreviousPage,
                HasNextPage = pagedResult.HasNextPage
            };
        }

        private static ReservationResponseDto MapReservation(Reservation reservation)
        {
            return new ReservationResponseDto
            {
                Id = reservation.Id,
                CustomerId = reservation.CustomerId,
                CustomerName = reservation.Customer?.FullName,
                TableId = reservation.TableId,
                TableName = reservation.RestaurantTable?.Name ?? $"Bàn {reservation.TableId}",
                ReservationDate = reservation.ReservationDate,
                ReservationTime = reservation.ReservationTime,
                GuestCount = reservation.GuestCount,
                Status = reservation.Status,
                Notes = reservation.Notes,
                CreatedAt = reservation.CreatedAt,
                UpdatedAt = reservation.UpdatedAt
            };
        }

        public sealed class ReservationResponseDto
        {
            public int Id { get; set; }
            public string? CustomerId { get; set; }
            public string? CustomerName { get; set; }
            public int TableId { get; set; }
            public string? TableName { get; set; }
            public DateTime ReservationDate { get; set; }
            public TimeSpan ReservationTime { get; set; }
            public int GuestCount { get; set; }
            public ReservationStatus Status { get; set; }
            public string? Notes { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime UpdatedAt { get; set; }
        }
    }
}
