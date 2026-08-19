/**
 * Utility functions to format round and matchday numbers,
 * especially mapping knockout round numbers (>= 100) to human-readable stage names.
 */

export const getRoundDisplay = (roundNum: number): string => {
  if (roundNum === 100) return "Round of 32";
  if (roundNum === 101) return "Round of 16";
  if (roundNum === 102) return "Quarter-Finals";
  if (roundNum === 103) return "Semi-Finals";
  if (roundNum === 104) return "Third Place Playoff";
  if (roundNum === 105) return "Grand Final";
  if (roundNum >= 106) return `Knockout Round ${roundNum - 100}`;
  return `Round ${roundNum}`;
};

export const getRoundDisplayUpper = (roundNum: number): string => {
  return getRoundDisplay(roundNum).toUpperCase();
};

export const getShortRoundLabel = (roundNum: number): string => {
  if (roundNum === 100) return "R32";
  if (roundNum === 101) return "R16";
  if (roundNum === 102) return "QF";
  if (roundNum === 103) return "SF";
  if (roundNum === 104) return "3rd";
  if (roundNum === 105) return "F";
  if (roundNum >= 106) return `KO${roundNum - 100}`;
  return `M${roundNum}`;
};
