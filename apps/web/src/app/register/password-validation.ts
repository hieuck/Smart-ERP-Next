export interface PasswordValidationResult {
  valid: boolean;
  strength: number;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    digit: boolean;
    special: boolean;
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-=+\[\]\\/]/.test(password),
  };

  const strength = Object.values(checks).filter(Boolean).length;
  const valid = checks.length && checks.uppercase && checks.lowercase && checks.digit && checks.special;

  return { valid, strength, checks };
}
