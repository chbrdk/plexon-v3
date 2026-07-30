declare module 'isomorphic-dompurify' {
  interface Config {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
  }
  type UponSanitizeAttributeHook = (node: Element, data: { attrName: string; attrValue: string }) => void;
  type AfterSanitizeAttributesHook = (node: Element) => void;
  function sanitize(dirty: string, config?: Config): string;
  function addHook(hook: 'uponSanitizeAttribute', cb: UponSanitizeAttributeHook): void;
  function addHook(hook: 'afterSanitizeAttributes', cb: AfterSanitizeAttributesHook): void;
  export default { sanitize, addHook };
}
