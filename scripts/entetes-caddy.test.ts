import { describe, expect, it } from 'vitest';
import { entetesDuCaddyfile, lireEntetesCaddy } from './lib/entetes-caddy.ts';

describe('en-têtes lus dans le Caddyfile', () => {
  it('reprend la CSP stricte du site, sans script ni style en ligne', () => {
    const e = lireEntetesCaddy();
    const csp = e['Content-Security-Policy']!;
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toContain('unsafe-inline');
    expect(e['X-Content-Type-Options']).toBe('nosniff');
    expect(e).not.toHaveProperty('Server');
  });

  it('refuse un bloc qu’il ne sait pas lire', () => {
    expect(() => entetesDuCaddyfile('x {\n}\n')).toThrow(/introuvable/);
    expect(() => entetesDuCaddyfile('header {\n\tFoo bar\n}\n')).toThrow(/non reconnue/);
    expect(() => entetesDuCaddyfile('header {\n\tFoo "bar"\n}\n')).toThrow(/Content-Security-Policy/);
  });
});
