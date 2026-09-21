import { INDICATOR_DEFINITIONS } from '../indicators.js';

export const getIndicatorDefinitionsToolDefinition = {
  name: 'get_indicator_definitions',
  description: 'Dictionnaire des indicateurs exposés par ce connecteur (formule, module source). Lecture statique, aucun paramètre.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
};

export function makeGetIndicatorDefinitions() {
  return async function getIndicatorDefinitions() {
    return { indicators: INDICATOR_DEFINITIONS };
  };
}
