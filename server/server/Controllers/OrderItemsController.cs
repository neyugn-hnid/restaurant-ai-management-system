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
    public class OrderItemsController : ControllerBase
    {
        private readonly serverContext _context;

        public OrderItemsController(serverContext context)
        {
            _context = context;
        }

        // GET: api/OrderItems
        [HttpGet]
        public async Task<ActionResult<PagedResponse<OrderItem>>> GetOrderItem([FromQuery] PagedRequest request)
        {
            var query = _context.OrderItem.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.Trim();
                query = query.Where(orderItem =>
                    (orderItem.OrderId != null && orderItem.OrderId.Contains(searchTerm)) ||
                    (orderItem.ProductName != null && orderItem.ProductName.Contains(searchTerm)) ||
                    (orderItem.Notes != null && orderItem.Notes.Contains(searchTerm)));
            }

            query = ApplySorting(query, request);

            var pagedResult = await query.ToPagedResponseAsync(request.GetPageNumber(), request.GetPageSize());
            return Ok(pagedResult);
        }

        // GET: api/OrderItems/5
        [HttpGet("{id}")]
        public async Task<ActionResult<OrderItem>> GetOrderItem(int id)
        {
            var orderItem = await _context.OrderItem.FindAsync(id);

            if (orderItem == null)
            {
                return NotFound();
            }

            return orderItem;
        }

        // PUT: api/OrderItems/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutOrderItem(int id, OrderItem orderItem)
        {
            if (id != orderItem.Id)
            {
                return BadRequest();
            }

            _context.Entry(orderItem).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!OrderItemExists(id))
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

        // POST: api/OrderItems
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<OrderItem>> PostOrderItem(OrderItem orderItem)
        {
            _context.OrderItem.Add(orderItem);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetOrderItem", new { id = orderItem.Id }, orderItem);
        }

        // DELETE: api/OrderItems/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrderItem(int id)
        {
            var orderItem = await _context.OrderItem.FindAsync(id);
            if (orderItem == null)
            {
                return NotFound();
            }

            _context.OrderItem.Remove(orderItem);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool OrderItemExists(int id)
        {
            return _context.OrderItem.Any(e => e.Id == id);
        }

        private static IQueryable<OrderItem> ApplySorting(IQueryable<OrderItem> query, PagedRequest request)
        {
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isAscending = request.IsAscending();

            return sortBy switch
            {
                "id" => isAscending ? query.OrderBy(orderItem => orderItem.Id) : query.OrderByDescending(orderItem => orderItem.Id),
                "orderid" => isAscending ? query.OrderBy(orderItem => orderItem.OrderId) : query.OrderByDescending(orderItem => orderItem.OrderId),
                "productid" => isAscending ? query.OrderBy(orderItem => orderItem.ProductId) : query.OrderByDescending(orderItem => orderItem.ProductId),
                "productname" => isAscending ? query.OrderBy(orderItem => orderItem.ProductName) : query.OrderByDescending(orderItem => orderItem.ProductName),
                "quantity" => isAscending ? query.OrderBy(orderItem => orderItem.Quantity) : query.OrderByDescending(orderItem => orderItem.Quantity),
                "unitprice" => isAscending ? query.OrderBy(orderItem => orderItem.UnitPrice) : query.OrderByDescending(orderItem => orderItem.UnitPrice),
                "totalprice" => isAscending ? query.OrderBy(orderItem => orderItem.TotalPrice) : query.OrderByDescending(orderItem => orderItem.TotalPrice),
                _ => isAscending ? query.OrderBy(orderItem => orderItem.CreatedAt) : query.OrderByDescending(orderItem => orderItem.CreatedAt)
            };
        }
    }
}
