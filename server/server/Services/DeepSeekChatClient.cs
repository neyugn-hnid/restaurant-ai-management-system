using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using server.Models.AI;

namespace server.Services
{
    public class DeepSeekChatClient
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly HttpClient _httpClient;
        private readonly IOptionsMonitor<DeepSeekOptions> _optionsMonitor;
        private readonly ILogger<DeepSeekChatClient> _logger;

        public DeepSeekChatClient(
            HttpClient httpClient,
            IOptionsMonitor<DeepSeekOptions> optionsMonitor,
            ILogger<DeepSeekChatClient> logger)
        {
            _httpClient = httpClient;
            _optionsMonitor = optionsMonitor;
            _logger = logger;
        }

        public bool IsConfigured => !string.IsNullOrWhiteSpace(GetApiKey());

        public async Task<T?> CreateJsonCompletionAsync<T>(
            string systemPrompt,
            string userPrompt,
            CancellationToken cancellationToken = default)
        {
            var options = _optionsMonitor.CurrentValue;
            var apiKey = GetApiKey();
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("DeepSeek API key is not configured.");
            }

            var requestBody = new DeepSeekChatCompletionRequest
            {
                Model = string.IsNullOrWhiteSpace(options.Model) ? "deepseek-v4-flash" : options.Model,
                MaxTokens = options.MaxTokens <= 0 ? 1200 : options.MaxTokens,
                Temperature = 0.2m,
                ResponseFormat = new DeepSeekResponseFormat { Type = "json_object" },
                Thinking = new DeepSeekThinking { Type = "disabled" },
                Messages =
                [
                    new DeepSeekMessage { Role = "system", Content = systemPrompt },
                    new DeepSeekMessage { Role = "user", Content = userPrompt }
                ]
            };

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{options.BaseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(
                JsonSerializer.Serialize(requestBody, JsonOptions),
                Encoding.UTF8,
                "application/json");

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("DeepSeek request failed: {StatusCode} {Body}", response.StatusCode, responseContent);
                throw new HttpRequestException($"DeepSeek API failed with status {(int)response.StatusCode}: {responseContent}");
            }

            var payload = JsonSerializer.Deserialize<DeepSeekChatCompletionResponse>(responseContent, JsonOptions);
            var messageContent = payload?.Choices?.FirstOrDefault()?.Message?.Content;
            if (string.IsNullOrWhiteSpace(messageContent))
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(messageContent, JsonOptions);
        }

        private string? GetApiKey()
        {
            return Environment.GetEnvironmentVariable("DEEPSEEK_API_KEY")
                ?? _optionsMonitor.CurrentValue.ApiKey;
        }

        private sealed class DeepSeekChatCompletionRequest
        {
            public string Model { get; set; } = string.Empty;
            public List<DeepSeekMessage> Messages { get; set; } = [];
            public DeepSeekResponseFormat ResponseFormat { get; set; } = new();
            public DeepSeekThinking Thinking { get; set; } = new();
            public decimal Temperature { get; set; }
            public int MaxTokens { get; set; }
        }

        private sealed class DeepSeekMessage
        {
            public string Role { get; set; } = string.Empty;
            public string Content { get; set; } = string.Empty;
        }

        private sealed class DeepSeekResponseFormat
        {
            public string Type { get; set; } = "json_object";
        }

        private sealed class DeepSeekThinking
        {
            public string Type { get; set; } = "disabled";
        }

        private sealed class DeepSeekChatCompletionResponse
        {
            public List<DeepSeekChoice>? Choices { get; set; }
        }

        private sealed class DeepSeekChoice
        {
            public DeepSeekChoiceMessage? Message { get; set; }
        }

        private sealed class DeepSeekChoiceMessage
        {
            public string? Content { get; set; }
        }
    }
}
