import { handleProtectedResourceMetadata, oauthOptions } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function OPTIONS() {
  return oauthOptions();
}

export function GET(req: Request) {
  return handleProtectedResourceMetadata(req);
}
