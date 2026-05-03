using System.Runtime.Serialization;

namespace server.Modal
{
    public enum AccountStatus
    {
        [EnumMember(Value = "Hoạt động")]
        Active,

        [EnumMember(Value = "Không hoạt động")]
        Inactive,

        [EnumMember(Value = "Tạm khóa")]
        Suspended
    }

    public enum ProductStatus
    {
        [EnumMember(Value = "Còn hàng")]
        Active,

        [EnumMember(Value = "Hết hàng")]
        OutOfStock,

        [EnumMember(Value = "Ngừng bán")]
        Inactive
    }

    public enum OrderStatus
    {
        [EnumMember(Value = "Chờ xử lý")]
        Pending,

        [EnumMember(Value = "Đang chế biến")]
        Preparing,

        [EnumMember(Value = "Hoàn thành")]
        Completed,

        [EnumMember(Value = "Hủy")]
        Cancelled
    }

    public enum PaymentStatus
    {
        [EnumMember(Value = "pending")]
        Pending,

        [EnumMember(Value = "completed")]
        Completed,

        [EnumMember(Value = "failed")]
        Failed,

        [EnumMember(Value = "refunded")]
        Refunded
    }

    public enum ReservationStatus
    {
        [EnumMember(Value = "Chờ xử lý")]
        Pending,

        [EnumMember(Value = "Đã xác nhận")]
        Confirmed,

        [EnumMember(Value = "Đã đến")]
        CheckedIn,

        [EnumMember(Value = "Đã hủy")]
        Cancelled
    }

    public enum RestaurantTableStatus
    {
        [EnumMember(Value = "Trống")]
        Available,

        [EnumMember(Value = "Đang phục vụ")]
        Occupied,

        [EnumMember(Value = "Đã đặt")]
        Reserved,

        [EnumMember(Value = "Chờ dọn dẹp")]
        Cleaning
    }
}
