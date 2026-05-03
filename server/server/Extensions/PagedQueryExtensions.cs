using Microsoft.EntityFrameworkCore;
using server.Models.Pagination;
using X.PagedList;

namespace server.Extensions
{
    public static class PagedQueryExtensions
    {
        public static async Task<PagedResponse<T>> ToPagedResponseAsync<T>(
            this IQueryable<T> query,
            int pageNumber,
            int pageSize)
        {
            var totalItemCount = await query.CountAsync();
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var pagedList = new StaticPagedList<T>(items, pageNumber, pageSize, totalItemCount);

            return new PagedResponse<T>
            {
                Items = pagedList.ToList(),
                PageNumber = pagedList.PageNumber,
                PageSize = pagedList.PageSize,
                TotalItemCount = pagedList.TotalItemCount,
                PageCount = pagedList.PageCount,
                HasPreviousPage = pagedList.HasPreviousPage,
                HasNextPage = pagedList.HasNextPage
            };
        }
    }
}
