// Initial Mock Data corresponding to database.sql
const MOCK_CATEGORIES = [
    {
        "id": 1,
        "_id": "starters",
        "name": "Món Khai Vị",
        "description": "The Starters",
        "count": 6,
        "status": "Hoạt động"
    },
    {
        "id": 2,
        "_id": "pasta",
        "name": "Mì Ý & Risotto",
        "description": "Pasta & Risotto",
        "count": 6,
        "status": "Hoạt động"
    },
    {
        "id": 3,
        "_id": "steaks",
        "name": "Nghệ Thuật Khói Lửa",
        "description": "Signature Steaks",
        "count": 6,
        "status": "Hoạt động"
    },
    {
        "id": 4,
        "_id": "seafood",
        "name": "Hải Sản Tinh Túy",
        "description": "Premium Seafood",
        "count": 6,
        "status": "Hoạt động"
    },
    {
        "id": 5,
        "_id": "sides",
        "name": "Món Ăn Kèm",
        "description": "Side Dishes",
        "count": 6,
        "status": "Hoạt động"
    },
    {
        "id": 6,
        "_id": "desserts",
        "name": "Dấu Ấn Ngọt Ngào",
        "description": "Desserts",
        "count": 6,
        "status": "Hoạt động"
    },
    {
        "id": 7,
        "_id": "drinks",
        "name": "Thức Uống & Rượu Vang",
        "description": "Beverages & Wines",
        "count": 6,
        "status": "Hoạt động"
    },
    {
        "id": 8,
        "_id": "vegan",
        "name": "Thực Đơn Chay",
        "description": "Vegetarian & Vegan",
        "count": 6,
        "status": "Hoạt động"
    },
    {
        "id": 9,
        "_id": "specials",
        "name": "Món Đặc Biệt",
        "description": "Chef's Specials",
        "count": 6,
        "status": "Hoạt động"
    }
];

const MOCK_PRODUCTS = [
    {
        "id": 1,
        "categoryId": 1,
        "name": "Sò Điệp Hokkaido Áp Chảo",
        "price": 450000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400",
        "description": "Áp chảo bơ xém cạnh tinh tế, phục vụ kèm Puree súp lơ trắng mịn và sốt chanh vàng."
    },
    {
        "id": 2,
        "categoryId": 1,
        "name": "Foie Gras Pháp Xém Lửa",
        "price": 650000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400",
        "description": "Gan ngỗng Pháp thượng hạng phục vụ trên bánh mì nướng men chua cùng nụ tầm xuân."
    },
    {
        "id": 3,
        "categoryId": 1,
        "name": "Thăn Bò Tartare Nấm Truffle",
        "price": 420000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400",
        "description": "Thăn bò Wagyu sống băm thủ công trộn cùng nấm Truffle đen, phủ lòng đỏ trứng cút."
    },
    {
        "id": 4,
        "categoryId": 1,
        "name": "Hàu Nước Sâu Mignonette",
        "price": 580000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400",
        "description": "6 con hàu sống mọng nước vớt từ biển lạnh, dùng kèm sốt giấm hành tím Mignonette cổ điển."
    },
    {
        "id": 5,
        "categoryId": 1,
        "name": "Súp Kem Nấm Rừng Bọc Bột",
        "price": 280000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400",
        "description": "Súp nấm rừng đẫm vị Truffle ủ dưới lớp vỏ bánh nướng Puff pastry phồng giòn rụm."
    },
    {
        "id": 6,
        "categoryId": 1,
        "name": "Salad Hoa Quả Burrata",
        "price": 320000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400",
        "description": "Phô mai Burrata tươi bọc dâu tây, cà chua bi nhiều sắc màu và đẫm sốt giấm Balsamic."
    },
    {
        "id": 7,
        "categoryId": 2,
        "name": "Risotto Nấm Truffle",
        "price": 580000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400",
        "description": "Cơm Ý nấu chậm nấu cùng phô mai, nấm hương mềm và cồi sò điệp Hokkaido xém lửa."
    },
    {
        "id": 8,
        "categoryId": 2,
        "name": "Tagliatelle Tôm Hùm Khói",
        "price": 620000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400",
        "description": "Mì dẹt làm tay, quyện trong nước dùng tôm hùm, phủ Grana Padano 24 tháng tuổi."
    },
    {
        "id": 9,
        "categoryId": 2,
        "name": "Ravioli Phô Mai Chân Vịt",
        "price": 350000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400",
        "description": "Mì gói nhân phô mai béo ngậy, sốt bơ cháy vàng, lá xô thơm cùng hạt óc chó."
    },
    {
        "id": 10,
        "categoryId": 2,
        "name": "Rigatoni Bò Wagyu Hầm",
        "price": 480000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400",
        "description": "Bò Wagyu hầm nhừ rục 12 tiếng cùng cà chua San Marzano đặc trưng, thấm đậm từng ống mì."
    },
    {
        "id": 11,
        "categoryId": 2,
        "name": "Spaghetti Carbonara Guanciale",
        "price": 320000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400",
        "description": "Công thức nguyên bản nước Ý với thịt heo muối Guanciale, lòng đỏ trứng và phô mai Pecorino."
    },
    {
        "id": 12,
        "categoryId": 2,
        "name": "Lasagna Bò Bằm Phô Mai",
        "price": 380000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1414235077428-33898bd122b5?auto=format&fit=crop&q=80&w=400",
        "description": "Mì Ý ngàn lớp nướng lò đẫm sốt thịt bò băm Bolognese cổ điển, phô mai Mozzarella kéo sợi."
    },
    {
        "id": 13,
        "categoryId": 3,
        "name": "Wagyu Tomahawk Mbs 8-9",
        "price": 4250000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400",
        "description": "Rìu sườn hoành tráng phục vụ trực tiếp trên đá tảng nóng, vảy vàng rực rỡ (Dành cho 2 người)."
    },
    {
        "id": 14,
        "categoryId": 3,
        "name": "Thăn Ngoại Wagyu A5",
        "price": 1950000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400",
        "description": "Vân mỡ cẩm thạch hoàn hảo, nướng nhiệt độ kỷ lục tạo lớp ngoài giòn, mọng mềm bên trong."
    },
    {
        "id": 15,
        "categoryId": 3,
        "name": "Thăn Nội Black Angus",
        "price": 1450000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400",
        "description": "Lõi nạc vai mềm mại không chút mỡ, sốt nấm gan ngỗng Pháp đậm đà."
    },
    {
        "id": 16,
        "categoryId": 3,
        "name": "Thăn Lưng Ribeye USDA",
        "price": 1100000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&q=80&w=400",
        "description": "Bò Mỹ hạng Prime nướng nguyên bản thủ công, mọng nước và đượm mùi than bích."
    },
    {
        "id": 17,
        "categoryId": 3,
        "name": "Sườn Bò Rút Xương Hầm",
        "price": 890000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&q=80&w=400",
        "description": "Góc sườn dày hầm 12 giờ cho đến khi rục mềm, kèm nước sốt vang đỏ cô đặc."
    },
    {
        "id": 18,
        "categoryId": 3,
        "name": "Sườn Cừu New Zealand",
        "price": 1200000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=400",
        "description": "Sườn cừu non đút lò hun khói gỗ sồi, dùng với sốt bạc hà thanh mát đặc biệt."
    },
    {
        "id": 19,
        "categoryId": 4,
        "name": "Tôm Hùm Alaska Đút Lò",
        "price": 1850000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400",
        "description": "Chẻ đôi nguyên con nướng phô mai Gruyere Thụy Sỹ, xông khói gỗ tại bàn."
    },
    {
        "id": 20,
        "categoryId": 4,
        "name": "Cá Tuyết Nam Cực (Cod)",
        "price": 850000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400",
        "description": "Phi lê trắng ngần, áp chảo bơ chanh, đính vụn bánh mì tỏi giòn tan."
    },
    {
        "id": 21,
        "categoryId": 4,
        "name": "Cua Hoàng Đế (100g)",
        "price": 450000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400",
        "description": "Hấp sâm panh tao nhã, lột vỏ phục vụ kèm sốt Cajun bơ cay miền Nam nước Mỹ."
    },
    {
        "id": 22,
        "categoryId": 4,
        "name": "Cá Hồi Na-Uy Hoàng Gia",
        "price": 550000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400",
        "description": "Lườn béo ủ tương Kombu, áp chảo nhiệt lớn, ăn với trứng cá tầm đen Caviar."
    },
    {
        "id": 23,
        "categoryId": 4,
        "name": "Bạch Tuộc Galician Tỏi",
        "price": 690000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400",
        "description": "Xúc tu khổng lồ khò qua lửa than, dai mềm sần sật pha chút sốt bơ ớt paprika hun khói."
    },
    {
        "id": 24,
        "categoryId": 4,
        "name": "Vẹm Xanh Sốt Vang Trắng",
        "price": 420000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400",
        "description": "Vẹm tươi rói New Zealand hầm nhanh trong nước cốt vang trắng chardonnay và rau mùi tây."
    },
    {
        "id": 25,
        "categoryId": 5,
        "name": "Khoai Tây Nghiền Truffle",
        "price": 150000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400",
        "description": "Khoai tây đánh bơ Pháp bông xốp, dậy mùi thơm nồng từ dầu nấm Truffle."
    },
    {
        "id": 26,
        "categoryId": 5,
        "name": "Măng Tây Xào Bơ Tỏi",
        "price": 180000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400",
        "description": "Đọt măng non tơ thanh giòn, xào chớp nhoáng với bơ giữ độ mọng nước."
    },
    {
        "id": 27,
        "categoryId": 5,
        "name": "Cải Bó Xôi Kem Phô Mai",
        "price": 140000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400",
        "description": "Trứ danh Steakhouse, rau bina xay nhuyễn tan chảy với kem béo, nhục đậu khấu."
    },
    {
        "id": 28,
        "categoryId": 5,
        "name": "Nấm Rừng Xào Vang Đỏ",
        "price": 160000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400",
        "description": "Các loại nấm đun kỹ cùng rượu vang đỏ tôn vị ngọt, lý tưởng ăn kèm thịt đỏ."
    },
    {
        "id": 29,
        "categoryId": 5,
        "name": "Mac & Cheese Tôm Hùm",
        "price": 350000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1414235077428-33898bd122b5?auto=format&fit=crop&q=80&w=400",
        "description": "Mì ống đút lò với phô mai bào Cheddar tan chảy và thịt tôm hùm xé nhỏ thượng lưu."
    },
    {
        "id": 30,
        "categoryId": 5,
        "name": "Khoai Tây Chiên Pháp Truffle",
        "price": 120000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400",
        "description": "Khoai tây chiên giòn tan rắc ngập bột nấm Truffle và phô mai Parmesan vụn."
    },
    {
        "id": 31,
        "categoryId": 6,
        "name": "Bánh Lava Cacao Grand Cru",
        "price": 450000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400",
        "description": "Socola dung nham 72% đi kèm kem vani lạnh béo mượt, cân bằng độ đắng."
    },
    {
        "id": 32,
        "categoryId": 6,
        "name": "Tiramisu Kahlua Đế Trắng",
        "price": 320000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&q=80&w=400",
        "description": "Mascarpone bông mịn với rượu Kahlua cà phê Espresso và bánh quy Ý."
    },
    {
        "id": 33,
        "categoryId": 6,
        "name": "Panna Cotta Sốt Dâu Rừng",
        "price": 180000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&q=80&w=400",
        "description": "Thạch kem sữa tươi mượt mà tan ngay góc miệng, rải sốt dâu rừng đỏ mọng lấp lánh."
    },
    {
        "id": 34,
        "categoryId": 6,
        "name": "Kem Tuyết Sorbet Thảo Mộc",
        "price": 120000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=400",
        "description": "Sorbet chanh leo mát lạnh giải nghén cực rát sau một bữa thịt lớn quá nhiệt lượng."
    },
    {
        "id": 35,
        "categoryId": 6,
        "name": "Phô Mai Nướng Basque",
        "price": 250000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400",
        "description": "Bánh phô mai nướng xém mặt đặc kịch bản Tây Ban Nha, thơm hương Caramel sữa."
    },
    {
        "id": 36,
        "categoryId": 6,
        "name": "Creme Brulee Madagascar",
        "price": 190000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400",
        "description": "Lớp đường khò giòn tan bể gãy rào rạo, che đậy trứng sữa và vani nguyên hạt sâu thẳm."
    },
    {
        "id": 37,
        "categoryId": 7,
        "name": "Vang Đỏ Chateau Margaux",
        "price": 880000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400",
        "description": "Thưởng thức Premier Grand Cru Classé vang danh Pháp theo ly. Hương dâu tằm, xì gà."
    },
    {
        "id": 38,
        "categoryId": 7,
        "name": "Sâm-panh Dom Pérignon",
        "price": 1250000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400",
        "description": "Khai tiệc bằng ly champagne xa hoa bọt sủi tăm, hương bánh mì nướng và men thoang thoảng."
    },
    {
        "id": 39,
        "categoryId": 7,
        "name": "Signature Cocktail",
        "price": 320000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400",
        "description": "Pha chế nền Bourbon hun khói gỗ keo tự nhiên, rắc xíu muối để đánh thức khứu giác."
    },
    {
        "id": 40,
        "categoryId": 7,
        "name": "Trà Thảo Mộc Hoa Cúc",
        "price": 120000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400",
        "description": "Tách trà ấm thanh tao sử dụng nụ cúc vàng thu hoạch sớm ngâm cùng kỷ tử và táo đỏ."
    },
    {
        "id": 41,
        "categoryId": 7,
        "name": "Mocktail Nhiệt Đới",
        "price": 150000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=400",
        "description": "Sự lôi cuốn không cồn từ những tép nước bưởi ép cùng dứa vàng, giải khát bất tận."
    },
    {
        "id": 42,
        "categoryId": 7,
        "name": "Cà Phê Espresso Đậm Mùi",
        "price": 95000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=400",
        "description": "Arabica pha máy tiêu chuẩn cùng độ đắng cực sâu vực dậy tinh thần tỉnh táo cuối ngày."
    },
    {
        "id": 43,
        "categoryId": 8,
        "name": "Salad Lúa Mạch Thảo Mộc",
        "price": 180000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1563223769-cf78fae2e541?auto=format&fit=crop&q=80&w=400",
        "description": "Hạt lúa mạch nấu mềm trộn rau mầm, bơ quả và sốt chanh mật hoa dừa thanh mát."
    },
    {
        "id": 44,
        "categoryId": 8,
        "name": "Súp Bí Đỏ Hạt Nướng",
        "price": 150000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=400",
        "description": "Bí đỏ nướng than nghiền mịn cùng kem hạt điều, điểm xuyết hạt bí rang muối."
    },
    {
        "id": 45,
        "categoryId": 8,
        "name": "Risotto Nấm Thông",
        "price": 320000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=400",
        "description": "Cơm Risotto Ý phô mai chay từ hạt macca, ninh thô trong nước cốt nấm quý."
    },
    {
        "id": 46,
        "categoryId": 8,
        "name": "Steak Nấm Đùi Gà",
        "price": 250000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400",
        "description": "Bản đùi gà lớn khía vảy rồng, áp chảo mỡ hành thảo mộc với cấu trúc dai giòn."
    },
    {
        "id": 47,
        "categoryId": 8,
        "name": "Cà Tím Áp Chảo Olive",
        "price": 120000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1414235077428-33898bd122b5?auto=format&fit=crop&q=80&w=400",
        "description": "Cà tím Nhật lát dày áp chảo rắc muối hồng Himalaya, rưới sốt dầu Olive."
    },
    {
        "id": 48,
        "categoryId": 8,
        "name": "Đậu Hũ Sốt Nấm Truffle",
        "price": 190000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=400",
        "description": "Khối đậu hũ non chiên phồng xốp, thấm đẫm lớp sốt sánh quyện đậm hương Truffle đen."
    },
    {
        "id": 49,
        "categoryId": 9,
        "name": "Thăn Wagyu Cuộn Nấm",
        "price": 1200000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&q=80&w=400",
        "description": "Lõi thăn bò cuộn nấm bào ngư rừng, áp lửa than hồng nguyên tảng độc đáo."
    },
    {
        "id": 50,
        "categoryId": 9,
        "name": "Cá Hồi Hữu Cơ Hấp Rượu",
        "price": 750000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1560684352-8497838a2229?auto=format&fit=crop&q=80&w=400",
        "description": "Phi lê cá hồi hấp cách thủy vang trắng sủi tăm, nhốt giữ trọn vẹn vị biển tinh khôi."
    },
    {
        "id": 51,
        "categoryId": 9,
        "name": "Tôm Càng Cỡ Tướng Đút Lò",
        "price": 850000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=400",
        "description": "Sáu con tôm càng xanh tươi xẻ lưng, ủ phô mai con bò cười nướng vỉ lửa tự nhiên."
    },
    {
        "id": 52,
        "categoryId": 9,
        "name": "Súp Bong Bóng Ngư Vi",
        "price": 1500000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400",
        "description": "Bát súp vi cá mập chay nấu cùng bong bóng cá thiêng liêng, nghệ thuật yến tiệc Châu Á."
    },
    {
        "id": 53,
        "categoryId": 9,
        "name": "Đùi Cừu Hầm Vang Đỏ",
        "price": 1100000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&q=80&w=400",
        "description": "Đùi cừu non hầm mềm rục xương cùng rượu Burgundy và rễ cây hương thảo."
    },
    {
        "id": 54,
        "categoryId": 9,
        "name": "Ức Vịt Quay Sốt Mứt Cam",
        "price": 650000,
        "status": "Còn hàng",
        "image": "https://images.unsplash.com/photo-1605807646983-377bc5a7644e?auto=format&fit=crop&q=80&w=400",
        "description": "Lớp vỏ da giòn tan, lớp mỡ thơm dịu, thớ nạc đỏ au rưới mứt cam chua ngọt hoàn mĩ."
    }
];

const MOCK_ACCOUNTS = [
    { id: 1, username: 'admin', password_hash: 'hashed_password_here', fullName: 'Quản trị viên', role: 'admin', status: 'Hoạt động', created_at: '2026-01-01T08:00:00Z' },
    { id: 2, username: 'manager', password_hash: 'hashed_password_here', fullName: 'Quản lý cửa hàng', role: 'manager', status: 'Hoạt động', created_at: '2026-01-02T08:00:00Z' },
    { id: 3, username: 'nhanvien1', password_hash: 'hashed_password_here', fullName: 'Lê Văn C', role: 'staff', status: 'Hoạt động', created_at: '2026-02-15T09:30:00Z' },
    { id: 4, username: 'nhanvien2', password_hash: 'hashed_password_here', fullName: 'Phạm Thị D', role: 'staff', status: 'Hoạt động', created_at: '2026-03-10T10:15:00Z' }
];

const MOCK_CUSTOMERS = [
    { id: 'KH101', phone: '0901234567', name: 'Nguyễn Văn A', full_name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', visits: 5, totalSpent: 15000000, total_spent: 15000000, tier: 'gold', created_at: '2025-12-10T14:20:00Z' },
    { id: 'KH102', phone: '0912345678', name: 'Trần Thị B', full_name: 'Trần Thị B', email: 'tranthib@gmail.com', visits: 1, totalSpent: 2450000, total_spent: 2450000, tier: 'new', created_at: '2026-04-05T18:45:00Z' },
    { id: 'KH103', phone: '0987654321', name: 'Lê Hữu C', full_name: 'Lê Hữu C', email: 'lehuuc@hoanglong.com', visits: 12, totalSpent: 45000000, total_spent: 45000000, tier: 'platinum', created_at: '2025-06-20T19:00:00Z' },
    { id: 'KH104', phone: '0933445566', name: 'Hoàng Đăng D', full_name: 'Hoàng Đăng D', email: 'hoangdangd@gmail.com', visits: 3, totalSpent: 8500000, total_spent: 8500000, tier: 'silver', created_at: '2026-01-15T12:30:00Z' },
    { id: 'KH105', phone: '0977889900', name: 'Đỗ Mỹ E', full_name: 'Đỗ Mỹ E', email: 'domye@yahoo.com', visits: 2, totalSpent: 3200000, total_spent: 3200000, tier: 'new', created_at: '2026-02-28T20:10:00Z' }
];

const MOCK_TABLES = [
    { id: 'Bàn 01', zone: 'Tầng 1', capacity: 4, status: 'Trống', created_at: '2025-01-01T00:00:00Z' },
    { id: 'Bàn 02', zone: 'Tầng 1', capacity: 4, status: 'Trống', created_at: '2025-01-01T00:00:00Z' },
    { id: 'Bàn 03', zone: 'Tầng 1 - Cửa sổ', capacity: 2, status: 'Trống', created_at: '2025-01-01T00:00:00Z' },
    { id: 'Bàn 04', zone: 'Tầng 1', capacity: 2, status: 'Trống', created_at: '2025-01-01T00:00:00Z' },
    { id: 'Bàn 05', zone: 'Sân vườn', capacity: 6, status: 'Trống', created_at: '2025-01-01T00:00:00Z' },
    { id: 'Bàn 06', zone: 'Sân vườn', capacity: 4, status: 'Trống', created_at: '2025-01-01T00:00:00Z' },
    { id: 'Bàn VIP 1', zone: 'Khu VIP', capacity: 8, status: 'Trống', created_at: '2025-01-01T00:00:00Z' }
];

// Để tương thích với code cũ
const MOCK_TABLE_STATUSES = {};
MOCK_TABLES.forEach(table => {
    MOCK_TABLE_STATUSES[table.id] = table.status;
});

const MOCK_RESERVATIONS = [
    { id: 1, customer_id: 'KH101', table_id: 'Bàn VIP 1', reservation_date: '2026-05-02', reservation_time: '19:00', guest_count: 5, status: 'Đã xác nhận', notes: 'Kỷ niệm', created_at: '2026-04-28T10:00:00Z' },
    { id: 2, customer_id: 'KH102', table_id: 'Bàn 02', reservation_date: '2026-05-02', reservation_time: '20:30', guest_count: 4, status: 'Chờ xử lý', notes: 'Cần ghế trẻ em', created_at: '2026-05-01T15:20:00Z' },
    { id: 3, customer_id: 'KH104', table_id: 'Bàn 05', reservation_date: '2026-05-03', reservation_time: '18:00', guest_count: 2, status: 'Đã xác nhận', notes: 'Bàn view đẹp', created_at: '2026-04-30T09:45:00Z' }
];

const MOCK_ORDERS = [
    { 
        id: 'ORD-17042026-001', 
        customer_id: 'KH101',
        customerName: 'Nguyễn Văn A',
        customerPhone: '0901234567',
        account_id: 2,
        table_id: 'Bàn VIP 1',
        tableId: 'Bàn VIP 1',
        customer: 'Bàn VIP 1', // Cho các chức năng tương thích ngược trong table.js
        time: '19:30', 
        date: '2026-04-17',
        subtotal: 12550000,
        discount: 0,
        total: 12550000, 
        status: 'Hoàn thành',
        payment_method: 'card',
        payment_status: 'completed',
        notes: '',
        created_at: '2026-04-17T19:30:00Z',
        items: [
            { product_id: 1, name: 'Sò Điệp Hokkaido Áp Chảo', price: 450000, quantity: 2, total_price: 900000 },
            { product_id: 13, name: 'Wagyu Tomahawk Mbs 8-9', price: 4250000, quantity: 1, total_price: 4250000 },
            { product_id: 19, name: 'Tôm Hùm Alaska Đút Lò', price: 1850000, quantity: 2, total_price: 3700000 }
        ]
    },
    { 
        id: 'ORD-02052026-002', 
        customer_id: 'KH103',
        customerName: 'Lê Hữu C',
        customerPhone: '0987654321',
        account_id: 3,
        table_id: 'T1',
        tableId: 'T1', 
        customer: 'T1',
        time: '18:15', 
        date: '2026-05-02',
        subtotal: 35000000,
        discount: 1000000,
        total: 34000000, 
        status: 'Đang chế biến',
        payment_method: 'transfer',
        payment_status: 'pending',
        notes: 'Khách VIP',
        created_at: '2026-05-02T18:15:00Z',
        items: [
            { product_id: 14, name: 'Thăn Ngoại Wagyu A5', price: 1950000, quantity: 2, total_price: 3900000 },
            { product_id: 38, name: 'Sâm-panh Dom Pérignon', price: 1250000, quantity: 1, total_price: 1250000 }
        ]
    },
    { 
        id: 'ORD-02052026-003', 
        customer_id: null,
        customerName: 'Khách lẻ',
        customerPhone: '',
        account_id: 4,
        table_id: 'T2',
        tableId: 'T2', 
        customer: 'T2',
        time: '12:30', 
        date: '2026-05-02',
        subtotal: 1060000,
        discount: 0,
        total: 1060000, 
        status: 'Hoàn thành',
        payment_method: 'cash',
        payment_status: 'completed',
        notes: '',
        created_at: '2026-05-02T12:30:00Z',
        items: [
            { product_id: 10, name: 'Rigatoni Bò Wagyu Hầm', price: 480000, quantity: 2, total_price: 960000 },
            { product_id: 42, name: 'Cà Phê Espresso Đậm Mùi', price: 95000, quantity: 1, total_price: 95000 }
        ]
    }
];

function initializeMockData() {
    if (!localStorage.getItem('bistro_categories')) {
        localStorage.setItem('bistro_categories', JSON.stringify(MOCK_CATEGORIES));
    }
    if (!localStorage.getItem('bistro_products')) {
        localStorage.setItem('bistro_products', JSON.stringify(MOCK_PRODUCTS));
    }
    if (!localStorage.getItem('bistro_accounts') || JSON.parse(localStorage.getItem('bistro_accounts')).length < 4) {
        localStorage.setItem('bistro_accounts', JSON.stringify(MOCK_ACCOUNTS));
    }
    if (!localStorage.getItem('bistro_customers') || JSON.parse(localStorage.getItem('bistro_customers')).length < 5) {
        localStorage.setItem('bistro_customers', JSON.stringify(MOCK_CUSTOMERS));
    }
    if (!localStorage.getItem('bistro_tables') || JSON.parse(localStorage.getItem('bistro_tables'))[0].id !== 'Bàn 01') {
        localStorage.setItem('bistro_tables', JSON.stringify(MOCK_TABLES));
        localStorage.setItem('bistro_table_statuses', JSON.stringify(MOCK_TABLE_STATUSES));
        localStorage.setItem('bistro_reservations', JSON.stringify(MOCK_RESERVATIONS));
        localStorage.setItem('bistro_orders', JSON.stringify(MOCK_ORDERS));
    }
    if (!localStorage.getItem('bistro_table_statuses') || Object.keys(JSON.parse(localStorage.getItem('bistro_table_statuses'))).length < 7) {
        localStorage.setItem('bistro_table_statuses', JSON.stringify(MOCK_TABLE_STATUSES));
    }
    if (!localStorage.getItem('bistro_reservations')) {
        localStorage.setItem('bistro_reservations', JSON.stringify(MOCK_RESERVATIONS));
    }
    if (!localStorage.getItem('bistro_orders') || JSON.parse(localStorage.getItem('bistro_orders')).length < 3) {
        localStorage.setItem('bistro_orders', JSON.stringify(MOCK_ORDERS));
    }
}

// Call initialization
initializeMockData();

window.BistroMockData = {
    MOCK_CATEGORIES,
    MOCK_PRODUCTS,
    MOCK_ACCOUNTS,
    MOCK_CUSTOMERS,
    MOCK_TABLES,
    MOCK_TABLE_STATUSES,
    MOCK_RESERVATIONS,
    MOCK_ORDERS
};

// --- Cài đặt hiển thị Responsive cho Sidebar và Navbar ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar cho trang quản trị
    const topbar = document.querySelector('.topbar');
    const sidebar = document.querySelector('.sidebar');
    
    if (topbar && sidebar) {
        let toggleBtn = topbar.querySelector('.mobile-toggle');
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.className = 'mobile-toggle';
            toggleBtn.innerHTML = '<span class="material-symbols-outlined fs-2">menu</span>';
            topbar.insertBefore(toggleBtn, topbar.firstChild);
        }
        
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            Object.assign(overlay.style, {
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999,
                display: 'none', opacity: 0, transition: 'opacity 0.3s'
            });
            document.body.appendChild(overlay);
        }
        
        toggleBtn.addEventListener('click', () => {
            const isShowing = sidebar.classList.toggle('show');
            if (isShowing) {
                overlay.style.display = 'block';
                setTimeout(() => overlay.style.opacity = 1, 10);
            } else {
                overlay.style.opacity = 0;
                setTimeout(() => overlay.style.display = 'none', 300);
            }
        });
        
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.style.opacity = 0;
            setTimeout(() => overlay.style.display = 'none', 300);
        });
    }

    // 2. Navbar cho trang khách hàng (customer pages)
    const navbar = document.querySelector('.navbar'); 
    if (navbar && !sidebar) {
        let mobileNavToggle = navbar.querySelector('.mobile-nav-toggle');
        if (!mobileNavToggle) {
            mobileNavToggle = document.createElement('button');
            mobileNavToggle.className = 'mobile-nav-toggle';
            mobileNavToggle.innerHTML = '<span class="material-symbols-outlined" style="font-size: 2.8rem; vertical-align: middle;">menu</span>';
            Object.assign(mobileNavToggle.style, {
                background: 'none', border: 'none', color: 'var(--color-brand, #006241)',
                cursor: 'pointer', display: 'none'
            });
            navbar.appendChild(mobileNavToggle);
            
            const style = document.createElement('style');
            style.textContent = `
                @media (max-width: 768px) {
                    .mobile-nav-toggle { display: block !important; }
                    .navbar { padding: 0 2rem !important; }
                    .nav-links {
                        display: flex !important; flex-direction: column;
                        position: absolute; top: 90px; left: 0; right: 0;
                        background: rgba(255, 255, 255, 0.98); padding: 2rem;
                        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                        clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
                        transition: clip-path 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                        z-index: 1000; align-items: flex-start !important; gap: 2rem !important;
                    }
                    .nav-links.nav-active { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
                    .nav-links .nav-label::after { display: none; }
                    .nav-links .btn { width: 100%; text-align: center; }
                    /* Adjust elements that might overlap */
                    .reservation-bar { grid-template-columns: 1fr !important; }
                    /* Customer Menu Page */
                    .menu-filter-island { 
                        justify-content: flex-start !important; 
                        padding: 1rem !important; 
                        margin: 0 !important; 
                        border-radius: 0 !important;
                        overflow-x: auto;
                        white-space: nowrap;
                    }
                    .menu-filter-island::-webkit-scrollbar { display: none; }
                    .menu-category h2 { font-size: 2.4rem !important; }
                    /* Map Page */
                    .map-main { grid-template-columns: 1fr !important; }
                    .map-booking-panel { position: static !important; width: 100% !important; margin-bottom: 2rem !important; }
                }
                @media (max-width: 576px) {
                    .info-grid { gap: 2rem !important; }
                    .dishes-grid { grid-template-columns: 1fr !important; }
                    .hero-content h1 { font-size: 3.6rem !important; }
                }
            `;
            document.head.appendChild(style);
            
            if (!document.querySelector('link[href*="Material+Symbols+Outlined"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
                document.head.appendChild(link);
            }
        }
        
        mobileNavToggle.addEventListener('click', () => {
            const navLinks = navbar.querySelector('.nav-links');
            if (navLinks) {
                navLinks.classList.toggle('nav-active');
                if (navLinks.classList.contains('nav-active')) {
                    mobileNavToggle.innerHTML = '<span class="material-symbols-outlined" style="font-size: 2.8rem; vertical-align: middle;">close</span>';
                } else {
                    mobileNavToggle.innerHTML = '<span class="material-symbols-outlined" style="font-size: 2.8rem; vertical-align: middle;">menu</span>';
                }
            }
        });
    }
});

