import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { AppConfig } from "./config.js";

export type GitHubProfile = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type OAuthGateway = {
  authorizationUrl(state: string, codeChallenge: string): string;
  exchangeCode(code: string, codeVerifier: string): Promise<string>;
  fetchProfile(accessToken: string): Promise<GitHubProfile>;
};

export function randomUrlToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function equalTokens(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createGitHubOAuth(config: AppConfig): OAuthGateway {
  return {
    authorizationUrl(state, challenge) {
      const url = new URL("https://github.com/login/oauth/authorize");
      url.searchParams.set("client_id", config.githubClientId);
      url.searchParams.set("redirect_uri", config.callbackUrl);
      url.searchParams.set("scope", "read:user");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      return url.toString();
    },
    async exchangeCode(code, verifier) {
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: config.githubClientId,
          client_secret: config.githubClientSecret,
          code,
          redirect_uri: config.callbackUrl,
          code_verifier: verifier,
        }),
      });
      if (!response.ok) throw new Error("GitHub token exchange failed");
      const result = await response.json() as { access_token?: string; error?: string };
      if (!result.access_token || result.error) throw new Error("GitHub token exchange failed");
      return result.access_token;
    },
    async fetchProfile(accessToken) {
      const response = await fetch("https://api.github.com/user", {
        signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
      });
      if (!response.ok) throw new Error("GitHub profile request failed");
      const profile = await response.json() as Partial<GitHubProfile>;
      if (!Number.isSafeInteger(profile.id) || typeof profile.login !== "string" || !profile.login) {
        throw new Error("GitHub profile is invalid");
      }
      return {
        id: profile.id!, login: profile.login,
        name: typeof profile.name === "string" ? profile.name : null,
        email: typeof profile.email === "string" ? profile.email : null,
        avatar_url: typeof profile.avatar_url === "string" ? profile.avatar_url : null,
      };
    },
  };
}
