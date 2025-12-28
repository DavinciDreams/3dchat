import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  group?: string;
}

interface TypeaheadSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function TypeaheadSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  icon,
  className = '',
}: TypeaheadSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        opt.description?.toLowerCase().includes(lower) ||
        opt.group?.toLowerCase().includes(lower)
    );
  }, [options, search]);

  // Group options by their group property
  const groupedOptions = useMemo(() => {
    const groups: Record<string, SelectOption[]> = {};
    filteredOptions.forEach((opt) => {
      const group = opt.group || '';
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
    });
    return groups;
  }, [filteredOptions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].id);
          setIsOpen(false);
          setSearch('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <span className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
          {label}
        </span>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg border border-gray-600/50 hover:border-teal-500/50 hover:bg-gray-700/80 transition-all duration-200 min-w-[140px] group focus:outline-none focus:ring-2 focus:ring-teal-500/50"
      >
        {icon && <span className="text-teal-400">{icon}</span>}
        <span className="flex-1 text-left truncate">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 w-72 max-h-80 bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-600/50 shadow-2xl shadow-black/50 overflow-hidden z-50"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-gray-700/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to search..."
                  className="w-full bg-gray-900 text-gray-100 text-sm pl-9 pr-3 py-2 rounded-lg border border-gray-600 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-60 overscroll-contain">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No results found
                </div>
              ) : (
                Object.entries(groupedOptions).map(([group, groupOptions]) => (
                  <div key={group}>
                    {group && (
                      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-900/30 sticky top-0">
                        {group}
                      </div>
                    )}
                    {groupOptions.map((option, idx) => {
                      const globalIndex = filteredOptions.indexOf(option);
                      const isSelected = option.id === value;
                      const isHighlighted = globalIndex === highlightedIndex;

                      return (
                        <button
                          key={option.id}
                          onClick={() => handleSelect(option.id)}
                          onMouseEnter={() => setHighlightedIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            isHighlighted
                              ? 'bg-teal-500/20'
                              : isSelected
                              ? 'bg-gray-700/50'
                              : 'hover:bg-gray-700/30'
                          }`}
                        >
                          {option.icon && (
                            <span className="text-gray-400">{option.icon}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm truncate ${
                                isSelected ? 'text-teal-400 font-medium' : 'text-white'
                              }`}
                            >
                              {option.label}
                            </div>
                            {option.description && (
                              <div className="text-xs text-gray-500 truncate">
                                {option.description}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-teal-400 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TypeaheadSelect;
