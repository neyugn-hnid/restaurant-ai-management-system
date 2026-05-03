using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Modal
{
    [Table("restaurant_tables")]
    public class RestaurantTable
    {
        [Key]
        [MaxLength(50)]
        [Column("id")]
        public string? Id { get; set; }

        [MaxLength(100)]
        [Column("zone")]
        public string? Zone { get; set; }

        [Column("capacity")]
        public int Capacity { get; set; } = 4;

        [Column("status")]
        public RestaurantTableStatus Status { get; set; } = RestaurantTableStatus.Available;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<Order>? Orders { get; set; }
        public ICollection<Reservation>? Reservations { get; set; }
    }
}
