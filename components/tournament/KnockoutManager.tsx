'use client';

import { useState, useEffect } from 'react';

// Types
type RoundName = 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'THIRD_PLACE' | 'FINAL';
type CreationMode = 'AUTO' | 'MANUAL';
type PairingMethod = 'AUTO_SEED' | 'CONSECUTIVE' | 'CUSTOM';

interface Team {
  id: number;
  name: string;
  logo: string;
  manager: string;
  points: number;
  goalDifference: number;
  groupName?: string;
  groupPosition?: number;
  overallPosition: number;
}

interface KnockoutManagerProps {
  tournamentId: number;
  tournament: any;
  onSuccess?: () => void;
}

export default function KnockoutManager({ tournamentId, tournament, onSuccess }: KnockoutManagerProps) {
  console.log('=== KnockoutManager RENDER START ===');
  console.log('tournamentId:', tournamentId);
  console.log('tournament:', tournament);
  console.log('tournament.format_type:', tournament?.format_type);
  
  // State
  const [knockoutRounds, setKnockoutRounds] = useState<any[]>([]);
  const [eligibleTeams, setEligibleTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [mode, setMode] = useState<CreationMode>('AUTO');
  const [roundName, setRoundName] = useState<RoundName>('QUARTER_FINAL');
  const [legs, setLegs] = useState(2);
  const [pairingMethod, setPairingMethod] = useState<PairingMethod>('AUTO_SEED');
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [createFullBracket, setCreateFullBracket] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [showTeamSelector, setShowTeamSelector] = useState(false);

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
    console.log('Loading knockout rounds for tournament:', tournamentId);
    setLoading(true);
    try {
      const { fetchKnockoutRounds } = await import('@/utils/solo/serverActions');
      const rounds = await fetchKnockoutRounds(tournamentId);
      console.log('Loaded knockout rounds:', rounds);
      console.log('Rounds type:', typeof rounds, 'Is array:', Array.isArray(rounds));
      
      // Force conversion to real array - the database query returns a Proxy
      let validRounds: any[] = [];
      if (rounds) {
        // Try spreading to force array conversion
        validRounds = [...rounds];
      }
      
      console.log('Valid rounds array:', validRounds);
      console.log('Valid rounds length:', validRounds.length);
      console.log('Valid rounds JSON:', JSON.stringify(validRounds));
      setKnockoutRounds(validRounds);
    } catch (error: any) {
      console.error('Error loading knockout rounds:', error);
      showToast('Failed to load knockout rounds: ' + error.message);
      setKnockoutRounds([]);
    } finally {
      console.log('Loading finished, setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('KnockoutManager mounted, tournament:', tournament);
    loadKnockoutRounds();
  }, [tournamentId]);

  const handleCreateKnockoutRound = async () => {
    const selectedRound = roundOptions.find(r => r.value === roundName);
    if (!selectedRound) return;

    if (mode === 'MANUAL' && selectedTeams.length !== selectedRound.teams) {
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
        mode: mode.toLowerCase() as 'auto' | 'manual',
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
        <div style={{ 
          width: "2rem", 
          height: "2rem", 
          border: "3px solid rgba(59, 130, 246, 0.3)", 
          borderTop: "3px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
      </div>
    );
  }

  const hasKnockoutStage = 
    tournament?.format_type?.includes('Knockout') || 
    tournament?.has_knockout_stage ||
    tournament?.is_pure_knockout;

  console.log('Render conditions:', { 
    loading, 
    hasKnockoutStage, 
    format_type: tournament?.format_type,
    knockoutRoundsLength: knockoutRounds?.length 
  });

  if (!hasKnockoutStage) {
    console.log('No knockout stage, showing warning');
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#e5e7eb", marginBottom: "0.5rem" }}>
          Knockout Stage Not Enabled
        </h3>
        <p style={{ color: "#9ca3af" }}>
          This tournament does not have a knockout stage configured.
          Please enable knockout stage in tournament settings.
        </p>
      </div>
    );
  }

  console.log('Rendering main content, knockoutRounds:', knockoutRounds);

  return (
    <div style={{ 
      width: "100%",
      minHeight: "500px",
      background: "#ff0000",
      padding: "24px",
      borderRadius: "12px",
      border: "10px solid #00ff00",
      position: "relative",
      zIndex: 999999,
      margin: "20px 0",
      boxShadow: "0 0 50px rgba(255, 0, 0, 0.8)"
    }}>
      {/* DEBUG: Always visible header */}
      <div style={{ 
        background: "#0000ff", 
        color: "#ffff00", 
        padding: "30px", 
        fontSize: "32px", 
        fontWeight: "bold",
        marginBottom: "24px",
        borderRadius: "8px",
        textAlign: "center",
        border: "5px solid white",
        position: "relative",
        zIndex: 999999
      }}>
        🥇 KNOCKOUT MANAGER ACTIVE - {knockoutRounds.length} ROUNDS LOADED
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ 
          position: "fixed", 
          top: "2rem", 
          right: "2rem", 
          zIndex: 99999, 
          background: "#1f2937", 
          color: "white", 
          padding: "1rem 1.5rem", 
          borderRadius: "0.75rem", 
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
          border: "1px solid #6366f1"
        }}>
          {toast}
        </div>
      )}

      {/* Header Section */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        marginBottom: "24px",
        padding: "16px",
        background: "rgba(99, 102, 241, 0.1)",
        borderRadius: "8px",
        border: "1px solid rgba(99, 102, 241, 0.3)"
      }}>
        <div>
          <h2 style={{ 
            fontSize: "1.5rem", 
            fontWeight: "bold", 
            color: "#f3f4f6", 
            margin: 0,
            marginBottom: "8px"
          }}>
            <span>🥇</span> Knockout Stage Management
          </h2>
          <p style={{ 
            fontSize: "0.875rem", 
            color: "#9ca3af", 
            margin: 0
          }}>
            Create and manage knockout tournament rounds
          </p>
        </div>
        {knockoutRounds.length > 0 && (
          <button
            onClick={handleResetBracket}
            style={{ 
              padding: "0.75rem 1.25rem", 
              background: "#dc2626", 
              color: "white", 
              borderRadius: "0.5rem", 
              border: "none", 
              cursor: "pointer", 
              fontSize: "0.875rem", 
              fontWeight: 600,
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#b91c1c"}
            onMouseOut={(e) => e.currentTarget.style.background = "#dc2626"}
          >
            <i className="fa-solid fa-trash" style={{ marginRight: "0.5rem" }}></i>
            Reset Bracket
          </button>
        )}
      </div>

      {/* Existing Rounds */}
      {knockoutRounds.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#e5e7eb" }}>Existing Knockout Rounds</h3>
          {knockoutRounds.map(round => (
            <div
              key={round.id}
              style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.5rem", padding: "1rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div>
                  <h4 style={{ fontWeight: 600, color: "#f3f4f6" }}>
                    {roundLabels[round.round_name] || round.round_name}
                  </h4>
                  <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                    {round.legs === 1 ? 'Single Leg' : 'Two Legs'} • {' '}
                    <span style={{ 
                      fontWeight: 500,
                      color: round.status === 'COMPLETED' ? '#10b981' :
                             round.status === 'IN_PROGRESS' ? '#3b82f6' :
                             '#6b7280'
                    }}>
                      {round.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Pairings */}
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {round.pairings?.filter((p: any) => p).map((pairing: any, idx: number) => (
                  <div
                    key={pairing.id || idx}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255, 255, 255, 0.02)", borderRadius: "0.375rem", padding: "0.75rem", fontSize: "0.875rem" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                      <span style={{ color: "#9ca3af", fontWeight: 500, width: "2rem" }}>#{pairing.pairingOrder}</span>
                      
                      {/* Team 1 */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                        {pairing.team1 ? (
                          <>
                            {pairing.team1.logo && (
                              <img
                                src={pairing.team1.logo}
                                alt={pairing.team1.name}
                                style={{ width: "1.5rem", height: "1.5rem", objectFit: "contain" }}
                              />
                            )}
                            <span style={{ fontWeight: 500, color: "#f3f4f6" }}>{pairing.team1.name}</span>
                          </>
                        ) : (
                          <span style={{ color: "#6b7280", fontStyle: "italic" }}>
                            {pairing.team1Placeholder || 'TBD'}
                          </span>
                        )}
                      </div>

                      <span style={{ color: "#6b7280", fontWeight: "bold" }}>VS</span>

                      {/* Team 2 */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                        {pairing.team2 ? (
                          <>
                            {pairing.team2.logo && (
                              <img
                                src={pairing.team2.logo}
                                alt={pairing.team2.name}
                                style={{ width: "1.5rem", height: "1.5rem", objectFit: "contain" }}
                              />
                            )}
                            <span style={{ fontWeight: 500, color: "#f3f4f6" }}>{pairing.team2.name}</span>
                          </>
                        ) : (
                          <span style={{ color: "#6b7280", fontStyle: "italic" }}>
                            {pairing.team2Placeholder || 'TBD'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Winner */}
                    {pairing.winnerId && (
                      <div style={{ marginLeft: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981" }}>
                        <i className="fa-solid fa-trophy"></i>
                        <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>Winner</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ 
          background: "rgba(59, 130, 246, 0.15)", 
          border: "2px solid rgba(59, 130, 246, 0.4)", 
          borderRadius: "12px", 
          padding: "32px", 
          textAlign: "center",
          marginBottom: "24px"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🥇</div>
          <h3 style={{ 
            fontWeight: 600, 
            color: "#93c5fd", 
            marginBottom: "12px",
            fontSize: "1.25rem"
          }}>
            No Knockout Rounds Yet
          </h3>
          <p style={{ 
            fontSize: "0.875rem", 
            color: "#60a5fa",
            margin: 0
          }}>
            Create your first knockout round below to get started
          </p>
        </div>
      )}

      {/* Create New Round */}
      <div style={{ 
        background: "rgba(99, 102, 241, 0.15)", 
        border: "2px solid rgba(99, 102, 241, 0.4)", 
        borderRadius: "12px", 
        padding: "24px"
      }}>
        <h3 style={{ 
          fontSize: "1.25rem", 
          fontWeight: 600, 
          color: "#e5e7eb", 
          marginBottom: "20px",
          margin: 0
        }}>
          Create New Knockout Round
        </h3>

        <div style={{ 
          display: "grid", 
          gap: "16px", 
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginTop: "20px"
        }}>
          {/* Mode Selection */}
          <div>
            <label style={{ 
              display: "block", 
              fontSize: "0.875rem", 
              fontWeight: 600, 
              color: "#d1d5db", 
              marginBottom: "8px" 
            }}>
              Creation Mode
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setMode('AUTO')}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: mode === 'AUTO' ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                  background: mode === 'AUTO' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                  color: mode === 'AUTO' ? 'white' : '#d1d5db',
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Auto Qualification
              </button>
              <button
                onClick={() => setMode('MANUAL')}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: mode === 'MANUAL' ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                  background: mode === 'MANUAL' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                  color: mode === 'MANUAL' ? 'white' : '#d1d5db',
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Manual Selection
              </button>
            </div>
          </div>

          {/* Round Selection */}
          <div>
            <label style={{ 
              display: "block", 
              fontSize: "0.875rem", 
              fontWeight: 600, 
              color: "#d1d5db", 
              marginBottom: "8px" 
            }}>
              Round Type
            </label>
            <select
              value={roundName}
              onChange={(e) => setRoundName(e.target.value as RoundName)}
              style={{ 
                width: "100%", 
                padding: "10px 16px", 
                border: "2px solid rgba(255, 255, 255, 0.2)", 
                borderRadius: "8px", 
                background: "rgba(255, 255, 255, 0.05)", 
                color: "#f3f4f6", 
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
              {roundOptions.map(option => (
                <option key={option.value} value={option.value} style={{ background: "#1f2937" }}>
                  {option.label} ({option.teams} teams)
                </option>
              ))}
            </select>
          </div>

          {/* Legs Selection */}
          <div>
            <label style={{ 
              display: "block", 
              fontSize: "0.875rem", 
              fontWeight: 600, 
              color: "#d1d5db", 
              marginBottom: "8px" 
            }}>
              Number of Legs
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setLegs(1)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: legs === 1 ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                  background: legs === 1 ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                  color: legs === 1 ? 'white' : '#d1d5db',
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Single Leg
              </button>
              <button
                onClick={() => setLegs(2)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: legs === 2 ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                  background: legs === 2 ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                  color: legs === 2 ? 'white' : '#d1d5db',
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Two Legs
              </button>
            </div>
          </div>

          {/* Full Bracket Option */}
          <div>
            <label style={{ 
              display: "block", 
              fontSize: "0.875rem", 
              fontWeight: 600, 
              color: "#d1d5db", 
              marginBottom: "8px" 
            }}>
              Bracket Generation
            </label>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              cursor: "pointer",
              padding: "10px 16px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              border: "2px solid rgba(255, 255, 255, 0.2)"
            }}>
              <input
                type="checkbox"
                checked={createFullBracket}
                onChange={(e) => setCreateFullBracket(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.875rem", color: "#d1d5db", fontWeight: 500 }}>
                Create full bracket (auto-generate subsequent rounds)
              </span>
            </label>
          </div>
        </div>

        {/* Mode Description */}
        <div style={{ 
          marginTop: "20px", 
          padding: "16px", 
          background: "rgba(255, 255, 255, 0.05)", 
          borderRadius: "8px", 
          border: "1px solid rgba(255, 255, 255, 0.15)" 
        }}>
          {mode === 'AUTO' ? (
            <div style={{ fontSize: "0.875rem" }}>
              <p style={{ 
                fontWeight: 600, 
                color: "#f3f4f6", 
                marginBottom: "8px",
                margin: "0 0 8px 0"
              }}>
                🤖 Auto Qualification Mode
              </p>
              <p style={{ color: "#9ca3af", margin: 0 }}>
                Teams will be automatically paired based on group/league standings.
                Placeholders like "Group A #1" will resolve as matches complete.
              </p>
            </div>
          ) : (
            <div style={{ fontSize: "0.875rem" }}>
              <p style={{ 
                fontWeight: 600, 
                color: "#f3f4f6", 
                marginBottom: "8px",
                margin: "0 0 8px 0"
              }}>
                ✋ Manual Selection Mode
              </p>
              <p style={{ color: "#9ca3af", margin: 0 }}>
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
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "14px 24px",
            background: creating ? "#4f46e5" : "#6366f1",
            color: "white",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.5 : 1,
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => !creating && (e.currentTarget.style.background = "#4f46e5")}
          onMouseOut={(e) => !creating && (e.currentTarget.style.background = "#6366f1")}
        >
          {creating ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }}></i>
              Creating...
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus" style={{ marginRight: "8px" }}></i>
              Create Knockout Round
            </>
          )}
        </button>
      </div>
    </div>
  );
}
