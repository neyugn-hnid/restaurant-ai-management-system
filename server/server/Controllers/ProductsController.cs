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
    public class ProductsController : ControllerBase
    {
        private readonly serverContext _context;

        public ProductsController(serverContext context)
        {
            _context = context;
        }


        [HttpGet]
        public async Task<ActionResult<PagedResponse<Product>>> GetProduct([FromQuery] PagedRequest request)
        {
            var query = _context.Product.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.Trim();
                query = query.Where(product =>
                    (product.Name != null && product.Name.Contains(searchTerm)) ||
                    (product.Description != null && product.Description.Contains(searchTerm)));
            }

            if (request.CategoryId.HasValue)
            {
                query = query.Where(product => product.CategoryId == request.CategoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Status) &&
                !string.Equals(request.Status, "Tất cả", StringComparison.OrdinalIgnoreCase))
            {
                var status = request.Status.Trim().ToLowerInvariant();
                query = query.Where(product => product.Status.ToString().ToLower() == status);
            }

            query = ApplySorting(query, request);

            var pagedResult = await query.ToPagedResponseAsync(request.GetPageNumber(), request.GetPageSize());
            return Ok(pagedResult);
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<Product>> GetProduct(int id)
        {
            var product = await _context.Product.FindAsync(id);

            if (product == null)
            {
                return NotFound();
            }

            return product;
        }



        [HttpPut("{id}")]
        public async Task<IActionResult> PutProduct(int id, Product product)
        {
            if (id != product.Id)
            {
                return BadRequest();
            }

            _context.Entry(product).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProductExists(id))
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
        public async Task<ActionResult<Product>> PostProduct(Product product)
        {
            _context.Product.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetProduct", new { id = product.Id }, product);
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Product.FindAsync(id);
            if (product == null)
            {
                return NotFound();
            }

            _context.Product.Remove(product);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ProductExists(int id)
        {
            return _context.Product.Any(e => e.Id == id);
        }

        private static IQueryable<Product> ApplySorting(IQueryable<Product> query, PagedRequest request)
        {
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isAscending = request.IsAscending();

            return sortBy switch
            {
                "id" => isAscending ? query.OrderBy(product => product.Id) : query.OrderByDescending(product => product.Id),
                "categoryid" => isAscending ? query.OrderBy(product => product.CategoryId) : query.OrderByDescending(product => product.CategoryId),
                "name" => isAscending ? query.OrderBy(product => product.Name) : query.OrderByDescending(product => product.Name),
                "price" => isAscending ? query.OrderBy(product => product.Price) : query.OrderByDescending(product => product.Price),
                "status" => isAscending ? query.OrderBy(product => product.Status) : query.OrderByDescending(product => product.Status),
                "updatedat" => isAscending ? query.OrderBy(product => product.UpdatedAt) : query.OrderByDescending(product => product.UpdatedAt),
                _ => isAscending ? query.OrderBy(product => product.CreatedAt) : query.OrderByDescending(product => product.CreatedAt)
            };
        }
    }
}
