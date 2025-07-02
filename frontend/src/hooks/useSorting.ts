// src/hooks/useSorting.ts
import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';
export type SortField = string;

// Standard sort configurations for different entity types
export const SORT_CONFIGS = {
  clients: {
    name: { label: 'Name', cardLabel: 'A-Z' },
    contact_person: { label: 'Contact Person', cardLabel: 'Contact' },
    type: { label: 'Type', cardLabel: 'Type' },
    created_at: { label: 'Created', cardLabel: 'Date' },
  },
  leads: {
    name: { label: 'Name', cardLabel: 'A-Z' },
    contact_person: { label: 'Contact Person', cardLabel: 'Contact' },
    lead_status: { label: 'Status', cardLabel: 'Status' },
    type: { label: 'Type', cardLabel: 'Type' },
    created_at: { label: 'Created', cardLabel: 'Date' },
  },
  projects: {
    project_name: { label: 'Project Name', cardLabel: 'A-Z' },
    project_status: { label: 'Status', cardLabel: 'Status' },
    type: { label: 'Type', cardLabel: 'Type' },
    project_worth: { label: 'Value', cardLabel: 'Value' },
    entity: { label: 'Entity', cardLabel: 'Entity' },
    created_at: { label: 'Created', cardLabel: 'Date' },
  }
} as const;

// Convert between different sorting formats
export function legacySortToUnified(sortOrder: 'newest' | 'oldest' | 'alphabetical', entityType: keyof typeof SORT_CONFIGS): { field: string, direction: SortDirection } {
  switch (sortOrder) {
    case 'newest':
      return { field: 'created_at', direction: 'desc' };
    case 'oldest':
      return { field: 'created_at', direction: 'asc' };
    case 'alphabetical':
      // Use the primary name field for each entity type
      const nameField = entityType === 'projects' ? 'project_name' : 'name';
      return { field: nameField, direction: 'asc' };
    default:
      return { field: 'created_at', direction: 'desc' };
  }
}

export function unifiedToLegacySort(field: string, direction: SortDirection, entityType: keyof typeof SORT_CONFIGS): 'newest' | 'oldest' | 'alphabetical' {
  if (field === 'created_at') {
    return direction === 'desc' ? 'newest' : 'oldest';
  }
  
  const nameField = entityType === 'projects' ? 'project_name' : 'name';
  if (field === nameField && direction === 'asc') {
    return 'alphabetical';
  }
  
  // Default fallback
  return 'newest';
}

export interface UseSortingProps {
  entityType: keyof typeof SORT_CONFIGS;
  initialSort?: { field: string; direction: SortDirection };
  onSortChange?: (field: string, direction: SortDirection) => void;
}

export function useSorting({ entityType, initialSort, onSortChange }: UseSortingProps) {
  const [sortField, setSortField] = useState<string>(initialSort?.field || 'created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSort?.direction || 'desc');

  const handleSort = useCallback((field: string) => {
    let newDirection: SortDirection = 'asc';
    
    if (sortField === field) {
      // Toggle direction if same field
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Default direction based on field type
      if (field === 'created_at' || field === 'project_worth') {
        newDirection = 'desc'; // Newer/higher values first
      } else {
        newDirection = 'asc'; // Alphabetical/ascending first
      }
    }

    setSortField(field);
    setSortDirection(newDirection);
    onSortChange?.(field, newDirection);
  }, [sortField, sortDirection, onSortChange]);

  const sortConfig = SORT_CONFIGS[entityType];

  // Generate card view sort options
  const cardSortOptions = useMemo(() => {
    const options = [
      { 
        value: 'created_at_desc', 
        label: 'Newest first',
        field: 'created_at',
        direction: 'desc' as SortDirection
      },
      { 
        value: 'created_at_asc', 
        label: 'Oldest first',
        field: 'created_at',
        direction: 'asc' as SortDirection
      }
    ];

    // Add alphabetical option
    const nameField = entityType === 'projects' ? 'project_name' : 'name';
    const nameConfig = sortConfig[nameField as keyof typeof sortConfig];
    options.push({
      value: `${nameField}_asc`,
      label: nameConfig?.cardLabel || 'A-Z',
      field: nameField,
      direction: 'asc' as SortDirection
    });

    // Add entity-specific options
    if (entityType === 'projects' && 'project_worth' in sortConfig) {
      options.push({
        value: 'project_worth_desc',
        label: 'By Value',
        field: 'project_worth',
        direction: 'desc' as SortDirection
      });
    }

    return options;
  }, [entityType, sortConfig]);

  const currentCardValue = `${sortField}_${sortDirection}`;

  const getSortIcon = useCallback((field: string) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  }, [sortField, sortDirection]);

  const sortData = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Special handling for different data types
      if (sortField === 'created_at' || sortField === 'project_start' || sortField === 'project_end') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (sortField === 'project_worth') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        // String comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortField, sortDirection]);

  return {
    sortField,
    sortDirection,
    handleSort,
    getSortIcon,
    sortData,
    cardSortOptions,
    currentCardValue,
    setCardSort: (value: string) => {
      const option = cardSortOptions.find(opt => opt.value === value);
      if (option) {
        setSortField(option.field);
        setSortDirection(option.direction);
        onSortChange?.(option.field, option.direction);
      }
    }
  };
}