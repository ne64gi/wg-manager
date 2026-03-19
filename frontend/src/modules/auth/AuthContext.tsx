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
import { queryKeys } from "../queryKeys";
import type { AuthLoginRequest, AuthenticatedLoginUser } from "../../types";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  currentUser: AuthenticatedLoginUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  loginAction: (payload: AuthLoginRequest) => Promise<void>;
  logoutAction: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
};

const STORAGE_KEY = "wg-studio-auth";

const AuthContext = createContext<AuthState | undefined>(undefined);

type PersistedAuth = {
  accessToken: string;
  refreshToken: string;
};

function readPersistedAuth(): PersistedAuth | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
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
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    if (accessToken && refreshToken) {
      writePersistedAuth({ accessToken, refreshToken });
    } else {
      writePersistedAuth(null);
    }
  }, [accessToken, refreshToken]);

  const meQuery = useQuery({
    queryKey: queryKeys.authMe,
    queryFn: async () => {
      if (!accessToken) {
        return null;
      }

      try {
        return await getAuthMe(accessToken);
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
    queryClient.removeQueries();
  }

  async function getValidAccessTokenInternal(): Promise<string | null> {
    if (!refreshToken) {
      clearAuth();
      return null;
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = refresh(refreshToken)
        .then((pair) => {
          setAccessToken(pair.access_token);
          setRefreshToken(pair.refresh_token);
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
    setAccessToken(pair.access_token);
    setRefreshToken(pair.refresh_token);
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
