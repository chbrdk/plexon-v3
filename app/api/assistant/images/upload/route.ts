import { NextRequest, NextResponse } from 'next/server';
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { putAssistantImage } from '@/lib/assistant/image-upload-store';

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    let body: { image?: string };
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
    }

    const image = typeof body.image === 'string' ? body.image : '';
    if (!image.trim()) {
      return apiError('image is required', API_STATUS.BAD_REQUEST);
    }

    const result = await putAssistantImage(image, user.id);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return NextResponse.json({ imageId: result.imageId });
  } catch (e) {
    return handleApiError(e, { context: 'assistant/images/upload' });
  }
}
