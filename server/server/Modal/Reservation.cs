using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Modal
{
    [Table("reservations")]
    public class Reservation
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("customer_id")]
        public string? CustomerId { get; set; }

        [Required]
        [Column("table_id")]
        public int TableId { get; set; }

        [Required]
        [Column("reservation_date", TypeName = "date")]
        public DateTime ReservationDate { get; set; }

        [Required]
        [Column("reservation_time", TypeName = "time")]
        public TimeSpan ReservationTime { get; set; }

        [Column("guest_count")]
        public int GuestCount { get; set; } = 1;

        [Column("status")]
        public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

        [Column("notes", TypeName = "text")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;


        [ForeignKey(nameof(CustomerId))]
        public Customer? Customer { get; set; }

        [ForeignKey(nameof(TableId))]
        public RestaurantTable? RestaurantTable { get; set; }
    }
}
