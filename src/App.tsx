import { HoldingsInputPanel } from './components/HoldingsInputPanel/HoldingsInputPanel';
import { HoldingsTable } from './components/HoldingsTable/HoldingsTable';
import { RecommendationsTable } from './components/RecommendationsTable/RecommendationsTable';
import { usePortfolio } from './hooks/usePortfolio';
import styles from './App.module.scss';

function App() {
  const {
    holdings,
    totalValue,
    addHolding,
    replaceHoldings,
    applyTargetPercentages,
    deleteHolding,
    calculateRecommendations
  } = usePortfolio();

  return (
    <div className={styles.container}>

      <div className={styles.inner}>
        <div className={styles.form}>
          <HoldingsInputPanel
            onAddHolding={addHolding}
            onReplaceHoldings={replaceHoldings}
            onApplyTargets={applyTargetPercentages}
          />
        </div>
      
        <div className={styles.tables}>
          <h1 className={styles.title}>Portfolio Allocation Calculator</h1>

          <HoldingsTable
            holdings={holdings}
            totalValue={totalValue}
            onDeleteHolding={deleteHolding}
          />
          
          <RecommendationsTable recommendations={calculateRecommendations()} />
        </div>
      </div>
    </div>
  );
}

export default App;
