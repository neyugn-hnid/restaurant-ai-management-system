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
    public class RestaurantTablesController : ControllerBase
    {
        private readonly serverContext _context;

        public RestaurantTablesController(serverContext context)
        {
            _context = context;
        }


        [HttpGet]
        public async Task<ActionResult<PagedResponse<RestaurantTable>>> GetRestaurantTable([FromQuery] PagedRequest request)
        {
            var query = _context.RestaurantTable.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.Trim();
                if (int.TryParse(searchTerm, out var tableId))
                {
                    query = query.Where(table => table.Id == tableId || (table.Zone != null && table.Zone.Contains(searchTerm)));
                }
                else
                {
                    query = query.Where(table => table.Zone != null && table.Zone.Contains(searchTerm));
                }
            }

            if (!string.IsNullOrWhiteSpace(request.Location) &&
                !string.Equals(request.Location, "Tất cả", StringComparison.OrdinalIgnoreCase))
            {
                var location = request.Location.Trim();
                query = query.Where(table =>
                    table.Zone != null &&
                    table.Zone.Contains(location));
            }

            if (!string.IsNullOrWhiteSpace(request.Status) &&
                !string.Equals(request.Status, "Tất cả", StringComparison.OrdinalIgnoreCase))
            {
                var status = request.Status.Trim().ToLowerInvariant();
                query = query.Where(table => table.Status.ToString().ToLower() == status);
            }

            query = ApplySorting(query, request);

            var pagedResult = await query.ToPagedResponseAsync(request.GetPageNumber(), request.GetPageSize());
            return Ok(pagedResult);
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<RestaurantTable>> GetRestaurantTable(int id)
        {
            var restaurantTable = await _context.RestaurantTable.FindAsync(id);

            if (restaurantTable == null)
            {
                return NotFound();
            }

            return restaurantTable;
        }



        [HttpPut("{id}")]
        public async Task<IActionResult> PutRestaurantTable(int id, RestaurantTable restaurantTable)
        {
            if (id != restaurantTable.Id)
            {
                return BadRequest();
            }

            _context.Entry(restaurantTable).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!RestaurantTableExists(id))
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



        [HttpPost]
        public async Task<ActionResult<RestaurantTable>> PostRestaurantTable(RestaurantTable restaurantTable)
        {
            _context.RestaurantTable.Add(restaurantTable);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (RestaurantTableExists(restaurantTable.Id))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetRestaurantTable", new { id = restaurantTable.Id }, restaurantTable);
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRestaurantTable(int id)
        {
            var restaurantTable = await _context.RestaurantTable.FindAsync(id);
            if (restaurantTable == null)
            {
                return NotFound();
            }

            _context.RestaurantTable.Remove(restaurantTable);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool RestaurantTableExists(int id)
        {
            return _context.RestaurantTable.Any(e => e.Id == id);
        }

        private static IQueryable<RestaurantTable> ApplySorting(IQueryable<RestaurantTable> query, PagedRequest request)
        {
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isAscending = request.IsAscending();

            return sortBy switch
            {
                "id" => isAscending ? query.OrderBy(table => table.Id) : query.OrderByDescending(table => table.Id),
                "zone" => isAscending ? query.OrderBy(table => table.Zone) : query.OrderByDescending(table => table.Zone),
                "capacity" => isAscending ? query.OrderBy(table => table.Capacity) : query.OrderByDescending(table => table.Capacity),
                "status" => isAscending ? query.OrderBy(table => table.Status) : query.OrderByDescending(table => table.Status),
                "updatedat" => isAscending ? query.OrderBy(table => table.UpdatedAt) : query.OrderByDescending(table => table.UpdatedAt),
                _ => isAscending ? query.OrderBy(table => table.CreatedAt) : query.OrderByDescending(table => table.CreatedAt)
            };
        }
    }
}
