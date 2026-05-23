-- SQL Server Database Schema for L'Héritage Restaurant

-- 1. Categories Table
CREATE TABLE Categories (
    id INT PRIMARY KEY,
    _id VARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255),
    count INT DEFAULT 0,
    status NVARCHAR(50)
);

-- 2. Products Table
CREATE TABLE Products (
    id INT PRIMARY KEY,
    categoryId INT,
    name NVARCHAR(150) NOT NULL,
    price DECIMAL(18, 2) NOT NULL,
    status NVARCHAR(50),
    image NVARCHAR(MAX),
    description NVARCHAR(MAX),
    CONSTRAINT FK_Products_Categories FOREIGN KEY (categoryId) REFERENCES Categories(id)
);

-- 3. Accounts Table
CREATE TABLE Accounts (
    id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    fullName NVARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE()
);

-- 4. Customers Table 
CREATE TABLE Customers (
    id VARCHAR(50) PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    name NVARCHAR(100) NOT NULL,
    full_name NVARCHAR(100),
    email VARCHAR(150),
    visits INT DEFAULT 0,
    total_spent DECIMAL(18, 2) DEFAULT 0,
    tier VARCHAR(50),
    created_at DATETIME DEFAULT GETDATE()
);

-- 5. Tables Table
CREATE TABLE RestaurantTables (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255),
    zone NVARCHAR(100),
    capacity INT DEFAULT 4,
    status NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE()
);

-- 6. Reservations Table
CREATE TABLE Reservations (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_id VARCHAR(50),
    table_id INT,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    guest_count INT NOT NULL,
    status NVARCHAR(50),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Reservations_Customers FOREIGN KEY (customer_id) REFERENCES Customers(id),
    CONSTRAINT FK_Reservations_Tables FOREIGN KEY (table_id) REFERENCES RestaurantTables(id)
);

-- 7. Orders Table
CREATE TABLE Orders (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50),
    customerName NVARCHAR(100),
    customerPhone VARCHAR(20),
    account_id INT,
    table_id VARCHAR(50),
    time TIME,
    date DATE,
    subtotal DECIMAL(18, 2),
    discount DECIMAL(18, 2) DEFAULT 0,
    total DECIMAL(18, 2),
    status NVARCHAR(50),
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Orders_Customers FOREIGN KEY (customer_id) REFERENCES Customers(id),
    CONSTRAINT FK_Orders_Accounts FOREIGN KEY (account_id) REFERENCES Accounts(id),
    CONSTRAINT FK_Orders_Tables FOREIGN KEY (table_id) REFERENCES RestaurantTables(id)
);

-- 8. Order Items Table
CREATE TABLE OrderItems (
    id INT PRIMARY KEY IDENTITY(1,1),
    order_id VARCHAR(50),
    product_id INT,
    name NVARCHAR(150),
    price DECIMAL(18, 2),
    quantity INT,
    total_price DECIMAL(18, 2),
    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (order_id) REFERENCES Orders(id),
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (product_id) REFERENCES Products(id)
);

-- INSERT MOCK DATA

-- Categories
INSERT INTO Categories ( name, description, created_at, updated_at) VALUES
( N'Món Khai Vị', N'The Starters', GETDATE(), GETDATE()),
( N'Mì Ý & Risotto', N'Pasta & Risotto', GETDATE(), GETDATE()),
( N'Nghệ Thuật Khói Lửa', N'Signature Steaks', GETDATE(), GETDATE()),
( N'Hải Sản Tinh Túy', N'Premium Seafood', GETDATE(), GETDATE()),
( N'Món Ăn Kèm', N'Side Dishes', GETDATE(), GETDATE()),
( N'Dấu Ấn Ngọt Ngào', N'Desserts', GETDATE(), GETDATE()),
( N'Thức Uống & Rượu Vang', N'Beverages & Wines', GETDATE(), GETDATE()),
( N'Thực Đơn Chay', N'Vegetarian & Vegan', GETDATE(), GETDATE()),
( N'Món Đặc Biệt', N'Chef''s Specials', GETDATE(), GETDATE());

-- Products
INSERT INTO Products (category_id, name, price, status, image_url, description, created_at, updated_at) VALUES
(1, N'Sò Điệp Hokkaido Áp Chảo', 450000, N'Còn hàng', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400', N'Áp chảo bơ xém cạnh tinh tế, phục vụ kèm Puree súp lơ trắng mịn và sốt chanh vàng.',GETDATE(), GETDATE()),
(2, N'Foie Gras Pháp Xém Lửa', 650000, N'Còn hàng', 'https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400', N'Gan ngỗng Pháp thượng hạng phục vụ trên bánh mì nướng men chua cùng nụ tầm xuân.',GETDATE(), GETDATE()),
(3, N'Thăn Bò Tartare Nấm Truffle', 420000, N'Còn hàng', 'https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400', N'Thăn bò Wagyu sống băm thủ công trộn cùng nấm Truffle đen, phủ lòng đỏ trứng cút.',GETDATE(), GETDATE()),
(4, N'Hàu Nước Sâu Mignonette', 580000, N'Còn hàng', 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400', N'6 con hàu sống mọng nước vớt từ biển lạnh, dùng kèm sốt giấm hành tím Mignonette cổ điển.',GETDATE(), GETDATE()),
(5, N'Súp Kem Nấm Rừng Bọc Bột', 280000, N'Còn hàng', 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=40<PASSWORD>', N'Súp nấm rừng đẫm vị Truffle ủ dưới lớp vỏ bánh nướng Puff pastry phồng giòn rụm.',GETDATE(), GETDATE()),
(1, N'Salad Hoa Quả Burrata', 320000, N'Còn hàng', 'https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400', N'Phô mai Burrata tươi bọc dâu tây, cà chua bi nhiều sắc màu và đẫm sốt giấm Balsamic.',GETDATE(), GETDATE()),
(2, N'Risotto Nấm Truffle', 580000, N'Còn hàng', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400', N'Cơm Ý nấu chậm nấu cùng phô mai, nấm hương mềm và cồi sò điệp Hokkaido xém lửa.',GETDATE(), GETDATE()),
(2, N'Tagliatelle Tôm Hùm Khói', 620000, N'Còn hàng', 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400', N'Mì dẹt làm tay, quyện trong nước dùng tôm hùm, phủ Grana Padano 24 tháng tuổi.',GETDATE(), GETDATE()),
(2, N'Ravioli Phô Mai Chân Vịt', 350000, N'Còn hàng', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400', N'Mì gói nhân phô mai béo ngậy, sốt bơ cháy vàng, lá xô thơm cùng hạt óc chó.',GETDATE(), GETDATE()),
(2, N'Rigatoni Bò Wagyu Hầm', 480000, N'Còn hàng', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400', N'Bò Wagyu hầm nhừ rục 12 tiếng cùng cà chua San Marzano đặc trưng, thấm đậm từng ống mì.',GETDATE(), GETDATE()),
(2, N'Spaghetti Carbonara Guanciale', 320000, N'Còn hàng', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400', N'Công thức nguyên bản nước Ý với thịt heo muối Guanciale, lòng đỏ trứng và phô mai Pecorino.',GETDATE(), GETDATE()),
(2, N'Lasagna Bò Bằm Phô Mai', 380000, N'Còn hàng', 'https://images.unsplash.com/photo-1414235077428-33898bd122b5?auto=format&fit=crop&q=80&w=400', N'Mì Ý ngàn lớp nướng lò đẫm sốt thịt bò băm Bolognese cổ điển, phô mai Mozzarella kéo sợi.',GETDATE(), GETDATE()),
(3, N'Wagyu Tomahawk Mbs 8-9', 4250000, N'Còn hàng', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400', N'Rìu sườn hoành tráng phục vụ trực tiếp trên đá tảng nóng, vảy vàng rực rỡ (Dành cho 2 người).',GETDATE(), GETDATE()),
(3, N'Thăn Ngoại Wagyu A5', 1950000, N'Còn hàng', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400', N'Vân mỡ cẩm thạch hoàn hảo, nướng nhiệt độ kỷ lục tạo lớp ngoài giòn, mọng mềm bên trong.',GETDATE(), GETDATE()),
(3, N'Thăn Nội Black Angus', 1450000, N'Còn hàng', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400', N'Lõi nạc vai mềm mại không chút mỡ, sốt nấm gan ngỗng Pháp đậm đà.',GETDATE(), GETDATE()),
(3, N'Thăn Lưng Ribeye USDA', 1100000, N'Còn hàng', 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&q=80&w=400', N'Bò Mỹ hạng Prime nướng nguyên bản thủ công, mọng nước và đượm mùi than bích.',GETDATE(), GETDATE()),
(3, N'Sườn Bò Rút Xương Hầm', 890000, N'Còn hàng', 'https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&q=80&w=400', N'Góc sườn dày hầm 12 giờ cho đến khi rục mềm, kèm nước sốt vang đỏ cô đặc.',GETDATE(), GETDATE()),
(3, N'Sườn Cừu New Zealand', 1200000, N'Còn hàng', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=400', N'Sườn cừu non đút lò hun khói gỗ sồi, dùng với sốt bạc hà thanh mát đặc biệt.',GETDATE(), GETDATE()),
(4, N'Tôm Hùm Alaska Đút Lò', 1850000, N'Còn hàng', 'https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400', N'Chẻ đôi nguyên con nướng phô mai Gruyere Thụy Sỹ, xông khói gỗ tại bàn.',GETDATE(), GETDATE()),
(4, N'Cá Tuyết Nam Cực (Cod)', 850000, N'Còn hàng', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400', N'Phi lê trắng ngần, áp chảo bơ chanh, đính vụn bánh mì tỏi giòn tan.',GETDATE(), GETDATE()),
(4, N'Cua Hoàng Đế (100g)', 450000, N'Còn hàng', 'https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400', N'Hấp sâm panh tao nhã, lột vỏ phục vụ kèm sốt Cajun bơ cay miền Nam nước Mỹ.',GETDATE(), GETDATE()),
(4, N'Cá Hồi Na-Uy Hoàng Gia', 550000, N'Còn hàng', 'https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400', N'Lườn béo ủ tương Kombu, áp chảo nhiệt lớn, ăn với trứng cá tầm đen Caviar.',GETDATE(), GETDATE()),
(4, N'Bạch Tuộc Galician Tỏi', 690000, N'Còn hàng', 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400', N'Xúc tu khổng lồ khò qua lửa than, dai mềm sần sật pha chút sốt bơ ớt paprika hun khói.',GETDATE(), GETDATE()),
(4, N'Vẹm Xanh Sốt Vang Trắng', 420000, N'Còn hàng', 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400', N'Vẹm tươi rói New Zealand hầm nhanh trong nước cốt vang trắng chardonnay và rau mùi tây.',GETDATE(), GETDATE()),
(5, N'Khoai Tây Nghiền Truffle', 150000, N'Còn hàng', 'https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400', N'Khoai tây đánh bơ Pháp bông xốp, dậy mùi thơm nồng từ dầu nấm Truffle.',GETDATE(), GETDATE()),
(5, N'Măng Tây Xào Bơ Tỏi', 180000, N'Còn hàng', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400', N'Đọt măng non tơ thanh giòn, xào chớp nhoáng với bơ giữ độ mọng nước.',GETDATE(), GETDATE()),
(5, N'Cải Bó Xôi Kem Phô Mai', 140000, N'Còn hàng', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400', N'Trứ danh Steakhouse, rau bina xay nhuyễn tan chảy với kem béo, nhục đậu khấu.',GETDATE(), GETDATE()),
(5, N'Nấm Rừng Xào Vang Đỏ', 160000, N'Còn hàng', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400', N'Các loại nấm đun kỹ cùng rượu vang đỏ tôn vị ngọt, lý tưởng ăn kèm thịt đỏ.',GETDATE(), GETDATE()),
(5, N'Mac & Cheese Tôm Hùm', 350000, N'Còn hàng', 'https://images.unsplash.com/photo-1414235077428-33898bd122b5?auto=format&fit=crop&q=80&w=400', N'Mì ống đút lò với phô mai bào Cheddar tan chảy và thịt tôm hùm xé nhỏ thượng lưu.',GETDATE(), GETDATE()),
(5, N'Khoai Tây Chiên Pháp Truffle', 120000, N'Còn hàng', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400', N'Khoai tây chiên giòn tan rắc ngập bột nấm Truffle và phô mai Parmesan vụn.',GETDATE(), GETDATE()),
(6, N'Bánh Lava Cacao Grand Cru', 450000, N'Còn hàng', 'https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400', N'Socola dung nham 72% đi kèm kem vani lạnh béo mượt, cân bằng độ đắng.',GETDATE(), GETDATE()),
(6, N'Tiramisu Kahlua Đế Trắng', 320000, N'Còn hàng', 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&q=80&w=400', N'Mascarpone bông mịn với rượu Kahlua cà phê Espresso và bánh quy Ý.',GETDATE(), GETDATE()),
(6, N'Panna Cotta Sốt Dâu Rừng', 180000, N'Còn hàng', 'https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&q=80&w=400', N'Thạch kem sữa tươi mượt mà tan ngay góc miệng, rải sốt dâu rừng đỏ mọng lấp lánh.',GETDATE(), GETDATE()),
(6, N'Kem Tuyết Sorbet Thảo Mộc', 120000, N'Còn hàng', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=400', N'Sorbet chanh leo mát lạnh giải nghén cực rát sau một bữa thịt lớn quá nhiệt lượng.',GETDATE(), GETDATE()),
(6, N'Phô Mai Nướng Basque', 250000, N'Còn hàng', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400', N'Bánh phô mai nướng xém mặt đặc kịch bản Tây Ban Nha, thơm hương Caramel sữa.',GETDATE(), GETDATE()),
(6, N'Creme Brulee Madagascar', 190000, N'Còn hàng', 'https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400', N'Lớp đường khò giòn tan bể gãy rào rạo, che đậy trứng sữa và vani nguyên hạt sâu thẳm.',GETDATE(), GETDATE()),
(7, N'Vang Đỏ Chateau Margaux', 880000, N'Còn hàng', 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400', N'Thưởng thức Premier Grand Cru Classé vang danh Pháp theo ly. Hương dâu tằm, xì gà.',GETDATE(), GETDATE()),
(7, N'Sâm-panh Dom Pérignon', 1250000, N'Còn hàng', 'https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400', N'Khai tiệc bằng ly champagne xa hoa bọt sủi tăm, hương bánh mì nướng và men thoang thoảng.',GETDATE(), GETDATE()),
(7, N'Signature Cocktail', 320000, N'Còn hàng', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400', N'Pha chế nền Bourbon hun khói gỗ keo tự nhiên, rắc xíu muối để đánh thức khứu giác.',GETDATE(), GETDATE()),
(7, N'Trà Thảo Mộc Hoa Cúc', 120000, N'Còn hàng', 'https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400', N'Tách trà ấm thanh tao sử dụng nụ cúc vàng thu hoạch sớm ngâm cùng kỷ tử và táo đỏ.',GETDATE(), GETDATE()),
(7, N'Mocktail Nhiệt Đới', 150000, N'Còn hàng', 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400', N'Sự lôi cuốn không cồn từ những tép nước bưởi ép cùng dứa vàng, giải khát bất tận.',GETDATE(), GETDATE()),
(7, N'Cà Phê Espresso Đậm Mùi', 95000, N'Còn hàng', 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400', N'Arabica pha máy tiêu chuẩn cùng độ đắng cực sâu vực dậy tinh thần tỉnh táo cuối ngày.',GETDATE(), GETDATE()),
(8, N'Salad Lúa Mạch Thảo Mộc', 180000, N'Còn hàng', 'https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400', N'Hạt lúa mạch nấu mềm trộn rau mầm, bơ quả và sốt chanh mật hoa dừa thanh mát.',GETDATE(), GETDATE()),
(8, N'Súp Bí Đỏ Hạt Nướng', 150000, N'Còn hàng', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400', N'Bí đỏ nướng than nghiền mịn cùng kem hạt điều, điểm xuyết hạt bí rang muối.',GETDATE(), GETDATE()),
(8, N'Risotto Nấm Thông', 320000, N'Còn hàng', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400', N'Cơm Risotto Ý phô mai chay từ hạt macca, ninh thô trong nước cốt nấm quý.',GETDATE(), GETDATE()),
(8, N'Steak Nấm Đùi Gà', 250000, N'Còn hàng', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400', N'Bản đùi gà lớn khía vảy rồng, áp chảo mỡ hành thảo mộc với cấu trúc dai giòn.',GETDATE(), GETDATE()),
(8, N'Cà Tím Áp Chảo Olive', 120000, N'Còn hàng', 'https://images.unsplash.com/photo-1414235077428-33898bd122b5?auto=format&fit=crop&q=80&w=400', N'Cà tím Nhật lát dày áp chảo rắc muối hồng Himalaya, rưới sốt dầu Olive.',GETDATE(), GETDATE()),
(8, N'Đậu Hũ Sốt Nấm Truffle', 190000, N'Còn hàng', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400', N'Khối đậu hũ non chiên phồng xốp, thấm đẫm lớp sốt sánh quyện đậm hương Truffle đen.',GETDATE(), GETDATE()),
(9, N'Thăn Wagyu Cuộn Nấm', 1200000, N'Còn hàng', 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&q=80&w=400', N'Lõi thăn bò cuộn nấm bào ngư rừng, áp lửa than hồng nguyên tảng độc đáo.',GETDATE(), GETDATE()),
(9, N'Cá Hồi Hữu Cơ Hấp Rượu', 750000, N'Còn hàng', 'https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&q=80&w=400', N'Phi lê cá hồi hấp cách thủy vang trắng sủi tăm, nhốt giữ trọn vẹn vị biển tinh khôi.',GETDATE(), GETDATE()),
(9, N'Tôm Càng Cỡ Tướng Đút Lò', 850000, N'Còn hàng', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=400', N'Sáu con tôm càng xanh tươi xẻ lưng, ủ phô mai con bò cười nướng vỉ lửa tự nhiên.',GETDATE(), GETDATE()),
(9, N'Súp Bong Bóng Ngư Vi', 1500000, N'Còn hàng', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400', N'Bát súp vi cá mập chay nấu cùng bong bóng cá thiêng liêng, nghệ thuật yến tiệc Châu Á.',GETDATE(), GETDATE()),
(9, N'Đùi Cừu Hầm Vang Đỏ', 1100000, N'Còn hàng', 'https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400', N'Đùi cừu non hầm mềm rục xương cùng rượu Burgundy và rễ cây hương thảo.',GETDATE(), GETDATE()),
(9, N'Ức Vịt Quay Sốt Mứt Cam', 650000, N'Còn hàng', 'https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400', N'Lớp vỏ da giòn tan, lớp mỡ thơm dịu, thớ nạc đỏ au rưới mứt cam chua ngọt hoàn mĩ.',GETDATE(), GETDATE());

-- Accounts
SET IDENTITY_INSERT Accounts ON;
INSERT INTO Accounts (username, password_hash, fullName, role, status, last_login, created_at, updated_at) VALUES 
('admin', '$2a$12$QRrwULUhWU37SUI8P1dMdeuh6EPU3C61wuIYp8L/DZx62mdhjbX.q', N'Quản trị viên', 'admin', N'Hoạt động', GETDATE(), GETDATE(), GETDATE()),
('manager', '$2a$12$BY9wYnTLmo7PYjI.VLEdv.IhoJpxXORFGzIzPAYiaFIdq2xotUCU.', N'Quản lý cửa hàng', 'manager', N'Hoạt động', GETDATE(), GETDATE(), GETDATE()),
('nhanvien1', '$2a$12$BY9wYnTLmo7PYjI.VLEdv.IhoJpxXORFGzIzPAYiaFIdq2xotUCU.', N'Lê Văn C', 'staff', N'Hoạt động', GETDATE(), GETDATE(), GETDATE()),
('nhanvien2', '$2a$12$BY9wYnTLmo7PYjI.VLEdv.IhoJpxXORFGzIzPAYiaFIdq2xotUCU.', N'Phạm Thị D', 'staff', N'Hoạt động', GETDATE(), GETDATE(), GETDATE()),
('nhanvien3', '$2a$12$BY9wYnTLmo7PYjI.VLEdv.IhoJpxXORFGzIzPAYiaFIdq2xotUCU.', N'Nguyễn Thị E', 'staff', N'Hoạt động', GETDATE(), GETDATE(), GETDATE());
SET IDENTITY_INSERT Accounts OFF;

-- Customers
INSERT INTO Customers (id, phone, full_name, email, visits, total_spent, tier, created_at, updated_at) VALUES
('KH101', '0901234567', N'Nguyễn Văn A', 'nguyenvana@gmail.com', 5, 15000000, 'gold', GETDATE(), GETDATE() ),
('KH102', '0912345678', N'Trần Thị B', 'tranthib@gmail.com', 1, 2450000, 'new', GETDATE(), GETDATE() ),
('KH103', '0987654321', N'Lê Hữu C', 'lehuuc@hoanglong.com', 12, 45000000, 'platinum', GETDATE(), GETDATE() ),
('KH104', '0933445566', N'Hoàng Đăng D', 'hoangdangd@gmail.com', 3, 8500000, 'silver', GETDATE(), GETDATE() ),
('KH105', '0977889900', N'Đỗ Mỹ E', 'domye@yahoo.com', 2, 3200000, 'new', GETDATE(), GETDATE() );

-- Table
INSERT INTO RestaurantTables (name, zone, capacity, status, created_at, updated_at) VALUES
(N'Bàn T101', N'Tầng 1', 4, N'Trống', GETDATE(), GETDATE()),
(N'Bàn T102', N'Tầng 1', 4, N'Trống', GETDATE(), GETDATE()),
(N'Bàn T103', N'Tầng 1', 2, N'Trống', GETDATE(), GETDATE()),
(N'Bàn T104', N'Tầng 1', 2, N'Trống', GETDATE(), GETDATE()),
(N'Bàn Sân vườn 1', N'Sân vườn', 6, N'Trống', GETDATE(), GETDATE()),
(N'Bàn Sân vườn 2', N'Sân vườn', 4, N'Trống', GETDATE(), GETDATE()),
(N'Bàn Khu VIP 1', N'Khu VIP', 8, N'Trống', GETDATE(), GETDATE()),
(N'Bàn Khu VIP 2', N'Khu VIP', 8, N'Trống', GETDATE(), GETDATE());

-- Reservations
SET IDENTITY_INSERT Reservations ON;
INSERT INTO Reservations (id, customer_id, table_id, reservation_date, reservation_time, guest_count, status, notes, created_at) VALUES(1, 'KH101', 7, '2026-05-02', '19:00:00', 5, N'Đã xác nhận', N'Kỷ niệm', '2026-04-28 10:00:00'),
(2, 'KH102', 2, '2026-05-02', '20:30:00', 4, N'Chờ xử lý', N'Cần ghế trẻ em', '2026-05-01 15:20:00'),
(3, 'KH104', 5, '2026-05-03', '18:00:00', 2, N'Đã xác nhận', N'Bàn view đẹp', '2026-04-30 09:45:00');
SET IDENTITY_INSERT Reservations OFF;

-- Orders
INSERT INTO Orders (id, customer_id, customerName, customerPhone, account_id, table_id, time, date, subtotal, discount, total, status, payment_method, payment_status, notes, created_at) VALUES
('ORD-17042026-001', 'KH101', N'Nguyễn Văn A', '0901234567', 2, 7, '19:30:00', '2026-04-17', 12550000, 0, 12550000, N'Hoàn thành', 'card', 'completed', N'', '2026-04-17 19:30:00'),
('ORD-02052026-002', 'KH103', N'Lê Hữu C', '0987654321', 3, NULL, '18:15:00', '2026-05-02', 35000000, 1000000, 34000000, N'Đang chế biến', 'transfer', 'pending', N'Khách VIP', '2026-05-02 18:15:00'),
('ORD-02052026-003', NULL, N'Khách lẻ', '', 4, NULL, '12:30:00', '2026-05-02', 1060000, 0, 1060000, N'Hoàn thành', 'cash', 'completed', N'', '2026-05-02 12:30:00');

-- Order Items
INSERT INTO OrderItems (order_id, product_id, name, price, quantity, total_price) VALUES
('ORD-17042026-001', 1, N'Sò Điệp Hokkaido Áp Chảo', 450000, 2, 900000),
('ORD-17042026-001', 13, N'Wagyu Tomahawk Mbs 8-9', 4250000, 1, 4250000),
('ORD-17042026-001', 19, N'Tôm Hùm Alaska Đút Lò', 1850000, 2, 3700000),

('ORD-02052026-002', 14, N'Thăn Ngoại Wagyu A5', 1950000, 2, 3900000),
('ORD-02052026-002', 38, N'Sâm-panh Dom Pérignon', 1250000, 1, 1250000),

('ORD-02052026-003', 10, N'Rigatoni Bò Wagyu Hầm', 480000, 2, 960000),
('ORD-02052026-003', 42, N'Cà Phê Espresso Đậm Mùi', 95000, 1, 95000);
