import { api } from "./api";
import { unpackPage, type PageResponseDTO } from "../types/api";
import type {
  AlunoResponseDTO,
  ModalidadeResponseDTO,
  RotinaTreinoResponseDTO,
  PlanejamentoRotinaResponseDTO,
  SessaoTreinoResponseDTO,
  ObservacaoFeedbackResponseDTO,
} from "../types/student";
import type {
  AcompanhamentoAlunoResponseDTO,
  AlterarSenhaRequestDTO,
  ConviteResponseDTO,
  GerarConviteRequestDTO,
  MensagemResponseDTO,
  PersonalNotificationDTO,
  ResumoPendenciasResponseDTO,
  TurmaResponseDTO,
  UsuarioPerfilResponseDTO,
} from "../types/personal";

const BASE_URL = "/personal-trainers";

export const personalService = {
  /**
   * Lista todos os alunos vinculados ao Personal Trainer.
   */
  async listarAlunos(params?: { page?: number; size?: number }): Promise<AlunoResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<AlunoResponseDTO>>(`${BASE_URL}/alunos`, {
      params: { size: 100, ...params },
    });
    return unpackPage(data);
  },

  /**
   * Lista as solicitações de alunos aguardando aprovação.
   */
  async listarAlunosPendentes(params?: { page?: number; size?: number }): Promise<AlunoResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<AlunoResponseDTO>>(`${BASE_URL}/alunos/pendentes`, {
      params: { size: 100, ...params },
    });
    return unpackPage(data);
  },

  /**
   * Lista os alunos inativos/desativados.
   */
  async listarAlunosInativos(params?: { page?: number; size?: number }): Promise<AlunoResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<AlunoResponseDTO>>(`${BASE_URL}/alunos/inativos`, {
      params: { size: 100, ...params },
    });
    return unpackPage(data);
  },

  /**
   * Aprova a solicitação do aluno pendente, tornando-o ATIVO.
   */
  async aprovarAluno(alunoId: string): Promise<AlunoResponseDTO> {
    const { data } = await api.patch<AlunoResponseDTO>(
      `${BASE_URL}/alunos/${encodeURIComponent(alunoId)}/aprovar`
    );
    return data;
  },

  /**
   * Recusa e remove a solicitação pendente do aluno.
   */
  async recusarAluno(alunoId: string): Promise<MensagemResponseDTO> {
    const { data } = await api.patch<MensagemResponseDTO>(
      `${BASE_URL}/alunos/${encodeURIComponent(alunoId)}/recusar`
    );
    return data;
  },

  /**
   * Desativa o aluno temporariamente mantendo seu histórico íntegro.
   */
  async desativarAluno(alunoId: string): Promise<MensagemResponseDTO> {
    const { data } = await api.patch<MensagemResponseDTO>(
      `${BASE_URL}/alunos/${encodeURIComponent(alunoId)}/desativar`
    );
    return data;
  },

  /**
   * Reativa o acesso do aluno ao sistema.
   */
  async reativarAluno(alunoId: string): Promise<MensagemResponseDTO> {
    const { data } = await api.patch<MensagemResponseDTO>(
      `${BASE_URL}/alunos/${encodeURIComponent(alunoId)}/reativar`
    );
    return data;
  },

  /**
   * Gera um link de convite com validade de 15 minutos (US-03).
   */
  async gerarConvite(dto: GerarConviteRequestDTO): Promise<ConviteResponseDTO> {
    const { data } = await api.post<ConviteResponseDTO>(`${BASE_URL}/convites`, dto);
    return data;
  },

  /**
   * Obtém o resumo geral de pendências de métricas e alunos com pendência (US-24 C3).
   */
  async obterResumoPendencias(): Promise<ResumoPendenciasResponseDTO> {
    const { data } = await api.get<ResumoPendenciasResponseDTO>(
      `${BASE_URL}/acompanhamento/pendencias`
    );
    return data;
  },

  /**
   * Obtém a visão de acompanhamento, sessões e pendências de um aluno específico.
   */
  async obterAcompanhamentoAluno(alunoId: string): Promise<AcompanhamentoAlunoResponseDTO> {
    const { data } = await api.get<AcompanhamentoAlunoResponseDTO>(
      `${BASE_URL}/alunos/${encodeURIComponent(alunoId)}/acompanhamento`
    );
    return data;
  },

  /**
   * Consulta o histórico completo de treinos executados de um aluno específico.
   */
  async obterHistoricoAluno(
    alunoId: string,
    params?: { page?: number; size?: number }
  ): Promise<SessaoTreinoResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<SessaoTreinoResponseDTO>>(
      `${BASE_URL}/rotinas/aluno/${encodeURIComponent(alunoId)}/historico`,
      { params: { size: 50, ...params } }
    );
    return unpackPage(data);
  },

  /**
   * Consulta o histórico de observações e feedbacks imutáveis do perfil do aluno.
   */
  async listarObservacoesEFeedbacks(
    alunoId: string,
    params?: { page?: number; size?: number }
  ): Promise<ObservacaoFeedbackResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<ObservacaoFeedbackResponseDTO>>(
      `${BASE_URL}/alunos/${encodeURIComponent(alunoId)}/observacoes-feedbacks`,
      { params: { size: 50, ...params } }
    );
    return unpackPage(data);
  },

  /**
   * Registra um novo feedback imutável sobre o aluno.
   */
  async registrarFeedback(
    alunoId: string,
    conteudo: string
  ): Promise<ObservacaoFeedbackResponseDTO> {
    const { data } = await api.post<ObservacaoFeedbackResponseDTO>(
      `${BASE_URL}/alunos/${encodeURIComponent(alunoId)}/observacoes-feedbacks`,
      { conteudo }
    );
    return data;
  },

  /**
   * Lista as turmas de alunos cadastradas pelo Personal Trainer.
   */
  async listarTurmas(params?: { page?: number; size?: number }): Promise<TurmaResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<TurmaResponseDTO>>(`${BASE_URL}/turmas`, {
      params: { size: 100, ...params },
    });
    return unpackPage(data);
  },

  /**
   * Busca detalhes completos de uma turma por ID.
   */
  async buscarTurmaPorId(turmaId: string): Promise<TurmaResponseDTO> {
    const { data } = await api.get<TurmaResponseDTO>(
      `${BASE_URL}/turmas/${encodeURIComponent(turmaId)}`
    );
    return data;
  },

  /**
   * Lista todas as rotinas de treino criadas pelo personal.
   */
  async listarRotinas(params?: { page?: number; size?: number }): Promise<RotinaTreinoResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<RotinaTreinoResponseDTO>>(`${BASE_URL}/rotinas`, {
      params: { size: 100, ...params },
    });
    return unpackPage(data);
  },

  /**
   * Busca os detalhes de uma rotina por ID.
   */
  async buscarRotinaPorId(rotinaId: string): Promise<RotinaTreinoResponseDTO> {
    const { data } = await api.get<RotinaTreinoResponseDTO>(
      `${BASE_URL}/rotinas/${encodeURIComponent(rotinaId)}`
    );
    return data;
  },

  /**
   * Consulta o planejamento semanal detalhado de uma rotina de treino.
   */
  async consultarPlanejamentoRotina(rotinaId: string): Promise<PlanejamentoRotinaResponseDTO> {
    const { data } = await api.get<PlanejamentoRotinaResponseDTO>(
      `${BASE_URL}/rotinas/${encodeURIComponent(rotinaId)}/planejamento`
    );
    return data;
  },

  /**
   * Lista as notificações do personal trainer.
   */
  async listarNotificacoes(params?: { page?: number; size?: number }): Promise<PersonalNotificationDTO[]> {
    const { data } = await api.get<PageResponseDTO<PersonalNotificationDTO>>(
      `${BASE_URL}/notificacoes`,
      { params: { size: 50, ...params } }
    );
    return unpackPage(data);
  },

  /**
   * Marca uma notificação como lida.
   */
  async marcarNotificacaoComoLida(id: string): Promise<PersonalNotificationDTO> {
    const { data } = await api.patch<PersonalNotificationDTO>(
      `${BASE_URL}/notificacoes/${encodeURIComponent(id)}/ler`
    );
    return data;
  },

  /**
   * Marca todas as notificações como lidas.
   */
  async marcarTodasNotificacoesComoLidas(): Promise<MensagemResponseDTO> {
    const { data } = await api.patch<MensagemResponseDTO>(
      `${BASE_URL}/notificacoes/marcar-como-lidas`
    );
    return data;
  },

  /**
   * Lista o catálogo de modalidades esportivas.
   */
  async listarModalidades(params?: { page?: number; size?: number }): Promise<ModalidadeResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<ModalidadeResponseDTO>>("/modalidades", {
      params: { size: 50, ...params },
    });
    return unpackPage(data);
  },

  /**
   * Obtém o perfil do usuário logado (Personal Trainer).
   */
  async obterMeuPerfil(): Promise<UsuarioPerfilResponseDTO> {
    const { data } = await api.get<UsuarioPerfilResponseDTO>("/usuarios/me");
    return data;
  },

  /**
   * Altera a senha do usuário com validação de política de senha forte.
   */
  async alterarSenha(payload: AlterarSenhaRequestDTO): Promise<MensagemResponseDTO> {
    const { data } = await api.patch<MensagemResponseDTO>("/usuarios/me/senha", payload);
    return data;
  },
};
