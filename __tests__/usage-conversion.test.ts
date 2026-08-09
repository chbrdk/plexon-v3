import { describe, it, expect } from 'vitest';
import { tokensFromEvent, getCurrentPeriod } from '@/lib/usage-conversion';

describe('usage-conversion', () => {
  describe('tokensFromEvent', () => {
    it('llm_request: input + 2*output', () => {
      expect(tokensFromEvent('llm_request', { input_tokens: 100, output_tokens: 50 })).toBe(200);
      expect(tokensFromEvent('llm_request', {})).toBe(0);
    });

    it('chat: same as llm_request', () => {
      expect(tokensFromEvent('chat', { input_tokens: 10, output_tokens: 5 })).toBe(20);
    });

    it('scan_wcag: 50 per scan', () => {
      expect(tokensFromEvent('scan_wcag', { scans: 3 })).toBe(150);
      expect(tokensFromEvent('scan_wcag', {})).toBe(50);
    });

    it('scan_screenshot: 5 per page', () => {
      expect(tokensFromEvent('scan_screenshot', { pages: 1 })).toBe(5);
      expect(tokensFromEvent('scan_screenshot', { pages: 4 })).toBe(20);
    });

    it('scan_pagespeed: fixed 20', () => {
      expect(tokensFromEvent('scan_pagespeed', {})).toBe(20);
    });

    it('domain_scan: 50 per page', () => {
      expect(tokensFromEvent('domain_scan', { pages: 2 })).toBe(100);
    });

    it('domain_scan_page: 50 per page unit (Deep Scan, one row per finished URL)', () => {
      expect(tokensFromEvent('domain_scan_page', { pages: 1 })).toBe(50);
      expect(tokensFromEvent('domain_scan_page', {})).toBe(50);
    });

    it('domain_scan_page: 5 per page when reused_unchanged', () => {
      expect(tokensFromEvent('domain_scan_page', { pages: 1, reused_unchanged: true })).toBe(5);
    });

    it('saliency_ai / journey_agent / geo_eeat: 100 when no usage', () => {
      expect(tokensFromEvent('saliency_ai', {})).toBe(100);
      expect(tokensFromEvent('journey_agent', { job: 1 })).toBe(100);
      expect(tokensFromEvent('geo_eeat', {})).toBe(100);
    });

    it('geo_eeat: token sum with minimum 100', () => {
      expect(tokensFromEvent('geo_eeat', { input_tokens: 10, output_tokens: 5 })).toBe(100);
      expect(tokensFromEvent('geo_eeat', { input_tokens: 5000, output_tokens: 100 })).toBe(5200);
    });

    it('page_classify: 40 tokens per page', () => {
      expect(tokensFromEvent('page_classify', { pages: 1 })).toBe(40);
      expect(tokensFromEvent('page_classify', { pages: 3 })).toBe(120);
    });

    it('page_classify: max of page floor and LLM token formula when usage present', () => {
      expect(tokensFromEvent('page_classify', { pages: 1, input_tokens: 10, output_tokens: 5 })).toBe(40);
      expect(tokensFromEvent('page_classify', { pages: 1, input_tokens: 100, output_tokens: 50 })).toBe(200);
    });

    it('ux_check: min 120 with tokens, or 120 per run', () => {
      expect(tokensFromEvent('ux_check', { input_tokens: 10, output_tokens: 5 })).toBe(120);
      expect(tokensFromEvent('ux_check', { input_tokens: 1000, output_tokens: 100 })).toBe(1200);
      expect(tokensFromEvent('ux_check', { runs: 2 })).toBe(240);
    });

    it('serp_refresh: 35 tokens per keyword slot', () => {
      expect(tokensFromEvent('serp_refresh', { keywords: 1 })).toBe(35);
      expect(tokensFromEvent('serp_refresh', { keywords: 4 })).toBe(140);
    });

    it('persona_discover: 75 tokens per run', () => {
      expect(tokensFromEvent('persona_discover', { runs: 1 })).toBe(75);
    });

    it('retrieval_query: 18 tokens per query unit', () => {
      expect(tokensFromEvent('retrieval_query', { queries: 1 })).toBe(18);
      expect(tokensFromEvent('retrieval_query', { queries: 4 })).toBe(72);
    });

    it('brandion_detect: pdf pages / image runs', () => {
      expect(tokensFromEvent('brandion_detect', { kind: 'pdf', pages: 2 })).toBe(80);
      expect(tokensFromEvent('brandion_detect', { kind: 'pdf' })).toBe(40);
      expect(tokensFromEvent('brandion_detect', { kind: 'image', runs: 1 })).toBe(25);
      expect(tokensFromEvent('brandion_detect', { kind: 'image', runs: 2 })).toBe(50);
    });

    it('brandion_measure: 30 tokens per run', () => {
      expect(tokensFromEvent('brandion_measure', { runs: 1 })).toBe(30);
      expect(tokensFromEvent('brandion_measure', { runs: 3 })).toBe(90);
    });

    it('journey_validate: 35 tokens per persona slot', () => {
      expect(tokensFromEvent('journey_validate', { personas: 1 })).toBe(35);
      expect(tokensFromEvent('journey_validate', { personas: 3 })).toBe(105);
    });

    it('tool_extract / wayback_lookup / ssl_labs_analyze: fixed per request', () => {
      expect(tokensFromEvent('tool_extract', { requests: 1 })).toBe(28);
      expect(tokensFromEvent('wayback_lookup', {})).toBe(6);
      expect(tokensFromEvent('ssl_labs_analyze', { requests: 2 })).toBe(36);
    });

    it('unknown event_type: default 10', () => {
      expect(tokensFromEvent('unknown_type', {})).toBe(10);
    });
  });

  describe('getCurrentPeriod', () => {
    it('returns YYYY-MM format', () => {
      const period = getCurrentPeriod();
      expect(period).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});
