const { readFileSync } = require('node:fs');
const path = require('node:path');

describe('compliance pages', () => {
  it('privacy page contains required compliance sections', () => {
    const file = path.join(__dirname, 'privacy', 'page.tsx');
    const contents = readFileSync(file, 'utf-8');

    expect(contents).toMatch(/Bên kiểm soát dữ liệu/);
    expect(contents).toMatch(/Thời gian lưu giữ/);
    expect(contents).toMatch(/Quyền của người dùng/);
    expect(contents).toMatch(/Cookie/);
    expect(contents).toMatch(/Bảo mật/);
    expect(contents).toMatch(/Lưu ý pháp lý/);
  });

  it('terms page contains required compliance sections', () => {
    const file = path.join(__dirname, 'terms', 'page.tsx');
    const contents = readFileSync(file, 'utf-8');

    expect(contents).toMatch(/Chấp nhận điều khoản/);
    expect(contents).toMatch(/Giới hạn trách nhiệm/);
    expect(contents).toMatch(/Luật áp dụng/);
    expect(contents).toMatch(/Chấm dứt/);
    expect(contents).toMatch(/Đăng ký, thanh toán và hoàn tiền/);
    expect(contents).toMatch(/Lưu ý pháp lý/);
  });
});
