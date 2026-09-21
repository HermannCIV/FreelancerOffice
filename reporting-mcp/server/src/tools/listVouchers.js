const ALLOWED_MODULES = ['invoices', 'expenses'];

export const listVouchersToolDefinition = {
  name: 'list_vouchers',
  description:
    "Liste paginée des références de pièces justificatives (numéro, date, montant, lien si disponible). " +
    'Ne rapatrie jamais le contenu binaire du justificatif (minimisation, cf. docs/05-SECURITE.md).',
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

export function makeListVouchers({ config, perfexClient, logger }) {
  return async function listVouchers(input, { tenantScopeId }) {
    if (!ALLOWED_MODULES.includes(input.module)) {
      throw new Error(`Module non autorisé pour list_vouchers: ${input.module}`);
    }
    const page = Number.isInteger(input?.page) && input.page > 0 ? input.page : 1;

    const raw = await perfexClient.get(input.module, {
      date_from: input.from,
      date_to: input.to,
      page,
      limit: config.limits.pageSizeMax,
      tenant: tenantScopeId,
    });

    const vouchers = (raw.data || []).map((record) => ({
      reference: record.number || record.id,
      date: record.date || record.datecreated,
      amount: record.total ?? record.amount,
      module: input.module,
      link: record.link ?? null,
    }));

    logger.info({ tool: 'list_vouchers', recordCount: vouchers.length, pagesFetched: page });

    return {
      module: input.module,
      currency: config.reportCurrency,
      page,
      page_size: config.limits.pageSizeMax,
      has_more: Boolean(raw.has_more),
      vouchers,
    };
  };
}
