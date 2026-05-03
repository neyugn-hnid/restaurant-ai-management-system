using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Modal
{
    [Table("orders")]
    public class Order
    {
        [Key]
        [MaxLength(50)]
        [Column("id")]
        public string? Id { get; set; }

        [MaxLength(50)]
        [Column("customer_id")]
        public string? CustomerId { get; set; }

        [Column("account_id")]
        public int? AccountId { get; set; }

        [Column("table_id")]
        public int? TableId { get; set; }

        [Column("status")]
        public OrderStatus Status { get; set; } = OrderStatus.Pending;

        [Required]
        [Column("subtotal", TypeName = "decimal(12, 2)")]
        public decimal Subtotal { get; set; } = 0;

        [Required]
        [Column("discount", TypeName = "decimal(12, 2)")]
        public decimal Discount { get; set; } = 0;

        [Required]
        [Column("total", TypeName = "decimal(12, 2)")]
        public decimal Total { get; set; } = 0;

        [MaxLength(50)]
        [Column("payment_method")]
        public string? PaymentMethod { get; set; } = "cash";

        [Column("payment_status")]
        public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

        [Column("notes", TypeName = "text")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;


        [ForeignKey(nameof(CustomerId))]
        public Customer? Customer { get; set; }

        [ForeignKey(nameof(AccountId))]
        public Account? Account { get; set; }

        [ForeignKey(nameof(TableId))]
        public RestaurantTable? RestaurantTable { get; set; }

        public ICollection<OrderItem>? OrderItems { get; set; }
    }
}
