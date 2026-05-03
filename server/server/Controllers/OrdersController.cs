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
    public class OrdersController : ControllerBase
    {
        private readonly serverContext _context;

        public OrdersController(serverContext context)
        {
            _context = context;
        }


        [HttpGet]
        public async Task<ActionResult<PagedResponse<Order>>> GetOrder([FromQuery] PagedRequest request)
        {
            var query = _context.Order.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.Trim();
                int? parsedTableId = int.TryParse(searchTerm, out var pid) ? pid : (int?)null;

                query = query.Where(order =>
                    (order.Id != null && order.Id.Contains(searchTerm)) ||
                    (order.CustomerId != null && order.CustomerId.Contains(searchTerm)) ||
                    (parsedTableId != null && order.TableId == parsedTableId) ||
                    (order.PaymentMethod != null && order.PaymentMethod.Contains(searchTerm)) ||
                    (order.Notes != null && order.Notes.Contains(searchTerm)));
            }

            query = ApplySorting(query, request);

            var pagedResult = await query.ToPagedResponseAsync(request.GetPageNumber(), request.GetPageSize());
            return Ok(pagedResult);
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<Order>> GetOrder(string id)
        {
            var order = await _context.Order.FindAsync(id);

            if (order == null)
            {
                return NotFound();
            }

            return order;
        }



        [HttpPut("{id}")]
        public async Task<IActionResult> PutOrder(string id, Order order)
        {
            if (id != order.Id)
            {
                return BadRequest();
            }

            _context.Entry(order).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!OrderExists(id))
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
        public async Task<ActionResult<Order>> PostOrder(Order order)
        {
            _context.Order.Add(order);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (OrderExists(order.Id))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetOrder", new { id = order.Id }, order);
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(string id)
        {
            var order = await _context.Order.FindAsync(id);
            if (order == null)
            {
                return NotFound();
            }

            _context.Order.Remove(order);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool OrderExists(string id)
        {
            return _context.Order.Any(e => e.Id == id);
        }

        private static IQueryable<Order> ApplySorting(IQueryable<Order> query, PagedRequest request)
        {
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isAscending = request.IsAscending();

            return sortBy switch
            {
                "id" => isAscending ? query.OrderBy(order => order.Id) : query.OrderByDescending(order => order.Id),
                "customerid" => isAscending ? query.OrderBy(order => order.CustomerId) : query.OrderByDescending(order => order.CustomerId),
                "accountid" => isAscending ? query.OrderBy(order => order.AccountId) : query.OrderByDescending(order => order.AccountId),
                "tableid" => isAscending ? query.OrderBy(order => order.TableId) : query.OrderByDescending(order => order.TableId),
                "status" => isAscending ? query.OrderBy(order => order.Status) : query.OrderByDescending(order => order.Status),
                "subtotal" => isAscending ? query.OrderBy(order => order.Subtotal) : query.OrderByDescending(order => order.Subtotal),
                "discount" => isAscending ? query.OrderBy(order => order.Discount) : query.OrderByDescending(order => order.Discount),
                "total" => isAscending ? query.OrderBy(order => order.Total) : query.OrderByDescending(order => order.Total),
                "paymentmethod" => isAscending ? query.OrderBy(order => order.PaymentMethod) : query.OrderByDescending(order => order.PaymentMethod),
                "paymentstatus" => isAscending ? query.OrderBy(order => order.PaymentStatus) : query.OrderByDescending(order => order.PaymentStatus),
                "updatedat" => isAscending ? query.OrderBy(order => order.UpdatedAt) : query.OrderByDescending(order => order.UpdatedAt),
                _ => isAscending ? query.OrderBy(order => order.CreatedAt) : query.OrderByDescending(order => order.CreatedAt)
            };
        }
    }
}
