import { useState } from 'react';
import { CryptoHolding } from '../../types/types';
import { AddHoldingForm } from '../AddHoldingForm/AddHoldingForm';
import { SmartPortfolioPanel } from '../SmartPortfolioPanel/SmartPortfolioPanel';
import styles from './HoldingsInputPanel.module.scss';

type InputMode = 'manual' | 'smart';

interface HoldingsInputPanelProps {
  onAddHolding: (holding: CryptoHolding) => void;
  onReplaceHoldings: (holdings: CryptoHolding[]) => void;
  onApplyTargets: (targets: Record<string, number>) => void;
}

export const HoldingsInputPanel = ({
  onAddHolding,
  onReplaceHoldings,
  onApplyTargets
}: HoldingsInputPanelProps) => {
  const [mode, setMode] = useState<InputMode>('smart');

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs}>
        <button
          type="button"
          onClick={() => setMode('smart')}
          className={`${styles.tab} ${mode === 'smart' ? styles.active : ''}`}
        >
          Smart
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`${styles.tab} ${mode === 'manual' ? styles.active : ''}`}
        >
          Manual
        </button>
      </div>

      {mode === 'manual' ? (
        <AddHoldingForm onAddHolding={onAddHolding} />
      ) : (
        <SmartPortfolioPanel onReplaceHoldings={onReplaceHoldings} onApplyTargets={onApplyTargets} />
      )}
    </div>
  );
};
