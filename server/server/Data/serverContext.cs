using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using server.Infrastructure;
using server.Modal;

namespace server.Data
{
    public class serverContext : DbContext
    {
        public serverContext (DbContextOptions<serverContext> options)
            : base(options)
        {
        }

        public DbSet<server.Modal.Category> Category { get; set; } = default!;
        public DbSet<server.Modal.Product> Product { get; set; } = default!;
        public DbSet<server.Modal.OrderItem> OrderItem { get; set; } = default!;
        public DbSet<server.Modal.Account> Account { get; set; } = default!;
        public DbSet<server.Modal.Customer> Customer { get; set; } = default!;
        public DbSet<server.Modal.RestaurantTable> RestaurantTable { get; set; } = default!;
        public DbSet<server.Modal.Reservation> Reservation { get; set; } = default!;
        public DbSet<server.Modal.Order> Order { get; set; } = default!;
        public DbSet<server.Modal.PaymentSetting> PaymentSetting { get; set; } = default!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Account>()
                .Property(entity => entity.Status)
                .HasConversion(new EnumMemberValueConverter<AccountStatus>())
                .HasMaxLength(50);

            modelBuilder.Entity<Product>()
                .Property(entity => entity.Status)
                .HasConversion(new EnumMemberValueConverter<ProductStatus>())
                .HasMaxLength(50);

            modelBuilder.Entity<Order>()
                .Property(entity => entity.Status)
                .HasConversion(new EnumMemberValueConverter<OrderStatus>())
                .HasMaxLength(50);

            modelBuilder.Entity<Order>()
                .Property(entity => entity.PaymentStatus)
                .HasConversion(new EnumMemberValueConverter<PaymentStatus>())
                .HasMaxLength(50);

            modelBuilder.Entity<Reservation>()
                .Property(entity => entity.Status)
                .HasConversion(new EnumMemberValueConverter<ReservationStatus>())
                .HasMaxLength(50);

            modelBuilder.Entity<RestaurantTable>()
                .Property(entity => entity.Status)
                .HasConversion(new EnumMemberValueConverter<RestaurantTableStatus>())
                .HasMaxLength(50);
        }
    }
}
