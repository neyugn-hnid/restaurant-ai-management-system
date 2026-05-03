using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Modal
{
    [Table("accounts")]
    public class Account
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("username")]
        public string? Username { get; set; }

        [MaxLength(255)]
        [Column("password_hash")]
        public string? PasswordHash { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("full_name")]
        public string? FullName { get; set; }

        [MaxLength(50)]
        [Column("role")]
        public string? Role { get; set; } = "staff";

        [Column("status")]
        public AccountStatus Status { get; set; } = AccountStatus.Active;

        [Column("last_login")]
        public DateTime? LastLogin { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;


        public ICollection<Order>? Orders { get; set; }
    }
}
