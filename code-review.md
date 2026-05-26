# Kiem tra code vs Yeu cau chuc nang

## 1. Chuc nang da co (Implemented)

| Chuc nang | Controller | Method | Trang thai |
|-----------|-----------|--------|------------|
| Dang nhap | AuthController | POST /login | ✅ |
| Dang xuat | AuthController | POST /logout | ✅ |
| Danh sach tai khoan | AccountsController | GET /api/Accounts | ✅ |
| Xem chi tiet tai khoan | AccountsController | GET /api/Accounts/{id} | ✅ |
| Sua tai khoan | AccountsController | PUT /api/Accounts/{id} | ✅ |
| Doi mat khau | AccountsController | PUT .../{id}/password | ✅ |
| Sua profile | AccountsController | PUT .../{id}/profile | ✅ |
| Xoa tai khoan | AccountsController | DELETE /api/Accounts/{id} | ✅ |
| Danh sach danh muc | CategoriesController | GET /api/Categories | ✅ |
| Them danh muc | CategoriesController | POST /api/Categories | ✅ |
| Sua danh muc | CategoriesController | PUT /api/Categories/{id} | ✅ |
| Xoa danh muc | CategoriesController | DELETE /api/Categories/{id} | ✅ |
| Danh sach mon an | ProductsController | GET /api/Products | ✅ |
| Them mon an | ProductsController | POST /api/Products | ✅ |
| Sua mon an | ProductsController | PUT /api/Products/{id} | ✅ |
| Xoa mon an | ProductsController | DELETE /api/Products/{id} | ✅ |
| Danh sach don hang | OrdersController | GET /api/Orders | ✅ |
| Tao don hang | OrdersController | POST /api/Orders | ✅ |
| Sua don hang | OrdersController | PUT /api/Orders/{id} | ✅ |
| Xoa don hang | OrdersController | DELETE /api/Orders/{id} | ✅ |
| Danh sach ban | RestaurantTablesController | GET /api/RestaurantTables | ✅ |
| Them ban | RestaurantTablesController | POST /api/RestaurantTables | ✅ |
| Sua ban | RestaurantTablesController | PUT /api/RestaurantTables/{id} | ✅ |
| Xoa ban | RestaurantTablesController | DELETE /api/RestaurantTables/{id} | ✅ |
| Danh sach khach hang | CustomersController | GET /api/Customers | ✅ |
| Them khach hang | CustomersController | POST /api/Customers | ✅ |
| Sua khach hang | CustomersController | PUT /api/Customers/{id} | ✅ |
| Xoa khach hang | CustomersController | DELETE /api/Customers/{id} | ✅ |
| Danh sach dat ban | ReservationsController | GET /api/Reservations | ✅ |
| Them dat ban | ReservationsController | POST /api/Reservations | ✅ |
| Sua dat ban | ReservationsController | PUT /api/Reservations/{id} | ✅ |
| Xoa dat ban | ReservationsController | DELETE /api/Reservations/{id} | ✅ |
| Goi y AI mon an | AiRecommendationsController | POST /dishes | ✅ |
| Goi y AI xep ban | AiRecommendationsController | POST /tables | ✅ |
| Real-time | SignalR Hub | RealtimeHub | ✅ |

## 2. Chuc nang con thieu (Missing)

| Chuc nang | Mo ta | Can bo sung vao |
|-----------|-------|-----------------|
| ❌ Dang ky | Frontend co form, nhung backend chua co `POST /Auth/register` | AuthController |
| ❌ Quen mat khau | Khong co endpoint gui email reset | AuthController + EmailService |
| ❌ OTP | Khong co gui ma OTP qua email | Service moi: EmailService |
| ❌ Phan quyen | [Authorize] thieu o Categories, Products, Customers, OrderItems, Reservations, RestaurantTables | Them attribute |
| ❌ Thanh toan | PaymentSettingsController co nhung chua tich hop | OrdersController |
| ❌ Thong ke (Analytics) | Frontend co analytics.html nhung backend chua co API | Controller moi |

## 3. Van de khac

| Van de | Chi tiet |
|--------|----------|
| ⚠️ Auth/register | Frontend `auth.js` goi `POST /Auth/register` nhung backend chua co |
| ⚠️ [Authorize] | CategoriesController, ProductsController, CustomersController... can them `[Authorize]` |
| ⚠️ EmailService | Chua co service gui email (cho OTP, reset password) |
