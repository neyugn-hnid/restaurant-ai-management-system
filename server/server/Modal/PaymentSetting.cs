using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Modal
{
    [Table("payment_settings")]
    public class PaymentSetting
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("bank_id")]
        public string? BankId { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("account_number")]
        public string? AccountNumber { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("account_name")]
        public string? AccountName { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
