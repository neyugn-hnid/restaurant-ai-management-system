using System.Reflection;
using System.Runtime.Serialization;

namespace server.Infrastructure
{
    public static class EnumMemberValueHelper
    {
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

            foreach (var field in typeof(TEnum).GetFields(BindingFlags.Public | BindingFlags.Static))
            {
                var attribute = field.GetCustomAttribute<EnumMemberAttribute>();
                if (string.Equals(attribute?.Value, rawValue, StringComparison.OrdinalIgnoreCase))
                {
                    return (TEnum)field.GetValue(null)!;
                }

                if (string.Equals(field.Name, rawValue, StringComparison.OrdinalIgnoreCase))
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
    }
}
