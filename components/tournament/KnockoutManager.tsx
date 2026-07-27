'use client';

import { useState, useEffect } from 'react';

interface KnockoutManagerProps {
  tournamentId: number;
  tournament: any;
  onSuccess?: () => void;
}

export default function KnockoutManager({ tournamentId, tournament, onSuccess }: KnockoutManagerProps) {
  const [knockoutRounds, setKnockoutRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [roundName, setRoundName] = useState('QUARTER_FINAL');
  const [legs, setLegs] = useState(2);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [createFullBracket, setCreateFullBracket] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const roundOptions = [
    { value: 'ROUND_OF_32', label: 'Round of 32', teams: 32 },
    { value: 'ROUND_OF_16', label: 'Round of 16', teams: 16 },
    { value: 'QUARTER_FINAL', label: 'Quarter Finals', teams: 8 },
    { value: 'SEMI_FINAL', label: 'Semi Finals', teams: 4 },
    { value: 'FINAL', label: 'Final', teams: 2 }
  ];

  const roundLabels: Record<string, string> = {
    'ROUND_OF_32': 'Round of 32',
    'ROUND_OF_16': 'Round of 16',
    'QUARTER_FINAL': 'Quarter Finals',
    'SEMI_FINAL': 'Semi Finals',
    'THIRD_PLACE': 'Third Place',
    'FINAL': 'Final'
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadKnockoutRounds = async () => {
    setLoading(true);
    try {
      const { fetchKnockoutRounds } = await import('@/utils/solo/serverActions');
      const rounds = await fetchKnockoutRounds(tournamentId);
      setKnockoutRounds(rounds || []);
    } catch (error: any) {
      console.error('Error loading knockout rounds:', error);
      showToast('Failed to load knockout rounds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnockoutRounds();
  }, [tournamentId]);

  const handleCreateKnockoutRound = async () => {
    const selectedRound = roundOptions.find(r => r.value === roundName);
    if (!selectedRound) return;

    if (mode === 'manual' && selectedTeams.length !== selectedRound.teams) {
      showToast(`Please select exactly ${selectedRound.teams} teams`);
      return;
    }

    setCreating(true);
    try {
      const { createKnockoutRound } = await import('@/utils/solo/serverActions');
      await createKnockoutRound({
        tournamentId,
        roundName,
        legs,
        teams: selectedTeams,
        mode,
        createFullBracket
      });

      showToast('✅ Knockout round created successfully!');
      setSelectedTeams([]);
      await loadKnockoutRounds();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error creating knockout round:', error);
      showToast(`❌ ${error.message || 'Failed to create knockout round'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleResetBracket = async () => {
    if (!confirm('Are you sure you want to delete ALL knockout rounds? This action cannot be undone!')) return;

    try {
      const { deleteAllKnockoutRounds } = await import('@/utils/solo/serverActions');
      await deleteAllKnockoutRounds(tournamentId);
      showToast('✅ All knockout rounds deleted');
      await loadKnockoutRounds();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      showToast(`❌ ${error.message || 'Failed to delete knockout rounds'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const hasKnockoutStage = 
    tournament?.format_type?.includes('Knockout') || 
    tournament?.has_knockout_stage ||
    tournament?.is_pure_knockout;

  if (!hasKnockoutStage) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Knockout Stage Not Enabled
        </h3>
        <p className="text-gray-600">
          This tournament does not have a knockout stage configured.
          Please enable knockout stage in tournament settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>🥇</span> Knockout Stage Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage knockout tournament rounds
          </p>
        </div>
        {knockoutRounds.length > 0 && (
          <button
            onClick={handleResetBracket}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <i className="fa-solid fa-trash mr-2"></i>
            Reset Bracket
          </button>
        )}
      </div>

      {/* Existing Rounds */}
      {knockoutRounds.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Existing Knockout Rounds</h3>
          {knockoutRounds.map(round => (
            <div
              key={round.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {roundLabels[round.round_name] || round.round_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {round.legs === 1 ? 'Single Leg' : 'Two Legs'} • {' '}
                    <span className={`font-medium ${
                      round.status === 'COMPLETED' ? 'text-green-600' :
                      round.status === 'IN_PROGRESS' ? 'text-blue-600' :
                      'text-gray-500'
                    }`}>
                      {round.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Pairings */}
              <div className="grid gap-2">
                {round.pairings?.filter((p: any) => p).map((pairing: any, idx: number) => (
                  <div
                    key={pairing.id || idx}
                    className="flex items-center justify-between bg-gray-50 rounded p-3 text-sm"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-gray-500 font-medium w-8">#{pairing.pairingOrder}</span>
                      
                      {/* Team 1 */}
                      <div className="flex items-center gap-2 flex-1">
                        {pairing.team1 ? (
                          <>
                            {pairing.team1.logo && (
                              <img
                                src={pairing.team1.logo}
                                alt={pairing.team1.name}
                                className="w-6 h-6 object-contain"
                              />
                            )}
                            <span className="font-medium">{pairing.team1.name}</span>
                          </>
                        ) : (
                          <span className="text-gray-500 italic">
                            {pairing.team1Placeholder || 'TBD'}
                          </span>
                        )}
                      </div>

                      <span className="text-gray-400 font-bold">VS</span>

                      {/* Team 2 */}
                      <div className="flex items-center gap-2 flex-1">
                        {pairing.team2 ? (
                          <>
                            {pairing.team2.logo && (
                              <img
                                src={pairing.team2.logo}
                                alt={pairing.team2.name}
                                className="w-6 h-6 object-contain"
                              />
                            )}
                            <span className="font-medium">{pairing.team2.name}</span>
                          </>
                        ) : (
                          <span className="text-gray-500 italic">
                            {pairing.team2Placeholder || 'TBD'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Winner */}
                    {pairing.winnerId && (
                      <div className="ml-4 flex items-center gap-2 text-green-600">
                        <i className="fa-solid fa-trophy"></i>
                        <span className="text-xs font-medium">Winner</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">🥇</div>
          <h3 className="font-semibold text-blue-900 mb-2">No Knockout Rounds Yet</h3>
          <p className="text-sm text-blue-700">
            Create your first knockout round below to get started
          </p>
        </div>
      )}

      {/* Create New Round */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Knockout Round</h3>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Creation Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('auto')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'auto'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                Auto Qualification
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'manual'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                Manual Selection
              </button>
            </div>
          </div>

          {/* Round Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Round Type
            </label>
            <select
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {roundOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.teams} teams)
                </option>
              ))}
            </select>
          </div>

          {/* Legs Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Legs
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLegs(1)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  legs === 1
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                Single Leg
              </button>
              <button
                onClick={() => setLegs(2)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  legs === 2
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                Two Legs
              </button>
            </div>
          </div>

          {/* Full Bracket Option */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bracket Generation
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createFullBracket}
                onChange={(e) => setCreateFullBracket(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">
                Create full bracket (auto-generate subsequent rounds)
              </span>
            </label>
          </div>
        </div>

        {/* Mode Description */}
        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
          {mode === 'auto' ? (
            <div className="text-sm">
              <p className="font-medium text-gray-900 mb-2">🤖 Auto Qualification Mode</p>
              <p className="text-gray-600">
                Teams will be automatically paired based on group/league standings.
                Placeholders like "Group A #1" will resolve as matches complete.
              </p>
            </div>
          ) : (
            <div className="text-sm">
              <p className="font-medium text-gray-900 mb-2">✋ Manual Selection Mode</p>
              <p className="text-gray-600">
                You'll select teams manually after the preceding stage completes.
                Teams must be selected before creating the round.
              </p>
            </div>
          )}
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateKnockoutRound}
          disabled={creating}
          className="mt-4 w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              Creating...
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus mr-2"></i>
              Create Knockout Round
            </>
          )}
        </button>
      </div>
    </div>
  );
}
