import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractDocxText } from '@/lib/assistant/extract-docx';
import { extractPptxText } from '@/lib/assistant/extract-pptx';
import { extractMarkdownText, extractPlainText } from '@/lib/assistant/extract-plain';
import {
  putAssistantDocument,
  resetAssistantDocumentUploadStore,
  resolveAssistantDocuments,
} from '@/lib/assistant/document-upload-store';
import { mergeUserMessageWithDocuments } from '@/lib/assistant/merge-documents';
import { normalizeAssistantDocumentIds } from '@/lib/assistant/user-turn-documents';
import { ASSISTANT_DOCUMENT_MAX_PER_TURN } from '@/lib/constants';
import { isAssistantDocumentFilename } from '@/lib/assistant/document-formats';

async function buildMinimalDocx(paragraphText: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}

describe('mergeUserMessageWithDocuments', () => {
  it('inserts document prefix before user content', () => {
    const out = mergeUserMessageWithDocuments('Please summarize.', [
      { filename: 'memo.docx', extractedText: 'Line one' },
    ]);
    expect(out).toContain('### Attached document: memo.docx');
    expect(out).toContain('Line one');
    expect(out).toContain('Please summarize.');
    expect(out.indexOf('Line one')).toBeLessThan(out.indexOf('Please summarize.'));
  });

  it('joins multiple docs with separators', () => {
    const out = mergeUserMessageWithDocuments('Q', [
      { filename: 'a.docx', extractedText: 'A' },
      { filename: 'b.pdf', extractedText: 'B' },
    ]);
    expect(out).toContain('### Attached document: a.docx');
    expect(out).toContain('### Attached document: b.pdf');
    expect(out).toContain('\n\n---\n\n');
  });
});

describe('extractDocxText', () => {
  it('extracts plain text from a minimal docx', async () => {
    const buf = await buildMinimalDocx('Hello from vitest');
    const { text, truncated } = await extractDocxText(buf, 10_000);
    expect(text).toContain('Hello from vitest');
    expect(truncated).toBe(false);
  });

  it('truncates long extracted text', async () => {
    const buf = await buildMinimalDocx('x'.repeat(500));
    const { text, truncated } = await extractDocxText(buf, 100);
    expect(truncated).toBe(true);
    expect(text).toContain('[… truncated]');
    expect(text.length).toBeLessThanOrEqual(100);
  });
});

describe('extractPptxText / plain', () => {
  it('extracts slide text from a minimal pptx', async () => {
    const zip = new JSZip();
    zip.file(
      'ppt/slides/slide1.xml',
      `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><a:t>Hello deck</a:t></p:sld>`,
    );
    const buf = Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
    const { text, truncated } = await extractPptxText(buf, 10_000);
    expect(text).toContain('Hello deck');
    expect(truncated).toBe(false);
  });

  it('strips markdown lightly', () => {
    const { text } = extractMarkdownText(
      Buffer.from('---\ntitle: x\n---\n# Title\n\n[link](https://x.test) **bold**'),
      10_000,
    );
    expect(text).toContain('Title');
    expect(text).toContain('link');
    expect(text).toContain('bold');
    expect(text).not.toContain('https://x.test');
  });

  it('reads plain txt', () => {
    const { text } = extractPlainText(Buffer.from('plain notes'), 10_000);
    expect(text).toBe('plain notes');
  });
});

describe('document-upload-store', () => {
  beforeEach(() => {
    resetAssistantDocumentUploadStore();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetAssistantDocumentUploadStore();
  });

  it('puts and resolves docx in memory', async () => {
    const buf = await buildMinimalDocx('Store me');
    const put = await putAssistantDocument({
      userId: 'user-a',
      filename: 'brief.docx',
      buffer: buf,
    });
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    const resolved = await resolveAssistantDocuments([put.documentId], 'user-a');
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.documents[0]?.filename).toBe('brief.docx');
    expect(resolved.documents[0]?.extractedText).toContain('Store me');
  });

  it('puts markdown', async () => {
    const put = await putAssistantDocument({
      userId: 'user-a',
      filename: 'notes.md',
      buffer: Buffer.from('# Hello\n\nWorld'),
    });
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    expect(put.filename).toBe('notes.md');
    expect(isAssistantDocumentFilename('deck.pptx')).toBe(true);
  });

  it('rejects unsupported types', async () => {
    const put = await putAssistantDocument({
      userId: 'user-a',
      filename: 'notes.doc',
      buffer: Buffer.from('hi'),
    });
    expect(put.ok).toBe(false);
    if (put.ok) return;
    expect(put.status).toBe(415);
  });

  it('fail-closes on missing ids', async () => {
    const resolved = await resolveAssistantDocuments(['missing'], 'user-a');
    expect(resolved.ok).toBe(false);
  });

  it('fail-closes resolve for another user', async () => {
    const put = await putAssistantDocument({
      userId: 'user-a',
      filename: 'notes.txt',
      buffer: Buffer.from('secret'),
    });
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    const resolved = await resolveAssistantDocuments([put.documentId], 'user-b');
    expect(resolved.ok).toBe(false);
  });
});

describe('normalizeAssistantDocumentIds', () => {
  it('caps and dedupes', () => {
    const ids = normalizeAssistantDocumentIds(['a', 'a', 'b', 'c', 'd', 'e', '', 1]);
    expect(ids).toEqual(['a', 'b', 'c', 'd']);
    expect(ids).toHaveLength(ASSISTANT_DOCUMENT_MAX_PER_TURN);
  });
});

describe('assistant document attachments surface smoke', () => {
  const root = join(__dirname, '..');

  it('ships domain spec + upload route + composer docs', () => {
    const spec = readFileSync(
      join(root, 'specs/domain/assistant-document-attachments.md'),
      'utf8',
    );
    expect(spec).toContain('API_ASSISTANT_DOCUMENTS_UPLOAD');
    expect(spec).toContain('documentIds');
    expect(spec).toContain('.pptx');
    expect(spec).toContain('.md');

    const route = readFileSync(
      join(root, 'app/api/assistant/documents/upload/route.ts'),
      'utf8',
    );
    expect(route).toContain('putAssistantDocument');
    expect(route).toContain('user.id');

    const composer = readFileSync(
      join(root, 'components/assistant/AssistantChatComposer.tsx'),
      'utf8',
    );
    expect(composer).toContain('pendingDocuments');
    expect(composer).toContain('ASSISTANT_DOCUMENT_UPLOAD_ACCEPT');
    expect(composer).toContain('onPaste');
    expect(composer).toContain('onDrop');

    const chat = readFileSync(join(root, 'components/assistant/AssistantChat.tsx'), 'utf8');
    expect(chat).toContain('API_ASSISTANT_DOCUMENTS_UPLOAD');
    expect(chat).toContain('documentIds');
    expect(chat).toContain('isAssistantDocumentFilename');
  });
});
