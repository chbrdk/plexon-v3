/**
 * PNG → text via tesseract.js (Node).
 * Spec: specs/domain/assistant-document-attachments.md (PDF OCR)
 */

import { createWorker, type Worker } from 'tesseract.js';
import { ASSISTANT_PDF_OCR_LANGS } from '@/lib/constants';

let sharedWorker: Worker | null = null;
let sharedWorkerLangs: string | null = null;

async function getWorker(langs: string): Promise<Worker> {
  if (sharedWorker && sharedWorkerLangs === langs) return sharedWorker;
  if (sharedWorker) {
    await sharedWorker.terminate().catch(() => undefined);
    sharedWorker = null;
    sharedWorkerLangs = null;
  }
  const worker = await createWorker(langs);
  sharedWorker = worker;
  sharedWorkerLangs = langs;
  return worker;
}

/** Recognize text from a PNG buffer. */
export async function ocrPngBuffer(
  png: Buffer | Uint8Array,
  langs: string = ASSISTANT_PDF_OCR_LANGS,
): Promise<string> {
  const worker = await getWorker(langs);
  const result = await worker.recognize(Buffer.from(png));
  return (result.data?.text || '').replace(/\r\n/g, '\n').trim();
}

/** Test helper — drop cached worker between suites. */
export async function resetOcrWorkerForTests(): Promise<void> {
  if (!sharedWorker) return;
  await sharedWorker.terminate().catch(() => undefined);
  sharedWorker = null;
  sharedWorkerLangs = null;
}
