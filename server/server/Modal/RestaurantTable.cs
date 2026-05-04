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
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

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


        public ICollection<Order>? Orders { get; set; }
        public ICollection<Reservation>? Reservations { get; set; }
    }
}
