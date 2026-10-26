import {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validateCredentials,
  validateNewPassword,
  type CredentialFields,
} from '@/features/auth/credentials';

function fields(overrides: Partial<CredentialFields> = {}): CredentialFields {
  return {
    email: 'player@example.com',
    password: 'secret123',
    confirmPassword: 'secret123',
    ...overrides,
  };
}

describe('validateCredentials', () => {
  it('accepts a complete login form without checking the password length', () => {
    expect(validateCredentials('login', fields({ password: 'x' }))).toBeNull();
  });

  it('accepts a complete create form', () => {
    expect(validateCredentials('create', fields())).toBeNull();
  });

  it('asks for an email address', () => {
    expect(validateCredentials('login', fields({ email: '   ' }))).toBe(
      'Enter your email address.',
    );
  });

  it('rejects an address without the email shape', () => {
    expect(validateCredentials('login', fields({ email: 'player' }))).toBe(
      'Enter a valid email address.',
    );
  });

  it('asks for a password', () => {
    expect(validateCredentials('create', fields({ password: '' }))).toBe('Enter your password.');
  });

  it('enforces the minimum password length only when creating', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);

    expect(validateCredentials('create', fields({ password: short, confirmPassword: short }))).toBe(
      `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
    );
    expect(validateCredentials('login', fields({ password: short }))).toBeNull();
  });

  it('requires the confirmation to match', () => {
    expect(validateCredentials('create', fields({ confirmPassword: 'different' }))).toBe(
      "Those passwords don't match.",
    );
  });

  it('normalises surrounding whitespace in the address', () => {
    expect(normalizeEmail('  player@example.com ')).toBe('player@example.com');
  });
});

describe('validateNewPassword', () => {
  it('accepts a matching password at the minimum length', () => {
    const password = 'a'.repeat(MIN_PASSWORD_LENGTH);

    expect(validateNewPassword({ password, confirmPassword: password })).toBeNull();
  });

  it('asks for a new password', () => {
    expect(validateNewPassword({ password: '', confirmPassword: '' })).toBe(
      'Enter a new password.',
    );
  });

  it('rejects a password shorter than the minimum', () => {
    const password = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);

    expect(validateNewPassword({ password, confirmPassword: password })).toBe(
      `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
    );
  });

  it('rejects a confirmation that does not match', () => {
    expect(validateNewPassword({ password: 'secret123', confirmPassword: 'different' })).toBe(
      "Those passwords don't match.",
    );
  });
});
