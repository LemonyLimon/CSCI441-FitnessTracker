import { describe, expect, it } from 'vitest';
import { normalizeReturnTo } from './normalize-return-to.js';

describe('normalizeReturnTo', () => {
  it('accepts root and simple paths', () => {
    expect(normalizeReturnTo('/')).toBe('/');
    expect(normalizeReturnTo('/workouts')).toBe('/workouts');
    expect(normalizeReturnTo('/path?q=1')).toBe('/path?q=1');
  });

  it('returns undefined for missing value', () => {
    expect(normalizeReturnTo(undefined)).toBeUndefined();
    expect(normalizeReturnTo('')).toBeUndefined();
  });

  it('rejects open redirects and schemes', () => {
    expect(() => normalizeReturnTo('//evil')).toThrow(/invalid return path/);
    expect(() => normalizeReturnTo('https://evil')).toThrow(
      /invalid return path/,
    );
    expect(() => normalizeReturnTo('javascript:alert(1)')).toThrow(
      /invalid return path/,
    );
    expect(() => normalizeReturnTo('#frag')).toThrow(/invalid return path/);
  });
});
