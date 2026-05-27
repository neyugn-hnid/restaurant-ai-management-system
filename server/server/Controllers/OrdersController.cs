using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
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
    public class OrdersController : ControllerBase
    {
        private readonly serverContext _context;
        private readonly TableStateCoordinator _tableStateCoordinator;
        private readonly RealtimeNotifier _realtimeNotifier;

        public OrdersController(serverContext context, TableStateCoordinator tableStateCoordinator, RealtimeNotifier realtimeNotifier)
        {
            _context = context;
            _tableStateCoordinator = tableStateCoordinator;
            _realtimeNotifier = realtimeNotifier;
        }


        [Authorize]
        [HttpGet]
        public async Task<ActionResult<PagedResponse<OrderResponseDto>>> GetOrder([FromQuery] PagedRequest request)
        {
            var query = _context.Order
                .AsNoTracking()
                .Include(order => order.OrderItems)
                .Include(order => order.Customer)
                .Include(order => order.RestaurantTable)
                .AsQueryable();

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
            return Ok(MapPagedOrders(pagedResult));
        }


        [Authorize]
        [HttpGet("{id}")]
        public async Task<ActionResult<OrderResponseDto>> GetOrder(string id)
        {
            var order = await _context.Order
                .AsNoTracking()
                .Include(entity => entity.OrderItems)
                .Include(entity => entity.Customer)
                .Include(entity => entity.RestaurantTable)
                .FirstOrDefaultAsync(entity => entity.Id == id);

            if (order == null)
            {
                return NotFound();
            }

            return Ok(MapOrder(order));
        }



        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutOrder(string id, Order order)
        {
            if (id != order.Id)
            {
                return BadRequest();
            }

            var existingOrder = await _context.Order.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);
            if (existingOrder == null)
            {
                return NotFound();
            }

            _context.Entry(order).State = EntityState.Modified;
            order.UpdatedAt = DateTime.UtcNow;

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

            if (existingOrder.TableId.HasValue && existingOrder.TableId != order.TableId)
            {
                var oldTable = await _context.RestaurantTable.FindAsync(existingOrder.TableId.Value);
                if (oldTable?.Status != RestaurantTableStatus.Reserved)
                {
                    await _tableStateCoordinator.RecalculateAsync(existingOrder.TableId.Value, "order-updated-old-table");
                }
            }

            if (order.TableId.HasValue)
            {
                // Nếu bàn đang ở trạng thái Đã đặt (Reserved), không thay đổi trạng thái khi cập nhật đơn (pre-order).
                var table = await _context.RestaurantTable.FindAsync(order.TableId.Value);
                if (table?.Status != RestaurantTableStatus.Reserved)
                {
                    var fallbackStatus = IsCompletedOrder(order) ? RestaurantTableStatus.Cleaning : (RestaurantTableStatus?)null;
                    await _tableStateCoordinator.RecalculateAsync(order.TableId.Value, "order-updated", fallbackStatus);
                }
            }

            await _realtimeNotifier.BroadcastOrderChangedAsync(order.Id, "updated", order.TableId);
            return NoContent();
        }



        [HttpPost]
        public async Task<ActionResult<OrderResponseDto>> PostOrder(Order order)
        {
            order.UpdatedAt = DateTime.UtcNow;
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

            if (order.TableId.HasValue)
            {
                // Nếu bàn đang ở trạng thái Đã đặt (Reserved), không thay đổi trạng thái khi tạo đơn (pre-order).
                // Chỉ khi khách check-in thì mới chuyển từ Reserved -> Occupied.
                var table = await _context.RestaurantTable.FindAsync(order.TableId.Value);
                if (table?.Status != RestaurantTableStatus.Reserved)
                {
                    var fallbackStatus = IsCompletedOrder(order) ? RestaurantTableStatus.Cleaning : (RestaurantTableStatus?)null;
                    await _tableStateCoordinator.RecalculateAsync(order.TableId.Value, "order-created", fallbackStatus);
                }
            }

            await _realtimeNotifier.BroadcastOrderChangedAsync(order.Id, "created", order.TableId);
            return CreatedAtAction("GetOrder", new { id = order.Id }, MapOrder(order));
        }


        [Authorize]
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
            if (order.TableId.HasValue)
            {
                await _tableStateCoordinator.RecalculateAsync(order.TableId.Value, "order-deleted");
            }
            await _realtimeNotifier.BroadcastOrderChangedAsync(order.Id, "deleted", order.TableId);

            return NoContent();
        }

        private bool OrderExists(string id)
        {
            return _context.Order.Any(e => e.Id == id);
        }

        private static bool IsCompletedOrder(Order order)
        {
            return order.Status == OrderStatus.Completed
                || order.Status == OrderStatus.Cancelled
                || order.PaymentStatus == PaymentStatus.Completed
                || order.PaymentStatus == PaymentStatus.Refunded;
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

        private static PagedResponse<OrderResponseDto> MapPagedOrders(PagedResponse<Order> pagedResult)
        {
            return new PagedResponse<OrderResponseDto>
            {
                Items = pagedResult.Items.Select(MapOrder).ToList(),
                PageNumber = pagedResult.PageNumber,
                PageSize = pagedResult.PageSize,
                TotalItemCount = pagedResult.TotalItemCount,
                PageCount = pagedResult.PageCount,
                HasPreviousPage = pagedResult.HasPreviousPage,
                HasNextPage = pagedResult.HasNextPage
            };
        }

        private static OrderResponseDto MapOrder(Order order)
        {
            var items = order.OrderItems?.Select(item => new OrderItemResponseDto
            {
                Id = item.Id,
                OrderId = item.OrderId,
                ProductId = item.ProductId,
                ProductName = item.ProductName,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                TotalPrice = item.TotalPrice,
                Notes = item.Notes,
                CreatedAt = item.CreatedAt
            }).ToList() ?? new List<OrderItemResponseDto>();

            return new OrderResponseDto
            {
                Id = order.Id,
                CustomerId = order.CustomerId,
                CustomerName = order.Customer?.FullName,
                AccountId = order.AccountId,
                TableId = order.TableId,
                TableName = order.RestaurantTable?.Name ?? (order.TableId != null ? $"Bàn {order.TableId}" : null),
                ItemsCount = items.Sum(i => i.Quantity),
                Status = order.Status,
                Subtotal = order.Subtotal,
                Discount = order.Discount,
                Total = order.Total,
                PaymentMethod = order.PaymentMethod,
                PaymentStatus = order.PaymentStatus,
                Notes = order.Notes,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt,
                Items = items
            };
        }

        public sealed class OrderResponseDto
        {
            public string? Id { get; set; }
            public string? CustomerId { get; set; }
            public string? CustomerName { get; set; }
            public int? AccountId { get; set; }
            public int? TableId { get; set; }
            public string? TableName { get; set; }
            public int ItemsCount { get; set; }
            public OrderStatus Status { get; set; }
            public decimal Subtotal { get; set; }
            public decimal Discount { get; set; }
            public decimal Total { get; set; }
            public string? PaymentMethod { get; set; }
            public PaymentStatus PaymentStatus { get; set; }
            public string? Notes { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime UpdatedAt { get; set; }
            public List<OrderItemResponseDto> Items { get; set; } = new();
        }

        public sealed class OrderItemResponseDto
        {
            public int Id { get; set; }
            public string? OrderId { get; set; }
            public int ProductId { get; set; }
            public string? ProductName { get; set; }
            public int Quantity { get; set; }
            public decimal UnitPrice { get; set; }
            public decimal TotalPrice { get; set; }
            public string? Notes { get; set; }
            public DateTime CreatedAt { get; set; }
        }
    }
}
