import { NextRequest, NextResponse } from 'next/server';
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { putAssistantDocument } from '@/lib/assistant/document-upload-store';

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return apiError('Expected multipart form data', API_STATUS.BAD_REQUEST);
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return apiError('file is required', API_STATUS.BAD_REQUEST);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.byteLength) {
      return apiError('Empty file', API_STATUS.BAD_REQUEST);
    }
    const result = await putAssistantDocument({
      userId: user.id,
      filename: file.name || 'document.docx',
      buffer,
    });
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return NextResponse.json({
      documentId: result.documentId,
      filename: result.filename,
      charCount: result.charCount,
      truncated: result.truncated,
      usedOcr: result.usedOcr === true ? true : undefined,
    });
  } catch (e) {
    return handleApiError(e, { context: 'assistant/documents/upload' });
  }
}
