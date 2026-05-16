import { CryptoHolding } from '../../types/types';

const IMPORT_ENDPOINT = '/api/kraken/import';

export interface KrakenCredentials {
  apiKey: string;
  apiSecret: string;
}

interface KrakenImportApiResponse {
  holdings: CryptoHolding[];
  error?: string;
}

export const importHoldingsFromKraken = async (credentials: KrakenCredentials): Promise<CryptoHolding[]> => {
  const response = await fetch(IMPORT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: credentials.apiKey.trim(),
      apiSecret: credentials.apiSecret.trim()
    })
  });

  const payload = (await response.json()) as KrakenImportApiResponse;
  if (!response.ok) {
    throw new Error(payload.error || `Import failed (${response.status})`);
  }

  if (!Array.isArray(payload.holdings)) {
    throw new Error('Unexpected import response from server.');
  }

  return payload.holdings.map((holding, index) => ({
    ...holding,
    id: holding.id || `${Date.now()}-${index}-${holding.name}`,
    lastUpdated: new Date()
  }));
};
