# Dự báo giá trị vòng đời khách hàng (CLV)

## Giới thiệu
Customer Lifetime Value (CLV) dự báo tổng lợi nhuận mà một khách hàng có thể mang lại trong suốt mối quan hệ với doanh nghiệp. Module này giúp:
- **Phân khúc khách hàng** dựa trên hành vi mua sắm.
- **Ưu tiên chăm sóc** nhóm VIP và nhóm có nguy cơ rời bỏ.
- **Đưa ra quyết định** về ngân sách marketing, khuyến mãi cá nhân hoá.

## Cách hoạt động
1. **Thu thập dữ liệu 12 tháng gần nhất**: tổng chi tiêu, tần suất mua, giá trị đơn trung bình, số ngày kể từ lần mua cuối.
2. **Tính CLV** = (giá trị đơn TB × tần suất/tháng × 12) × hệ số hiệu chỉnh dựa trên recency (càng lâu ngày thì CLV càng giảm).
3. **Phân khúc**:
   - **VIP**: CLV dự báo > 10 triệu VND
   - **Cao**: > 3 triệu
   - **Trung bình**: > 1 triệu
   - **Rủi ro mất**: recency > 90 ngày (bất kể CLV)
   - **Thấp**: còn lại
4. **Lưu kết quả** vào bảng `customer_lifetime_values` kèm độ tin cậy (dựa trên tần suất mua ổn định).

## Sử dụng
- Truy cập **Phân tích → CLV (Customer Lifetime Value)**.
- Nhấn **"Tính CLV"** để chạy phân tích (thường mất vài giây).
- Xem tóm tắt phân khúc (thẻ trên cùng) và danh sách khách hàng chi tiết.
- Lọc theo phân khúc bằng cách nhấp vào thẻ tương ứng.

## Tuỳ chỉnh
- Mô hình CLV có thể điều chỉnh trong `clv.service.ts` (công thức, ngưỡng phân khúc, hệ số recency).
- Chạy định kỳ bằng cron job (hiện chưa được tích hợp) để cập nhật dữ liệu hàng tháng.

## Lưu ý
CLV chỉ mang tính tham khảo, không thay thế phân tích tài chính chuyên sâu. Nên kết hợp với dữ liệu chi phí thu hút khách hàng (CAC) để đánh giá ROI chính xác hơn.
