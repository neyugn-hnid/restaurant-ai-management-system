using Microsoft.EntityFrameworkCore;
using server.Modal;

namespace server.Data
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(serverContext context)
        {
            // Ensure database is created
            await context.Database.EnsureCreatedAsync();

            // Seed admin account if no accounts exist
            if (!await context.Account.AnyAsync())
            {
                var adminAccount = new Account
                {
                    Username = "admin",
                    FullName = "Quản trị viên",
                    Role = "Admin",
                    Status = AccountStatus.Active,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var staffAccount = new Account
                {
                    Username = "staff01",
                    FullName = "Nhân viên 01",
                    Role = "Staff",
                    Status = AccountStatus.Active,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("staff123"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var managerAccount = new Account
                {
                    Username = "manager",
                    FullName = "Quản lý",
                    Role = "Manager",
                    Status = AccountStatus.Active,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("manager123"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                context.Account.AddRange(adminAccount, staffAccount, managerAccount);
                await context.SaveChangesAsync();
            }

            // Seed categories if none exist
            if (!await context.Category.AnyAsync())
            {
                var categories = new[]
                {
                    new Category { Name = "Khai vị", Description = "Món khai vị", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Món chính", Description = "Món chính", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Tráng miệng", Description = "Món tráng miệng", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Đồ uống", Description = "Đồ uống", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Lẩu & Nướng", Description = "Lẩu và nướng", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                };

                context.Category.AddRange(categories);
                await context.SaveChangesAsync();
            }

            // Seed products if none exist
            if (!await context.Product.AnyAsync())
            {
                var categories = await context.Category.ToListAsync();
                var khaiVi = categories.First(c => c.Name == "Khai vị").Id;
                var monChinh = categories.First(c => c.Name == "Món chính").Id;
                var trangMieng = categories.First(c => c.Name == "Tráng miệng").Id;
                var doUong = categories.First(c => c.Name == "Đồ uống").Id;
                var lauNuong = categories.First(c => c.Name == "Lẩu & Nướng").Id;

                var products = new[]
                {
                    new Product { Name = "Gỏi cuốn tôm thịt", CategoryId = khaiVi, Price = 55000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Chả giò rế", CategoryId = khaiVi, Price = 45000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Súp cua", CategoryId = khaiVi, Price = 35000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cơm tấm sườn nướng", CategoryId = monChinh, Price = 65000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Bún bò Huế", CategoryId = monChinh, Price = 60000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cơm gà xối mỡ", CategoryId = monChinh, Price = 70000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Bò lúc lắc", CategoryId = monChinh, Price = 120000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Lẩu thái", CategoryId = lauNuong, Price = 250000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Bò nướng lá lốt", CategoryId = lauNuong, Price = 150000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Chè khúc bạch", CategoryId = trangMieng, Price = 35000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Trái cây dĩa", CategoryId = trangMieng, Price = 40000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cà phê sữa đá", CategoryId = doUong, Price = 30000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Trà đào", CategoryId = doUong, Price = 35000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Nước ép cam", CategoryId = doUong, Price = 40000, Status = ProductStatus.Active, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                };

                context.Product.AddRange(products);
                await context.SaveChangesAsync();
            }

            // Seed tables if none exist
            if (!await context.RestaurantTable.AnyAsync())
            {
                var tables = new List<RestaurantTable>();
                string[] zones = { "Trong nhà", "Ngoài trời", "Tầng 1", "Tầng 2", "Phòng VIP", "Khu chung" };
                int[] capacities = { 2, 4, 4, 6, 6, 8 };

                for (int z = 0; z < zones.Length; z++)
                {
                    for (int t = 1; t <= 4; t++)
                    {
                        tables.Add(new RestaurantTable
                        {
                            Name = $"Bàn {z * 4 + t}",
                            Zone = zones[z],
                            Capacity = capacities[z],
                            Status = RestaurantTableStatus.Available,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }

                context.RestaurantTable.AddRange(tables);
                await context.SaveChangesAsync();
            }
        }
    }
}
