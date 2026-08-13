export interface RankDefinition {
  name: string;
  requiredLevel: number;
  discordRoleId?: string | null;
}

export type RankStatusKind = "unlocked" | "current" | "locked";

export interface RankStatus extends RankDefinition {
  status: RankStatusKind;
}

export const DEFAULT_LEVEL_ROLES: RankDefinition[] = [
  { name: "Beginner", requiredLevel: 1 },
  { name: "Rising", requiredLevel: 5 },
  { name: "Skilled", requiredLevel: 10 },
  { name: "Advanced", requiredLevel: 20 },
  { name: "Expert", requiredLevel: 30 },
  { name: "Master", requiredLevel: 50 },
];

export function sortRanks(ranks: RankDefinition[]): RankDefinition[] {
  return [...ranks].sort((left, right) => left.requiredLevel - right.requiredLevel);
}

export function resolveLadder(stored: RankDefinition[]): RankDefinition[] {
  return stored.length > 0 ? sortRanks(stored) : DEFAULT_LEVEL_ROLES;
}

export function getCurrentRank(
  level: number,
  ranks: RankDefinition[],
): RankDefinition | null {
  const qualifying = sortRanks(ranks).filter((rank) => rank.requiredLevel <= level);
  return qualifying.at(-1) ?? null;
}

export function getNextRank(
  level: number,
  ranks: RankDefinition[],
): RankDefinition | null {
  return sortRanks(ranks).find((rank) => rank.requiredLevel > level) ?? null;
}

export function getCrossedRanks(
  oldLevel: number,
  newLevel: number,
  ranks: RankDefinition[],
): RankDefinition[] {
  if (newLevel <= oldLevel) {
    return [];
  }

  return sortRanks(ranks).filter(
    (rank) => rank.requiredLevel > oldLevel && rank.requiredLevel <= newLevel,
  );
}

export function rankStatuses(level: number, ranks: RankDefinition[]): RankStatus[] {
  const ladder = sortRanks(ranks);
  const current = getCurrentRank(level, ladder);

  return ladder.map((rank) => {
    if (current && rank.requiredLevel === current.requiredLevel) {
      return { ...rank, status: "current" };
    }
    if (rank.requiredLevel <= level) {
      return { ...rank, status: "unlocked" };
    }
    return { ...rank, status: "locked" };
  });
}

export function formatUnlockMessage(crossed: RankDefinition[]): string | null {
  if (crossed.length === 0) {
    return null;
  }

  const newest = crossed.at(-1);
  if (!newest) {
    return null;
  }

  if (crossed.length === 1) {
    return `New Role Unlocked: **${newest.name}**`;
  }

  const skipped = crossed.slice(0, -1).map((rank) => rank.name);
  return `New Role Unlocked: **${newest.name}**\nAlso passed: ${skipped.join(", ")}`;
}
