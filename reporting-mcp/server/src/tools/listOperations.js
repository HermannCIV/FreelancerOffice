import { validateDateRange } from '../dateRange.js';

const ALLOWED_MODULES = ['invoices', 'payments', 'expenses', 'credit_notes'];

export const listOperationsToolDefinition = {
  name: 'list_operations',
  description:
    'Journal paginé des opérations (facture, paiement, dépense, avoir) sur une période bornée, filtrable par module autorisé. ' +
    "Usage d'analyse uniquement, pas un export comptable officiel.",
  inputSchema: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'AAAA-MM-JJ' },
      to: { type: 'string', description: 'AAAA-MM-JJ' },
      module: { type: 'string', enum: ALLOWED_MODULES },
      page: { type: 'integer', minimum: 1, default: 1 },
    },
    required: ['from', 'to', 'module'],
    additionalProperties: false,
  },
};

export function makeListOperations({ config, perfexClient, logger }) {
  return async function listOperations(input, { tenantScopeId }) {
    if (!ALLOWED_MODULES.includes(input.module)) {
      throw new Error(`Module non autorisé pour list_operations: ${input.module}`);
    }
    const range = validateDateRange(input, { maxRangeDays: config.limits.maxRangeDays });
    const page = Number.isInteger(input?.page) && input.page > 0 ? input.page : 1;

    const raw = await perfexClient.get(input.module, {
      date_from: range.from,
      date_to: range.to,
      page,
      limit: config.limits.pageSizeMax,
      tenant: tenantScopeId,
    });

    logger.info({ tool: 'list_operations', recordCount: (raw.data || []).length, pagesFetched: page });

    return {
      module: input.module,
      period: { from: range.from, to: range.to },
      currency: config.reportCurrency,
      page,
      page_size: config.limits.pageSizeMax,
      has_more: Boolean(raw.has_more),
      operations: raw.data || [],
    };
  };
}
