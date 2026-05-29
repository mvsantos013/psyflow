export const AUTH_SESSION_STORAGE_KEY = "psyflow_auth_session";
export const AUTH_ID_TOKEN_STORAGE_KEY = "psyflow_id_token";
const REFRESH_SKEW_MS = 30_000;

export type AuthRole = "admin" | "therapist" | "assistant" | "super_admin" | "unknown";

export type AuthUser = {
  sub: string;
  email: string;
  name?: string;
  role: AuthRole;
  orgId?: string;
};

export type AuthSession = {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt: number;
  user: AuthUser;
};

type CognitoInitiateAuthResponse = {
  AuthenticationResult?: {
    AccessToken?: string;
    ExpiresIn?: number;
    IdToken?: string;
    RefreshToken?: string;
    TokenType?: string;
  };
  ChallengeName?: string;
  Session?: string;
  ChallengeParameters?: Record<string, string>;
  message?: string;
  __type?: string;
};

type CognitoTarget =
  | "AWSCognitoIdentityProviderService.InitiateAuth"
  | "AWSCognitoIdentityProviderService.RespondToAuthChallenge";

export class NewPasswordRequiredError extends Error {
  readonly code = "NEW_PASSWORD_REQUIRED";
  readonly challengeSession: string;
  readonly username: string;

  constructor(params: { challengeSession: string; username: string }) {
    super("New password is required");
    this.name = "NewPasswordRequiredError";
    this.challengeSession = params.challengeSession;
    this.username = params.username;
  }
}

let refreshInFlight: Promise<AuthSession | null> | null = null;

function getStringEnv(name: string): string {
  const raw = (import.meta.env[name] as string | undefined)?.trim();
  return raw ?? "";
}

function getCognitoConfig() {
  const region = getStringEnv("VITE_COGNITO_REGION");
  const clientId = getStringEnv("VITE_COGNITO_CLIENT_ID");

  if (!region || !clientId) {
    throw new Error(
      "Missing Cognito config. Set VITE_COGNITO_REGION and VITE_COGNITO_CLIENT_ID in ui .env.local",
    );
  }

  return { region, clientId };
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return decodeURIComponent(
      Array.from(window.atob(padded))
        .map((ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
  }

  return Buffer.from(padded, "base64").toString("utf-8");
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid token format");
  }

  const payloadJson = decodeBase64Url(parts[1]);
  const parsed = JSON.parse(payloadJson);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid token payload");
  }

  return parsed as Record<string, unknown>;
}

function toRole(value: unknown): AuthRole {
  const normalized = typeof value === "string" ? value : "";
  if (
    normalized === "admin" ||
    normalized === "therapist" ||
    normalized === "assistant" ||
    normalized === "super_admin"
  ) {
    return normalized;
  }
  return "unknown";
}

function buildUserFromIdToken(idToken: string): AuthUser {
  const claims = decodeJwtPayload(idToken);

  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email : "";
  const name = typeof claims.name === "string" ? claims.name : undefined;
  const role = toRole(claims["custom:role"]);
  const orgId = typeof claims["custom:org_id"] === "string" ? claims["custom:org_id"] : undefined;

  if (!sub) {
    throw new Error("Token is missing required subject claim");
  }

  return {
    sub,
    email,
    name,
    role,
    orgId,
  };
}

function isExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

function isExpiringSoon(expiresAt: number, skewMs = REFRESH_SKEW_MS): boolean {
  return expiresAt - Date.now() <= skewMs;
}

function parseStoredSession(raw: string): AuthSession | null {
  const parsed = JSON.parse(raw) as AuthSession;
  if (!parsed?.idToken || !parsed?.expiresAt || !parsed?.user) {
    return null;
  }
  return parsed;
}

function getStoredSessionInternal(options?: { includeExpired?: boolean }): AuthSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = parseStoredSession(raw);
    if (!parsed) {
      clearStoredSession();
      return null;
    }

    if (!options?.includeExpired && isExpired(parsed.expiresAt)) {
      return null;
    }

    return parsed;
  } catch {
    clearStoredSession();
    return null;
  }
}

function buildSessionFromAuthResult(params: {
  authResult: NonNullable<CognitoInitiateAuthResponse["AuthenticationResult"]>;
  fallbackRefreshToken?: string;
}): AuthSession {
  const idToken = params.authResult.IdToken;
  if (!idToken) {
    throw new Error("Missing id token in auth response");
  }

  const expiresIn = params.authResult.ExpiresIn ?? 3600;

  return {
    idToken,
    accessToken: params.authResult.AccessToken,
    refreshToken: params.authResult.RefreshToken ?? params.fallbackRefreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user: buildUserFromIdToken(idToken),
  };
}

async function requestCognitoAuth(
  payload: Record<string, unknown>,
  target: CognitoTarget,
): Promise<CognitoInitiateAuthResponse> {
  const { region, clientId } = getCognitoConfig();
  const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": target,
    },
    body: JSON.stringify({
      ClientId: clientId,
      ...payload,
    }),
  });

  const parsed = (await response.json()) as CognitoInitiateAuthResponse;

  if (!response.ok) {
    const message = parsed.message || parsed.__type || "Unable to authenticate";
    throw new Error(message);
  }

  return parsed;
}

function readChallengeUsername(payload: CognitoInitiateAuthResponse, fallback: string): string {
  const fromChallenge = payload.ChallengeParameters?.USER_ID_FOR_SRP;
  if (fromChallenge) {
    return fromChallenge;
  }
  return fallback;
}

export function getStoredSession(options?: { includeExpired?: boolean }): AuthSession | null {
  return getStoredSessionInternal(options);
}

export function getStoredIdToken(): string | null {
  return getStoredSession()?.idToken ?? null;
}

export function getMsUntilSessionExpiry(session: AuthSession): number {
  return session.expiresAt - Date.now();
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_ID_TOKEN_STORAGE_KEY);
}

function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  window.localStorage.setItem(AUTH_ID_TOKEN_STORAGE_KEY, session.idToken);
}

export function isAuthenticated(): boolean {
  return getStoredSession() !== null;
}

export async function loginWithPassword(params: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const email = params.email.trim();
  const password = params.password;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const payload = await requestCognitoAuth({
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  }, "AWSCognitoIdentityProviderService.InitiateAuth");

  if (payload.ChallengeName === "NEW_PASSWORD_REQUIRED") {
    if (!payload.Session) {
      throw new Error("Missing challenge session from Cognito");
    }

    throw new NewPasswordRequiredError({
      challengeSession: payload.Session,
      username: readChallengeUsername(payload, email),
    });
  }

  const authResult = payload.AuthenticationResult;
  if (!authResult) {
    throw new Error("Missing auth result in login response");
  }

  const session = buildSessionFromAuthResult({ authResult });

  saveSession(session);
  return session;
}

export async function completeNewPasswordChallenge(params: {
  username: string;
  newPassword: string;
  challengeSession: string;
}): Promise<AuthSession> {
  const username = params.username.trim();
  const newPassword = params.newPassword;

  if (!username || !newPassword || !params.challengeSession) {
    throw new Error("Missing parameters to complete new password challenge");
  }

  const payload = await requestCognitoAuth(
    {
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      Session: params.challengeSession,
      ChallengeResponses: {
        USERNAME: username,
        NEW_PASSWORD: newPassword,
      },
    },
    "AWSCognitoIdentityProviderService.RespondToAuthChallenge",
  );

  const authResult = payload.AuthenticationResult;
  if (!authResult) {
    throw new Error("Missing auth result after password change");
  }

  const session = buildSessionFromAuthResult({ authResult });
  saveSession(session);
  return session;
}

export function isNewPasswordRequiredError(error: unknown): error is NewPasswordRequiredError {
  return (
    error instanceof NewPasswordRequiredError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "NEW_PASSWORD_REQUIRED")
  );
}

export async function refreshSession(): Promise<AuthSession | null> {
  const current = getStoredSessionInternal({ includeExpired: true });
  if (!current?.refreshToken) {
    return null;
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const payload = await requestCognitoAuth({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: {
          REFRESH_TOKEN: current.refreshToken,
        },
      }, "AWSCognitoIdentityProviderService.InitiateAuth");

      const authResult = payload.AuthenticationResult;
      if (!authResult) {
        clearStoredSession();
        return null;
      }

      const refreshed = buildSessionFromAuthResult({
        authResult,
        fallbackRefreshToken: current.refreshToken,
      });
      saveSession(refreshed);
      return refreshed;
    } catch {
      clearStoredSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function ensureValidSession(): Promise<AuthSession | null> {
  const current = getStoredSessionInternal({ includeExpired: true });
  if (!current) {
    return null;
  }

  if (!isExpired(current.expiresAt) && !isExpiringSoon(current.expiresAt)) {
    return current;
  }

  const refreshed = await refreshSession();
  if (refreshed) {
    return refreshed;
  }

  if (isExpired(current.expiresAt)) {
    clearStoredSession();
    return null;
  }

  return current;
}

export async function getValidIdToken(): Promise<string | null> {
  const session = await ensureValidSession();
  return session?.idToken ?? null;
}
