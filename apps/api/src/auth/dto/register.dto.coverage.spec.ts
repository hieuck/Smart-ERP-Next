import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './index';

describe('RegisterDto password strength', () => {
  const validPayload = {
    email: 'user@example.com',
    name: 'Nguyen Van A',
    password: 'StrongPass1!',
    companyName: 'ABC',
  };

  it.each([
    ['password', 'all lowercase'],
    ['PASSWORD', 'all uppercase'],
    ['Password', 'missing number and special'],
    ['Password1', 'missing special character'],
    ['Pass1!', 'too short'],
    ['12345678', 'only numbers'],
  ])('rejects weak password "%s" (%s)', async (password, _description) => {
    const dto = plainToInstance(RegisterDto, { ...validPayload, password });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const passwordErrors = errors.filter((e) => e.property === 'password');
    expect(passwordErrors.length).toBeGreaterThan(0);
  });

  it('accepts a strong password', async () => {
    const dto = plainToInstance(RegisterDto, validPayload);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
