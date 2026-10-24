/**
 * Tipos de retorno e contratos de resposta da API Spring Boot
 */

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  timestamp?: string;
  invalidFields?: Record<string, string>;
  minutosRestantes?: number;
  bloqueadoAte?: string;
  [key: string]: unknown;
}

export interface PageResponseDTO<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/**
 * Função utilitária para desempacotar respostas paginadas do Spring Data
 * ou listas planas sem quebrar o estado da aplicação.
 */
export function unpackPage<T>(data: PageResponseDTO<T> | T[] | undefined | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if ("content" in data && Array.isArray(data.content)) return data.content;
  return [];
}
