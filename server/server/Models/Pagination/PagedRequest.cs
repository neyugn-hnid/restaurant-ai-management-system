namespace server.Models.Pagination
{
    public class PagedRequest
    {
        private const int DefaultPageNumber = 1;
        private const int DefaultPageSize = 10;
        private const int MaxPageSize = 100;

        public int Page { get; set; } = DefaultPageNumber;

        public int PageSize { get; set; } = DefaultPageSize;

        public string? SearchTerm { get; set; }

        public string? Location { get; set; }

        public string? Status { get; set; }

        public int? CategoryId { get; set; }

        public string? SortBy { get; set; }

        public string? SortOrder { get; set; }

        public int GetPageNumber()
        {
            return Page < 1 ? DefaultPageNumber : Page;
        }

        public int GetPageSize()
        {
            if (PageSize < 1)
            {
                return DefaultPageSize;
            }

            return PageSize > MaxPageSize ? MaxPageSize : PageSize;
        }

        public bool IsAscending()
        {
            return string.Equals(SortOrder, "asc", StringComparison.OrdinalIgnoreCase);
        }
    }
}
