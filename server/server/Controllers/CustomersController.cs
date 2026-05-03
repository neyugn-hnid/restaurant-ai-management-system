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
    public class CustomersController : ControllerBase
    {
        private readonly serverContext _context;

        public CustomersController(serverContext context)
        {
            _context = context;
        }

        // GET: api/Customers
        [HttpGet]
        public async Task<ActionResult<PagedResponse<Customer>>> GetCustomer([FromQuery] PagedRequest request)
        {
            var query = _context.Customer.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.Trim();
                query = query.Where(customer =>
                    (customer.Id != null && customer.Id.Contains(searchTerm)) ||
                    (customer.Phone != null && customer.Phone.Contains(searchTerm)) ||
                    (customer.FullName != null && customer.FullName.Contains(searchTerm)) ||
                    (customer.Email != null && customer.Email.Contains(searchTerm)) ||
                    (customer.Tier != null && customer.Tier.Contains(searchTerm)));
            }

            query = ApplySorting(query, request);

            var pagedResult = await query.ToPagedResponseAsync(request.GetPageNumber(), request.GetPageSize());
            return Ok(pagedResult);
        }

        // GET: api/Customers/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Customer>> GetCustomer(string id)
        {
            var customer = await _context.Customer.FindAsync(id);

            if (customer == null)
            {
                return NotFound();
            }

            return customer;
        }

        // PUT: api/Customers/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCustomer(string id, Customer customer)
        {
            if (id != customer.Id)
            {
                return BadRequest();
            }

            _context.Entry(customer).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!CustomerExists(id))
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

        // POST: api/Customers
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Customer>> PostCustomer(Customer customer)
        {
            _context.Customer.Add(customer);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (CustomerExists(customer.Id))
                {
                    return Conflict();
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetCustomer", new { id = customer.Id }, customer);
        }

        // DELETE: api/Customers/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(string id)
        {
            var customer = await _context.Customer.FindAsync(id);
            if (customer == null)
            {
                return NotFound();
            }

            _context.Customer.Remove(customer);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool CustomerExists(string id)
        {
            return _context.Customer.Any(e => e.Id == id);
        }

        private static IQueryable<Customer> ApplySorting(IQueryable<Customer> query, PagedRequest request)
        {
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isAscending = request.IsAscending();

            return sortBy switch
            {
                "id" => isAscending ? query.OrderBy(customer => customer.Id) : query.OrderByDescending(customer => customer.Id),
                "phone" => isAscending ? query.OrderBy(customer => customer.Phone) : query.OrderByDescending(customer => customer.Phone),
                "fullname" => isAscending ? query.OrderBy(customer => customer.FullName) : query.OrderByDescending(customer => customer.FullName),
                "email" => isAscending ? query.OrderBy(customer => customer.Email) : query.OrderByDescending(customer => customer.Email),
                "visits" => isAscending ? query.OrderBy(customer => customer.Visits) : query.OrderByDescending(customer => customer.Visits),
                "totalspent" => isAscending ? query.OrderBy(customer => customer.TotalSpent) : query.OrderByDescending(customer => customer.TotalSpent),
                "tier" => isAscending ? query.OrderBy(customer => customer.Tier) : query.OrderByDescending(customer => customer.Tier),
                "updatedat" => isAscending ? query.OrderBy(customer => customer.UpdatedAt) : query.OrderByDescending(customer => customer.UpdatedAt),
                _ => isAscending ? query.OrderBy(customer => customer.CreatedAt) : query.OrderByDescending(customer => customer.CreatedAt)
            };
        }
    }
}
