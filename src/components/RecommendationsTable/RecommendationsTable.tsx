import { Recommendation } from '../../types/types';
import { Table, Column } from '../Table/Table';
import { Card } from '../Card/Card';
import { TokenIcon } from '../TokenIcon/TokenIcon';
import styles from './RecommendationsTable.module.scss';

interface RecommendationsTableProps {
  recommendations: Recommendation[];
}

export const RecommendationsTable = ({ recommendations }: RecommendationsTableProps) => {
  const columns: Column<Recommendation>[] = [
    {
      header: 'Asset',
      accessor: (rec: Recommendation) => <TokenIcon symbol={rec.asset} />
    },
    {
      header: 'Action',
      accessor: (rec: Recommendation) => (
        <span className={`${styles.recommendationBox} ${styles[rec.action.toLowerCase()]}`}>
          {rec.action}
        </span>
      ),
      className: styles.recommendation
    },
    {
      header: 'Amount (€)',
      accessor: (rec: Recommendation) => rec.action !== 'No changes' ? `€${rec.amount.toFixed()}` : '€0'
    }
  ];

  return (
    <Card 
      title="Buy/Sell Recommendations"
      icon="🔄"
    >
      <Table
        data={recommendations}
        columns={columns}
        emptyMessage="No recommendations yet. Add holdings and target allocations first."
      />
    </Card>
  );
}; 