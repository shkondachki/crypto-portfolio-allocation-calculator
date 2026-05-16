import crypto from 'node:crypto';

const KRAKEN_BASE_URL = 'https://api.kraken.com';
const MIN_HOLDING_VALUE_EUR = 0.01;

const ASSET_SYMBOL_OVERRIDES = {
  XBT: 'BTC',
  XDG: 'DOGE'
};

const withCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const normalizeKrakenAssetCode = (assetCode) => {
  let normalized = String(assetCode || '').toUpperCase();
  normalized = normalized.replace(/\..*$/, '');
  normalized = normalized.replace(/^(X|Z)/, '');
  normalized = normalized.replace(/[^A-Z0-9]/g, '');
  return ASSET_SYMBOL_OVERRIDES[normalized] || normalized;
};

const createNonce = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

const createPrivateSignature = (apiPath, bodyParams, apiSecret) => {
  const nonce = bodyParams.get('nonce') || '';
  const bodyString = bodyParams.toString();
  const hash = crypto.createHash('sha256').update(`${nonce}${bodyString}`).digest();
  const hmacPayload = Buffer.concat([Buffer.from(apiPath), hash]);
  const secret = Buffer.from(apiSecret, 'base64');

  return crypto.createHmac('sha512', secret).update(hmacPayload).digest('base64');
};

const privatePost = async (path, bodyParams, apiKey, apiSecret) => {
  const signature = createPrivateSignature(path, bodyParams, apiSecret);

  const response = await fetch(`${KRAKEN_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'API-Key': apiKey,
      'API-Sign': signature,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
    },
    body: bodyParams.toString()
  });

  if (!response.ok) {
    throw new Error(`Kraken private request failed (${response.status})`);
  }

  const json = await response.json();
  if (json.error?.length) {
    throw new Error(`Kraken error: ${json.error.join(', ')}`);
  }

  return json.result;
};

const publicGet = async (path, queryParams) => {
  const url = `${KRAKEN_BASE_URL}${path}${queryParams ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Kraken public request failed (${response.status})`);
  }

  const json = await response.json();
  if (json.error?.length) {
    throw new Error(`Kraken error: ${json.error.join(', ')}`);
  }

  return json.result;
};

const buildEurPairMap = async () => {
  const assetPairs = await publicGet('/0/public/AssetPairs');
  const symbolToPair = {};

  Object.entries(assetPairs).forEach(([pairCode, pair]) => {
    const quote = normalizeKrakenAssetCode(pair.quote);
    if (quote !== 'EUR') {
      return;
    }

    const base = normalizeKrakenAssetCode(pair.base);
    if (!base || symbolToPair[base]) {
      return;
    }

    symbolToPair[base] = pairCode;
  });

  return symbolToPair;
};

const fetchTickerPricesInEur = async (pairCodes) => {
  if (!pairCodes.length) {
    return {};
  }

  const uniquePairs = Array.from(new Set(pairCodes));
  const query = new URLSearchParams({ pair: uniquePairs.join(',') });
  const tickerResult = await publicGet('/0/public/Ticker', query);

  return Object.entries(tickerResult).reduce((acc, [pairCode, ticker]) => {
    const close = ticker.c?.[0];
    const price = Number(close);
    if (Number.isFinite(price) && price > 0) {
      acc[pairCode] = price;
    }
    return acc;
  }, {});
};

const toHoldings = async (balanceResult) => {
  const eurPairMap = await buildEurPairMap();
  const rawBalances = Object.entries(balanceResult)
    .map(([assetCode, amount]) => ({
      symbol: normalizeKrakenAssetCode(assetCode),
      amount: Number(amount)
    }))
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0);

  const pairCodesToFetch = rawBalances
    .map(({ symbol }) => eurPairMap[symbol])
    .filter(Boolean);
  const pricesByPair = await fetchTickerPricesInEur(pairCodesToFetch);

  return rawBalances
    .map(({ symbol, amount }, index) => {
      let value = 0;
      if (symbol === 'EUR') {
        value = amount;
      } else {
        const pairCode = eurPairMap[symbol];
        const price = pairCode ? pricesByPair[pairCode] : undefined;
        if (price) {
          value = amount * price;
        }
      }

      return {
        id: `${Date.now()}-${index}-${symbol}`,
        name: symbol,
        value
      };
    })
    .filter((holding) => holding.value >= MIN_HOLDING_VALUE_EUR);
};

export default async function handler(req, res) {
  withCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = String(req.body?.apiKey || '').trim();
  const apiSecret = String(req.body?.apiSecret || '').trim();

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'apiKey and apiSecret are required.' });
  }

  try {
    const balanceResult = await privatePost(
      '/0/private/Balance',
      new URLSearchParams({ nonce: createNonce() }),
      apiKey,
      apiSecret
    );

    const holdings = await toHoldings(balanceResult);
    return res.status(200).json({ holdings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected import failure.';
    return res.status(502).json({ error: message });
  }
}
