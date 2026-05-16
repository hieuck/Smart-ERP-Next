# Smart ERP Next - New Modules Documentation

This document specifies the APIs and internal structures for the newly engineered modules.

## CRM & Sales Pipeline `/crm`
Manages the end-to-end sales lifecycle, from initial contact to closed deals, utilizing a drag-and-drop Kanban interface and AI-driven scoring.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/crm/leads` | List all pipeline leads |
| POST   | `/crm/leads` | Create a new lead |
| PATCH  | `/crm/leads/:id/status` | Move lead to a different stage (new/contacted/won) |

**Schema (`leads` table):**
- `status`: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
- `score`: AI computed or manual probability score (0-100)

---

## E-Invoice `/e-invoice`
Hệ thống xử lý hóa đơn điện tử tuân thủ hoàn toàn Thông tư 78 và Nghị định 123/2020/NĐ-CP. Kết nối trực tiếp với các nhà cung cấp (VNPT, Misa, Viettel) thông qua cấu hình provider.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/e-invoice` | Liệt kê danh sách hóa đơn (nháp và đã phát hành) |
| POST   | `/e-invoice` | Tạo nháp hóa đơn từ Đơn hàng (Sales Order) |
| PATCH  | `/e-invoice/:id/issue` | Ký số và gửi dữ liệu lên Cơ quan Thuế (CQT) |

---

## Hợp đồng Điện tử `/e-contracts`
Phân hệ e-Contract cho phép doanh nghiệp B2B tạo, gửi và ký số hợp đồng ngay trên nền tảng Smart ERP mà không cần bên thứ ba.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/e-contracts` | Liệt kê các hợp đồng điện tử |
| POST   | `/e-contracts` | Khởi tạo hợp đồng mới từ CRM Lead hoặc Customer |
| PATCH  | `/e-contracts/:id/sign` | Thực hiện ký số (Xác thực OTP/Token/Chữ ký ảnh) |

**Cấu trúc dữ liệu:**
- `signature_data`: Lưu trữ tọa độ chữ ký, IP người ký và log bằng chứng pháp lý.

**Hỗ trợ Mobile Native:**
- Người dùng có thể xem danh sách hợp đồng và thực hiện ký số trực tiếp trên ứng dụng di động thông qua màn hình `EContractScreen`.
- Hỗ trợ ký bằng chữ ký ảnh hoặc xác thực OTP trực tiếp trên thiết bị cầm tay.

---

## HR & Payroll `/hr`
Hệ thống nhân sự thế hệ mới, tích hợp chấm công GPS và tự động hóa bảng lương.

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/hr/attendance/shifts` | Thiết lập ca làm việc và khung giờ |
| POST   | `/hr/attendance/check-in` | Chấm công qua App (GPS + Xác thực vị trí) |
| POST   | `/hr/payroll/boards/generate` | Tự động tính toán lương thực nhận dựa trên công và OT |
| GET    | `/hr/payroll/my-payslips` | Xem phiếu lương trực tiếp trên Mobile App |

---

## Workflow Automation Engine `/automations` (Lõi hệ thống)
Cỗ máy No-code cho phép người dùng tự định nghĩa các quy trình tự động hóa mà không cần can thiệp vào mã nguồn.

**Cơ chế hoạt động:**
- `triggerEvent`: Sự kiện kích hoạt (Ví dụ: `invoice.issued`, `employee.late`).
- `conditions`: Điều kiện lọc theo định dạng JSONB (Ví dụ: `{"totalAmount": { ">": 10000000 } }`).
- `actions`: Mảng các hành động thực thi (Gửi Email, Thông báo App, Cập nhật trạng thái CRM).

*Lưu ý: Engine thực thi được tích hợp sâu vào lifecycle của NestJS và Drizzle ORM.*

---

## Omnichannel E-commerce `/ecommerce`
Hệ thống kết nối đa sàn thương mại điện tử, tự động đồng bộ tồn kho và đơn hàng từ Shopee, Lazada, TikTok Shop, Amazon, eBay.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/ecommerce/stores` | Liệt kê các cửa hàng đã kết nối |
| POST   | `/ecommerce/stores` | Kết nối cửa hàng mới (Cung cấp API Key/Secret) |
| POST   | `/ecommerce/sync/all` | Kích hoạt đồng bộ tồn kho & đơn hàng cho toàn bộ hệ thống |
| GET    | `/ecommerce/logs` | Xem nhật ký đồng bộ (Success/Failed) |

---

## Omnichannel Messaging `/omnichannel`
Giải pháp Social Commerce tích hợp, cho phép chat trực tiếp với khách hàng từ Facebook, Zalo, Web Chat ngay trên ERP.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/omnichannel/messages` | Lấy lịch sử hội thoại với khách hàng |
| POST   | `/omnichannel/messages` | Gửi tin nhắn phản hồi tới khách hàng trên mạng xã hội |

**Tính năng nổi bật:**
- **Identity Resolution**: Tự động nhận diện khách hàng cũ dựa trên ID mạng xã hội để hiển thị lịch sử mua hàng ngay trong cửa sổ chat.
- **Conversion**: Chốt đơn trực tiếp từ hội thoại chat, tự động tạo Đơn hàng trong ERP.

---

## Quy trình Phê duyệt Đa cấp `/approvals`
Hệ thống quản lý quy trình phê duyệt động cho các chứng từ quan trọng (Đơn mua hàng, Nghỉ phép, Thanh toán).

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST   | `/approvals/requests` | Gửi một chứng từ đi phê duyệt |
| GET    | `/approvals/pending` | Liệt kê các yêu cầu đang chờ người dùng hiện tại duyệt |
| POST   | `/approvals/requests/:id/approve` | Thực hiện phê duyệt bước hiện tại |
| POST   | `/approvals/requests/:id/reject` | Từ chối yêu cầu và kết thúc quy trình |

**Điểm vượt trội:**
- **Native Mobile Approval**: Cấp quản lý có thể duyệt nhanh ngay trên App thông qua màn hình `ApprovalsScreen`.
- **Dynamic Rules**: Tự động xác định luồng duyệt dựa trên giá trị chứng từ (Ví dụ: PO > 100tr cần thêm CEO duyệt).

---

## Quản lý Dịch vụ Hiện trường (Field Service) `/field-service`
Giải pháp quản lý đội ngũ kỹ thuật hiện trường, tối ưu hóa quá trình sửa chữa, bảo trì tại điểm khách hàng.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/field-service/tickets` | Liệt kê danh sách phiếu dịch vụ (tự động lọc theo Technician) |
| POST   | `/field-service/tickets` | Tạo mới phiếu dịch vụ và phân công kỹ thuật viên |
| PATCH  | `/field-service/tickets/:id/check-in` | Ghi nhận sự hiện diện của kỹ thuật viên tại địa điểm khách hàng (GPS) |
| PATCH  | `/field-service/tickets/:id/complete` | Hoàn tất phiếu dịch vụ, kèm báo cáo và chữ ký khách hàng |

**Tính năng vượt trội:**
- **GPS Verification**: Ngăn chặn gian lận check-in ảo bằng cách đối chiếu vị trí thực tế của kỹ thuật viên với địa chỉ khách hàng.
- **Offline Mode Ready**: Kỹ thuật viên có thể xem thông tin phiếu và ghi chú ngay cả khi mất kết nối mạng (Native Mobile advantage).
- **Integrated CRM**: Tự động lưu lịch sử sửa chữa vào hồ sơ khách hàng để hỗ trợ bảo hành và CSKH.

---

## Quản lý Tài sản Cố định & Khấu hao (Fixed Assets) `/fixed-assets`
Phân hệ quản lý vòng đời tài sản, từ khâu mua sắm, theo dõi vị trí đến tự động tính toán khấu hao hàng tháng.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/fixed-assets` | Liệt kê và tìm kiếm tài sản cố định |
| POST   | `/fixed-assets` | Khai báo tài sản mới (Giá mua, thời gian sử dụng, giá trị thanh lý) |
| POST   | `/fixed-assets/run-depreciation` | **Hành động 1-click**: Tự động tính và hạch toán khấu hao cho toàn bộ tài sản trong tháng |
| POST   | `/fixed-assets/:id/dispose` | Thanh lý tài sản |

**Tính năng vượt trội:**
- **Automated Depreciation Schedule**: Không còn phải tính toán thủ công trên Excel. Hệ thống tự động tạo các bút toán khấu hao hàng tháng dựa trên phương pháp đường thẳng.
- **Asset Maintenance Link**: Tích hợp trực tiếp với phân hệ `Field Service` để quản lý lịch bảo trì định kỳ cho máy móc, thiết bị.

---

## Phân tích Thông minh (BI) & Dự báo AI `/insights`
Trung tâm chỉ huy dành cho lãnh đạo, chuyển đổi dữ liệu thô thành các quyết định chiến lược thông qua biểu đồ và trí tuệ nhân tạo.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/insights/dashboard` | Tổng hợp dữ liệu BI: Doanh thu, Xu hướng, Kho hàng và Dự báo AI |

**Tính năng vượt trội:**
- **Native BI Dashboard**: Hiển thị biểu đồ xu hướng doanh thu ngay trên Mobile mà không cần qua bên thứ ba (Native advantage over Odoo web views).
- **AI Revenue Prediction**: Sử dụng thuật toán Linear Regression để dự báo doanh thu tháng tới dựa trên dữ liệu lịch sử 3 tháng gần nhất.
- **Smart Insights Overlay**: Tự động đưa ra các cảnh báo thông minh (Growth, Warning, Stock Alert) giúp lãnh đạo phản ứng kịp thời với biến động thị trường.

---

## Sản xuất Thông minh (Smart Manufacturing/MRP) `/manufacturing`
Giải pháp quản lý sản xuất toàn diện từ định mức nguyên vật liệu (BOM) đến quản lý xưởng sản xuất (Shop Floor).

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/manufacturing/orders` | Danh sách lệnh sản xuất |
| POST   | `/manufacturing/orders` | Tạo lệnh sản xuất mới, tự động tính toán nhu cầu vật tư |
| PATCH  | `/manufacturing/orders/:id/progress` | **Shop Floor Update**: Công nhân cập nhật sản lượng thực tế ngay tại xưởng qua Mobile |
| PATCH  | `/manufacturing/orders/:id/complete` | Hoàn tất lệnh, tự động nhập kho thành phẩm và trừ kho nguyên liệu |

**Tính năng vượt trội:**
- **Real-time Shop Floor**: Công nhân sử dụng Mobile để báo cáo sản lượng và phế phẩm, giúp ban lãnh đạo nắm bắt tiến độ sản xuất tức thì thay vì chờ báo cáo giấy.
- **Auto-Inventory Sync**: Cơ chế tự động trừ kho nguyên liệu (Backflushing) và cộng kho thành phẩm chính xác, giảm thiểu sai sót kiểm kho.
- **QC Integrated**: Tích hợp các điểm kiểm tra chất lượng (Quality Checkpoints) ngay trong quá trình sản xuất.

---

## Quản lý Dự án & Timesheets `/projects`
Giải pháp quản lý dự án tập trung, kết hợp giữa theo dõi tiến độ công việc và phân tích hiệu quả kinh tế (Profitability).

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/projects` | Danh sách các dự án đang triển khai |
| POST   | `/projects/:id/timesheets` | **Mobile Timesheet**: Nhân viên ghi nhận giờ làm việc ngay trên App |
| GET    | `/projects/:id/profitability` | **Phân tích Lợi nhuận**: So sánh ngân sách với chi phí nhân công thực tế từ Timesheet |

**Tính năng vượt trội:**
- **Financial Project Tracking**: Không chỉ quản lý Task, hệ thống tự động tính toán giá trị giờ công để báo cáo lợi nhuận gộp (Gross Profit) của từng dự án theo thời gian thực.
- **Native Timesheet App**: Giao diện Mobile tối ưu giúp nhân viên hiện trường ghi nhận giờ làm việc chỉ trong 30 giây, tăng độ chính xác cho việc tính lương và hóa đơn khách hàng.
- **AI Task Summarizer Ready**: Sẵn sàng tích hợp AI để tóm tắt các cuộc thảo luận dài trong Task thành các gạch đầu dòng hành động.

---

## Quản lý Hiệu suất & KPI (HR Performance) `/hr/performance`
Giải pháp quản trị nguồn nhân lực hiện đại theo mục tiêu (MBO), tích hợp KPI và đánh giá 360 độ.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/hr/performance/my-kpis` | Nhân viên xem danh sách mục tiêu và tiến độ KPI cá nhân |
| PATCH  | `/hr/performance/kpis/:id` | **KPI Update**: Cập nhật giá trị thực tế của chỉ số KPI từ Mobile |
| POST   | `/hr/performance/reviews` | Khởi tạo đợt đánh giá hiệu suất nhân viên |

**Tính năng vượt trội:**
- **Goal-Driven Culture**: Tự động hóa việc theo dõi mục tiêu (KPI/OKR), giúp nhân viên luôn nắm rõ trọng tâm công việc và manager theo dõi hiệu suất tức thì.
- **Mobile-First Review**: Thực hiện tự đánh giá (Self-assessment) và phản hồi của quản lý ngay trên ứng dụng di động, loại bỏ quy trình giấy tờ phiền hà.
- **Dynamic Scoring**: Thuật toán tự động tính điểm hiệu suất dựa trên trọng số (Weight) và kết quả thực tế, sẵn sàng kết nối với phân hệ tính lương để thưởng hiệu quả.

---

## Quản lý Chuỗi cung ứng & Dự báo (SCM) `/scm`
Giải pháp tối ưu hóa tồn kho thông qua dự báo nhu cầu và quản lý hiệu quả nhà cung cấp.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET    | `/scm/suggestions` | Danh sách các gợi ý nhập hàng do AI tính toán |
| POST   | `/scm/suggestions/run` | Chạy Engine phân tích dữ liệu lịch sử để dự báo nhu cầu |
| PATCH  | `/scm/suggestions/:id/approve` | Duyệt gợi ý, tự động khởi tạo Đơn mua hàng nháp (Draft PO) |

**Tính năng vượt trội:**
- **Predictive Procurement**: Sử dụng AI để phân tích tốc độ bán hàng (Sales Velocity) và thời gian giao hàng của nhà cung cấp (Lead Time) để gợi ý thời điểm nhập hàng tối ưu.
- **Stockout Prevention**: Cảnh báo sớm các nguy cơ hết hàng trước khi nó xảy ra, giúp doanh nghiệp không bỏ lỡ cơ hội kinh doanh.
- **Supplier Reliability Tracking**: Tự động đánh giá độ tin cậy của nhà cung cấp dựa trên thực tế giao hàng, hỗ trợ ra quyết định lựa chọn đối tác cung ứng.
