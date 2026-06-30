/**
 * Security Headers Audit
 *
 * Verifies that the API application has all required security headers configured.
 * These are set by helmet() middleware in main.ts.
 */
import { Helmet } from '../common/config/helmet-config';

describe('Security headers', () => {
  it('CSP default-src is restricted to self', () => {
    const config = Helmet;
    expect(config.contentSecurityPolicy.directives.defaultSrc).toContain("'self'");
  });

  it('CSP object-src is none', () => {
    const config = Helmet;
    expect(config.contentSecurityPolicy.directives.objectSrc).toContain("'none'");
  });

  it('CSP frame-src is none', () => {
    const config = Helmet;
    expect(config.contentSecurityPolicy.directives.frameSrc).toContain("'none'");
  });

  it('CSP upgrade-insecure-requests is enabled', () => {
    const config = Helmet;
    expect(config.contentSecurityPolicy.directives.upgradeInsecureRequests).toBeDefined();
  });

  it('Helmet reference must be importable without errors', () => {
    expect(Helmet).toBeDefined();
    expect(Helmet.contentSecurityPolicy).toBeDefined();
  });
});
