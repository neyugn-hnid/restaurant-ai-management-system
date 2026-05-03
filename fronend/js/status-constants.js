export const TABLE_STATUSES = Object.freeze({
    AVAILABLE: 'Trống',
    OCCUPIED: 'Đang phục vụ',
    RESERVED: 'Đã đặt',
    CLEANING: 'Chờ dọn dẹp'
});

export const ORDER_STATUSES = Object.freeze({
    PENDING_CONFIRMATION: 'Chờ xác nhận',
    PENDING: 'Chờ xử lý',
    PREPARING: 'Đang chế biến',
    SERVED: 'Đã phục vụ',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Hủy'
});

export const PAYMENT_STATUSES = Object.freeze({
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
});

export const ACCOUNT_STATUSES = Object.freeze({
    ACTIVE: 'Hoạt động',
    INACTIVE: 'Không hoạt động',
    LOCKED: 'Khóa',
    SUSPENDED: 'Tạm khóa',
    LEGACY_ACTIVE: 'active',
    LEGACY_INACTIVE: 'inactive'
});

export const PRODUCT_STATUSES = Object.freeze({
    ACTIVE: 'Còn hàng',
    OUT_OF_STOCK: 'Hết hàng',
    PAUSED: 'Tạm ngưng',
    DISCONTINUED: 'Ngừng bán',
    SELLING: 'Đang bán',
    NO_INGREDIENTS: 'Hết nguyên liệu'
});

export function isCompletedOrderStatus(status) {
    return status === ORDER_STATUSES.COMPLETED || status === ORDER_STATUSES.CANCELLED;
}

export function isActiveAccountStatus(status) {
    return status === ACCOUNT_STATUSES.ACTIVE || status === ACCOUNT_STATUSES.LEGACY_ACTIVE;
}

export function isInactiveAccountStatus(status) {
    return status === ACCOUNT_STATUSES.INACTIVE
        || status === ACCOUNT_STATUSES.LOCKED
        || status === ACCOUNT_STATUSES.SUSPENDED
        || status === ACCOUNT_STATUSES.LEGACY_INACTIVE;
}

export function isOutOfStockProductStatus(status) {
    return status === PRODUCT_STATUSES.OUT_OF_STOCK || status === PRODUCT_STATUSES.NO_INGREDIENTS;
}
