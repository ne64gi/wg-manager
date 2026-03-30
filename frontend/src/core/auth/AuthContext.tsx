import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, getAuthMe, login, logout, refresh } from "../../lib/api";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "../browser/storage";
import {
  clearPreviewLocale,
  clearPreviewTheme,
} from "../preferences/previewPreferences";
import { queryKeys } from "../../modules/queryKeys";
import type { AuthLoginRequest, AuthenticatedLoginUser, TokenPair } from "../../types";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  currentUser: AuthenticatedLoginUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  loginAction: (payload: AuthLoginRequest) => Promise<void>;
  acceptTokenPair: (pair: TokenPair) => Promise<void>;
  logoutAction: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
};

const STORAGE_KEY = "wg-studio-auth";

const AuthContext = createContext<AuthState | undefined>(undefined);

type PersistedAuth = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
};

const REFRESH_SKEW_MS = 60_000;

function readPersistedAuth(): PersistedAuth | null {
  try {
    const value = readLocalStorage(STORAGE_KEY);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as PersistedAuth;
  } catch {
    return null;
  }
}

function writePersistedAuth(value: PersistedAuth | null) {
  if (value) {
    writeLocalStorage(STORAGE_KEY, JSON.stringify(value));
  } else {
    removeLocalStorage(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const persisted = useMemo(readPersistedAuth, []);
  const [accessToken, setAccessToken] = useState<string | null>(
    persisted?.accessToken ?? null,
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    persisted?.refreshToken ?? null,
  );
  const [accessTokenExpiresAt, setAccessTokenExpiresAt] = useState<string | null>(
    persisted?.accessTokenExpiresAt ?? null,
  );
  const [refreshTokenExpiresAt, setRefreshTokenExpiresAt] = useState<string | null>(
    persisted?.refreshTokenExpiresAt ?? null,
  );
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    if (accessToken && refreshToken) {
      writePersistedAuth({
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      });
    } else {
      writePersistedAuth(null);
    }
  }, [accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt]);

  const meQuery = useQuery({
    queryKey: queryKeys.authMe,
    queryFn: async () => {
      const token = await getValidAccessTokenInternal();
      if (!token) {
        return null;
      }

      try {
        return await getAuthMe(token);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const nextToken = await getValidAccessTokenInternal();
          if (!nextToken) {
            return null;
          }
          return getAuthMe(nextToken);
        }
        throw error;
      }
    },
    enabled: Boolean(accessToken),
    retry: false,
  });

  function clearAuth() {
    setAccessToken(null);
    setRefreshToken(null);
    setAccessTokenExpiresAt(null);
    setRefreshTokenExpiresAt(null);
    clearPreviewLocale();
    clearPreviewTheme();
    queryClient.removeQueries();
  }

  function isTokenUsable(expiresAt: string | null) {
    if (!expiresAt) {
      return false;
    }

    const expiry = Date.parse(expiresAt);
    if (Number.isNaN(expiry)) {
      return false;
    }

    return expiry - Date.now() > REFRESH_SKEW_MS;
  }

  async function getValidAccessTokenInternal(): Promise<string | null> {
    if (accessToken && (!accessTokenExpiresAt || isTokenUsable(accessTokenExpiresAt))) {
      return accessToken;
    }

    if (!refreshToken) {
      clearAuth();
      return null;
    }

    if (refreshTokenExpiresAt && !isTokenUsable(refreshTokenExpiresAt)) {
      clearAuth();
      return null;
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = refresh(refreshToken)
        .then((pair) => {
          setAccessToken(pair.access_token);
          setRefreshToken(pair.refresh_token);
          setAccessTokenExpiresAt(pair.access_token_expires_at);
          setRefreshTokenExpiresAt(pair.refresh_token_expires_at);
          return pair.access_token;
        })
        .catch(() => {
          clearAuth();
          return null;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }

    return refreshPromiseRef.current;
  }

  async function loginAction(payload: AuthLoginRequest) {
    const pair = await login(payload);
    await acceptTokenPair(pair);
  }

  async function acceptTokenPair(pair: TokenPair) {
    setAccessToken(pair.access_token);
    setRefreshToken(pair.refresh_token);
    setAccessTokenExpiresAt(pair.access_token_expires_at);
    setRefreshTokenExpiresAt(pair.refresh_token_expires_at);
    await queryClient.invalidateQueries({ queryKey: queryKeys.authMe });
  }

  async function logoutAction() {
    try {
      if (accessToken && refreshToken) {
        await logout(accessToken, refreshToken);
      }
    } catch {
      // Ignore logout errors and clear the local session anyway.
    } finally {
      clearAuth();
    }
  }

  const value = useMemo<AuthState>(
    () => ({
      accessToken,
      refreshToken,
      currentUser: meQuery.data ?? null,
      isAuthenticated: Boolean(accessToken && meQuery.data),
      isBootstrapping: Boolean(accessToken) && meQuery.isLoading,
      loginAction,
      acceptTokenPair,
      logoutAction,
      getValidAccessToken: getValidAccessTokenInternal,
    }),
    [accessToken, refreshToken, meQuery.data, meQuery.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
