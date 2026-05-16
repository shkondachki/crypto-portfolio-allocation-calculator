export interface ParsedSignalsResult {
  targets: Record<string, number>;
  totalPercentage: number;
  errors: string[];
}

// Supports: "52.4% ETH", "34.6% DOGE LONG", "0.0% CASH" (extra words after symbol are ignored)
const SIGNAL_LINE_PATTERN = /^\s*([0-9]+(?:\.[0-9]+)?)\s*%\s+([A-Za-z0-9._-]+)(?:\s+\S+)*\s*$/;

const normalizeSymbol = (rawSymbol: string) => {
  if (rawSymbol.trim().toUpperCase() === 'CASH') {
    return 'CASH';
  }
  return rawSymbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const parseSignals = (rawSignals: string): ParsedSignalsResult => {
  const lines = rawSignals
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const targets: Record<string, number> = {};
  const errors: string[] = [];
  let totalPercentage = 0;

  lines.forEach((line, index) => {
    const match = line.match(SIGNAL_LINE_PATTERN);
    if (!match) {
      errors.push(`Line ${index + 1} has invalid format: "${line}"`);
      return;
    }

    const percentage = Number(match[1]);
    const symbol = normalizeSymbol(match[2]);

    if (!Number.isFinite(percentage) || percentage < 0) {
      errors.push(`Line ${index + 1} has invalid percentage: "${line}"`);
      return;
    }

    if (!symbol) {
      errors.push(`Line ${index + 1} has invalid symbol: "${line}"`);
      return;
    }

    targets[symbol] = (targets[symbol] || 0) + percentage;
    totalPercentage += percentage;
  });

  return {
    targets,
    totalPercentage,
    errors
  };
};
