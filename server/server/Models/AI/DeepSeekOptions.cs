namespace server.Models.AI
{
    public class DeepSeekOptions
    {
        public string BaseUrl { get; set; } = "https://api.deepseek.com";
        public string Model { get; set; } = "deepseek-v4-flash";
        public string? ApiKey { get; set; }
        public int MaxTokens { get; set; } = 1200;
    }
}
