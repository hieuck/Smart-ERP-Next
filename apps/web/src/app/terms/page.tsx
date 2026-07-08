import Link from 'next/link';

export const metadata = {
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản sử dụng Smart ERP Next.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
          Smart ERP Next
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Điều khoản sử dụng</h1>
        <p className="mt-2 text-sm text-slate-400">Cập nhật lần cuối: 08/07/2026</p>

        <div className="mt-8 space-y-8 text-slate-300">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Chấp nhận điều khoản</h2>
            <p className="mt-2">
              Bằng việc đăng ký hoặc sử dụng Smart ERP Next, bạn đồng ý tuân thủ các điều khoản này. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Tài khoản và trách nhiệm</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Người dùng có trách nhiệm bảo vệ thông tin đăng nhập và sử dụng mật khẩu mạnh.</li>
              <li>Quản trị viên chịu trách nhiệm phân quyền nội bộ, quản lý tenant và đảm bảo tính chính xác của dữ liệu nghiệp vụ.</li>
              <li>Mỗi tài khoản chỉ được sử dụng bởi một cá nhân, trừ khi được cấu hình khác.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Sử dụng dịch vụ</h2>
            <p className="mt-2">
              Các tính năng ERP, báo cáo và tự động hóa cung cấp thông tin hỗ trợ ra quyết định. Người dùng nên đối chiếu dữ liệu với quy trình vận hành và tư vấn chuyên môn trước khi đưa ra quyết định tài chính hoặc pháp lý.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Đăng ký, thanh toán và hoàn tiền</h2>
            <p className="mt-2">
              Các gói đăng ký, chu kỳ thanh toán và chính sách hoàn tiền được quy định trong hợp đồng hoặc trang giá cụ thể do đơn vị vận hành cung cấp. Thay đổi gói dịch vụ có thể được thực hiện theo chu kỳ thanh toán hiện tại.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Chấm dứt</h2>
            <p className="mt-2">
              Chúng tôi có thể tạm ngưng hoặc chấm dứt tài khoản nếu phát hiện hành vi vi phạm điều khoản, sử dụng trái phép hoặc gây hại đến hệ thống. Người dùng cũng có thể yêu cầu xóa tài khoản theo quy trình của đơn vị vận hành.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Giới hạn trách nhiệm</h2>
            <p className="mt-2">
              Smart ERP Next được cung cấp theo nguyên trạng. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm đối với các thiệt hại gián tiếp, ngẫu nhiên hoặc hậu quả phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Luật áp dụng</h2>
            <p className="mt-2">
              Các điều khoản này chịu sự điều chỉnh của pháp luật nơi đơn vị vận hành đăng ký kinh doanh. Mọi tranh chấp sẽ được giải quyết thông qua thương lượng hoặc cơ quan có thẩm quyền tại địa phương đó.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Thay đổi điều khoản</h2>
            <p className="mt-2">
              Chúng tôi có thể cập nhật điều khoản này theo thời gian. Người dùng sẽ được thông báo về các thay đổi quan trọng và việc tiếp tục sử dụng dịch vụ đồng nghĩa với việc chấp nhận điều khoản mới.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Liên hệ</h2>
            <p className="mt-2">
              Mọi thắc mắc về điều khoản sử dụng vui lòng liên hệ quản trị viên của tổ chức bạn hoặc đơn vị vận hành hệ thống.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Lưu ý pháp lý</h2>
            <p className="mt-2">
              Nội dung này là mẫu điều khoản sử dụng và cần được luật sư hoặc chuyên gia tuân thủ pháp lý xem xét trước khi công bố production.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-3">
          <Link href="/register" className="rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300">
            Đăng ký
          </Link>
          <Link href="/login" className="rounded-md border border-white/20 px-4 py-2 font-semibold text-white hover:bg-white/10">
            Đăng nhập
          </Link>
        </div>
      </div>
    </main>
  );
}
