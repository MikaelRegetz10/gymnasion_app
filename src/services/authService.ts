import { api } from "./api";
import { session } from "./session";
import type {
  AlterarSenhaRequestDTO,
  LoginRequestDTO,
  MensagemResponseDTO,
  TokenResponseDTO,
  UsuarioResponseDTO,
} from "../types/auth";

export const authService = {
  async login(payload: LoginRequestDTO): Promise<TokenResponseDTO> {
    const { data } = await api.post<TokenResponseDTO>("/auth/login", payload);
    await session.save(data);
    return data;
  },

  async logout(): Promise<void> {
    await session.clear();
  },

  async getMe(): Promise<UsuarioResponseDTO> {
    const { data } = await api.get<UsuarioResponseDTO>("/usuarios/me");
    return data;
  },

  async alterarSenha(payload: AlterarSenhaRequestDTO): Promise<MensagemResponseDTO> {
    const { data } = await api.patch<MensagemResponseDTO>("/usuarios/me/senha", payload);
    return data;
  },
};
