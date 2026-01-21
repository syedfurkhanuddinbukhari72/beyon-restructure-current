import { useState, useMemo } from 'react';

export function useSearchAndCategory({ menuData }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!menuData) return [];
    const allItems = Object.values(menuData).flat();

    if (searchMode && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return allItems.filter(i => i.name.toLowerCase().includes(q));
    }

    if (selectedCategory === 'All') return allItems;
    return menuData[selectedCategory] || [];
  }, [menuData, selectedCategory, searchMode, searchQuery]);

  return {
    // state
    selectedCategory,
    searchMode,
    searchQuery,

    // setters
    setSelectedCategory,
    setSearchMode,
    setSearchQuery,

    // derived
    filteredItems,
  };
}
