import axios, { AxiosError } from "axios";
import type { ProblemDetail } from "../types/api";
import { session } from "./session";

// Base URL configurável por variável de ambiente (ex: EXPO_PUBLIC_API_URL=http://192.168.1.15:8080)
const RAW_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";
// Garante o prefixo /api configurado no context-path do Spring Boot
const BASE_URL = RAW_URL.endsWith("/api") ? RAW_URL : `${RAW_URL.replace(/\/+$/, "")}/api`;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export function isSessionError(err: unknown): boolean {
  return (
    axios.isAxiosError(err) &&
    err.response?.status === 401 &&
    Boolean(err.config?.headers?.Authorization)
  );
}

export function getProblemDetail(err: unknown): ProblemDetail | null {
  if (axios.isAxiosError(err) && err.response?.data) {
    return err.response.data as ProblemDetail;
  }
  return null;
}

// Interceptor de Requisição: Injeta o token Bearer salvo no SecureStore
api.interceptors.request.use(
  (config) => {
    const token = session.getToken();
    if (token && !config.url?.startsWith("/auth/")) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Resposta: Trata 401 para expiração automática de sessão
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (isSessionError(error)) {
      const problem = error.response?.data as ProblemDetail | undefined;
      const detail = problem?.detail || "Sua sessão expirou. Faça login novamente.";
      session.notifySessionExpired(detail);
    }
    return Promise.reject(error);
  }
);
