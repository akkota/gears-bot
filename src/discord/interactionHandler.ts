import { MessageFlags, type Interaction } from "discord.js";
import { handleGardenComponent } from "../modules/garden/services/gardenButtons.js";
import { handleHabitChallengeButton } from "../modules/habits/services/habitChallengeWorker.js";
import {
  paginateProjects,
  searchEswProjects,
} from "../modules/projects/services/projectSearchService.js";
import {
  buildProjectSearchMessage,
  parseProjectPageCustomId,
} from "../modules/projects/services/projectSearchUi.js";
import { handleReactionRoleButtonToggle } from "../modules/reactionRoles/services/reactionRoleService.js";
import { commandMap } from "./commandRegistry.js";

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (
    (interaction.isButton() || interaction.isStringSelectMenu()) &&
    interaction.customId.startsWith("garden:")
  ) {
    try {
      await handleGardenComponent(interaction);
    } catch (error) {
      console.error("Garden interaction failed:", error);
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith("rr:toggle:")) {
      try {
        await handleReactionRoleButtonToggle(interaction);
      } catch (error) {
        console.error("Button interaction failed:", error);

        if (interaction.deferred || interaction.replied) {
          return;
        }

        await interaction
          .reply({
            content: "Something went wrong while processing that button.",
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => undefined);
      }
      return;
    }

    if (
      interaction.customId.startsWith("habit:approve:") ||
      interaction.customId.startsWith("habit:reject:")
    ) {
      try {
        await handleHabitChallengeButton(interaction);
      } catch (error) {
        console.error("Habit button failed:", error);
      }
      return;
    }

    if (interaction.customId.startsWith("proj:")) {
      await handleProjectSearchPage(interaction);
    }

    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commandMap.get(interaction.commandName);
  if (!command) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Command execution failed:", error);

    if (interaction.deferred || interaction.replied) {
      return;
    }

    await interaction
      .reply({
        content: "Something went wrong while processing that command.",
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => undefined);
  }
}

async function handleProjectSearchPage(
  interaction: Interaction & { isButton(): boolean },
): Promise<void> {
  if (!interaction.isButton()) {
    return;
  }

  const parsed = parseProjectPageCustomId(interaction.customId);
  if (!parsed) {
    await interaction.reply({
      content: "That search expired. Run `/project search` again.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferUpdate();

  const results = await searchEswProjects(parsed.state);
  const page = paginateProjects(results, parsed.page);
  const message = buildProjectSearchMessage(
    page.items,
    page.page,
    page.total,
    page.totalPages,
    parsed.state,
  );

  await interaction.editReply({
    embeds: message.embeds,
    components: message.components,
  });
}
