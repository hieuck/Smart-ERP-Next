# Dự báo dòng tiền bằng AI

## Giới thiệu
Mô-đun dự báo dòng tiền sử dụng **Exponential Smoothing** để dự đoán dòng tiền thuần (doanh thu – chi phí) trong 30 ngày tiếp theo. Tính năng này giúp doanh nghiệp chủ động lập kế hoạch tài chính, tránh rủi ro thiếu hụt tiền mặt.

## Cách hoạt động
1. **Thu thập dữ liệu lịch sử 90 ngày**:
   - Doanh thu từ các đơn hàng đã giao.
   - Chi phí từ các phiếu chi (thanh toán, nhập hàng, lương…).
2. **Exponential smoothing** với alpha = 0.2: ưu tiên các ngày gần đây hơn.
3. **Xuất dự báo ngày theo ngày** cho 30 ngày tới.

## Sử dụng
- Truy cập **Báo cáo → Dự báo dòng tiền**.
- Xem biểu đồ với đường thực tế (xanh) và dự báo (cam).
- Dự báo được cập nhật hàng ngày tự động.

## Tuỳ chỉnh
- Độ nhạy dự báo có thể điều chỉnh qua tham số `alpha` (hiện tại 0.2) trong file `cashflow-forecast.service.ts`.
- Độ dài dự báo mặc định 30 ngày, có thể thay bằng query param `?days=60`.

## Lưu ý
Dự báo dựa trên dữ liệu quá khứ, không thay thế kế hoạch tài chính chuyên sâu. Doanh nghiệp nên kết hợp với dự báo doanh thu và quản lý công nợ để có quyết định chính xác hơn.
