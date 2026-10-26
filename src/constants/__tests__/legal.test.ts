import { parsePrivacyUrl, parseSupportEmail } from '@/constants/legal';

describe('parseSupportEmail', () => {
  it('accepts a plausible published address', () => {
    expect(parseSupportEmail('support@plasticatch.app')).toBe('support@plasticatch.app');
    expect(parseSupportEmail('  hello@example.org ')).toBe('hello@example.org');
  });

  it('hides the row for a missing or malformed value', () => {
    expect(parseSupportEmail(undefined)).toBeNull();
    expect(parseSupportEmail('')).toBeNull();
    expect(parseSupportEmail('not-an-address')).toBeNull();
    expect(parseSupportEmail('mailto:support@example.org')).toBeNull();
  });
});

describe('parsePrivacyUrl', () => {
  it('accepts an absolute HTTPS URL', () => {
    expect(parsePrivacyUrl('https://example.org/privacy')).toBe('https://example.org/privacy');
  });

  it('hides the row for anything else', () => {
    expect(parsePrivacyUrl(undefined)).toBeNull();
    expect(parsePrivacyUrl('http://example.org/privacy')).toBeNull();
    expect(parsePrivacyUrl('/privacy')).toBeNull();
    expect(parsePrivacyUrl('not a url')).toBeNull();
  });
});
