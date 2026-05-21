jest.mock('uuid', () => ({ v4: jest.fn(() => 'uuid-test') }));

import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

describe('AppModule coverage', () => {
  it('applies tenant middleware to every route', () => {
    const forRoutes = jest.fn();
    const consumer = {
      apply: jest.fn(() => ({ forRoutes })),
    };

    new AppModule().configure(consumer as any);

    expect(consumer.apply).toHaveBeenCalledWith(TenantMiddleware);
    expect(forRoutes).toHaveBeenCalledWith({ path: '*', method: RequestMethod.ALL });
  });
});
