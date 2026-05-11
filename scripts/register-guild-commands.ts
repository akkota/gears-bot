import { REST, Routes } from "discord.js";
import { env } from "../src/env.js";
import { registeredCommands } from "../src/discord/commandRegistry.js";

const commands = registeredCommands.map((command) => command.data.toJSON());

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

async function registerGuildCommands(): Promise<void> {
  await rest.put(
    Routes.applicationGuildCommands(
      env.DISCORD_CLIENT_ID,
      env.DISCORD_GUILD_ID,
    ),
    { body: commands },
  );

  console.log(
    `Registered ${commands.length} guild command(s) for guild ${env.DISCORD_GUILD_ID}.`,
  );
}

void registerGuildCommands();
