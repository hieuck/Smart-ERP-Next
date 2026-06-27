import { Injectable, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import * as schema from '@smart-erp/database/schema';

interface OnboardingState {
  companyInfo?: {
    name: string;
    address?: string;
    taxCode?: string;
    phone?: string;
    industry: string;
  };
  status: 'pending' | 'complete';
}

@Injectable()
export class OnboardingService {
  readonly onboardingState = new Map<string, OnboardingState>();

  constructor(private readonly drizzle: DrizzleService) {}

  async getStatus(tenantId: string): Promise<{ status: string }> {
    const state = this.onboardingState.get(tenantId);
    return { status: state?.status || 'pending' };
  }

  async setupCompany(
    tenantId: string,
    dto: { name: string; address?: string; taxCode?: string; phone?: string; industry: string },
  ): Promise<{ status: string; companyInfo: typeof dto }> {
    this.onboardingState.set(tenantId, {
      companyInfo: dto,
      status: 'pending',
    });
    return { status: 'pending', companyInfo: dto };
  }

  async seedIndustryData(
    tenantId: string,
    industry: 'retail' | 'fnb' | 'service',
  ): Promise<Record<string, any>> {
    if (!['retail', 'fnb', 'service'].includes(industry)) {
      throw new BadRequestException(`Invalid industry: ${industry}`);
    }

    switch (industry) {
      case 'retail':
        return this.seedRetail(tenantId);
      case 'fnb':
        return this.seedFnb(tenantId);
      case 'service':
        return this.seedService(tenantId);
    }
  }

  async complete(tenantId: string): Promise<{ status: string }> {
    const state = this.onboardingState.get(tenantId);
    if (!state?.companyInfo) {
      throw new BadRequestException('Must complete company setup first');
    }
    state.status = 'complete';
    return { status: 'complete' };
  }

  private async seedRetail(tenantId: string) {
    const categories = await this.drizzle.db
      .insert(schema.productCategories)
      .values([
        { tenantId, name: 'Điện tử', slug: 'dien-tu', description: 'Điện tử, điện lạnh' },
        { tenantId, name: 'Thời trang', slug: 'thoi-trang', description: 'Quần áo, phụ kiện' },
        { tenantId, name: 'Thực phẩm', slug: 'thuc-pham', description: 'Đồ ăn, thức uống' },
        { tenantId, name: 'Đồ gia dụng', slug: 'do-gia-dung', description: 'Đồ dùng gia đình' },
        { tenantId, name: 'Mỹ phẩm', slug: 'my-pham', description: 'Mỹ phẩm, chăm sóc sắc đẹp' },
      ])
      .returning();

    const catIds = categories.map((c: any) => c.id);
    const products = [];
    const retailProductNames = [
      'Tivi Samsung 55 inch', 'Tủ lạnh LG Inverter', 'Máy giặt Panasonic', 'Điều hòa Daikin',
      'Laptop Dell Inspiron', 'Điện thoại iPhone 15', 'Máy tính bảng iPad', 'Loa Bluetooth JBL',
      'Áo sơ mi nam', 'Quần jeans nữ', 'Váy đầm dự tiệc', 'Áo khoác mùa đông',
      'Áo thun thể thao', 'Nước mắm Phú Quốc', 'Dầu ăn Tường An', 'Gạo ST25',
      'Bột ngọt Ajinomoto', 'Sữa tươi Vinamilk', 'Cà phê Trung Nguyên', 'Trà xanh Ocha',
    ];
    for (let i = 0; i < 20; i++) {
      products.push({
        tenantId,
        name: retailProductNames[i],
        sku: `RET-${String(i + 1).padStart(4, '0')}`,
        categoryId: catIds[i % 5],
        price: String((i + 1) * 100000),
        cost: String((i + 1) * 60000),
        stock: Math.floor(Math.random() * 100) + 10,
      });
    }

    await this.drizzle.db.insert(schema.products).values(products).returning();

    await this.drizzle.db
      .insert(schema.warehouses)
      .values([{ tenantId, code: 'WH-MAIN', name: 'Kho trung tâm', isDefault: true }])
      .returning();

    await this.drizzle.db
      .insert(schema.employees)
      .values([{ tenantId, code: 'EMP-001', name: 'Nhân viên bán hàng', email: `sale-${tenantId.slice(0, 4)}@smarterp.vn`, position: 'Nhân viên bán hàng' }])
      .returning();

    return { industry: 'retail', categories: 5, products: 20, warehouses: 1, employees: 1 };
  }

  private async seedFnb(tenantId: string) {
    await this.drizzle.db
      .insert(schema.productCategories)
      .values([{ tenantId, name: 'Đồ uống', slug: 'do-uong', description: 'Nước giải khát' }])
      .returning();

    const menuItems = [];
    const fnbNames = [
      'Phở bò tái', 'Bún bò Huế', 'Cơm tấm sườn', 'Bánh mì thịt', 'Hủ tiếu Nam Vang',
      'Cà phê sữa đá', 'Trà sữa trân châu', 'Nước cam ép', 'Sinh tố bơ', 'Nước dừa tươi',
    ];
    for (let i = 0; i < 10; i++) {
      menuItems.push({
        tenantId,
        name: fnbNames[i],
        sku: `FNB-${String(i + 1).padStart(3, '0')}`,
        price: String((i + 1) * 15000 + 10000),
        cost: String((i + 1) * 8000 + 5000),
        stock: 100,
      });
    }
    await this.drizzle.db.insert(schema.products).values(menuItems).returning();

    await this.drizzle.db
      .insert(schema.warehouses)
      .values([{ tenantId, code: 'POS-001', name: 'Quầy bán hàng chính', isDefault: true }])
      .returning();

    return { industry: 'fnb', categories: 1, menuItems: 10, warehouses: 1 };
  }

  private async seedService(tenantId: string) {
    const services = [];
    const serviceNames = [
      'Dịch vụ tư vấn quản trị doanh nghiệp',
      'Dịch vụ đào tạo nhân sự',
      'Dịch vụ thiết kế website',
      'Dịch vụ marketing online',
      'Dịch vụ bảo trì hệ thống CNTT',
    ];
    for (let i = 0; i < 5; i++) {
      services.push({
        tenantId,
        name: serviceNames[i],
        sku: `SVC-${String(i + 1).padStart(3, '0')}`,
        price: String((i + 1) * 500000),
        cost: String((i + 1) * 200000),
        stock: 999,
      });
    }
    await this.drizzle.db.insert(schema.products).values(services).returning();

    await this.drizzle.db
      .insert(schema.employees)
      .values([{ tenantId, code: 'EMP-001', name: 'Nhân viên dịch vụ', email: `svc-${tenantId.slice(0, 4)}@smarterp.vn`, position: 'Nhân viên dịch vụ' }])
      .returning();

    await this.drizzle.db
      .insert(schema.projects)
      .values([{ tenantId, name: 'Dự án mẫu', description: 'Khung dự án mẫu cho khách hàng mới', status: 'planning' }])
      .returning();

    return { industry: 'service', services: 5, employees: 1, projectTemplates: 1 };
  }
}
