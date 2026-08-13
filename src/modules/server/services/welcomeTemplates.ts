export const DEFAULT_WELCOME_MESSAGE = "Welcome {user} to {server}!";
export const DEFAULT_BOOST_MESSAGE = "Thanks {user} for boosting {server}!";

export interface WelcomeTemplateVars {
  userMention: string;
  serverName: string;
  memberCount: number;
  boostCount: number;
}

export function renderWelcomeTemplate(template: string, vars: WelcomeTemplateVars): string {
  return template
    .replaceAll("{user}", vars.userMention)
    .replaceAll("{server}", vars.serverName)
    .replaceAll("{memberCount}", String(vars.memberCount))
    .replaceAll("{boosts}", String(vars.boostCount))
    .slice(0, 2000);
}
