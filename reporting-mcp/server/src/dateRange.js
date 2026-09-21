// Validation stricte des plages de dates demandées par un outil MCP. Rejette plutôt que
// de tronquer silencieusement : une troncature silencieuse fausserait un total sans que
// l'appelant ne le sache (cf. docs/04-LIMITES-DE-CHARGE.md).

export class InvalidRangeError extends Error {}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateDateRange({ from, to }, { maxRangeDays }) {
  if (!ISO_DATE_RE.test(from) || !ISO_DATE_RE.test(to)) {
    throw new InvalidRangeError('Les dates doivent être au format AAAA-MM-JJ.');
  }
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new InvalidRangeError('Date invalide.');
  }
  if (fromDate > toDate) {
    throw new InvalidRangeError('"from" doit être antérieure ou égale à "to".');
  }
  const rangeDays = Math.round((toDate - fromDate) / 86_400_000) + 1;
  if (rangeDays > maxRangeDays) {
    throw new InvalidRangeError(
      `Plage demandée (${rangeDays} jours) supérieure au maximum autorisé (${maxRangeDays} jours). ` +
      'Découpez la demande en plusieurs appels.'
    );
  }
  return { from, to, rangeDays };
}
