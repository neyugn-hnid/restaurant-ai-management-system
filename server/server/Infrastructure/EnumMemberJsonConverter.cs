using System.Text.Json;
using System.Text.Json.Serialization;

namespace server.Infrastructure
{
    public class EnumMemberJsonConverterFactory : JsonConverterFactory
    {
        public override bool CanConvert(Type typeToConvert)
        {
            var targetType = Nullable.GetUnderlyingType(typeToConvert) ?? typeToConvert;
            return targetType.IsEnum;
        }

        public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
        {
            var targetType = Nullable.GetUnderlyingType(typeToConvert);
            if (targetType is not null)
            {
                var converterType = typeof(NullableEnumMemberJsonConverter<>).MakeGenericType(targetType);
                return (JsonConverter)Activator.CreateInstance(converterType)!;
            }

            var enumConverterType = typeof(EnumMemberJsonConverter<>).MakeGenericType(typeToConvert);
            return (JsonConverter)Activator.CreateInstance(enumConverterType)!;
        }
    }

    public class EnumMemberJsonConverter<TEnum> : JsonConverter<TEnum> where TEnum : struct, Enum
    {
        public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.String)
            {
                throw new JsonException($"Token không hợp lệ cho enum {typeof(TEnum).Name}.");
            }

            return EnumMemberValueHelper.Parse<TEnum>(reader.GetString());
        }

        public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(EnumMemberValueHelper.GetValue(value));
        }
    }

    public class NullableEnumMemberJsonConverter<TEnum> : JsonConverter<TEnum?> where TEnum : struct, Enum
    {
        public override TEnum? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return null;
            }

            if (reader.TokenType != JsonTokenType.String)
            {
                throw new JsonException($"Token không hợp lệ cho enum nullable {typeof(TEnum).Name}.");
            }

            return EnumMemberValueHelper.Parse<TEnum>(reader.GetString());
        }

        public override void Write(Utf8JsonWriter writer, TEnum? value, JsonSerializerOptions options)
        {
            if (!value.HasValue)
            {
                writer.WriteNullValue();
                return;
            }

            writer.WriteStringValue(EnumMemberValueHelper.GetValue(value.Value));
        }
    }
}
