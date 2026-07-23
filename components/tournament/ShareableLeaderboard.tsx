'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';

interface GroupTeam {
  team_id: string;
  team_name: string;
  team_logo?: string;
  group: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  position: number;
  qualifies: boolean;
}

interface TeamStats {
  team_id: string;
  team_name: string;
  team_logo?: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

interface ShareableLeaderboardProps {
  standings?: TeamStats[];
  groupStandings?: Record<string, GroupTeam[]>;
  tournamentName: string;
  seasonName?: string;
  format?: string;
  selectedRound?: number | null;
  availableRounds?: number[];
}

export default function ShareableLeaderboard({ 
  standings,
  groupStandings,
  tournamentName,
  seasonName,
  format = 'league',
  selectedRound = null,
}: ShareableLeaderboardProps) {
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  // Initialize selected group for group stage
  useState(() => {
    if (groupStandings && !selectedGroup) {
      const groups = Object.keys(groupStandings).sort();
      if (groups.length > 0) {
        setSelectedGroup(groups[0]);
      }
    }
  });

  const isGroupStage = format === 'group_stage' && groupStandings;
  const groups = isGroupStage ? Object.keys(groupStandings).sort() : [];
  const currentStandings = isGroupStage && selectedGroup 
    ? groupStandings[selectedGroup] 
    : standings || [];

  const generateImage = async () => {
    if (!leaderboardRef.current) return;

    try {
      setIsGenerating(true);
      
      // Ensure preview is visible for rendering
      const wasHidden = !showPreview;
      if (wasHidden) {
        setShowPreview(true);
        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const dataUrl = await toPng(leaderboardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#020617',
        cacheBust: true,
        skipFonts: true,
      });

      // Hide preview again if it was hidden
      if (wasHidden) {
        setShowPreview(false);
      }

      // Create download link
      const link = document.createElement('a');
      link.download = `${tournamentName.replace(/\s+/g, '-')}-leaderboard.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareImage = async () => {
    if (!leaderboardRef.current) return;

    try {
      setIsGenerating(true);
      
      // Ensure preview is visible for rendering
      const wasHidden = !showPreview;
      if (wasHidden) {
        setShowPreview(true);
        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const dataUrl = await toPng(leaderboardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#020617',
        cacheBust: true,
        skipFonts: true,
      });

      // Hide preview again if it was hidden
      if (wasHidden) {
        setShowPreview(false);
      }

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${tournamentName}-leaderboard.png`, { type: 'image/png' });

      // Check if Web Share API is available
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${tournamentName} - Leaderboard`,
          text: `Check out the current standings for ${tournamentName}!`,
          files: [file],
        });
      } else {
        // Fallback to download
        generateImage();
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      // Fallback to download
      generateImage();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Group Selector for Group Stage */}
      {isGroupStage && groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-semibold text-gray-700 flex items-center">Select Group:</span>
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm ${
                selectedGroup === group
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Group {group}
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {showPreview ? 'Hide Preview' : 'Preview Image'}
        </button>

        <button
          onClick={generateImage}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Image
            </>
          )}
        </button>

        <button
          onClick={shareImage}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Image
            </>
          )}
        </button>
      </div>

      {/* Preview/Hidden Leaderboard for Image Generation */}
      <div className={showPreview ? 'block' : 'hidden'} style={{ width: '100%', overflowX: 'auto' }}>
        <div 
          ref={leaderboardRef}
          className="bg-slate-950 p-8 rounded-2xl shadow-2xl border border-slate-800"
          style={{ width: '1200px', minWidth: '1200px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {/* Header Section */}
          <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-950 p-8 border-b border-slate-800 text-center">
            {/* Background glowing circles/gradient for depth */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
            
            <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest rounded-full mb-3 border border-indigo-500/30">
              {seasonName || `SEASON ${new Date().getFullYear()}`}
            </span>
            
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 uppercase tracking-wider mb-2 drop-shadow-sm" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              {tournamentName}
            </h1>
            
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
              {format === 'league' && '⚽ LEAGUE STANDINGS ⚽'}
              {format === 'group_stage' && `⚽ GROUP ${selectedGroup} STANDINGS ⚽`}
              {format === 'knockout' && '⚽ KNOCKOUT STAGE ⚽'}
            </p>
          </div>

          {/* Leaderboard Title */}
          <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-4 text-center">
            <h2 className="text-2xl font-extrabold text-slate-200 uppercase tracking-wide">
              {isGroupStage ? `GROUP ${selectedGroup} STANDINGS` : 'LEADERBOARD'}
              {selectedRound && ` - AFTER ROUND ${selectedRound}`}
            </h2>
          </div>

          {/* Table Container */}
          <div className="p-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-2 text-center w-[6%]">#</th>
                  <th className="py-4 px-4 text-left w-[30%]">TEAM</th>
                  <th className="py-4 px-2 text-center w-[8%]">MP</th>
                  <th className="py-4 px-2 text-center w-[8%]">W</th>
                  <th className="py-4 px-2 text-center w-[8%]">D</th>
                  <th className="py-4 px-2 text-center w-[8%]">L</th>
                  <th className="py-4 px-2 text-center w-[8%]">GF</th>
                  <th className="py-4 px-2 text-center w-[8%]">GA</th>
                  <th className="py-4 px-2 text-center w-[8%]">GD</th>
                  <th className="py-4 px-3 text-center w-[8%] text-amber-400 bg-amber-500/5 rounded-t-lg">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50">
                {currentStandings.map((team: any, index: number) => {
                  const isGold = index === 0;
                  const isSilver = index === 1;
                  const isBronze = index === 2;
                  
                  return (
                    <tr 
                      key={team.team_id}
                      className="hover:bg-slate-800/20 transition-colors group"
                    >
                      {/* Rank */}
                      <td className="py-4 px-2 text-center">
                        <div className="flex items-center justify-center">
                          {isGold ? (
                            <span className="flex items-center justify-center bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-955 font-black px-2.5 py-1 rounded text-sm shadow-md shadow-yellow-500/20 w-8 h-8">
                              1
                            </span>
                          ) : isSilver ? (
                            <span className="flex items-center justify-center bg-gradient-to-r from-slate-300 to-slate-400 text-slate-955 font-black px-2.5 py-1 rounded text-sm shadow-md shadow-slate-400/20 w-8 h-8">
                              2
                            </span>
                          ) : isBronze ? (
                            <span className="flex items-center justify-center bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black px-2.5 py-1 rounded text-sm shadow-md shadow-amber-700/20 w-8 h-8">
                              3
                            </span>
                          ) : (
                            <span className="flex items-center justify-center bg-slate-800 text-slate-400 font-bold px-2.5 py-1 rounded text-sm w-8 h-8">
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Team Name and Logo */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-4">
                          {team.team_logo ? (
                            <img 
                              src={team.team_logo} 
                              alt={`${team.team_name} logo`}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-800 bg-slate-900 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm">
                              {team.team_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-slate-100 uppercase text-sm tracking-wide group-hover:text-white">
                            {team.team_name}
                          </span>
                        </div>
                      </td>
                      
                      {/* Matches Played */}
                      <td className="py-4 px-2 text-center">
                        <span className="text-slate-300 font-semibold">{team.matches_played}</span>
                      </td>
                      
                      {/* Wins */}
                      <td className="py-4 px-2 text-center">
                        <span className="text-slate-300 font-semibold">{team.wins}</span>
                      </td>
                      
                      {/* Draws */}
                      <td className="py-4 px-2 text-center">
                        <span className="text-slate-300 font-semibold">{team.draws}</span>
                      </td>
                      
                      {/* Losses */}
                      <td className="py-4 px-2 text-center">
                        <span className="text-slate-300 font-semibold">{team.losses}</span>
                      </td>
                      
                      {/* Goals For (Forwarded) */}
                      <td className="py-4 px-2 text-center">
                        <span className="text-slate-300 font-semibold">{team.goals_for}</span>
                      </td>
                      
                      {/* Goals Against (Conceded) */}
                      <td className="py-4 px-2 text-center">
                        <span className="text-slate-400 font-semibold">{team.goals_against}</span>
                      </td>
                      
                      {/* Goal Difference */}
                      <td className="py-4 px-2 text-center">
                        <span className={`font-bold text-sm ${
                          team.goal_difference > 0 ? 'text-emerald-400' :
                          team.goal_difference < 0 ? 'text-rose-400' :
                          'text-slate-400'
                        }`}>
                          {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                        </span>
                      </td>
                      
                      {/* Points */}
                      <td className="py-4 px-3 text-center bg-amber-500/5 border-x border-slate-900">
                        <span className="font-black text-base text-yellow-400">{team.points}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
