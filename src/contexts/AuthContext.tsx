import React, { createContext, useContext, useEffect, useState } from "react";
import { router } from "expo-router";
import { session } from "../services/session";
import { authService } from "../services/authService";
import type { LoginRequestDTO, SessionUser, TokenResponseDTO } from "../types/auth";

interface AuthContextData {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequestDTO) => Promise<TokenResponseDTO>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStoredSession() {
      try {
        const stored = await session.init();
        if (stored.token && stored.user) {
          setToken(stored.token);
          setUser(stored.user);
        }
      } catch {
        await session.clear();
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredSession();

    const unsubscribe = session.onSessionExpired(() => {
      setToken(null);
      setUser(null);
      router.replace("/(auth)/login");
    });

    return unsubscribe;
  }, []);

  async function login(credentials: LoginRequestDTO): Promise<TokenResponseDTO> {
    const data = await authService.login(credentials);
    setToken(data.token);
    setUser({ id: data.id, role: data.role });
    return data;
  }

  async function logout(): Promise<void> {
    await authService.logout();
    setToken(null);
    setUser(null);
    router.replace("/(auth)/login");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
