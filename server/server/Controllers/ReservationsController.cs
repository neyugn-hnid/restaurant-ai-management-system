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

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReservationsController : ControllerBase
    {
        private readonly serverContext _context;

        public ReservationsController(serverContext context)
        {
            _context = context;
        }

        // GET: api/Reservations
        [HttpGet]
        public async Task<ActionResult<PagedResponse<Reservation>>> GetReservation([FromQuery] PagedRequest request)
        {
            var query = _context.Reservation.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.Trim();
                query = query.Where(reservation =>
                    (reservation.CustomerId != null && reservation.CustomerId.Contains(searchTerm)) ||
                    (reservation.TableId != null && reservation.TableId.Contains(searchTerm)) ||
                    (reservation.Notes != null && reservation.Notes.Contains(searchTerm)));
            }

            query = ApplySorting(query, request);

            var pagedResult = await query.ToPagedResponseAsync(request.GetPageNumber(), request.GetPageSize());
            return Ok(pagedResult);
        }

        // GET: api/Reservations/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Reservation>> GetReservation(int id)
        {
            var reservation = await _context.Reservation.FindAsync(id);

            if (reservation == null)
            {
                return NotFound();
            }

            return reservation;
        }

        // PUT: api/Reservations/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutReservation(int id, Reservation reservation)
        {
            if (id != reservation.Id)
            {
                return BadRequest();
            }

            _context.Entry(reservation).State = EntityState.Modified;

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

            return NoContent();
        }

        // POST: api/Reservations
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Reservation>> PostReservation(Reservation reservation)
        {
            _context.Reservation.Add(reservation);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetReservation", new { id = reservation.Id }, reservation);
        }

        // DELETE: api/Reservations/5
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
    }
}
