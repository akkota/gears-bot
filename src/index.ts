import { env } from "./env.js";
import { createDiscordClient } from "./discord/client.js";

const client = createDiscordClient();
void client.login(env.DISCORD_TOKEN);
