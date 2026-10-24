import * as SecureStore from "expo-secure-store";
import type { SessionUser, TokenResponseDTO } from "../types/auth";

const TOKEN_KEY = "gymnasion_token";
const USER_KEY = "gymnasion_user";

// Listener para encerramento de sessão (ex: token expirado ou 401)
type SessionExpiredListener = (message?: string) => void;
const listeners = new Set<SessionExpiredListener>();

// Cache em memória para leitura síncrona nos renders
let cachedToken: string | null = null;
let cachedUser: SessionUser | null = null;
let isInitialized = false;

function decodeBase64(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = input.replace(/=+$/, "");
  let output = "";

  if (str.length % 4 === 1) {
    throw new Error("String base64 inválida");
  }

  for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++)); ) {
    const charIndex = chars.indexOf(buffer);
    if (~charIndex) {
      bs = bc % 4 ? bs * 64 + charIndex : charIndex;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
      }
    }
  }

  return output;
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeBase64(payload);
    const { exp } = JSON.parse(jsonStr) as { exp?: number };
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const session = {
  /**
   * Inicializa o cache síncrono a partir do SecureStore no startup do app.
   */
  async init(): Promise<{ token: string | null; user: SessionUser | null }> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);

      if (token && !isTokenExpired(token)) {
        cachedToken = token;
        cachedUser = userStr ? JSON.parse(userStr) : null;
      } else {
        await session.clear();
      }
    } catch {
      await session.clear();
    } finally {
      isInitialized = true;
    }

    return { token: cachedToken, user: cachedUser };
  },

  isReady(): boolean {
    return isInitialized;
  },

  async save(data: TokenResponseDTO): Promise<void> {
    cachedToken = data.token;
    cachedUser = { id: data.id, role: data.role };

    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(cachedUser));
  },

  async clear(): Promise<void> {
    cachedToken = null;
    cachedUser = null;

    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // Ignora erro se as chaves não existiam
    }
  },

  getToken(): string | null {
    if (cachedToken && isTokenExpired(cachedToken)) {
      session.clear();
      return null;
    }
    return cachedToken;
  },

  getUser(): SessionUser | null {
    if (!session.getToken()) return null;
    return cachedUser;
  },

  onSessionExpired(callback: SessionExpiredListener): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  notifySessionExpired(detail?: string): void {
    session.clear();
    listeners.forEach((listener) => listener(detail));
  },
};
