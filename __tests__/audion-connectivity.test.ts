import { describe, expect, it, afterEach } from 'vitest';
import {
  formatAudionHttpFailure,
  formatAudionMisconfigHint,
  getAudionUrlDiagnostics,
  isAudionHtmlOrLoginRedirect,
} from '@/lib/integrations/audion-connectivity';

describe('audion-connectivity', () => {
  const originalApiUrl = process.env.AUDION_API_URL;
  const originalToken = process.env.AUDION_API_TOKEN;

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.AUDION_API_URL;
    else process.env.AUDION_API_URL = originalApiUrl;
    if (originalToken === undefined) delete process.env.AUDION_API_TOKEN;
    else process.env.AUDION_API_TOKEN = originalToken;
  });

  it('detects HTML login redirect bodies', () => {
    expect(isAudionHtmlOrLoginRedirect('text/html', '<html><body>login</body></html>')).toBe(true);
    expect(isAudionHtmlOrLoginRedirect('application/json', '{"ok":true}')).toBe(false);
  });

  it('accepts public /api base when AUDION_API_URL is explicit', () => {
    process.env.AUDION_API_URL = 'https://audion.projects-a.plygrnd.tech/api';
    process.env.AUDION_API_TOKEN = 'audion_' + 'a'.repeat(64);
    const diag = getAudionUrlDiagnostics();
    expect(diag.apiUrlExplicit).toBe(true);
    expect(diag.looksLikeWebApp).toBe(false);
  });

  it('flags bare web origin without /api', () => {
    process.env.AUDION_API_URL = 'https://audion.projects-a.plygrnd.tech';
    const diag = getAudionUrlDiagnostics();
    expect(diag.looksLikeWebApp).toBe(true);
  });

  it('fallback api url includes /api when env unset', () => {
    delete process.env.AUDION_API_URL;
    const diag = getAudionUrlDiagnostics();
    expect(diag.apiUrlExplicit).toBe(false);
    expect(diag.looksLikeWebApp).toBe(false);
    expect(diag.apiUrlPrefix).toContain('/api');
  });

  it('formats 404 HTML as missing route (audion-v3)', () => {
    const msg = formatAudionHttpFailure(
      404,
      'text/html',
      '<!doctype html><a href="/login">',
      'AUDION Zielgruppen'
    );
    expect(msg).toContain('Route fehlt');
    expect(msg).toContain('personas/generate');
  });

  it('formats non-404 HTML as web-app URL misconfig', () => {
    const msg = formatAudionHttpFailure(
      302,
      'text/html',
      '<!doctype html><a href="/login">',
      'AUDION Zielgruppen'
    );
    expect(msg).toContain('Login-Redirect');
    expect(msg).toContain('/api');
  });
});
