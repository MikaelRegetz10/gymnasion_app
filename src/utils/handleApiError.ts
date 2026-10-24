import axios from "axios";
import type { ProblemDetail } from "../types/api";

export interface ParsedApiError {
  message: string;
  invalidFields?: Record<string, string>;
  minutosRestantes?: number;
  bloqueadoAte?: string;
  status?: number;
}

export function handleApiError(err: unknown, fallbackMessage = "Ocorreu um erro inesperado"): ParsedApiError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ProblemDetail | undefined;

    if (data) {
      // Bloqueio temporário de conta (RN-010)
      if (data.minutosRestantes !== undefined || data.type?.includes("conta-bloqueada")) {
        return {
          message: data.detail || `Conta temporariamente bloqueada. Tente novamente em ${data.minutosRestantes || 5} minutos.`,
          minutosRestantes: data.minutosRestantes,
          bloqueadoAte: data.bloqueadoAte,
          status: err.response?.status,
        };
      }

      // Erros de validação nos campos do formulário
      if (data.invalidFields && Object.keys(data.invalidFields).length > 0) {
        return {
          message: data.detail || "Verifique os campos destacados abaixo.",
          invalidFields: data.invalidFields,
          status: err.response?.status,
        };
      }

      // Mensagem direta de regra de negócio
      if (data.detail) {
        return {
          message: data.detail,
          status: err.response?.status,
        };
      }
    }

    if (err.message === "Network Error" || err.code === "ECONNABORTED") {
      return {
        message: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.",
        status: 0,
      };
    }
  }

  if (err instanceof Error) {
    return { message: err.message };
  }

  return { message: fallbackMessage };
}
