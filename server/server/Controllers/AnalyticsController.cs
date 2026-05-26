using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Modal;

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AnalyticsController : ControllerBase
    {
        private readonly serverContext _context;

        public AnalyticsController(serverContext context)
        {
            _context = context;
        }

        // Doanh thu theo ngay trong thang
        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenue([FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
        {
            var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
            var to = toDate ?? DateTime.UtcNow;

            var orders = await _context.Order
                .Where(o => o.CreatedAt >= from && o.CreatedAt <= to && o.Status == Modal.OrderStatus.Completed)
                .GroupBy(o => o.CreatedAt.Date)
                .Select(g => new
                {
                    date = g.Key,
                    revenue = g.Sum(o => (double)o.Total),
                    count = g.Count()
                })
                .OrderBy(x => x.date)
                .ToListAsync();

            return Ok(new
            {
                fromDate = from,
                toDate = to,
                totalRevenue = orders.Sum(o => o.revenue),
                totalOrders = orders.Sum(o => o.count),
                daily = orders
            });
        }

        // Mon an ban chay
        [HttpGet("top-products")]
        public async Task<IActionResult> GetTopProducts([FromQuery] int top = 10, [FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
        {
            var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
            var to = toDate ?? DateTime.UtcNow;

            var items = await _context.OrderItem
                .Include(i => i.Order)
                .Where(i => i.Order.CreatedAt >= from && i.Order.CreatedAt <= to)
                .GroupBy(i => i.ProductName)
                .Select(g => new
                {
                    productName = g.Key,
                    quantity = g.Sum(i => i.Quantity),
                    totalRevenue = g.Sum(i => (double)i.TotalPrice)
                })
                .OrderByDescending(x => x.quantity)
                .Take(top)
                .ToListAsync();

            return Ok(items);
        }

        // Tong quan
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var now = DateTime.UtcNow;
            var todayStart = now.Date;
            var todayEnd = todayStart.AddDays(1);

            var todayOrders = await _context.Order
                .Where(o => o.CreatedAt >= todayStart && o.CreatedAt < todayEnd)
                .ToListAsync();

            var totalOrders = await _context.Order.CountAsync();
            var totalCustomers = await _context.Customer.CountAsync();
            var totalProducts = await _context.Product.CountAsync();
            var totalTables = await _context.RestaurantTable.CountAsync();

            return Ok(new
            {
                todayRevenue = todayOrders.Sum(o => o.Total),
                todayOrders = todayOrders.Count,
                totalOrders,
                totalCustomers,
                totalProducts,
                totalTables
            });
        }

        // Thong ke don hang theo trang thai
        [HttpGet("orders-status")]
        public async Task<IActionResult> GetOrdersByStatus()
        {
            var stats = await _context.Order
                .GroupBy(o => o.Status)
                .Select(g => new { status = g.Key, count = g.Count() })
                .ToListAsync();

            return Ok(stats);
        }
    }
}
