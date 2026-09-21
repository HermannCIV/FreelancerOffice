// Point d'entrée du connecteur MCP. Transport HTTP streamable (SDK officiel), un seul
// jeu d'outils, tous en lecture seule (aucun handler de mutation n'existe dans ce
// fichier ni ailleurs dans le service).
//
// La vérification de signature du jeton OAuth (oauthVerifier.js) est une implémentation
// réelle (JWKS via `jose`), pas un stub. Le nom de la revendication portant le périmètre
// société (OAUTH_TENANT_CLAIM) reste configurable car il n'est standardisé par aucune
// RFC contrairement à iss/aud/exp/scope — à confirmer contre le fournisseur
// d'autorisation réellement choisi (voir docs/05-SECURITE.md).
import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createAuthMiddleware, AuthError } from './auth.js';
import { createOAuthVerifier } from './oauthVerifier.js';
import { createRateLimiter } from './rateLimiter.js';
import { PerfexClient } from './perfexClient.js';

import { getStatusToolDefinition, makeGetStatus } from './tools/getStatus.js';
import { getDailyKpisToolDefinition, makeGetDailyKpis } from './tools/getDailyKpis.js';
import { getOutstandingInvoicesToolDefinition, makeGetOutstandingInvoices } from './tools/getOutstandingInvoices.js';
import { listOperationsToolDefinition, makeListOperations } from './tools/listOperations.js';
import { listVouchersToolDefinition, makeListVouchers } from './tools/listVouchers.js';
import { getIndicatorDefinitionsToolDefinition, makeGetIndicatorDefinitions } from './tools/getIndicatorDefinitions.js';

export function buildToolRegistry({ config, logger, perfexClient }) {
  const deps = { config, logger, perfexClient };
  return new Map([
    [getStatusToolDefinition.name, { definition: getStatusToolDefinition, handler: makeGetStatus(deps) }],
    [getDailyKpisToolDefinition.name, { definition: getDailyKpisToolDefinition, handler: makeGetDailyKpis(deps) }],
    [getOutstandingInvoicesToolDefinition.name, { definition: getOutstandingInvoicesToolDefinition, handler: makeGetOutstandingInvoices(deps) }],
    [listOperationsToolDefinition.name, { definition: listOperationsToolDefinition, handler: makeListOperations(deps) }],
    [listVouchersToolDefinition.name, { definition: listVouchersToolDefinition, handler: makeListVouchers(deps) }],
    [getIndicatorDefinitionsToolDefinition.name, { definition: getIndicatorDefinitionsToolDefinition, handler: makeGetIndicatorDefinitions(deps) }],
  ]);
}

export function createMcpServer({ toolRegistry }) {
  const server = new Server(
    { name: 'reporting-btob', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...toolRegistry.values()].map((t) => t.definition),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const entry = toolRegistry.get(request.params.name);
    if (!entry) {
      throw new Error(`Outil inconnu: ${request.params.name}`);
    }
    const authContext = extra?.authInfo?.extra?.reportingContext;
    if (!authContext) {
      throw new Error('Contexte d\'authentification manquant pour cet appel.');
    }
    const result = await entry.handler(request.params.arguments || {}, authContext);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  return server;
}

async function main() {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const perfexClient = new PerfexClient({ config, logger });
  const toolRegistry = buildToolRegistry({ config, logger, perfexClient });
  const mcpServer = createMcpServer({ toolRegistry });

  const verifyToken = createOAuthVerifier(config.oauth);
  const authenticate = createAuthMiddleware({ verifyToken });
  const rateLimiter = createRateLimiter({
    perTokenPerMinute: config.limits.rateLimitPerTokenPerMin,
    perIpPerMinute: config.limits.rateLimitPerIpPerMin,
  });

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await mcpServer.connect(transport);

  const httpServer = http.createServer(async (req, res) => {
    try {
      const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || undefined;
      const authContext = await authenticate(bearer);
      const ip = req.socket.remoteAddress || 'unknown';
      if (!rateLimiter.allow({ tokenRef: authContext.tokenRef, ip })) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'rate_limited' }));
        return;
      }
      req.auth = {
        token: bearer,
        clientId: authContext.subject || 'unknown',
        scopes: ['reporting:read'],
        extra: { reportingContext: authContext },
      };
      await transport.handleRequest(req, res);
    } catch (error) {
      const status = error instanceof AuthError ? 401 : 500;
      logger.error({ tool: 'http', statusCode: status, message: error.message, errorCode: error.code });
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.code || 'internal_error' }));
    }
  });

  const port = Number(process.env.PORT || 8787);
  httpServer.listen(port, () => {
    logger.info({ tool: 'startup', message: `reporting-mcp-btob à l'écoute sur le port ${port}` });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`Échec au démarrage: ${error.stack || error.message}\n`);
    process.exit(1);
  });
}
