import { useState, useEffect } from 'react';

export function useStatusFilter(entityType: string) {
  const [statusFilter, setStatusFilterState] = useState<string>('all');
  
  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`${entityType}StatusFilter`);
    if (saved) {
      setStatusFilterState(saved);
    }
  }, [entityType]);

  // Save to localStorage when changed
  const setStatusFilter = (status: string) => {
    setStatusFilterState(status);
    localStorage.setItem(`${entityType}StatusFilter`, status);
  };

  // Clear filter (useful for reset buttons)
  const clearStatusFilter = () => {
    setStatusFilterState('all');
    localStorage.removeItem(`${entityType}StatusFilter`);
  };

  return {
    statusFilter,
    setStatusFilter,
    clearStatusFilter
  };
}