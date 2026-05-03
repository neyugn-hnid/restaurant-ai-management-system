using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace server.Modal
{
    [Table("products")]
    public class Product
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("category_id")]
        public int CategoryId { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("name")]
        public string? Name { get; set; }

        [Required]
        [Column("price", TypeName = "decimal(12, 2)")]
        public decimal Price { get; set; }

        [MaxLength(255)]
        [Column("image_url")]
        public string? ImageUrl { get; set; }

        [Column("description", TypeName = "text")]
        public string? Description { get; set; }

        [Column("status")]
        public ProductStatus Status { get; set; } = ProductStatus.Active;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;


        [ForeignKey(nameof(CategoryId))]
        public Category? Category { get; set; }

        public ICollection<OrderItem>? OrderItems { get; set; }
    }
}
