/** Public assistant report export query params (PLEXON). */
export const ASSISTANT_REPORT_PPTX_DEBUG_PARAM = 'debug';
export const ASSISTANT_REPORT_PPTX_DEBUG_QUERY_PLAN = 'plan';

export function isAssistantReportPptxDebugPlanRequest(url: string | URL): boolean {
    const parsed = typeof url === 'string' ? new URL(url, 'http://localhost') : url;
    return parsed.searchParams.get(ASSISTANT_REPORT_PPTX_DEBUG_PARAM) === ASSISTANT_REPORT_PPTX_DEBUG_QUERY_PLAN;
}

export function withAssistantReportPptxDebugPlan(path: string): string {
    const parsed = new URL(path, 'http://localhost');
    parsed.searchParams.set(ASSISTANT_REPORT_PPTX_DEBUG_PARAM, ASSISTANT_REPORT_PPTX_DEBUG_QUERY_PLAN);
    return `${parsed.pathname}${parsed.search}`;
}
