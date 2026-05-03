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
    public class AccountsController : ControllerBase
    {
        private readonly serverContext _context;

        public AccountsController(serverContext context)
        {
            _context = context;
        }


        [HttpGet]
        public async Task<ActionResult<PagedResponse<Account>>> GetAccount([FromQuery] PagedRequest request)
        {
            var query = _context.Account.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.Trim();
                query = query.Where(account =>
                    (account.Username != null && account.Username.Contains(searchTerm)) ||
                    (account.FullName != null && account.FullName.Contains(searchTerm)) ||
                    (account.Role != null && account.Role.Contains(searchTerm)));
            }

            query = ApplySorting(query, request);

            var pagedResult = await query.ToPagedResponseAsync(request.GetPageNumber(), request.GetPageSize());
            return Ok(pagedResult);
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<Account>> GetAccount(int id)
        {
            var account = await _context.Account.FindAsync(id);

            if (account == null)
            {
                return NotFound();
            }

            return account;
        }



        [HttpPut("{id}")]
        public async Task<IActionResult> PutAccount(int id, Account account)
        {
            if (id != account.Id)
            {
                return BadRequest();
            }

            var existing = await _context.Account.FindAsync(id);
            if (existing == null) return NotFound();

            existing.FullName = account.FullName ?? existing.FullName;
            existing.Username = account.Username ?? existing.Username;
            existing.Role = account.Role ?? existing.Role;
            existing.Status = account.Status;
            if (!string.IsNullOrWhiteSpace(account.PasswordHash) && !account.PasswordHash.StartsWith("$2"))
            {
                existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(account.PasswordHash);
            }
            else if (!string.IsNullOrWhiteSpace(account.PasswordHash))
            {
                existing.PasswordHash = account.PasswordHash;
            }
            existing.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AccountExists(id))
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
        public async Task<ActionResult<Account>> PostAccount(Account account)
        {
            if (!string.IsNullOrWhiteSpace(account.PasswordHash) && !account.PasswordHash.StartsWith("$2"))
            {
                account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(account.PasswordHash);
            }
            else if (string.IsNullOrWhiteSpace(account.PasswordHash))
            {
                account.PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
            }
            _context.Account.Add(account);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetAccount", new { id = account.Id }, account);
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAccount(int id)
        {
            var account = await _context.Account.FindAsync(id);
            if (account == null)
            {
                return NotFound();
            }

            _context.Account.Remove(account);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool AccountExists(int id)
        {
            return _context.Account.Any(e => e.Id == id);
        }

        private static IQueryable<Account> ApplySorting(IQueryable<Account> query, PagedRequest request)
        {
            var sortBy = request.SortBy?.Trim().ToLowerInvariant();
            var isAscending = request.IsAscending();

            return sortBy switch
            {
                "id" => isAscending ? query.OrderBy(account => account.Id) : query.OrderByDescending(account => account.Id),
                "username" => isAscending ? query.OrderBy(account => account.Username) : query.OrderByDescending(account => account.Username),
                "fullname" => isAscending ? query.OrderBy(account => account.FullName) : query.OrderByDescending(account => account.FullName),
                "role" => isAscending ? query.OrderBy(account => account.Role) : query.OrderByDescending(account => account.Role),
                "status" => isAscending ? query.OrderBy(account => account.Status) : query.OrderByDescending(account => account.Status),
                "lastlogin" => isAscending ? query.OrderBy(account => account.LastLogin) : query.OrderByDescending(account => account.LastLogin),
                "updatedat" => isAscending ? query.OrderBy(account => account.UpdatedAt) : query.OrderByDescending(account => account.UpdatedAt),
                _ => isAscending ? query.OrderBy(account => account.CreatedAt) : query.OrderByDescending(account => account.CreatedAt)
            };
        }
    }
}
