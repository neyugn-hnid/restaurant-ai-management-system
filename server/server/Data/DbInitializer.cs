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
                    new Category { Name = "Món Khai Vị", Description = "The Starters", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Mì Ý & Risotto", Description = "Pasta & Risotto", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Nghệ Thuật Khói Lửa", Description = "Signature Steaks", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Hải Sản Tinh Túy", Description = "Premium Seafood", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Món Ăn Kèm", Description = "Side Dishes", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Dấu Ấn Ngọt Ngào", Description = "Desserts", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Thức Uống & Rượu Vang", Description = "Beverages & Wines", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Thực Đơn Chay", Description = "Vegetarian & Vegan", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Category { Name = "Món Đặc Biệt", Description = "Chef's Specials", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                };

                context.Category.AddRange(categories);
                await context.SaveChangesAsync();
            }

            // Seed products if none exist
            if (!await context.Product.AnyAsync())
            {
                var categories = await context.Category.ToListAsync();
                var khaiVi = categories.First(c => c.Name == "Món Khai Vị").Id;
                var myRisotto = categories.First(c => c.Name == "Mì Ý & Risotto").Id;
                var khóiLửa = categories.First(c => c.Name == "Nghệ Thuật Khói Lửa").Id;
                var haiSan = categories.First(c => c.Name == "Hải Sản Tinh Túy").Id;
                var anKem = categories.First(c => c.Name == "Món Ăn Kèm").Id;
                var ngotNgao = categories.First(c => c.Name == "Dấu Ấn Ngọt Ngào").Id;
                var doUong = categories.First(c => c.Name == "Thức Uống & Rượu Vang").Id;
                var chay = categories.First(c => c.Name == "Thực Đơn Chay").Id;
                var dacBiet = categories.First(c => c.Name == "Món Đặc Biệt").Id;

                var products = new[]
                {
                    new Product { Name = "Sò Điệp Hokkaido Áp Chảo", CategoryId = khaiVi, Price = 450000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400", Description = "Áp chảo bơ xém cạnh tinh tế, phục vụ kèm Puree súp lơ trắng mịn và sốt chanh vàng.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Foie Gras Pháp Xém Lửa", CategoryId = myRisotto, Price = 650000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400", Description = "Gan ngỗng Pháp thượng hạng phục vụ trên bánh mì nướng men chua cùng nụ tầm xuân.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Thăn Bò Tartare Nấm Truffle", CategoryId = khóiLửa, Price = 420000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400", Description = "Thăn bò Wagyu sống băm thủ công trộn cùng nấm Truffle đen, phủ lòng đỏ trứng cút.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Hàu Nước Sâu Mignonette", CategoryId = haiSan, Price = 580000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400", Description = "6 con hàu sống mọng nước vớt từ biển lạnh, dùng kèm sốt giấm hành tím Mignonette cổ điển.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Súp Kem Nấm Rừng Bọc Bột", CategoryId = anKem, Price = 280000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400", Description = "Súp nấm rừng đẫm vị Truffle ủ dưới lớp vỏ bánh nướng Puff pastry phồng giòn rụm.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Salad Hoa Quả Burrata", CategoryId = khaiVi, Price = 320000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400", Description = "Phô mai Burrata tươi bọc dâu tây, cà chua bi nhiều sắc màu và đẫm sốt giấm Balsamic.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Risotto Nấm Truffle", CategoryId = myRisotto, Price = 580000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400", Description = "Cơm Ý nấu chậm nấu cùng phô mai, nấm hương mềm và cồi sò điệp Hokkaido xém lửa.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Tagliatelle Tôm Hùm Khói", CategoryId = myRisotto, Price = 620000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400", Description = "Mì dẹt làm tay, quyện trong nước dùng tôm hùm, phủ Grana Padano 24 tháng tuổi.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Ravioli Phô Mai Chân Vịt", CategoryId = myRisotto, Price = 350000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400", Description = "Mì gói nhân phô mai béo ngậy, sốt bơ cháy vàng, lá xô thơm cùng hạt óc chó.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Rigatoni Bò Wagyu Hầm", CategoryId = myRisotto, Price = 480000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400", Description = "Bò Wagyu hầm nhừ rục 12 tiếng cùng cà chua San Marzano đặc trưng, thấm đậm từng ống mì.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Spaghetti Carbonara Guanciale", CategoryId = myRisotto, Price = 320000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400", Description = "Công thức nguyên bản nước Ý với thịt heo muối Guanciale, lòng đỏ trứng và phô mai Pecorino.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Lasagna Bò Bằm Phô Mai", CategoryId = myRisotto, Price = 380000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1414235077428-33898bd122b5?auto=format&fit=crop&q=80&w=400", Description = "Mì Ý ngàn lớp nướng lò đẫm sốt thịt bò băm Bolognese cổ điển, phô mai Mozzarella kéo sợi.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Wagyu Tomahawk Mbs 8-9", CategoryId = khóiLửa, Price = 4250000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400", Description = "Rìu sườn hoành tráng phục vụ trực tiếp trên đá tảng nóng, vảy vàng rực rỡ (Dành cho 2 người).", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Thăn Ngoại Wagyu A5", CategoryId = khóiLửa, Price = 1950000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400", Description = "Vân mỡ cẩm thạch hoàn hảo, nướng nhiệt độ kỷ lục tạo lớp ngoài giòn, mọng mềm bên trong.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Thăn Nội Black Angus", CategoryId = khóiLửa, Price = 1450000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400", Description = "Lõi nạc vai mềm mại không chút mỡ, sốt nấm gan ngỗng Pháp đậm đà.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Thăn Lưng Ribeye USDA", CategoryId = khóiLửa, Price = 1100000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&q=80&w=400", Description = "Bò Mỹ hạng Prime nướng nguyên bản thủ công, mọng nước và đượm mùi than bích.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Sườn Bò Rút Xương Hầm", CategoryId = khóiLửa, Price = 890000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&q=80&w=400", Description = "Góc sườn dày hầm 12 giờ cho đến khi rục mềm, kèm nước sốt vang đỏ cô đặc.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Sườn Cừu New Zealand", CategoryId = khóiLửa, Price = 1200000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=400", Description = "Sườn cừu non đút lò hun khói gỗ sồi, dùng với sốt bạc hà thanh mát đặc biệt.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Tôm Hùm Alaska Đút Lò", CategoryId = haiSan, Price = 1850000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400", Description = "Chẻ đôi nguyên con nướng phô mai Gruyere Thụy Sỹ, xông khói gỗ tại bàn.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cá Tuyết Nam Cực (Cod)", CategoryId = haiSan, Price = 850000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400", Description = "Phi lê trắng ngần, áp chảo bơ chanh, đính vụn bánh mì tỏi giòn tan.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cua Hoàng Đế (100g)", CategoryId = haiSan, Price = 450000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400", Description = "Hấp sâm panh tao nhã, lột vỏ phục vụ kèm sốt Cajun bơ cay miền Nam nước Mỹ.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cá Hồi Na-Uy Hoàng Gia", CategoryId = haiSan, Price = 550000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400", Description = "Lườn béo ủ tương Kombu, áp chảo nhiệt lớn, ăn với trứng cá tầm đen Caviar.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Bạch Tuộc Galician Tỏi", CategoryId = haiSan, Price = 690000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400", Description = "Xúc tu khổng lồ khò qua lửa than, dai mềm sần sật pha chút sốt bơ ớt paprika hun khói.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Vẹm Xanh Sốt Vang Trắng", CategoryId = haiSan, Price = 420000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400", Description = "Vẹm tươi rói New Zealand hầm nhanh trong nước cốt vang trắng chardonnay và rau mùi tây.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Khoai Tây Nghiền Truffle", CategoryId = anKem, Price = 150000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400", Description = "Khoai tây đánh bơ Pháp bông xốp, dậy mùi thơm nồng từ dầu nấm Truffle.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Măng Tây Xào Bơ Tỏi", CategoryId = anKem, Price = 180000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400", Description = "Đọt măng non tơ thanh giòn, xào chớp nhoáng với bơ giữ độ mọng nước.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cải Bó Xôi Kem Phô Mai", CategoryId = anKem, Price = 140000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400", Description = "Trứ danh Steakhouse, rau bina xay nhuyễn tan chảy với kem béo, nhục đậu khấu.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Nấm Rừng Xào Vang Đỏ", CategoryId = anKem, Price = 160000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400", Description = "Các loại nấm đun kỹ cùng rượu vang đỏ tôn vị ngọt, lý tưởng ăn kèm thịt đỏ.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Mac & Cheese Tôm Hùm", CategoryId = anKem, Price = 350000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1414235077428-33898bd122b5?auto=format&fit=crop&q=80&w=400", Description = "Mì ống đút lò với phô mai bào Cheddar tan chảy và thịt tôm hùm xé nhỏ thượng lưu.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Khoai Tây Chiên Pháp Truffle", CategoryId = anKem, Price = 120000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400", Description = "Khoai tây chiên giòn tan rắc ngập bột nấm Truffle và phô mai Parmesan vụn.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Bánh Lava Cacao Grand Cru", CategoryId = ngotNgao, Price = 450000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400", Description = "Socola dung nham 72% đi kèm kem vani lạnh béo mượt, cân bằng độ đắng.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Tiramisu Kahlua Đế Trắng", CategoryId = ngotNgao, Price = 320000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&q=80&w=400", Description = "Mascarpone bông mịn với rượu Kahlua cà phê Espresso và bánh quy Ý.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Panna Cotta Sốt Dâu Rừng", CategoryId = ngotNgao, Price = 180000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&q=80&w=400", Description = "Thạch kem sữa tươi mượt mà tan ngay góc miệng, rải sốt dâu rừng đỏ mọng lấp lánh.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Kem Tuyết Sorbet Thảo Mộc", CategoryId = ngotNgao, Price = 120000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=400", Description = "Sorbet chanh leo mát lạnh giải nghén cực rát sau một bữa thịt lớn quá nhiệt lượng.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Phô Mai Nướng Basque", CategoryId = ngotNgao, Price = 250000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400", Description = "Bánh phô mai nướng xém mặt đặc kịch bản Tây Ban Nha, thơm hương Caramel sữa.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Creme Brulee Madagascar", CategoryId = ngotNgao, Price = 190000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400", Description = "Lớp đường khò giòn tan bể gãy rào rạo, che đậy trứng sữa và vani nguyên hạt sâu thẳm.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Vang Đỏ Chateau Margaux", CategoryId = doUong, Price = 880000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400", Description = "Thưởng thức Premier Grand Cru Classé vang danh Pháp theo ly. Hương dâu tằm, xì gà.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Sâm-panh Dom Pérignon", CategoryId = doUong, Price = 1250000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400", Description = "Khai tiệc bằng ly champagne xa hoa bọt sủi tăm, hương bánh mì nướng và men thoang thoảng.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Signature Cocktail", CategoryId = doUong, Price = 320000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400", Description = "Pha chế nền Bourbon hun khói gỗ keo tự nhiên, rắc xíu muối để đánh thức khứu giác.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Trà Thảo Mộc Hoa Cúc", CategoryId = doUong, Price = 120000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400", Description = "Tách trà ấm thanh tao sử dụng nụ cúc vàng thu hoạch sớm ngâm cùng kỷ tử và táo đỏ.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Mocktail Nhiệt Đới", CategoryId = doUong, Price = 150000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400", Description = "Sự lôi cuốn không cồn từ những tép nước bưởi ép cùng dứa vàng, giải khát bất tận.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cà Phê Espresso Đậm Mùi", CategoryId = doUong, Price = 95000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400", Description = "Arabica pha máy tiêu chuẩn cùng độ đắng cực sâu vực dậy tinh thần tỉnh táo cuối ngày.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Salad Lúa Mạch Thảo Mộc", CategoryId = chay, Price = 180000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400", Description = "Hạt lúa mạch nấu mềm trộn rau mầm, bơ quả và sốt chanh mật hoa dừa thanh mát.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Súp Bí Đỏ Hạt Nướng", CategoryId = chay, Price = 150000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400", Description = "Bí đỏ nướng than nghiền mịn cùng kem hạt điều, điểm xuyết hạt bí rang muối.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Risotto Nấm Thông", CategoryId = chay, Price = 320000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400", Description = "Cơm Risotto Ý phô mai chay từ hạt macca, ninh thô trong nước cốt nấm quý.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Steak Nấm Đùi Gà", CategoryId = chay, Price = 250000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400", Description = "Bản đùi gà lớn khía vảy rồng, áp chảo mỡ hành thảo mộc với cấu trúc dai giòn.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cà Tím Áp Chảo Olive", CategoryId = chay, Price = 120000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1414235077428-33898bd122b5?auto=format&fit=crop&q=80&w=400", Description = "Cà tím Nhật lát dày áp chảo rắc muối hồng Himalaya, rưới sốt dầu Olive.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Đậu Hũ Sốt Nấm Truffle", CategoryId = chay, Price = 190000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400", Description = "Khối đậu hũ non chiên phồng xốp, thấm đẫm lớp sốt sánh quyện đậm hương Truffle đen.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Thăn Wagyu Cuộn Nấm", CategoryId = dacBiet, Price = 1200000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&q=80&w=400", Description = "Lõi thăn bò cuộn nấm bào ngư rừng, áp lửa than hồng nguyên tảng độc đáo.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Cá Hồi Hữu Cơ Hấp Rượu", CategoryId = dacBiet, Price = 750000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&q=80&w=400", Description = "Phi lê cá hồi hấp cách thủy vang trắng sủi tăm, nhốt giữ trọn vẹn vị biển tinh khôi.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Tôm Càng Cỡ Tướng Đút Lò", CategoryId = dacBiet, Price = 850000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=400", Description = "Sáu con tôm càng xanh tươi xẻ lưng, ủ phô mai con bò cười nướng vỉ lửa tự nhiên.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Đùi Cừu Hầm Vang Đỏ", CategoryId = dacBiet, Price = 1100000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400", Description = "Đùi cừu non hầm mềm rục xương cùng rượu Burgundy và rễ cây hương thảo.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Product { Name = "Ức Vịt Quay Sốt Mứt Cam", CategoryId = dacBiet, Price = 650000, Status = ProductStatus.Active, ImageUrl = "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400", Description = "Lớp vỏ da giòn tan, lớp mỡ thơm dịu, thớ nạc đỏ au rưới mứt cam chua ngọt hoàn mĩ.", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
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
