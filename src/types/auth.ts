/**
 * Tipos e DTOs de Autenticação & Usuários
 */

export type Role =
  | "ALUNO"
  | "PERSONAL_TRAINER"
  | "ADMIN"
  | "ROLE_ALUNO"
  | "ROLE_PERSONAL_TRAINER"
  | "ROLE_ADMIN";

export function isAluno(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return normalized === "ALUNO" || normalized === "ROLE_ALUNO";
}

export function isPersonal(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return normalized === "PERSONAL_TRAINER" || normalized === "ROLE_PERSONAL_TRAINER";
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface TokenResponseDTO {
  token: string;
  id: string;
  role: Role;
}

export interface SessionUser {
  id: string;
  role: Role;
}

export interface UsuarioResponseDTO {
  id: string;
  nome: string;
  email: string;
  role: Role;
  cpf?: string;
  telefone?: string;
}

export interface MensagemResponseDTO {
  mensagem: string;
}

export interface AlterarSenhaRequestDTO {
  senhaAtual: string;
  novaSenha: string;
  confirmacaoSenha: string;
}
