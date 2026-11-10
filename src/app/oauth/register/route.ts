import { handleRegister, oauthOptions } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function OPTIONS() {
  return oauthOptions();
}

export function POST(req: Request) {
  return handleRegister(req);
}
