using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Modal;
using server.Services;

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AiRecommendationsController : ControllerBase
    {
        private readonly serverContext _context;
        private readonly DeepSeekChatClient _deepSeekChatClient;
        private readonly ILogger<AiRecommendationsController> _logger;

        public AiRecommendationsController(
            serverContext context,
            DeepSeekChatClient deepSeekChatClient,
            ILogger<AiRecommendationsController> logger)
        {
            _context = context;
            _deepSeekChatClient = deepSeekChatClient;
            _logger = logger;
        }

        [HttpPost("dishes")]
        public async Task<ActionResult<DishRecommendationResponse>> RecommendDishes(
            [FromBody] DishRecommendationRequest request,
            CancellationToken cancellationToken)
        {
            var categories = await _context.Category
                .AsNoTracking()
                .ToDictionaryAsync(category => category.Id, category => category.Name ?? "Khác", cancellationToken);

            var popularity = await _context.OrderItem
                .AsNoTracking()
                .GroupBy(item => item.ProductId)
                .Select(group => new { ProductId = group.Key, Score = group.Sum(item => item.Quantity) })
                .ToDictionaryAsync(entry => entry.ProductId, entry => entry.Score, cancellationToken);

            var currentCartIds = request.CurrentCartProductIds?
                .Where(productId => productId > 0)
                .Distinct()
                .ToHashSet() ?? [];

            var allProducts = await _context.Product
                .AsNoTracking()
                .Where(product => product.Status == ProductStatus.Active)
                .OrderBy(product => product.Name)
                .ToListAsync(cancellationToken);

            var candidateProducts = allProducts
                .Where(product => !currentCartIds.Contains(product.Id))
                .Select(product => new DishCandidate
                {
                    Id = product.Id,
                    Name = product.Name ?? $"Món {product.Id}",
                    CategoryId = product.CategoryId,
                    Category = categories.TryGetValue(product.CategoryId, out var categoryName) ? categoryName : "Khác",
                    Price = product.Price,
                    Description = product.Description ?? string.Empty,
                    ImageUrl = product.ImageUrl,
                    PopularityScore = popularity.TryGetValue(product.Id, out var score) ? score : 0
                })
                .ToList();

            if (candidateProducts.Count == 0)
            {
                return Ok(new DishRecommendationResponse
                {
                    Provider = "heuristic",
                    Summary = "Hiện không có món phù hợp để gợi ý.",
                    Items = []
                });
            }

            var heuristicCandidates = RankDishCandidates(candidateProducts, request, allProducts);
            var fallbackResponse = BuildDishResponse(
                heuristicCandidates.Take(GetClampedMaxResults(request.MaxResults)).ToList(),
                "heuristic",
                "Gợi ý theo dữ liệu món hiện có và lịch sử gọi món nội bộ.");

            if (!_deepSeekChatClient.IsConfigured)
            {
                return Ok(fallbackResponse);
            }

            try
            {
                var aiPayload = await _deepSeekChatClient.CreateJsonCompletionAsync<DeepSeekDishResponse>(
                    systemPrompt: """
Bạn là trợ lý gợi ý món ăn cho nhà hàng cao cấp.
Nhiệm vụ: chọn món từ danh sách ứng viên được cung cấp.
Yêu cầu:
- Chỉ trả về JSON hợp lệ.
- Chỉ chọn id nằm trong danh sách ứng viên.
- Ưu tiên món bổ trợ cho giỏ hiện tại, tránh trùng lặp category quá mức.
- Mỗi reason ngắn gọn, cụ thể, tiếng Việt.
- Không bịa món ngoài dữ liệu đầu vào.
JSON schema:
{
  "summary": "string",
  "recommendations": [
    { "id": 1, "reason": "string", "score": 0.0 }
  ]
}
""",
                    userPrompt: BuildDishPrompt(request, heuristicCandidates),
                    cancellationToken: cancellationToken);

                if (aiPayload?.Recommendations?.Count > 0)
                {
                    var candidateLookup = heuristicCandidates.ToDictionary(item => item.Id);
                    var aiItems = aiPayload.Recommendations
                        .Where(item => candidateLookup.ContainsKey(item.Id))
                        .Select(item =>
                        {
                            var candidate = candidateLookup[item.Id];
                            return new DishRecommendationItem
                            {
                                Id = candidate.Id,
                                Name = candidate.Name,
                                Category = candidate.Category,
                                Price = candidate.Price,
                                ImageUrl = candidate.ImageUrl,
                                Reason = string.IsNullOrWhiteSpace(item.Reason) ? candidate.DefaultReason : item.Reason,
                                Score = item.Score <= 0 ? candidate.Score : item.Score
                            };
                        })
                        .OrderByDescending(item => item.Score)
                        .Take(GetClampedMaxResults(request.MaxResults))
                        .ToList();

                    if (aiItems.Count > 0)
                    {
                        return Ok(new DishRecommendationResponse
                        {
                            Provider = "deepseek",
                            Summary = string.IsNullOrWhiteSpace(aiPayload.Summary)
                                ? "Gợi ý được tối ưu theo ngữ cảnh gọi món hiện tại."
                                : aiPayload.Summary,
                            Items = aiItems
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "DeepSeek dish recommendation failed, fallback to heuristic.");
            }

            return Ok(fallbackResponse);
        }

        [HttpPost("tables")]
        public async Task<ActionResult<TableRecommendationResponse>> RecommendTables(
            [FromBody] TableRecommendationRequest request,
            CancellationToken cancellationToken)
        {
            if (!DateTime.TryParse(request.ReservationDate, out var reservationDate))
            {
                return BadRequest(new { message = "reservationDate không hợp lệ." });
            }

            if (!TimeSpan.TryParse(request.ReservationTime, out var reservationTime))
            {
                return BadRequest(new { message = "reservationTime không hợp lệ." });
            }

            var guestCount = Math.Max(1, request.GuestCount);
            var requestedSlot = reservationDate.Date + reservationTime;

            var tables = await _context.RestaurantTable
                .AsNoTracking()
                .OrderBy(table => table.Zone)
                .ThenBy(table => table.Name)
                .ToListAsync(cancellationToken);

            var sameDayReservations = await _context.Reservation
                .AsNoTracking()
                .Where(reservation => reservation.ReservationDate == reservationDate.Date)
                .Where(reservation => reservation.Status != ReservationStatus.Cancelled)
                .ToListAsync(cancellationToken);

            var blockedTableIds = sameDayReservations
                .Where(reservation =>
                {
                    var reservationSlot = reservation.ReservationDate.Date + reservation.ReservationTime;
                    var difference = (reservationSlot - requestedSlot).Duration();
                    return difference <= TimeSpan.FromHours(2);
                })
                .Select(reservation => reservation.TableId)
                .ToHashSet();

            var candidates = tables
                .Select(table =>
                {
                    var isCapacityFit = table.Capacity >= guestCount;
                    var isStatusAvailable = table.Status == RestaurantTableStatus.Available;
                    var isReservationFree = !blockedTableIds.Contains(table.Id);
                    var available = isCapacityFit && isStatusAvailable && isReservationFree;

                    return new TableCandidate
                    {
                        Id = table.Id,
                        Name = table.Name ?? $"Bàn {table.Id}",
                        Zone = table.Zone ?? "Khu chung",
                        Capacity = table.Capacity,
                        Status = table.Status.ToString(),
                        Available = available,
                        Score = 0,
                        DefaultReason = available
                            ? "Đủ chỗ và đang trống trong khung giờ bạn chọn."
                            : "Không phù hợp do trạng thái hoặc sức chứa."
                    };
                })
                .Where(table => table.Available)
                .ToList();

            if (candidates.Count == 0)
            {
                return Ok(new TableRecommendationResponse
                {
                    Provider = "heuristic",
                    Summary = "Không còn bàn trống phù hợp trong khung giờ này.",
                    Tables = []
                });
            }

            var rankedCandidates = RankTableCandidates(candidates, request);
            var fallbackResponse = BuildTableResponse(
                rankedCandidates.Take(GetClampedMaxResults(request.MaxResults)).ToList(),
                "heuristic",
                "Gợi ý theo sức chứa, mức độ vừa chỗ và ghi chú bàn.");

            if (!_deepSeekChatClient.IsConfigured)
            {
                return Ok(fallbackResponse);
            }

            try
            {
                var aiPayload = await _deepSeekChatClient.CreateJsonCompletionAsync<DeepSeekTableResponse>(
                    systemPrompt: """
Bạn là trợ lý gợi ý bàn cho nhà hàng.
Nhiệm vụ: chọn bàn tốt nhất từ danh sách bàn trống đã cho.
Yêu cầu:
- Chỉ trả về JSON hợp lệ.
- Chỉ chọn id nằm trong danh sách ứng viên.
- Ưu tiên bàn vừa sức chứa, hợp ghi chú, tránh lãng phí bàn lớn nếu không cần thiết.
- Mỗi reason ngắn gọn, cụ thể, tiếng Việt.
JSON schema:
{
  "summary": "string",
  "recommendations": [
    { "id": 1, "reason": "string", "score": 0.0 }
  ]
}
""",
                    userPrompt: BuildTablePrompt(request, rankedCandidates, requestedSlot),
                    cancellationToken: cancellationToken);

                if (aiPayload?.Recommendations?.Count > 0)
                {
                    var lookup = rankedCandidates.ToDictionary(table => table.Id);
                    var aiTables = aiPayload.Recommendations
                        .Where(item => lookup.ContainsKey(item.Id))
                        .Select(item =>
                        {
                            var candidate = lookup[item.Id];
                            return new TableRecommendationItem
                            {
                                TableId = candidate.Id,
                                Name = candidate.Name,
                                Zone = candidate.Zone,
                                Capacity = candidate.Capacity,
                                Reason = string.IsNullOrWhiteSpace(item.Reason) ? candidate.DefaultReason : item.Reason,
                                Score = item.Score <= 0 ? candidate.Score : item.Score
                            };
                        })
                        .OrderByDescending(item => item.Score)
                        .Take(GetClampedMaxResults(request.MaxResults))
                        .ToList();

                    if (aiTables.Count > 0)
                    {
                        return Ok(new TableRecommendationResponse
                        {
                            Provider = "deepseek",
                            Summary = string.IsNullOrWhiteSpace(aiPayload.Summary)
                                ? "Đây là các bàn phù hợp nhất cho yêu cầu hiện tại."
                                : aiPayload.Summary,
                            Tables = aiTables
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "DeepSeek table recommendation failed, fallback to heuristic.");
            }

            return Ok(fallbackResponse);
        }

        private static string BuildDishPrompt(DishRecommendationRequest request, List<DishCandidate> candidates)
        {
            var currentTime = string.IsNullOrWhiteSpace(request.DiningTime)
                ? DateTime.Now.ToString("HH:mm")
                : request.DiningTime;

            var candidateText = string.Join('\n', candidates.Select(candidate =>
                $"- id={candidate.Id}; name={candidate.Name}; category={candidate.Category}; price={candidate.Price}; popularity={candidate.PopularityScore}; score={candidate.Score:0.##}; reason={candidate.DefaultReason}; desc={candidate.Description}"));

            return $"""
Khách đang xem thực đơn.
Thời gian: {currentTime}
Khách: {request.CustomerName ?? "Ẩn danh"}
Số bàn: {request.TableId?.ToString() ?? "Không có"}
Giỏ hiện tại: {(request.CurrentCartProductIds?.Count > 0 ? string.Join(", ", request.CurrentCartProductIds) : "Trống")}
Số lượng cần gợi ý: {GetClampedMaxResults(request.MaxResults)}

Danh sách ứng viên:
{candidateText}
""";
        }

        private static string BuildTablePrompt(TableRecommendationRequest request, List<TableCandidate> candidates, DateTime requestedSlot)
        {
            var candidateText = string.Join('\n', candidates.Select(candidate =>
                $"- id={candidate.Id}; name={candidate.Name}; zone={candidate.Zone}; capacity={candidate.Capacity}; score={candidate.Score:0.##}; reason={candidate.DefaultReason}"));

            return $"""
Yêu cầu đặt bàn:
- Thời gian: {requestedSlot:dd/MM/yyyy HH:mm}
- Số khách: {Math.Max(1, request.GuestCount)}
- Tên khách: {request.CustomerName ?? "Ẩn danh"}
- Ghi chú: {request.Preference ?? "Không có"}
- Số lượng cần gợi ý: {GetClampedMaxResults(request.MaxResults)}

Danh sách bàn trống:
{candidateText}
""";
        }

        private static List<DishCandidate> RankDishCandidates(
            List<DishCandidate> candidates,
            DishRecommendationRequest request,
            List<Product> allProducts)
        {
            var cartIds = request.CurrentCartProductIds?.ToHashSet() ?? [];
            var cartProducts = allProducts
                .Where(product => cartIds.Contains(product.Id))
                .ToList();
            var cartCategories = cartProducts
                .Select(product => product.CategoryId)
                .ToHashSet();

            foreach (var candidate in candidates)
            {
                var score = 0d;

                score += candidate.PopularityScore * 0.25d;
                if (candidate.Price is >= 50000 and <= 250000)
                {
                    score += 2;
                }

                if (cartProducts.Count == 0)
                {
                    score += candidate.PopularityScore > 0 ? 8 : 4;
                    candidate.DefaultReason = candidate.PopularityScore > 0
                        ? "Đây là món được gọi nhiều và phù hợp để bắt đầu."
                        : "Món dễ chọn cho lượt gọi đầu tiên.";
                }
                else if (!cartCategories.Contains(candidate.CategoryId))
                {
                    score += 15;
                    candidate.DefaultReason = "Khác nhóm món hiện tại, giúp bữa ăn cân bằng hơn.";
                }
                else
                {
                    score += 6;
                    candidate.DefaultReason = "Bổ sung theo gu gọi món hiện tại của khách.";
                }

                var timeValue = request.DiningTime ?? string.Empty;
                if (timeValue.StartsWith("17") || timeValue.StartsWith("18") || timeValue.StartsWith("19") || timeValue.StartsWith("20"))
                {
                    if (candidate.Price >= 150000) score += 3;
                }

                candidate.Score = score;
            }

            return candidates.OrderByDescending(candidate => candidate.Score).ThenByDescending(candidate => candidate.PopularityScore).ToList();
        }

        private static List<TableCandidate> RankTableCandidates(List<TableCandidate> candidates, TableRecommendationRequest request)
        {
            var preference = (request.Preference ?? string.Empty).Trim().ToLowerInvariant();

            foreach (var candidate in candidates)
            {
                var score = 100d - Math.Abs(candidate.Capacity - Math.Max(1, request.GuestCount)) * 8d;

                if (candidate.Capacity == request.GuestCount) score += 12;
                if (candidate.Capacity - request.GuestCount is >= 1 and <= 2) score += 6;

                if (!string.IsNullOrWhiteSpace(preference))
                {
                    var searchable = $"{candidate.Name} {candidate.Zone}".ToLowerInvariant();
                    if (searchable.Contains("vip") && (preference.Contains("vip") || preference.Contains("riêng"))) score += 18;
                    if (searchable.Contains("ngoài") && (preference.Contains("ngoài") || preference.Contains("sân"))) score += 14;
                    if (searchable.Contains("cửa sổ") && preference.Contains("cửa sổ")) score += 14;
                    if (searchable.Contains("gia đình") && preference.Contains("gia đình")) score += 12;
                }

                candidate.Score = score;
                candidate.DefaultReason = candidate.Capacity == request.GuestCount
                    ? "Vừa đúng số khách, tối ưu không gian."
                    : candidate.Capacity > request.GuestCount
                        ? "Đủ chỗ và còn dư chỗ ngồi thoải mái."
                        : candidate.DefaultReason;
            }

            return candidates.OrderByDescending(candidate => candidate.Score).ThenBy(candidate => candidate.Capacity).ToList();
        }

        private static DishRecommendationResponse BuildDishResponse(List<DishCandidate> candidates, string provider, string summary)
        {
            return new DishRecommendationResponse
            {
                Provider = provider,
                Summary = summary,
                Items = candidates.Select(candidate => new DishRecommendationItem
                {
                    Id = candidate.Id,
                    Name = candidate.Name,
                    Category = candidate.Category,
                    Price = candidate.Price,
                    ImageUrl = candidate.ImageUrl,
                    Reason = candidate.DefaultReason,
                    Score = candidate.Score
                }).ToList()
            };
        }

        private static TableRecommendationResponse BuildTableResponse(List<TableCandidate> candidates, string provider, string summary)
        {
            return new TableRecommendationResponse
            {
                Provider = provider,
                Summary = summary,
                Tables = candidates.Select(candidate => new TableRecommendationItem
                {
                    TableId = candidate.Id,
                    Name = candidate.Name,
                    Zone = candidate.Zone,
                    Capacity = candidate.Capacity,
                    Reason = candidate.DefaultReason,
                    Score = candidate.Score
                }).ToList()
            };
        }

        private static int GetClampedMaxResults(int? requested)
        {
            return Math.Clamp(requested ?? 3, 1, 6);
        }

        private sealed class DishCandidate
        {
            public int Id { get; set; }
            public int CategoryId { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public decimal Price { get; set; }
            public string Description { get; set; } = string.Empty;
            public string? ImageUrl { get; set; }
            public int PopularityScore { get; set; }
            public double Score { get; set; }
            public string DefaultReason { get; set; } = string.Empty;
        }

        private sealed class TableCandidate
        {
            public int Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Zone { get; set; } = string.Empty;
            public int Capacity { get; set; }
            public string Status { get; set; } = string.Empty;
            public bool Available { get; set; }
            public double Score { get; set; }
            public string DefaultReason { get; set; } = string.Empty;
        }

        private sealed class DeepSeekDishResponse
        {
            public string? Summary { get; set; }
            public List<DeepSeekRecommendation>? Recommendations { get; set; }
        }

        private sealed class DeepSeekTableResponse
        {
            public string? Summary { get; set; }
            public List<DeepSeekRecommendation>? Recommendations { get; set; }
        }

        private sealed class DeepSeekRecommendation
        {
            public int Id { get; set; }
            public string? Reason { get; set; }
            public double Score { get; set; }
        }
    }

    public sealed class DishRecommendationRequest
    {
        public List<int>? CurrentCartProductIds { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string? DiningTime { get; set; }
        public int? TableId { get; set; }
        public int? MaxResults { get; set; }
    }

    public sealed class DishRecommendationResponse
    {
        public string Provider { get; set; } = "heuristic";
        public string Summary { get; set; } = string.Empty;
        public List<DishRecommendationItem> Items { get; set; } = [];
    }

    public sealed class DishRecommendationItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public string Reason { get; set; } = string.Empty;
        public double Score { get; set; }
    }

    public sealed class TableRecommendationRequest
    {
        public string ReservationDate { get; set; } = string.Empty;
        public string ReservationTime { get; set; } = string.Empty;
        public int GuestCount { get; set; }
        public string? CustomerName { get; set; }
        public string? Preference { get; set; }
        public int? MaxResults { get; set; }
    }

    public sealed class TableRecommendationResponse
    {
        public string Provider { get; set; } = "heuristic";
        public string Summary { get; set; } = string.Empty;
        public List<TableRecommendationItem> Tables { get; set; } = [];
    }

    public sealed class TableRecommendationItem
    {
        public int TableId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Zone { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string Reason { get; set; } = string.Empty;
        public double Score { get; set; }
    }
}
