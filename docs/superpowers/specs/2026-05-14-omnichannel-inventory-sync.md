# Omnichannel Inventory Sync (MVP)

**Mục tiêu:** Đồng bộ tồn kho ERP làm source of truth → marketplace, chống oversell bằng reservation + buffer.

**Architecture:** ERP push, scheduled + manual sync, reservation lock khi import đơn marketplace.

## DB mới
- `inventory_reservations(tenantId, externalOrderId, storeId, productId, quantityReserved, status)`
- `ecommerce_store_settings` mở rộng: safetyStockBuffer, syncMode, warehouseIdMap

## Công thức
- `available_to_sell = max(0, physical_stock - safety_stock - reserved_quantity)`

## Flow
1. Import đơn từ marketplace → tạo reservation (giảm available)
2. Xác nhận/huỷ đơn → chuyển consumed/released
3. Button/scheduler push available_to_sell → marketplace API
4. Reservation và stock sync được log đầy đủ
