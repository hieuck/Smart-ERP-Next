import { CommerceModule } from '../modules/commerce.module';
import { InfraModule } from '../modules/infra.module';

describe('Domain Modules — Refactoring Validation', () => {
  it('CommerceModule can be instantiated', () => {
    const module = new CommerceModule();
    expect(module).toBeDefined();
  });

  it('InfraModule can be instantiated', () => {
    const module = new InfraModule();
    expect(module).toBeDefined();
  });

  it('CommerceModule imports products module', () => {
    const module = new CommerceModule();
    const metadata = Reflect.getMetadata('imports', CommerceModule);
    expect(metadata).toBeDefined();
    const importNames = metadata.map((m: any) => m.name || m);
    expect(importNames.some((n: string) => n.includes('Products'))).toBeTruthy();
  });

  it('InfraModule imports scheduler module', () => {
    const module = new InfraModule();
    const metadata = Reflect.getMetadata('imports', InfraModule);
    expect(metadata).toBeDefined();
    const importNames = metadata.map((m: any) => m.name || m);
    expect(importNames.some((n: string) => n.includes('Scheduler'))).toBeTruthy();
  });
});
