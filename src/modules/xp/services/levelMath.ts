/**
 * Level 1 starts at 0 XP.
 * Cumulative XP required to reach level L is 50 * (L - 1)^2.
 * Inverse: levelFromXp(xp) = floor(sqrt(xp / 50)) + 1
 */
export const XP_CURVE_FACTOR = 50;

export function xpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return XP_CURVE_FACTOR * (safeLevel - 1) ** 2;
}

export function levelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor(Math.sqrt(safeXp / XP_CURVE_FACTOR)) + 1;
}

export function xpToNextLevel(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeeded: number;
} {
  const level = levelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpIntoLevel = Math.max(0, xp - currentLevelXp);
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeeded: Math.max(0, nextLevelXp - xp),
  };
}
