import * as WebBrowser from "expo-web-browser";
import { api } from "./api";
import type {
  StravaAuthUrlResponse,
  StravaConectarRequest,
  StravaStatusResponse,
  StravaAtividade,
} from "../types/strava";

const BASE_URL = "/alunos/strava";

// Garante que o WebBrowser complete qualquer sessão aberta anteriormente
WebBrowser.maybeCompleteAuthSession();

function extrairParametroUrl(url: string, param: string): string | undefined {
  const regex = new RegExp(`[?&]${param}=([^&#]*)`);
  const match = regex.exec(url);
  return match && match[1] ? decodeURIComponent(match[1]) : undefined;
}

export const stravaService = {
  /**
   * Obtém a URL oficial de autorização OAuth 2.0 do Strava gerada pelo backend.
   */
  async obterAuthUrl(): Promise<StravaAuthUrlResponse> {
    const { data } = await api.get<StravaAuthUrlResponse>(`${BASE_URL}/auth-url`);
    return data;
  },

  /**
   * Conecta a conta Strava enviando o code, scope e state recebidos no callback.
   */
  async conectar(dados: StravaConectarRequest): Promise<StravaStatusResponse> {
    const { data } = await api.post<StravaStatusResponse>(`${BASE_URL}/conectar`, dados);
    return data;
  },

  /**
   * Consulta o status atual da conexão do aluno com o Strava.
   */
  async obterStatus(): Promise<StravaStatusResponse> {
    const { data } = await api.get<StravaStatusResponse>(`${BASE_URL}/status`);
    return data;
  },

  /**
   * Desconecta a conta Strava e revoga a autorização no backend.
   */
  async desconectar(): Promise<void> {
    await api.delete(`${BASE_URL}/desconectar`);
  },

  /**
   * Lista as atividades recentes do Strava com métricas convertidas.
   */
  async listarAtividades(limite = 10): Promise<StravaAtividade[]> {
    const { data } = await api.get<StravaAtividade[]>(`${BASE_URL}/atividades`, {
      params: { limite },
    });
    return data;
  },

  /**
   * Fluxo completo e automatizado de conexão OAuth 2.0 para mobile.
   * Abre o navegador seguro in-app (ASWebAuthenticationSession no iOS),
   * intercepta o redirecionamento com o código e conecta a conta.
   */
  async iniciarConexao(): Promise<StravaStatusResponse> {
    const authData = await this.obterAuthUrl();

    // Caso 1: Modo Mock direto da API (a URL já contém o code simulado)
    if (authData.mock || (authData.authUrl && authData.authUrl.includes("code=mock_code"))) {
      const code = extrairParametroUrl(authData.authUrl, "code") || "mock_code";
      const scope = extrairParametroUrl(authData.authUrl, "scope") || "read,activity:read_all";
      const state = extrairParametroUrl(authData.authUrl, "state");
      return await this.conectar({ code, scope, state });
    }

    // Caso 2: Fluxo OAuth Real no Strava via in-app browser
    const redirectUrl = "http://localhost:5173/strava/callback";
    const result = await WebBrowser.openAuthSessionAsync(authData.authUrl, redirectUrl);

    if (result.type === "success" && result.url) {
      const error = extrairParametroUrl(result.url, "error");
      if (error) {
        if (error === "access_denied") {
          throw new Error("Autorização cancelada no Strava.");
        }
        throw new Error(`Erro retornado pelo Strava: ${error}`);
      }

      const code = extrairParametroUrl(result.url, "code");
      const scope = extrairParametroUrl(result.url, "scope");
      const state = extrairParametroUrl(result.url, "state");

      if (!code) {
        throw new Error("Código de autorização não recebido do Strava.");
      }

      return await this.conectar({ code, scope, state });
    }

    if (result.type === "cancel" || result.type === "dismiss") {
      throw new Error("Conexão com o Strava cancelada pelo usuário.");
    }

    throw new Error("Não foi possível concluir a autenticação com o Strava.");
  },
};
