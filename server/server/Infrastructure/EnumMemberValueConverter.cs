using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace server.Infrastructure
{
    public class EnumMemberValueConverter<TEnum> : ValueConverter<TEnum, string> where TEnum : struct, Enum
    {
        public EnumMemberValueConverter()
            : base(
                value => EnumMemberValueHelper.GetValue(value),
                value => EnumMemberValueHelper.Parse<TEnum>(value))
        {
        }
    }
}
