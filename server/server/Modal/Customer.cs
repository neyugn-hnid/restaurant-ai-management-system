using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Modal
{
    [Table("customers")]
    public class Customer
    {
        [Key]
        [MaxLength(50)]
        [Column("id")]
        public string? Id { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("phone")]
        public string? Phone { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("full_name")]
        public string? FullName { get; set; }

        [MaxLength(255)]
        [Column("email")]
        public string? Email { get; set; }

        [Column("visits")]
        public int Visits { get; set; } = 0;

        [Column("total_spent", TypeName = "decimal(12, 2)")]
        public decimal TotalSpent { get; set; } = 0;

        [MaxLength(50)]
        [Column("tier")]
        public string? Tier { get; set; } = "new";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;


        public ICollection<Order>? Orders { get; set; }
        public ICollection<Reservation>? Reservations { get; set; }
    }
}
