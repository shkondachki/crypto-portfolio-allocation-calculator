import { CryptoHolding } from '../../types/types';
import { Table, Column } from '../Table/Table';
import { Card } from '../Card/Card';
import { TokenIcon } from '../TokenIcon/TokenIcon';
import styles from './HoldingsTable.module.scss';

interface HoldingsTableProps {
  holdings: CryptoHolding[];
  totalValue: number;
  onDeleteHolding: (id: string) => void;
}

export const HoldingsTable = ({ holdings, totalValue, onDeleteHolding }: HoldingsTableProps) => {
  const columns: Column<CryptoHolding>[] = [
    {
      header: 'Asset',
      accessor: (holding: CryptoHolding) => <TokenIcon symbol={holding.name} />
    },
    {
      header: 'Value (€)',
      accessor: (holding: CryptoHolding) => `€${holding.value.toFixed()}`
    },
    {
      header: '% of Portfolio',
      accessor: (holding: CryptoHolding) => `${((holding.value / totalValue) * 100).toFixed()}%`
    },
    {
      header: 'Target %',
      accessor: (holding: CryptoHolding) => {
        const percent = holding.targetPercentage ?? 0;
        if (!percent) return '€0';
        const targetValue = ((percent / 100) * totalValue) || 0;
        return (
          <>
            {percent}% <span className={styles.divider}>/</span> €{targetValue.toFixed()}
          </>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (holding: CryptoHolding) => (
        <button
          className={`${styles.button} ${styles.link} ${styles.error} ${styles.sm}`}
          onClick={() => onDeleteHolding(holding.id)}
        >
          Delete
        </button>
      )
    }
  ];

  const totalTargetPercent =
      holdings.reduce((sum, h) => sum + (h.targetPercentage ?? 0), 0);
  const AlertTriangleIcon = () => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             className="feather feather-alert-triangle">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
    )
  };

  return (
      <Card
          title={
            <div className={styles.holdingsTitleWrapper}>
              <div>Current Holdings <span className={styles.smallText}>(Total: €{totalValue.toFixed(2)}, Target: {totalTargetPercent}%)</span></div>

              {totalTargetPercent === 100 ? null : (
                  <span className={styles.warning}>
                    <AlertTriangleIcon/>
                    {totalTargetPercent > 100 ? 'Over 100%' : 'Under 100%'}
                  </span>
              )}
            </div>
          }
          icon="💼"
      >
      <Table
        data={holdings}
        columns={columns}
        emptyMessage="No holdings yet. Add manually or import from Kraken."
      />
    </Card>
  );
}; 