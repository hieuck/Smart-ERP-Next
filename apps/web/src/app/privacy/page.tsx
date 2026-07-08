import Link from 'next/link';

export const metadata = {
  title: 'Quyền riêng tư',
  description: 'Chính sách quyền riêng tư của Smart ERP Next.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
          Smart ERP Next
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Chính sách quyền riêng tư</h1>
        <p className="mt-2 text-sm text-slate-400">Cập nhật lần cuối: 08/07/2026</p>

        <div className="mt-8 space-y-8 text-slate-300">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Bên kiểm soát dữ liệu</h2>
            <p className="mt-2">
              Smart ERP Next là bên kiểm soát dữ liệu đối với thông tin được xử lý thông qua nền tảng ERP. Đơn vị vận hành cụ thể (doanh nghiệp triển khai) chịu trách nhiệm cấu hình môi trường production, xác định người dùng được phép và đảm bảo tuân thủ pháp luật địa phương.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Dữ liệu chúng tôi thu thập</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Thông tin tài khoản: email, tên, mật khẩu (được mã hóa) và vai trò.</li>
              <li>Thông tin doanh nghiệp: tên công ty, mã số thuế, địa chỉ, số điện thoại.</li>
              <li>Dữ liệu nghiệp vụ: đơn hàng, sản phẩm, kho, khách hàng, nhà cung cấp, hóa đơn, báo cáo.</li>
              <li>Dữ liệu kỹ thuật: địa chỉ IP, loại trình duyệt, nhật ký hoạt động và cookie cần thiết.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Mục đích sử dụng dữ liệu</h2>
            <p className="mt-2">
              Dữ liệu được sử dụng để xác thực người dùng, phân quyền, tách biệt dữ liệu theo tenant, vận hành hệ thống ERP, tạo báo cáo và cải thiện trải nghiệm sử dụng. Chúng tôi không bán dữ liệu cá nhân cho bên thứ ba.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Thời gian lưu giữ</h2>
            <p className="mt-2">
              Dữ liệu tài khoản được lưu giữ cho đến khi người dùng xóa tài khoản hoặc quản trị viên tenant yêu cầu xóa. Dữ liệu nghiệp vụ được lưu giữ theo chính sách lưu trữ của doanh nghiệp vận hành và các yêu cầu pháp lý áp dụng.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Quyền của người dùng</h2>
            <p className="mt-2">Tùy thuộc vào quyền được cấp, người dùng có thể:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Truy cập và chỉnh sửa thông tin cá nhân trong phần hồ sơ.</li>
              <li>Yêu cầu xuất dữ liệu hoặc xóa dữ liệu cá nhân.</li>
              <li>Rút lại sự đồng ý đối với các tính năng tùy chọn.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Cookie và công nghệ tương tự</h2>
            <p className="mt-2">
              Hệ thống sử dụng cookie cần thiết để duy trì phiên đăng nhập, lưu ngôn ngữ và giao diện ưa thích. Cookie của bên thứ ba chỉ được sử dụng khi được tích hợp rõ ràng và có sự đồng ý.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Bảo mật</h2>
            <p className="mt-2">
              Chúng tôi áp dụng mã hóa mật khẩu, xác thực JWT, phân quyền theo vai trò, tách biệt dữ liệu theo tenant và khuyến nghị triển khai HTTPS, sao lưu định kỳ và giám sát bảo mật.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Liên hệ</h2>
            <p className="mt-2">
              Để đặt câu hỏi về quyền riêng tư hoặc thực hiện quyền của mình, vui lòng liên hệ quản trị viên của tổ chức bạn hoặc gửi email đến địa chỉ hỗ trợ được cấu hình trong hệ thống.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Lưu ý pháp lý</h2>
            <p className="mt-2">
              Nội dung này là mẫu chính sách quyền riêng tư và cần được luật sư hoặc chuyên gia tuân thủ pháp lý xem xét trước khi công bố production.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-3">
          <Link href="/register" className="rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300">
            Đăng ký sử dụng
          </Link>
          <Link href="/terms" className="rounded-md border border-white/20 px-4 py-2 font-semibold text-white hover:bg-white/10">
            Điều khoản sử dụng
          </Link>
        </div>
      </div>
    </main>
  );
}
