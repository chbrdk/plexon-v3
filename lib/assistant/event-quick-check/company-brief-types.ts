/** Draft company profile for Quick Check — user confirms before CHECKION/AUDION steps. */

export type CompanyBriefHomepageSignals = {
  url: string;
  domain: string;
  pageTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  h1: string[];
  fetchError?: string;
};

export type EventQuickCheckCompanyBrief = {
  displayName: string;
  industry: string;
  summary: string;
  /** Typical B2B buyer / user persona focus (not the company's trade name literally). */
  targetAudienceHint: string;
  disambiguationNote: string;
  companyContext: string;
  sources: CompanyBriefHomepageSignals;
  generatedAt: string;
};

export const EVENT_QUICK_CHECK_COMPANY_BRIEF_DISAMBIGUATION_DE =
  'Der Firmenname ist eine Marke — die Zielgruppen-Persona ist kein Handwerker/Berufsträger, der zufällig dem Namen entspricht, sondern typische Käufer oder Nutzer laut Website.';
