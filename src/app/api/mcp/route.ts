import { NextRequest, NextResponse } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authorizeMcpRequest } from '@/lib/mcp/oauth';
import { createYacelltechMcpServer } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-api-key, mcp-session-id, last-event-id, mcp-protocol-version',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version, WWW-Authenticate',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

async function handleMcpRequest(req: Request): Promise<Response> {
  const auth = authorizeMcpRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message:
            'No autorizado. Debe incluir el encabezado "Authorization: Bearer <MCP_API_KEY>" o "x-api-key".',
        },
      },
      { status: 401, headers: { ...CORS_HEADERS, 'WWW-Authenticate': auth.challenge } }
    );
  }

  try {
    const server = createYacelltechMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Modo stateless compatible con serverless/cloud
      enableJsonResponse: true,
    });

    await server.connect(transport);
    const response = await transport.handleRequest(req);

    // Añadir encabezados CORS a la respuesta
    for (const [key, val] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, val);
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Error interno en servidor MCP: ${error.message}`,
        },
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleMcpRequest(req);
}

export async function GET(req: NextRequest) {
  return handleMcpRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleMcpRequest(req);
}
