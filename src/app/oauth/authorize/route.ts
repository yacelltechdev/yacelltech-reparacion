import { handleAuthorize, oauthOptions } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function OPTIONS() {
  return oauthOptions();
}

export function GET(req: Request) {
  return handleAuthorize(req);
}

export function POST(req: Request) {
  return handleAuthorize(req);
}
