/**
 * Utility functions for Prime player validity formatting and duration parsing.
 * Placed in a separate utility module without 'use server' so they can be
 * safely used synchronously by both client components and server actions.
 */

export function formatPrimeValidity(
  validity: string | number | undefined | null,
  curSeasonNum: number,
  isMidSeason: boolean = false
): string {
  if (!validity) {
    const target = (Number(curSeasonNum) + (isMidSeason ? 0.5 : 0) + 1.0).toFixed(1);
    return `Season ${target} (1 Season)`;
  }

  const vStr = String(validity).trim();
  if (vStr.toLowerCase() === "permanent") {
    return "Permanent";
  }

  const numVal = parseFloat(vStr);
  if (!isNaN(numVal) && (vStr === String(numVal) || vStr === `${numVal}.0` || !isNaN(Number(vStr)))) {
    const curBase = Number(curSeasonNum) + (isMidSeason ? 0.5 : 0);
    const target = (curBase + numVal).toFixed(1);
    const label = numVal === 0.5 ? "0.5 Season (Half)" : numVal === 1 ? "1 Season" : `${numVal} Seasons`;
    return `Season ${target} (${label})`;
  }

  return vStr;
}

export function parsePrimeDurationInfo(
  validUntil: string | null | undefined,
  curSeasonNum: number = 9,
  isMidSeason: boolean = false
): { durationLabel: string; expiryLabel: string; raw: string } {
  const currentBase = Number(curSeasonNum) + (isMidSeason ? 0.5 : 0);

  if (!validUntil || validUntil.trim() === "") {
    const target = (currentBase + 1.0).toFixed(1);
    return {
      durationLabel: "1 Season",
      expiryLabel: `Until Season ${target}`,
      raw: "1 Season"
    };
  }

  const str = validUntil.trim();
  const lower = str.toLowerCase();

  if (lower === "permanent") {
    return {
      durationLabel: "Permanent",
      expiryLabel: "Never Expires",
      raw: str
    };
  }

  // Handle formats like "Season 7.0 (1 Season)" or "Season 8.5 (1.5 Seasons)" or "Season 9.5 (0.5 Season (Half))"
  const parenMatch = str.match(/(?:season\s*([0-9.]+))?\s*\(([^)]+)\)/i);
  if (parenMatch) {
    const seasonPart = parenMatch[1];
    let durationPart = parenMatch[2].trim();
    if (durationPart === "0.5 Season") durationPart = "0.5 Season (Half)";
    return {
      durationLabel: durationPart,
      expiryLabel: seasonPart ? `Until Season ${seasonPart}` : "",
      raw: str
    };
  }

  // Handle formats like "season 9.5", "season 10.0", "season 10"
  const seasonMatch = lower.match(/^season\s*([0-9.]+)$/i);
  if (seasonMatch) {
    const targetSeason = parseFloat(seasonMatch[1]);
    const diff = Math.round((targetSeason - currentBase) * 10) / 10;

    let durationLabel = "";
    if (diff === 0.5) durationLabel = "0.5 Season (Half)";
    else if (diff === 1.0 || diff === 1) durationLabel = "1 Season";
    else if (diff === 1.5) durationLabel = "1.5 Seasons";
    else if (diff === 2.0 || diff === 2) durationLabel = "2 Seasons";
    else if (diff === 3.0 || diff === 3) durationLabel = "3 Seasons";
    else if (diff > 0) durationLabel = `${diff} Seasons`;
    else durationLabel = "1 Season";

    return {
      durationLabel,
      expiryLabel: `Until Season ${seasonMatch[1]}`,
      raw: str
    };
  }

  // Handle relative strings like "0.5", "0.5 Season", "half season"
  if (lower === "0.5" || lower.includes("0.5 season") || lower.includes("half")) {
    const target = (currentBase + 0.5).toFixed(1);
    return {
      durationLabel: "0.5 Season (Half)",
      expiryLabel: `Until Season ${target}`,
      raw: str
    };
  }

  // Handle "1.5", "1.5 seasons"
  if (lower === "1.5" || lower.includes("1.5 season")) {
    const target = (currentBase + 1.5).toFixed(1);
    return {
      durationLabel: "1.5 Seasons",
      expiryLabel: `Until Season ${target}`,
      raw: str
    };
  }

  // Handle "2", "2.0", "2 seasons"
  if (lower === "2" || lower === "2.0" || lower.includes("2 season")) {
    const target = (currentBase + 2.0).toFixed(1);
    return {
      durationLabel: "2 Seasons",
      expiryLabel: `Until Season ${target}`,
      raw: str
    };
  }

  // Handle "3", "3.0", "3 seasons"
  if (lower === "3" || lower === "3.0" || lower.includes("3 season")) {
    const target = (currentBase + 3.0).toFixed(1);
    return {
      durationLabel: "3 Seasons",
      expiryLabel: `Until Season ${target}`,
      raw: str
    };
  }

  // Handle "1", "1.0", "1 season"
  if (lower === "1" || lower === "1.0" || lower.includes("1 season")) {
    const target = (currentBase + 1.0).toFixed(1);
    return {
      durationLabel: "1 Season",
      expiryLabel: `Until Season ${target}`,
      raw: str
    };
  }

  // Custom text fallback
  return {
    durationLabel: str,
    expiryLabel: "",
    raw: str
  };
}
