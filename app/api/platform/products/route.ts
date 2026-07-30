import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { PLEXON_FEDERATION_CONTRACT_VERSION, platformJson } from '@/lib/platform-contract';
import { getRequestUser } from '@/lib/auth-request-user';
import { getPlatformProductSummariesForUser } from '@/lib/platform-product-registry';

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  }
  const products = await getPlatformProductSummariesForUser(user);
  return platformJson({
    contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    viewer: { id: user.id, role: user.role },
    products,
  });
}
