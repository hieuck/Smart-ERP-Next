import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { PurchasingModule } from '../purchasing/purchasing.module';
import { PaymentsModule } from '../payments/payments.module';
import { CurrenciesModule } from '../currencies/currencies.module';
import { ExchangeRateModule } from '../currencies/exchange-rate.module';
import { EcommerceModule } from '../ecommerce/ecommerce.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { EInvoiceModule } from '../e-invoice/e-invoice.module';

@Module({
  imports: [
    ProductsModule, OrdersModule, InventoryModule,
    CustomersModule, SuppliersModule, PurchasingModule,
    PaymentsModule, CurrenciesModule, ExchangeRateModule,
    EcommerceModule, WarehousesModule, EInvoiceModule,
  ],
  exports: [
    ProductsModule, OrdersModule, InventoryModule,
    CustomersModule, SuppliersModule, PurchasingModule,
    PaymentsModule, CurrenciesModule, ExchangeRateModule,
    EcommerceModule, WarehousesModule, EInvoiceModule,
  ],
})
export class CommerceModule {}
