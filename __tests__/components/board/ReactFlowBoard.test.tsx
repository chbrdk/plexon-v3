import { describe, it, expect } from 'vitest';
import { ReactFlowBoard } from '@/components/board/ReactFlowBoard';
import { isHtmlContent } from '@/lib/board-card-content';

describe('ReactFlowBoard', () => {
  it('exports a function component', () => {
    expect(typeof ReactFlowBoard).toBe('function');
  });
});

describe('board-card-content (WYSIWYG)', () => {
  it('isHtmlContent returns true for HTML-like strings', () => {
    expect(isHtmlContent('<p>hello</p>')).toBe(true);
    expect(isHtmlContent('  <div>x</div>')).toBe(true);
    expect(isHtmlContent('<strong>bold</strong>')).toBe(true);
  });

  it('isHtmlContent returns false for plain text and markdown', () => {
    expect(isHtmlContent('hello')).toBe(false);
    expect(isHtmlContent('**bold**')).toBe(false);
    expect(isHtmlContent('')).toBe(false);
    expect(isHtmlContent('  no tag here')).toBe(false);
  });
});
