// Moteur de calcul pur (aucun I/O) : pagination bornée avec "gating", agrégation
// déterministe HT/TTC/avoirs/paiements partiels, distinction stricte zéro / indisponible
// / incomplet. Voir docs/03-DICTIONNAIRE-INDICATEURS.md pour les règles métier.

export const STATUS = Object.freeze({
  OK: 'ok',
  ZERO: 'ok', // une valeur 0 sur couverture complète a status "ok", value 0.
  UNAVAILABLE: 'unavailable',
  INCOMPLETE: 'incomplete',
});

/**
 * Récupère toutes les pages nécessaires en respectant un plafond de sécurité.
 * `fetchPage(pageIndex)` doit retourner `{ records: Array, hasMore: boolean }` ou lever.
 * Ne calcule JAMAIS un total sur une pagination incomplète : si le plafond est atteint
 * alors qu'il reste des pages, ou si une page échoue, `coverage.complete` vaut false et
 * l'appelant doit refléter `status: "incomplete"` plutôt que produire un chiffre.
 */
export async function fetchAllPages({ fetchPage, maxPages }) {
  const records = [];
  let pagesFetched = 0;
  let complete = true;
  let hasMore = true;

  while (hasMore) {
    if (pagesFetched >= maxPages) {
      complete = false;
      break;
    }
    let page;
    try {
      // eslint-disable-next-line no-await-in-loop
      page = await fetchPage(pagesFetched);
    } catch (error) {
      complete = false;
      break;
    }
    pagesFetched += 1;
    records.push(...page.records);
    hasMore = Boolean(page.hasMore);
  }

  return { records, coverage: { pagesFetched, complete } };
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Agrège une liste de factures fictives/normalisées en indicateurs déterministes.
 * Chaque enregistrement attendu (déjà normalisé en amont depuis la réponse Perfex) :
 * { id, currency, status, amount_ht, amount_ttc, paid_to_date, credit_note_amount }
 */
export function aggregateInvoices(records, { currency }) {
  let invoicedHt = 0;
  let invoicedTtc = 0;
  let paidTotal = 0;
  let outstandingTotal = 0;
  let creditNotesTotal = 0;
  let cancelledCount = 0;
  let draftCount = 0;
  let incompleteLineCount = 0;
  const warnings = [];

  for (const record of records) {
    if (record.currency && record.currency !== currency) {
      warnings.push({ code: 'currency_mismatch', invoice_id: record.id, currency: record.currency });
      continue;
    }
    if (record.status === 'cancelled') {
      cancelledCount += 1;
      continue;
    }
    if (record.status === 'draft') {
      draftCount += 1;
      continue;
    }
    if (!isFiniteNumber(record.amount_ht) || !isFiniteNumber(record.amount_ttc)) {
      incompleteLineCount += 1;
      warnings.push({ code: 'missing_ht_or_ttc', invoice_id: record.id });
      continue;
    }

    invoicedHt += record.amount_ht;
    invoicedTtc += record.amount_ttc;

    const paid = isFiniteNumber(record.paid_to_date) ? record.paid_to_date : 0;
    paidTotal += paid;

    if (record.status === 'unpaid' || record.status === 'partially_paid' || record.status === 'overdue') {
      outstandingTotal += Math.max(record.amount_ttc - paid, 0);
    }

    if (isFiniteNumber(record.credit_note_amount)) {
      creditNotesTotal += record.credit_note_amount;
    }
  }

  return {
    invoiced_ht: invoicedHt,
    invoiced_ttc: invoicedTtc,
    net_ttc: invoicedTtc - creditNotesTotal,
    paid_total: paidTotal,
    outstanding_total: outstandingTotal,
    credit_notes_total: creditNotesTotal,
    cancelled_count: cancelledCount,
    draft_count: draftCount,
    incomplete_line_count: incompleteLineCount,
    warnings,
  };
}

/**
 * Enveloppe un résultat d'agrégation avec les métadonnées obligatoires de doc 03 :
 * period, timezone, currency, status (ok/unavailable/incomplete), coverage.
 */
export function buildIndicatorResponse({ coverage, aggregate, period, timezone, currency, generatedAt, dataAsOf }) {
  const base = {
    period,
    timezone,
    currency,
    generated_at: generatedAt,
    data_as_of: dataAsOf ?? 'unavailable',
    coverage: {
      pages_fetched: coverage.pagesFetched,
      complete: coverage.complete,
    },
  };

  if (!coverage.complete) {
    return {
      ...base,
      status: STATUS.INCOMPLETE,
      values: null,
      reason: 'Pagination incomplète : au moins une page attendue n\'a pas pu être récupérée dans les limites de charge configurées.',
    };
  }

  return {
    ...base,
    status: STATUS.OK,
    values: aggregate,
  };
}
