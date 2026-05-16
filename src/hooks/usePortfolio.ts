import { useState, useCallback, useMemo, useEffect } from 'react';
import { CryptoHolding, Recommendation, PortfolioState } from '../types/types';
import { storage } from '../utils/storage';

const PORTFOLIO_CACHE_KEY = 'crypto_portfolio_cache';

export const usePortfolio = () => {
  const savePortfolio = useCallback((nextHoldings: CryptoHolding[]) => {
    storage.set(PORTFOLIO_CACHE_KEY, {
      holdings: nextHoldings,
      totalValue: nextHoldings.reduce((sum, h) => sum + h.value, 0),
      lastUpdated: new Date()
    });
  }, []);

  // Initialize state from cache if available
  const [holdings, setHoldings] = useState<CryptoHolding[]>(() => {
    const cachedState = storage.get<PortfolioState>(PORTFOLIO_CACHE_KEY);
    return cachedState?.holdings || [];
  });

  const totalValue = useMemo(() => 
    holdings.reduce((sum, holding) => sum + holding.value, 0),
    [holdings]
  );

  const portfolioState: PortfolioState = useMemo(() => ({
    holdings,
    totalValue,
    lastUpdated: new Date()
  }), [holdings, totalValue]);

  const addHolding = useCallback((holding: CryptoHolding) => {
    setHoldings(prev => {
      const normalizedIncomingName = holding.name.trim().toUpperCase();
      const existingIndex = prev.findIndex(h => h.name.trim().toUpperCase() === normalizedIncomingName);

      let newHoldings: CryptoHolding[];
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];

        const updated: CryptoHolding = {
          ...existing,
          value: existing.value + (holding.value || 0),
          targetPercentage: holding.targetPercentage ?? existing.targetPercentage,
          lastUpdated: new Date()
        };

        newHoldings = [...prev];
        newHoldings[existingIndex] = updated;
      }
      else {
        newHoldings = [...prev, {
          ...holding,
          name: normalizedIncomingName,
          id: Date.now().toString(),
          lastUpdated: new Date()
        }];
      }

      savePortfolio(newHoldings);
      return newHoldings;
    });
  }, [savePortfolio]);

  const replaceHoldings = useCallback((nextHoldings: CryptoHolding[]) => {
    const normalized = nextHoldings.map(holding => ({
      ...holding,
      id: holding.id || Date.now().toString(),
      name: holding.name.trim().toUpperCase(),
      lastUpdated: new Date()
    }));

    setHoldings(normalized);
    savePortfolio(normalized);
  }, [savePortfolio]);

  const applyTargetPercentages = useCallback((targets: Record<string, number>) => {
    setHoldings(prev => {
      const normalizedTargets = Object.entries(targets).reduce<Record<string, number>>((acc, [name, value]) => {
        acc[name.trim().toUpperCase()] = value;
        return acc;
      }, {});

      const updatedHoldings = prev.map(holding => {
        const normalizedName = holding.name.trim().toUpperCase();
        if (!(normalizedName in normalizedTargets)) {
          return holding;
        }

        return {
          ...holding,
          targetPercentage: normalizedTargets[normalizedName],
          lastUpdated: new Date()
        };
      });

      const existingNames = new Set(updatedHoldings.map(holding => holding.name.trim().toUpperCase()));
      const missingHoldings: CryptoHolding[] = Object.entries(normalizedTargets)
        .filter(([name]) => !existingNames.has(name))
        .map(([name, targetPercentage]) => ({
          id: `${Date.now()}-${name}`,
          name,
          value: 0,
          targetPercentage,
          lastUpdated: new Date()
        }));

      const newHoldings = [...updatedHoldings, ...missingHoldings];
      savePortfolio(newHoldings);
      return newHoldings;
    });
  }, [savePortfolio]);

  const deleteHolding = useCallback((id: string) => {
    setHoldings(prev => {
      const newHoldings = prev.filter(holding => holding.id !== id);
      savePortfolio(newHoldings);
      return newHoldings;
    });
  }, [savePortfolio]);

  const calculateRecommendations = useCallback((): Recommendation[] => {
    return holdings.map(holding => {
      const currentValue = holding.value;
      const targetValue = (holding.targetPercentage || 0) * totalValue / 100;
      const difference = targetValue - currentValue;

      return {
        asset: holding.name,
        action: Math.abs(difference) < 1 ? 'No changes' : difference > 0 ? 'Buy' : 'Sell',
        amount: Math.abs(difference),
        timestamp: new Date()
      };
    });
  }, [holdings, totalValue]);

  // Save to cache whenever portfolio state changes
  useEffect(() => {
    storage.set(PORTFOLIO_CACHE_KEY, portfolioState);
  }, [portfolioState]);

  return {
    holdings,
    totalValue,
    addHolding,
    replaceHoldings,
    applyTargetPercentages,
    deleteHolding,
    calculateRecommendations
  };
}; 