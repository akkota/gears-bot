import { AttachmentBuilder } from "discord.js";
import type { RankDefinition } from "../../xp/services/rankLadder.js";
import { getCurrentRank } from "../../xp/services/rankLadder.js";
import { nextGardenUnlockLabel } from "./gardenCatalog.js";
import { renderGardenCard } from "./gardenCard.js";
import { loadGardenView, type GardenView } from "./gardenService.js";
import { buildGardenActionRows, buildGardenEmbed } from "./gardenUi.js";

export async function presentGarden(params: {
  guildId: string;
  ownerId: string;
  displayName: string;
  xp: number;
  level: number;
  ranks: RankDefinition[];
  self: boolean;
}): Promise<{
  view: GardenView;
  embeds: ReturnType<typeof buildGardenEmbed>[];
  files: AttachmentBuilder[];
  components: ReturnType<typeof buildGardenActionRows>;
}> {
  const view = await loadGardenView({
    guildId: params.guildId,
    userId: params.ownerId,
    level: params.level,
  });
  const rank = getCurrentRank(params.level, params.ranks);
  const nextUnlock = nextGardenUnlockLabel(params.level);
  const image = await renderGardenCard({
    view,
    displayName: params.displayName,
    rankName: rank?.name ?? null,
    xpLabel: `${params.xp.toLocaleString()} XP`,
    nextUnlock,
  });
  const files = image ? [new AttachmentBuilder(image, { name: "garden.png" })] : [];
  const embed = buildGardenEmbed({
    displayName: params.displayName,
    rankName: rank?.name ?? null,
    xp: params.xp,
    view,
    nextUnlock,
    imageName: image ? "garden.png" : undefined,
  });

  return {
    view,
    embeds: [embed],
    files,
    components: buildGardenActionRows({ ownerId: params.ownerId, view, self: params.self }),
  };
}
