using System.Reflection;
using System.Runtime.Serialization;
using System.Text.RegularExpressions;

namespace server.Infrastructure
{
    public static class EnumMemberValueHelper
    {
        private static string NormalizeEnumValue(string value)
        {
            value = value.Normalize(System.Text.NormalizationForm.FormC)
                .Replace('\u00A0', ' ')
                .Trim();

            return Regex.Replace(value, "\\s+", " ");
        }

        public static string GetValue<TEnum>(TEnum value) where TEnum : struct, Enum
        {
            var enumType = typeof(TEnum);
            var memberName = value.ToString();
            var member = enumType.GetMember(memberName).FirstOrDefault();
            var attribute = member?.GetCustomAttribute<EnumMemberAttribute>();
            return attribute?.Value ?? memberName;
        }

        public static TEnum Parse<TEnum>(string? rawValue) where TEnum : struct, Enum
        {
            if (string.IsNullOrWhiteSpace(rawValue))
            {
                throw new ArgumentException($"Giá trị enum không hợp lệ cho {typeof(TEnum).Name}.");
            }

            rawValue = NormalizeEnumValue(rawValue);

            foreach (var field in typeof(TEnum).GetFields(BindingFlags.Public | BindingFlags.Static))
            {
                var attribute = field.GetCustomAttribute<EnumMemberAttribute>();
                if (attribute?.Value is not null && string.Equals(NormalizeEnumValue(attribute.Value), rawValue, StringComparison.OrdinalIgnoreCase))
                {
                    return (TEnum)field.GetValue(null)!;
                }

                if (string.Equals(NormalizeEnumValue(field.Name), rawValue, StringComparison.OrdinalIgnoreCase))
                {
                    return (TEnum)field.GetValue(null)!;
                }
            }

            if (Enum.TryParse<TEnum>(rawValue, true, out var parsedValue))
            {
                return parsedValue;
            }

            throw new ArgumentException($"Không thể ánh xạ giá trị '{rawValue}' sang enum {typeof(TEnum).Name}.");
        }

        public static bool TryParse<TEnum>(string? rawValue, out TEnum result) where TEnum : struct, Enum
        {
            try
            {
                result = Parse<TEnum>(rawValue);
                return true;
            }
            catch
            {
                result = default;
                return false;
            }
        }
    }
}
