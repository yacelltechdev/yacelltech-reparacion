process.env.MCP_API_KEY = 'static-test-key';
process.env.MCP_OAUTH_PASSWORD = 'clave-dueno-test';
process.env.MCP_OAUTH_SIGNING_SECRET = 'signing-secret-for-oauth-tests';
delete process.env.MCP_PUBLIC_URL;
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase.yacelltech.local';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key-test-only';
}

import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createYacelltechMcpServer } from '../src/lib/mcp/server';
import {
  authorizeMcpRequest,
  handleAuthorizationServerMetadata,
  handleAuthorize,
  handleProtectedResourceMetadata,
  handleRegister,
  handleToken,
  isAllowedRedirectUri,
  pkceS256,
} from '../src/lib/mcp/oauth';

const BASE = 'http://127.0.0.1:3210';
const REDIRECT = `${BASE}/callback`;
const UNAUTHORIZED_MESSAGE =
  'No autorizado. Debe incluir el encabezado "Authorization: Bearer <MCP_API_KEY>" o "x-api-key".';

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function formRequest(path: string, params: URLSearchParams): Request {
  return new Request(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params,
  });
}

async function mcpCall(authorization?: string, apiKey?: string) {
  const headers: Record<string, string> = {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
  };
  if (authorization) headers.authorization = authorization;
  if (apiKey) headers['x-api-key'] = apiKey;
  const request = new Request(`${BASE}/api/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
  });
  const auth = authorizeMcpRequest(request);
  if (!auth.ok) {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: UNAUTHORIZED_MESSAGE },
    });
    return {
      response: new Response(body, { status: 401, headers: { 'WWW-Authenticate': auth.challenge } }),
      text: body,
    };
  }
  const server = createYacelltechMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const text = await response.text();
  return { response, text };
}

function toolNames(text: string): string[] {
  return [
    'buscar_reparacion',
    'obtener_reparacion',
    'preparar_cambios',
    'actualizar_reparacion',
    'verificar_cambios',
    'revertir_cambios',
  ].filter((name) => text.includes(name));
}

async function run() {
  console.log('Probando OAuth del MCP...');

  assert.equal(isAllowedRedirectUri('https://chatgpt.com/connector_platform_oauth_redirect'), true);
  assert.equal(isAllowedRedirectUri('https://chatgpt.com/connector/oauth/abc'), true);
  assert.equal(isAllowedRedirectUri('https://evil.example/steal'), false);
  assert.equal(isAllowedRedirectUri('https://chatgpt.com.evil.com/steal'), false);
  assert.equal(isAllowedRedirectUri('http://127.0.0.1:3210/callback'), true);
  assert.equal(pkceS256('a'.repeat(43)).length > 0, true);

  const metadata = await handleProtectedResourceMetadata(new Request(`${BASE}/.well-known/oauth-protected-resource`));
  const prm = await metadata.json();
  assert.equal(prm.resource, `${BASE}/api/mcp`);
  assert.deepEqual(prm.authorization_servers, [BASE]);
  assert.deepEqual(prm.scopes_supported, ['mcp:tools']);

  const serverMetadata = await handleAuthorizationServerMetadata(
    new Request(`${BASE}/.well-known/oauth-authorization-server`)
  );
  const asMeta = await serverMetadata.json();
  assert.equal(asMeta.issuer, BASE);
  assert.equal(asMeta.authorization_response_iss_parameter_supported, true);
  assert.ok(asMeta.code_challenge_methods_supported.includes('S256'));
  assert.equal(asMeta.registration_endpoint, `${BASE}/oauth/register`);
  assert.equal(asMeta.token_endpoint_auth_methods_supported.includes('none'), true);

  const extraGrants = await handleRegister(
    jsonRequest('/oauth/register', {
      client_name: 'ChatGPT',
      redirect_uris: ['https://chatgpt.com/connector/oauth/abc'],
      grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    })
  );
  assert.equal(extraGrants.status, 201);
  const extraClient = await extraGrants.json();
  assert.deepEqual(extraClient.grant_types, ['authorization_code', 'refresh_token']);

  const evil = await handleRegister(
    jsonRequest('/oauth/register', {
      client_name: 'Evil',
      redirect_uris: ['https://evil.example/steal'],
      token_endpoint_auth_method: 'none',
    })
  );
  assert.equal(evil.status, 400);

  const registered = await handleRegister(
    jsonRequest('/oauth/register', {
      client_name: 'ChatGPT',
      redirect_uris: [REDIRECT, 'https://chatgpt.com/connector_platform_oauth_redirect'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    })
  );
  assert.equal(registered.status, 201);
  const client = await registered.json();
  assert.equal(client.token_endpoint_auth_method, 'none');
  assert.ok(client.client_id);

  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = pkceS256(codeVerifier);
  const state = 'estado-oauth';
  const authorizeUrl = new URL(`${BASE}/oauth/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', client.client_id);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', 'mcp:tools');
  authorizeUrl.searchParams.set('resource', prm.resource);

  const page = await handleAuthorize(new Request(authorizeUrl));
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Clave del dueño/);

  const fields = {
    response_type: 'code',
    client_id: client.client_id,
    redirect_uri: REDIRECT,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    scope: 'mcp:tools',
    resource: prm.resource,
    decision: 'approve',
  };
  const wrong = await handleAuthorize(formRequest('/oauth/authorize', new URLSearchParams({ ...fields, password: 'no' })));
  assert.match(await wrong.text(), /Clave incorrecta/);

  const approved = await handleAuthorize(
    formRequest('/oauth/authorize', new URLSearchParams({ ...fields, password: process.env.MCP_OAUTH_PASSWORD || '' }))
  );
  assert.equal(approved.status, 303);
  const location = new URL(approved.headers.get('location') || '');
  assert.equal(location.searchParams.get('state'), state);
  assert.equal(location.searchParams.get('iss'), BASE);
  const code = location.searchParams.get('code');
  assert.ok(code);

  const badPkce = await handleToken(
    formRequest(
      '/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code || '',
        redirect_uri: REDIRECT,
        client_id: client.client_id,
        code_verifier: 'b'.repeat(50),
        resource: prm.resource,
      })
    )
  );
  assert.equal(badPkce.status, 400);

  const tokenResponse = await handleToken(
    formRequest(
      '/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code || '',
        redirect_uri: REDIRECT,
        client_id: client.client_id,
        code_verifier: codeVerifier,
        resource: prm.resource,
      })
    )
  );
  assert.equal(tokenResponse.status, 200);
  const tokens = await tokenResponse.json();
  assert.equal(tokens.token_type, 'Bearer');
  assert.equal(tokens.scope, 'mcp:tools');
  assert.equal(typeof tokens.access_token, 'string');
  assert.equal(typeof tokens.refresh_token, 'string');

  const replay = await handleToken(
    formRequest(
      '/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code || '',
        redirect_uri: REDIRECT,
        client_id: client.client_id,
        code_verifier: codeVerifier,
        resource: prm.resource,
      })
    )
  );
  assert.equal(replay.status, 400);

  const withOauth = await mcpCall(`Bearer ${tokens.access_token}`);
  assert.equal(withOauth.response.status, 200, withOauth.text);
  assert.deepEqual(toolNames(withOauth.text).length, 6, withOauth.text);

  const refreshed = await handleToken(
    formRequest(
      '/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: client.client_id,
        resource: prm.resource,
      })
    )
  );
  assert.equal(refreshed.status, 200);
  const nextTokens = await refreshed.json();
  const withRefresh = await mcpCall(`Bearer ${nextTokens.access_token}`);
  assert.equal(withRefresh.response.status, 200, withRefresh.text);
  assert.equal(toolNames(withRefresh.text).length, 6);

  const withStatic = await mcpCall(`Bearer ${process.env.MCP_API_KEY}`);
  assert.equal(withStatic.response.status, 200, withStatic.text);
  assert.equal(toolNames(withStatic.text).length, 6);

  const withApiKey = await mcpCall(undefined, process.env.MCP_API_KEY);
  assert.equal(withApiKey.response.status, 200, withApiKey.text);

  const missing = await mcpCall();
  assert.equal(missing.response.status, 401);
  const challenge = missing.response.headers.get('www-authenticate') || '';
  assert.match(challenge, /resource_metadata="http:\/\/127\.0\.0\.1:3210\/\.well-known\/oauth-protected-resource"/);
  assert.equal(JSON.parse(missing.text).error.message, UNAUTHORIZED_MESSAGE);

  const invalid = await mcpCall('Bearer token-incorrecto');
  assert.equal(invalid.response.status, 401);
  assert.match(invalid.response.headers.get('www-authenticate') || '', /error="invalid_token"/);

  const previous = process.env.MCP_API_KEY;
  delete process.env.MCP_API_KEY;
  const open = await mcpCall();
  process.env.MCP_API_KEY = previous;
  assert.equal(open.response.status, 200, open.text);

  console.log('OAuth del MCP verificado.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
