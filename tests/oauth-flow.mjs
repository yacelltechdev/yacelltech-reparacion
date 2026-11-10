import { randomBytes, createHash } from 'node:crypto';

const base = process.env.BASE_URL || 'http://127.0.0.1:3456';
const redirect = `${base}/callback`;

function pkce(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

async function mcp(path, authorization) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  const text = await response.text();
  return { response, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const unauth = await mcp('/api/mcp');
assert(unauth.response.status === 401, `401 esperado, llegó ${unauth.response.status}: ${unauth.text}`);
const challenge = unauth.response.headers.get('www-authenticate') || '';
assert(challenge.includes('resource_metadata='), challenge);
assert(
  unauth.text.includes('Authorization: Bearer <MCP_API_KEY>'),
  unauth.text
);

const prmResponse = await fetch(`${base}/.well-known/oauth-protected-resource`);
assert(prmResponse.status === 200, `metadata recurso ${prmResponse.status}`);
const prm = await prmResponse.json();
assert(prm.resource === `${base}/api/mcp`, JSON.stringify(prm));
assert(prm.authorization_servers[0] === base, JSON.stringify(prm));

const pathMetadata = await fetch(`${base}/.well-known/oauth-protected-resource/api/mcp`);
assert(pathMetadata.status === 200, `metadata con ruta ${pathMetadata.status}`);
assert((await pathMetadata.json()).resource === prm.resource, 'metadata de ruta distinta');

const asResponse = await fetch(`${base}/.well-known/oauth-authorization-server`);
const asMeta = await asResponse.json();
assert(asMeta.issuer === base, JSON.stringify(asMeta));
assert(asMeta.authorization_response_iss_parameter_supported === true, 'falta iss');
assert(asMeta.code_challenge_methods_supported.includes('S256'), 'falta S256');
assert(asMeta.registration_endpoint === `${base}/oauth/register`, asMeta.registration_endpoint);

const evil = await fetch(asMeta.registration_endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    client_name: 'Evil',
    redirect_uris: ['https://evil.example/steal'],
    token_endpoint_auth_method: 'none',
  }),
});
assert(evil.status === 400, `redirect malicioso aceptado: ${evil.status}`);

const registered = await fetch(asMeta.registration_endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    client_name: 'ChatGPT',
    redirect_uris: [redirect],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  }),
});
assert(registered.status === 201, `registro ${registered.status} ${await registered.clone().text()}`);
const client = await registered.json();

const codeVerifier = randomBytes(32).toString('base64url');
const authorizeUrl = new URL(asMeta.authorization_endpoint);
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('client_id', client.client_id);
authorizeUrl.searchParams.set('redirect_uri', redirect);
authorizeUrl.searchParams.set('code_challenge', pkce(codeVerifier));
authorizeUrl.searchParams.set('code_challenge_method', 'S256');
authorizeUrl.searchParams.set('state', 'estado-http');
authorizeUrl.searchParams.set('scope', 'mcp:tools');
authorizeUrl.searchParams.set('resource', prm.resource);

const page = await fetch(authorizeUrl);
assert(page.status === 200, `authorize ${page.status}`);
assert((await page.text()).includes('Clave del dueño'), 'la pantalla no pide la clave');

const approved = await fetch(asMeta.authorization_endpoint, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    response_type: 'code',
    client_id: client.client_id,
    redirect_uri: redirect,
    code_challenge: pkce(codeVerifier),
    code_challenge_method: 'S256',
    state: 'estado-http',
    scope: 'mcp:tools',
    resource: prm.resource,
    password: process.env.MCP_OAUTH_PASSWORD || 'clave-dueno-test',
    decision: 'approve',
  }),
});
assert(approved.status === 303, `redirect ${approved.status}`);
const location = new URL(approved.headers.get('location'));
assert(location.searchParams.get('iss') === base, location.searchParams.get('iss') || '');
assert(location.searchParams.get('state') === 'estado-http', 'state distinto');
const code = location.searchParams.get('code');
assert(code, 'sin código');

const tokenResponse = await fetch(asMeta.token_endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirect,
    client_id: client.client_id,
    code_verifier: codeVerifier,
    resource: prm.resource,
  }),
});
assert(tokenResponse.status === 200, await tokenResponse.clone().text());
const tokens = await tokenResponse.json();
assert(tokens.token_type === 'Bearer', tokens.token_type);

const tools = await mcp('/api/mcp', `Bearer ${tokens.access_token}`);
assert(tools.response.status === 200, tools.text);
for (const name of [
  'buscar_reparacion',
  'obtener_reparacion',
  'preparar_cambios',
  'actualizar_reparacion',
  'verificar_cambios',
  'revertir_cambios',
]) {
  assert(tools.text.includes(name), `falta ${name}: ${tools.text}`);
}

const legacy = await mcp('/api/mcp', `Bearer ${process.env.MCP_API_KEY || 'static-test-key'}`);
assert(legacy.response.status === 200, legacy.text);
assert(legacy.text.includes('buscar_reparacion'), legacy.text);

async function quick(method, authorization) {
  const started = Date.now();
  const response = await fetch(`${base}/api/mcp`, {
    method,
    headers: {
      accept: 'text/event-stream',
      ...(authorization ? { authorization } : {}),
    },
    signal: AbortSignal.timeout(2000),
  });
  const text = await response.text();
  return { response, text, ms: Date.now() - started };
}

const openGet = await quick('GET');
assert(openGet.response.status === 401, `GET sin auth ${openGet.response.status} ${openGet.text}`);
assert((openGet.response.headers.get('www-authenticate') || '').includes('resource_metadata='), 'GET sin WWW-Authenticate');
assert(openGet.ms < 1500, `GET sin auth tardó ${openGet.ms}ms`);

const staticKey = process.env.MCP_API_KEY || 'static-test-key';
for (const method of ['GET', 'DELETE']) {
  const hung = await quick(method, `Bearer ${staticKey}`);
  assert(hung.response.status === 405, `${method} autenticado ${hung.response.status} ${hung.text}`);
  assert(hung.ms < 1500, `${method} tardó ${hung.ms}ms`);
  const allow = hung.response.headers.get('allow') || '';
  assert(allow.includes('POST') && allow.includes('OPTIONS'), `${method} Allow: ${allow}`);
  assert((hung.response.headers.get('access-control-allow-origin') || '') === '*', `${method} sin CORS`);
  assert(!hung.text.includes('keepalive'), `${method} abrió el stream: ${hung.text}`);
}

const oauthGet = await quick('GET', `Bearer ${tokens.access_token}`);
assert(oauthGet.response.status === 405, `GET oauth ${oauthGet.response.status} ${oauthGet.text}`);
assert(oauthGet.ms < 1500, `GET oauth tardó ${oauthGet.ms}ms`);

const secondVerifier = randomBytes(32).toString('base64url');
const secondApproved = await fetch(asMeta.authorization_endpoint, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    response_type: 'code',
    client_id: client.client_id,
    redirect_uri: redirect,
    code_challenge: pkce(secondVerifier),
    code_challenge_method: 'S256',
    state: 'sin-resource',
    resource: prm.resource,
    password: process.env.MCP_OAUTH_PASSWORD || 'clave-dueno-test',
    decision: 'approve',
  }),
});
const secondCode = new URL(secondApproved.headers.get('location')).searchParams.get('code');
const withoutResource = await fetch(asMeta.token_endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: secondCode,
    redirect_uri: redirect,
    client_id: client.client_id,
    code_verifier: secondVerifier,
  }),
});
const withoutText = await withoutResource.text();
assert(withoutResource.status === 200, withoutText);
assert(JSON.parse(withoutText).token_type === 'Bearer', withoutText);

console.log('Flujo OAuth HTTP verificado.');
