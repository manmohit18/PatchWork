export type AppConfig = {
  appOrigin: string;
  callbackUrl: string;
  githubClientId: string;
  githubClientSecret: string;
  secureCookies: boolean;
};

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const required = ["APP_ORIGIN", "GITHUB_OAUTH_CALLBACK_URL", "GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET"] as const;
  for (const key of required) {
    if (!env[key] || env[key]?.startsWith("replace-with-")) throw new Error(`Missing configuration: ${key}`);
  }
  const appOrigin = new URL(env.APP_ORIGIN!).origin;
  const callbackUrl = new URL(env.GITHUB_OAUTH_CALLBACK_URL!).toString();
  if (new URL(callbackUrl).origin !== appOrigin) throw new Error("OAuth callback must use APP_ORIGIN");
  return {
    appOrigin,
    callbackUrl,
    githubClientId: env.GITHUB_OAUTH_CLIENT_ID!,
    githubClientSecret: env.GITHUB_OAUTH_CLIENT_SECRET!,
    secureCookies: appOrigin.startsWith("https://"),
  };
}
