'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Player {
  id: string;
  player_id: string;
  player_name: string;
  team_name?: string;
  auction_value?: number; // For real players
  acquisition_value?: number; // For football players
  star_rating: number;
  position?: string;
  contract_start_season?: string;
  contract_end_season?: string;
  type?: 'real' | 'football';
}

interface SearchablePlayerSelectProps {
  players: Player[];
  value: string;
  onChange: (playerId: string) => void;
  placeholder?: string;
  label: string;
  disabled?: boolean;
  color?: 'blue' | 'purple' | 'orange';
  showValueAs?: 'currency' | 'rating';
  playerType?: 'real' | 'football';
}

export default function SearchablePlayerSelect({
  players,
  value,
  onChange,
  placeholder = 'Search player...',
  label,
  disabled = false,
  color = 'blue',
  playerType = 'real'
}: SearchablePlayerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 250 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedPlayer = players.find(p => p.id === value);

  // Get the value to display (auction_value for real players, acquisition_value for football players)
  const getPlayerValue = (player: Player) => {
    return playerType === 'football' ? (player.acquisition_value || 0) : (player.auction_value || 0);
  };

  const filteredPlayers = players.filter(p => 
    p.player_name.toLowerCase().includes(search.toLowerCase()) ||
    p.team_name?.toLowerCase().includes(search.toLowerCase())
  );

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const targetWidth = Math.max(rect.width, 280);
      let left = rect.left;
      if (left + targetWidth > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - targetWidth - 10);
      }

      let top = rect.bottom + 8;
      // If menu would overflow screen bottom and there's enough space above, flip upwards
      if (top + 360 > window.innerHeight && rect.top > 360) {
        top = Math.max(10, rect.top - 368);
      }

      setDropdownPos({
        top,
        left,
        width: targetWidth
      });
    }
  };

  // Close dropdown when clicking outside or scrolling outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      if (isOpen) {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest('.searchable-dropdown')) {
          return;
        }
        updatePosition();
      }
    };

    const handleResize = () => {
      if (isOpen) updatePosition();
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const colorClasses = {
    blue: {
      border: 'border-blue-500',
      ring: 'ring-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      hover: 'hover:bg-blue-50'
    },
    purple: {
      border: 'border-purple-500',
      ring: 'ring-purple-500',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      hover: 'hover:bg-purple-50'
    },
    orange: {
      border: 'border-orange-500',
      ring: 'ring-orange-500',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      hover: 'hover:bg-orange-50'
    }
  };

  const colors = colorClasses[color];

  const dropdownMenu = isOpen && mounted && (
    <div 
      ref={dropdownRef}
      className="searchable-dropdown fixed bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden"
      style={{
        top: `${dropdownPos.top}px`,
        left: `${dropdownPos.left}px`,
        width: `${dropdownPos.width}px`,
        maxWidth: 'calc(100vw - 20px)',
        maxHeight: '400px',
        zIndex: 999999
      }}
    >
      {/* Search Input */}
      <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10">
        <input
          ref={inputRef}
          type="text"
          placeholder="🔍 Type to search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="text-xs text-gray-500 mt-1">
          {search ? `Found ${filteredPlayers.length} of ${players.length}` : `${players.length} players available`}
        </div>
      </div>

      {/* Player List */}
      <div className="dropdown-scroll-container overflow-y-auto" style={{ maxHeight: '320px' }}>
        {filteredPlayers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No players found
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <div
              key={player.id}
              onClick={() => {
                onChange(player.id);
                setIsOpen(false);
                setSearch('');
              }}
              className={`p-3 cursor-pointer transition-colors ${
                player.id === value ? colors.bg : 'hover:bg-gray-50'
              } border-b border-gray-100 last:border-b-0`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`font-semibold ${player.id === value ? colors.text : 'text-gray-900'}`}>
                    {player.player_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {player.team_name}
                    {player.contract_start_season && player.contract_end_season && (
                      <> • {player.contract_start_season} → {player.contract_end_season}</>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-sm font-semibold text-gray-700">
                    {playerType === 'football' ? `${getPlayerValue(player)} eCoin` : `$${getPlayerValue(player)}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {playerType === 'football' && player.position ? player.position : (player.star_rating > 20 ? `OVR: ${player.star_rating}` : `${player.star_rating}⭐`)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>

      {/* Selected Player Display / Search Input */}
      <div
        ref={triggerRef}
        className={`w-full px-4 py-3 rounded-xl border-2 ${
          isOpen ? `${colors.border} ${colors.ring} ring-2` : 'border-gray-300'
        } bg-white cursor-pointer transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
      >
        {selectedPlayer ? (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{selectedPlayer.player_name}</div>
              <div className="text-xs text-gray-500">
                {selectedPlayer.team_name} • {playerType === 'football' ? `${getPlayerValue(selectedPlayer)} eCoin` : `$${getPlayerValue(selectedPlayer)}`} • {playerType === 'football' && selectedPlayer.position ? selectedPlayer.position : (selectedPlayer.star_rating > 20 ? `OVR: ${selectedPlayer.star_rating}` : `${selectedPlayer.star_rating}⭐`)}
                {selectedPlayer.contract_start_season && selectedPlayer.contract_end_season && (
                  <> • Contract: {selectedPlayer.contract_start_season} → {selectedPlayer.contract_end_season}</>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="text-gray-400">{placeholder}</div>
        )}
      </div>

      {/* Dropdown rendered through Portal directly on document.body */}
      {mounted && typeof document !== 'undefined' && dropdownMenu ? createPortal(dropdownMenu, document.body) : null}
    </div>
  );
}
