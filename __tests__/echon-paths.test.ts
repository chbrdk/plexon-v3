import { describe, expect, it, afterEach } from 'vitest';
import {
  echonIntegrationUrl,
  echonResearchRunsPath,
  getEchonApiBaseUrl,
  getEchonQuickCheckApiBaseCandidates,
  getEchonServerApiBaseUrl,
  isEchonServerIntegrationConfigured,
} from '@/lib/paths/echon-api';

describe('echon-api paths', () => {
  const orig = process.env.ECHON_API_URL;

  afterEach(() => {
    if (orig !== undefined) process.env.ECHON_API_URL = orig;
    else delete process.env.ECHON_API_URL;
  });

  it('uses env override for API base', () => {
    process.env.ECHON_API_URL = 'http://echon-v2-api:8000';
    expect(getEchonApiBaseUrl()).toBe('http://echon-v2-api:8000');
    expect(getEchonServerApiBaseUrl()).toBe('http://echon-v2-api:8000');
    expect(isEchonServerIntegrationConfigured()).toBe(true);
    expect(echonIntegrationUrl(echonResearchRunsPath())).toBe(
      'http://echon-v2-api:8000/api/v2/research/runs'
    );
  });

  it('server integration requires explicit ECHON_API_URL', () => {
    delete process.env.ECHON_API_URL;
    expect(getEchonServerApiBaseUrl()).toBeNull();
    expect(isEchonServerIntegrationConfigured()).toBe(false);
  });

  it('quick check API candidates include env then public fallback', () => {
    process.env.ECHON_API_URL = 'http://echon-v2-api:8000';
    expect(getEchonQuickCheckApiBaseCandidates()).toEqual([
      'http://echon-v2-api:8000',
      'https://echon.projects-a.plygrnd.tech/echon',
    ]);
    delete process.env.ECHON_API_URL;
    expect(getEchonQuickCheckApiBaseCandidates()).toEqual([
      'https://echon.projects-a.plygrnd.tech/echon',
    ]);
  });
});
