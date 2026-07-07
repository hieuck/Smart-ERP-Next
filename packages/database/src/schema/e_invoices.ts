import { pgTable, uuid, text, numeric, timestamp, integer, boolean, index, jsonb, foreignKey } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { orders } from './orders';
import { users } from './users';

/**
 * E-Invoices (Hoa don dien tu) — theo Nghi dinh 123/2020/ND-CP
 * Tich hop voi cac nha cung cap: VNPT, Viettel, MISA, EasyInvoice, etc.
 * Phat hanh, xu ly loi, thay the, huy hoa don
 */
export const eInvoices = pgTable(
  'e_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Thong tin hoa don
    /** So hoa don (ky tu + so thu tu) */
    invoiceNumber: text('invoice_number'),
    /** Ky hieu mau hoa don (VD: 01GTKT0/001) */
    invoiceTemplate: text('invoice_template').notNull().default('01GTKT0/001'),
    /** Ky hieu hoa don (VD: AA/24E) */
    invoiceSeries: text('invoice_series').notNull(),
    /** Ngay ky/phat hanh */
    issuedAt: timestamp('issued_at'),
    /** Ngay tao (draft) */
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

    // Trang thai
    /** draft | signed | issued | cancelled | replaced | adjusted */
    status: text('status', {
      enum: ['draft', 'signed', 'issued', 'cancelled', 'replaced', 'adjusted'],
    }).notNull().default('draft'),

    // Lien ket
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

    // Thong tin khach hang
    buyerName: text('buyer_name').notNull(),
    buyerTaxCode: text('buyer_tax_code'),
    buyerAddress: text('buyer_address'),
    buyerEmail: text('buyer_email'),
    buyerPhone: text('buyer_phone'),
    buyerBankAccount: text('buyer_bank_account'),

    // Gia tri hoa don
    subtotal: numeric('subtotal', { precision: 18, scale: 2 }).notNull().default('0'),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('10'),
    vatAmount: numeric('vat_amount', { precision: 18, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 18, scale: 2 }).default('0'),
    totalAmount: numeric('total_amount', { precision: 18, scale: 2 }).notNull(),

    // Don vi tien te
    currency: text('currency').notNull().default('VND'),
    exchangeRate: numeric('exchange_rate', { precision: 18, scale: 6 }).default('1'),

    // Nha cung cap hoa don dien tu
    /** vnpt | viettel | misa | easy_invoice | bkav | soft_dreams */
    provider: text('provider').notNull().default('vnpt'),
    /** Ma giao dich tra ve tu nha cung cap */
    providerTransactionId: text('provider_transaction_id'),
    /** XML hoa don goc (luu tru phap ly) */
    invoiceXml: text('invoice_xml'),
    /** URL xem hoa don (PDF/HTML) */
    viewUrl: text('view_url'),
    /** URL tai PDF */
    pdfUrl: text('pdf_url'),
    /** Ma QR code */
    qrCode: text('qr_code'),
    /** Ma tra cuu (MCQuan) */
    lookupCode: text('lookup_code'),
    /** Thong bao loi tu co quan thue */
    taxAuthorityError: text('tax_authority_error'),

    // Hoa don thay the/dieu chinh
    /** Hoa don bi thay the boi hoa don nay */
    replacesInvoiceId: uuid('replaces_invoice_id'),
    /** Hoa don goc (neu la hoa don dieu chinh) */
    adjustsInvoiceId: uuid('adjusts_invoice_id'),
    /** Ly do huy/thay the/dieu chinh */
    cancellationReason: text('cancellation_reason'),

    // Du lieu dong them (items snapshot)
    lineItems: jsonb('line_items'),

    // Ghi chu noi bo
    notes: text('notes'),
  },
  (table) => ({
    tenantIdx: index('einv_tenant_idx').on(table.tenantId),
    statusIdx: index('einv_status_idx').on(table.tenantId, table.status),
    orderIdx: index('einv_order_idx').on(table.orderId),
    customerIdx: index('einv_customer_idx').on(table.customerId),
    invoiceNumberIdx: index('einv_number_idx').on(table.tenantId, table.invoiceNumber),
    issuedAtIdx: index('einv_issued_at_idx').on(table.tenantId, table.issuedAt),
    replacesInvoiceIdx: index('einv_replaces_invoice_idx').on(table.tenantId, table.replacesInvoiceId),
    adjustsInvoiceIdx: index('einv_adjusts_invoice_idx').on(table.tenantId, table.adjustsInvoiceId),
    replacesInvoiceFk: foreignKey({
      columns: [table.replacesInvoiceId],
      foreignColumns: [table.id],
      name: 'e_invoices_replaces_invoice_id_fk',
    }).onDelete('set null'),
    adjustsInvoiceFk: foreignKey({
      columns: [table.adjustsInvoiceId],
      foreignColumns: [table.id],
      name: 'e_invoices_adjusts_invoice_id_fk',
    }).onDelete('set null'),
  })
);

export type EInvoice = typeof eInvoices.$inferSelect;
export type NewEInvoice = typeof eInvoices.$inferInsert;

/**
 * E-Invoice Line Items — chi tiet hang hoa dich vu
 * Luu rieng de query, bao cao theo dong hang hoa
 */
export const eInvoiceItems = pgTable(
  'e_invoice_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => eInvoices.id, { onDelete: 'cascade' }),
    /** Ten hang hoa/dich vu */
    itemName: text('item_name').notNull(),
    /** Don vi tinh (cai, kg, chiec, ...) */
    unit: text('unit'),
    /** So luong */
    quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
    /** Don gia chua thue */
    unitPrice: numeric('unit_price', { precision: 18, scale: 2 }).notNull(),
    /** Ty le chiet khau */
    discountRate: numeric('discount_rate', { precision: 5, scale: 2 }).default('0'),
    /** Thanh tien chua thue */
    subtotal: numeric('subtotal', { precision: 18, scale: 2 }).notNull(),
    /** Ty le VAT (0, 5, 10, khong chiu thue) */
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('10'),
    /** Tien thue VAT */
    vatAmount: numeric('vat_amount', { precision: 18, scale: 2 }).notNull(),
    /** Thanh tien bao gom thue */
    totalAmount: numeric('total_amount', { precision: 18, scale: 2 }).notNull(),
    /** Thu tu dong */
    sequenceOrder: integer('sequence_order').default(0),
  },
  (table) => ({
    invoiceIdx: index('einv_items_invoice_idx').on(table.invoiceId),
    tenantIdx: index('einv_items_tenant_idx').on(table.tenantId),
  })
);

export type EInvoiceItem = typeof eInvoiceItems.$inferSelect;
export type NewEInvoiceItem = typeof eInvoiceItems.$inferInsert;
