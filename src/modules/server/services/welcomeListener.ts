import { type GuildMember, type PartialGuildMember } from "discord.js";
import { loadWelcomeSettings } from "./welcomeService.js";
import { DEFAULT_BOOST_MESSAGE, DEFAULT_WELCOME_MESSAGE, renderWelcomeTemplate } from "./welcomeTemplates.js";

async function sendTemplatedMessage(params: {
  channelId: string | null;
  template: string | null;
  fallback: string;
  member: GuildMember;
}): Promise<void> {
  if (!params.channelId) {
    return;
  }

  const channel = await params.member.guild.channels.fetch(params.channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    return;
  }

  const content = renderWelcomeTemplate(params.template?.trim() || params.fallback, {
    userMention: `<@${params.member.id}>`,
    serverName: params.member.guild.name,
    memberCount: params.member.guild.memberCount,
    boostCount: params.member.guild.premiumSubscriptionCount ?? 0,
  });

  await channel.send({ content }).catch(() => undefined);
}

export async function handleMemberJoin(member: GuildMember): Promise<void> {
  if (member.user.bot) {
    return;
  }

  const settings = await loadWelcomeSettings(member.guild.id);
  if (!settings?.welcomeChannelId) {
    return;
  }

  await sendTemplatedMessage({
    channelId: settings.welcomeChannelId,
    template: settings.welcomeMessage,
    fallback: DEFAULT_WELCOME_MESSAGE,
    member,
  });
}

export async function handleMemberBoost(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
): Promise<void> {
  if (newMember.user.bot) {
    return;
  }

  const wasBoosting = Boolean(oldMember.premiumSince);
  const isBoosting = Boolean(newMember.premiumSince);
  if (wasBoosting || !isBoosting) {
    return;
  }

  const settings = await loadWelcomeSettings(newMember.guild.id);
  if (!settings?.boostChannelId) {
    return;
  }

  await sendTemplatedMessage({
    channelId: settings.boostChannelId,
    template: settings.boostMessage,
    fallback: DEFAULT_BOOST_MESSAGE,
    member: newMember,
  });
}
