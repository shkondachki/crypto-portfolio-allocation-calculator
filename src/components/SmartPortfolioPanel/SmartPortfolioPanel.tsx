import { useMemo, useState } from 'react';
import { CryptoHolding } from '../../types/types';
import { storage } from '../../utils/storage';
import { parseSignals } from '../../utils/parseSignals';
import { importHoldingsFromKraken, KrakenCredentials } from '../../integrations/kraken/krakenClient';
import { Card } from '../Card/Card';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './SmartPortfolioPanel.module.scss';

const KRAKEN_CREDS_STORAGE_KEY = 'kraken_api_creds_v1';
const SIGNAL_TOTAL_TOLERANCE = 0.1;

const toFriendlyImportError = (rawMessage: string) => {
  if (/EGeneral:Permission denied/i.test(rawMessage)) {
    return 'Kraken denied access. Enable "Query Funds" permission for this API key, then retry.';
  }

  if (/EAPI:Invalid key|invalid key|invalid signature/i.test(rawMessage)) {
    return 'Invalid Kraken API credentials. Recheck API key/secret and save them again.';
  }

  if (/failed to fetch|networkerror|not found|404/i.test(rawMessage)) {
    return `${rawMessage} Ensure the Vercel API route is reachable (use \`vercel dev\` locally or deploy).`;
  }

  return rawMessage;
};

interface SmartPortfolioPanelProps {
  onReplaceHoldings: (holdings: CryptoHolding[]) => void;
  onApplyTargets: (targets: Record<string, number>) => void;
}

export const SmartPortfolioPanel = ({ onReplaceHoldings, onApplyTargets }: SmartPortfolioPanelProps) => {
  const savedCreds = useMemo(() => storage.get<KrakenCredentials>(KRAKEN_CREDS_STORAGE_KEY), []);
  const [credentials, setCredentials] = useState<KrakenCredentials>({
    apiKey: savedCreds?.apiKey || '',
    apiSecret: savedCreds?.apiSecret || ''
  });
  const [signalsText, setSignalsText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isApplyingSignals, setIsApplyingSignals] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const clearCredentials = () => {
    storage.remove(KRAKEN_CREDS_STORAGE_KEY);
    setCredentials({ apiKey: '', apiSecret: '' });
    setError('');
    setMessage('Credentials cleared from local storage.');
  };

  const handleImport = async () => {
    const currentlyStoredCreds = storage.get<KrakenCredentials>(KRAKEN_CREDS_STORAGE_KEY);
    const enteredApiKey = credentials.apiKey.trim();
    const enteredApiSecret = credentials.apiSecret.trim();
    const fallbackApiKey = currentlyStoredCreds?.apiKey?.trim() || '';
    const fallbackApiSecret = currentlyStoredCreds?.apiSecret?.trim() || '';
    const apiKeyToUse = enteredApiKey || fallbackApiKey;
    const apiSecretToUse = enteredApiSecret || fallbackApiSecret;

    if (!apiKeyToUse || !apiSecretToUse) {
      setError('Provide your Kraken API key and secret before importing.');
      setMessage('');
      return;
    }

    setIsImporting(true);
    setError('');
    setMessage('');

    try {
      const storedApiKey = currentlyStoredCreds?.apiKey?.trim() || '';
      const storedApiSecret = currentlyStoredCreds?.apiSecret?.trim() || '';
      const credsChanged = storedApiKey !== apiKeyToUse || storedApiSecret !== apiSecretToUse;

      if (credsChanged) {
        storage.set(KRAKEN_CREDS_STORAGE_KEY, {
          apiKey: apiKeyToUse,
          apiSecret: apiSecretToUse
        });
      }

      const imported = await importHoldingsFromKraken({
        apiKey: apiKeyToUse,
        apiSecret: apiSecretToUse
      });
      if (!imported.length) {
        setError('No non-zero EUR-valued holdings were returned from Kraken.');
        return;
      }

      onReplaceHoldings(imported);
      setMessage(`Imported ${imported.length} holdings from Kraken.${credsChanged ? ' Credentials saved locally.' : ''}`);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Unknown Kraken import error.';
      setError(toFriendlyImportError(rawMessage));
    } finally {
      setIsImporting(false);
    }
  };

  const applySignals = () => {
    setIsApplyingSignals(true);
    setError('');
    setMessage('');

    try {
      const parsed = parseSignals(signalsText);
      if (!signalsText.trim()) {
        setError('Paste at least one signal line before applying.');
        return;
      }

      if (parsed.errors.length) {
        setError(parsed.errors.join(' '));
        return;
      }

      if (Math.abs(parsed.totalPercentage - 100) > SIGNAL_TOTAL_TOLERANCE) {
        setError(`Signals must total 100%. Current total is ${parsed.totalPercentage.toFixed(2)}%.`);
        return;
      }

      const { CASH: _cashTarget, ...assetTargets } = parsed.targets;
      onApplyTargets(assetTargets);
      setMessage('Signals applied. Recommendations are now updated.');
    } finally {
      setIsApplyingSignals(false);
    }
  };

  return (
    <Card title="Smart Portfolio Input" icon="🧠">
      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <div className={styles.labelWithTooltip}>
            <label className={styles.inputLabel}>Kraken API Key</label>
            <Tooltip text="Enter your Kraken API key with Query Funds permission enabled." />
          </div>
          <input
            className={`${styles.input} ${styles.sm}`}
            type="password"
            value={credentials.apiKey}
            onChange={event => setCredentials(prev => ({ ...prev, apiKey: event.target.value }))}
            placeholder="Paste your Kraken API key"
          />
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.labelWithTooltip}>
            <label className={styles.inputLabel}>Kraken API Secret</label>
            <Tooltip text="Paste the Kraken API secret paired with the key above." />
          </div>
          <input
            className={`${styles.input} ${styles.sm}`}
            type="password"
            value={credentials.apiSecret}
            onChange={event => setCredentials(prev => ({ ...prev, apiSecret: event.target.value }))}
            placeholder="Paste your Kraken API secret"
          />
        </div>

        <div className={styles.buttonRow}>
          <button className={`${styles.button} ${styles.sm}`} onClick={handleImport} disabled={isImporting}>
            {isImporting ? 'Importing...' : 'Import from Kraken'}
          </button>
          <button className={`${styles.button} ${styles.sm} ${styles.secondary}`} onClick={clearCredentials}>
            Clear
          </button>
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.labelWithTooltip}>
            <label className={styles.inputLabel}>Signals</label>
            <Tooltip text="One line per target, e.g. 52.4% ETH or 34.6% DOGE LONG (extra words after the symbol are ignored)." />
          </div>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={signalsText}
            onChange={event => setSignalsText(event.target.value)}
            placeholder={`52.4% ETH\n34.6% DOGE LONG\n18% Cash`}
            rows={6}
          />
        </div>

        <button className={`${styles.button} ${styles.main}`} onClick={applySignals} disabled={isApplyingSignals}>
          {isApplyingSignals ? 'Applying...' : 'Apply Signals'}
        </button>

        {message ? <p className={styles.success}>{message}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </Card>
  );
};
