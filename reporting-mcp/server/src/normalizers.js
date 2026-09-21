// Normalise les enregistrements bruts de l'API Perfex vers la forme attendue par
// totals.js. Les noms de champs bruts ci-dessous (total, total_tax, subtotal, status,
// datecreated, ...) sont des hypothèses basées sur la structure généraliste des modules
// Perfex CRM ; ILS DOIVENT être confirmés contre la réponse réelle de l'instance avant
// activation (cf. docs/00-HYPOTHESES-ET-MANQUANTS.md, point 2). Centraliser le mapping
// ici permet de le corriger en un seul endroit une fois la vraie forme connue, sans
// toucher à la logique de calcul.

function toFiniteNumberOrUndefined(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeInvoiceRecord(raw) {
  return {
    id: raw.id ?? raw.invoiceid,
    currency: raw.currency_name || raw.currency,
    status: mapInvoiceStatus(raw.status),
    amount_ht: toFiniteNumberOrUndefined(raw.subtotal),
    amount_ttc: toFiniteNumberOrUndefined(raw.total),
    paid_to_date: toFiniteNumberOrUndefined(raw.total_paid ?? raw.paid),
    credit_note_amount: toFiniteNumberOrUndefined(raw.credit_note_amount),
    issue_date: raw.date || raw.datecreated,
    due_date: raw.duedate,
  };
}

function mapInvoiceStatus(rawStatus) {
  // Mapping à confirmer contre les libellés/constantes réels de l'instance.
  const known = new Set(['paid', 'unpaid', 'partially_paid', 'overdue', 'cancelled', 'draft']);
  const normalized = String(rawStatus || '').toLowerCase().replace(/\s+/g, '_');
  return known.has(normalized) ? normalized : 'unpaid';
}

export function normalizeExpenseRecord(raw) {
  return {
    id: raw.id ?? raw.expenseid,
    currency: raw.currency_name || raw.currency,
    amount: toFiniteNumberOrUndefined(raw.amount),
    category: raw.category_name || raw.category,
    date: raw.date,
  };
}
