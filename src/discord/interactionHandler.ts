import { MessageFlags, type Interaction } from "discord.js";
import { commandMap } from "./commandRegistry.js";

export async function handleInteraction(interaction: Interaction): Promise<void> {
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
