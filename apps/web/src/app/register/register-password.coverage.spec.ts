import fs from 'node:fs';
import path from 'node:path';

describe('register page password complexity', () => {
  const filePath = path.join(__dirname, 'page.tsx');

  it('exists and includes password complexity checks', () => {
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toMatch(/passwordChecks/);
    expect(content).toMatch(/uppercase/);
    expect(content).toMatch(/lowercase/);
    expect(content).toMatch(/digit/);
    expect(content).toMatch(/special/);
    expect(content).toMatch(/passwordStrength/);
  });

  it('rejects weak passwords before submitting', () => {
    const filePath = path.join(__dirname, 'page.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toMatch(/auth\.passwordComplexity/);
    expect(content).toMatch(/setError\(t\('auth\.passwordComplexity'\)\)/);
  });

  it('exports a password validation helper that rejects weak passwords', () => {
    const helperPath = path.join(__dirname, 'password-validation.ts');
    expect(fs.existsSync(helperPath)).toBe(true);
    const helper = require(helperPath) as {
      validatePassword: (password: string) => { valid: boolean; strength: number; checks: Record<string, boolean> };
    };

    expect(helper.validatePassword('password').valid).toBe(false);
    expect(helper.validatePassword('Password1').valid).toBe(false);
    expect(helper.validatePassword('Password1!').valid).toBe(true);
  });
});
