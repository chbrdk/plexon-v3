import { describe, expect, it } from 'vitest'
import {
  resolveEqcPersonaChatEmbedHref,
  resolveEqcPersonaChatHref,
} from '@/lib/assistant/event-quick-check/eqc-persona-chat-href'
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { eventQuickCheckBvikFixture } from '@/__tests__/fixtures/event-quick-check-report.fixture'

describe('resolveEqcPersonaChatHref (Wave C5)', () => {
  it('builds Audion chat URL when persona + project present', () => {
    expect(
      resolveEqcPersonaChatHref({
        personaId: 'persona-elena',
        audionProjectId: 'audion-1',
        webOrigin: 'https://audion-v3.example',
      })
    ).toBe(
      'https://audion-v3.example/chat?personaId=persona-elena&projectId=audion-1'
    );
  });

  it('returns null when persona or project missing', () => {
    expect(
      resolveEqcPersonaChatHref({
        personaId: 'p1',
        audionProjectId: '',
        webOrigin: 'https://audion.example',
      })
    ).toBeNull();
    expect(
      resolveEqcPersonaChatHref({
        personaId: null,
        audionProjectId: 'aud-1',
        webOrigin: 'https://audion.example',
      })
    ).toBeNull();
  });
});

describe('resolveEqcPersonaChatEmbedHref (Wave C5 overlay)', () => {
  it('builds Audion /chat/embed URL with embed marker', () => {
    expect(
      resolveEqcPersonaChatEmbedHref({
        personaId: 'persona-elena',
        audionProjectId: 'audion-1',
        webOrigin: 'https://audion-v3.example',
        theme: 'light',
      })
    ).toBe(
      'https://audion-v3.example/chat/embed?personaId=persona-elena&projectId=audion-1&embed=1&theme=light'
    );
  });

  it('uses embed=full for logged-in EQC overlay (Tavus + inspect)', () => {
    expect(
      resolveEqcPersonaChatEmbedHref({
        personaId: 'persona-elena',
        audionProjectId: 'audion-1',
        webOrigin: 'https://audion-v3.example',
        full: true,
      })
    ).toBe(
      'https://audion-v3.example/chat/embed?personaId=persona-elena&projectId=audion-1&embed=full'
    );
  });

  it('returns null when ids missing', () => {
    expect(
      resolveEqcPersonaChatEmbedHref({
        personaId: 'p1',
        audionProjectId: null,
        webOrigin: 'https://audion.example',
      })
    ).toBeNull();
  });
});

describe('EQC report persona chat link', () => {
  it('adds meta audionProjectId and appendix chat link from fixture', () => {
    const model = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture());
    expect(model.meta.audionProjectId).toBe('audion-1');
    expect(model.appendix.audionProjectId).toBe('audion-1');
    expect(model.persona?.id).toBe('persona-elena');
    const chat = model.appendix.links.find((l) => l.label === EQC_REPORT_COPY.personaChatCta);
    expect(chat?.external).toBe(true);
    expect(chat?.href).toContain('/chat?');
    expect(chat?.href).toContain('personaId=persona-elena');
    expect(chat?.href).toContain('projectId=audion-1');
  });

  it('omits chat link when audion project missing', () => {
    const base = eventQuickCheckBvikFixture();
    const model = buildEventQuickCheckReportModel({
      ...base,
      audionProjectId: undefined,
      personaPreview: base.personaPreview
        ? { ...base.personaPreview, projectId: '' }
        : undefined,
    });
    expect(model.meta.audionProjectId).toBeUndefined();
    expect(
      model.appendix.links.some((l) => l.label === EQC_REPORT_COPY.personaChatCta)
    ).toBe(false);
  });
});

describe('EQC persona chat copy', () => {
  it('documents overlay CTA and Audion deep-link labels', () => {
    expect(EQC_REPORT_COPY.personaChatCta).toBe('Mit Persona sprechen');
    expect(EQC_REPORT_COPY.personaChatOpenAudion).toBe('In Audion öffnen');
  });
});
