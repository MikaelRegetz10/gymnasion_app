import { api } from "./api";
import { unpackPage, type PageResponseDTO } from "../types/api";
import type {
  AlunoResponseDTO,
  RotinaTreinoResponseDTO,
  PlanejamentoRotinaResponseDTO,
  FormularioExecucaoResponseDTO,
  SessaoTreinoResponseDTO,
  RegistrarExecucaoSessaoRequestDTO,
  DashboardEvolucaoResponseDTO,
  ObservacaoFeedbackResponseDTO,
} from "../types/student";

const BASE_URL = "/alunos";

export const alunoService = {
  /**
   * Obtém os dados cadastrais do aluno autenticado, modalidade praticada
   * e dados do seu Personal Trainer vinculado.
   */
  async obterMeuPerfil(): Promise<AlunoResponseDTO> {
    const { data } = await api.get<AlunoResponseDTO>(`${BASE_URL}/me`);
    return data;
  },

  /**
   * Lista as rotinas vinculadas ao aluno logado.
   */
  async listarRotinas(params?: { page?: number; size?: number }): Promise<RotinaTreinoResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<RotinaTreinoResponseDTO>>(`${BASE_URL}/rotinas`, {
      params: { size: 100, ...params },
    });
    return unpackPage(data);
  },

  /**
   * Consulta o planejamento da rotina organizado por semanas.
   */
  async consultarPlanejamento(rotinaId: string): Promise<PlanejamentoRotinaResponseDTO> {
    const { data } = await api.get<PlanejamentoRotinaResponseDTO>(
      `${BASE_URL}/rotinas/${encodeURIComponent(rotinaId)}/planejamento`
    );
    return data;
  },

  /**
   * Obtém os dados da sessão e as métricas configuradas pelo personal
   * para montar a tela de execução/conclusão do treino.
   */
  async obterFormularioExecucao(sessaoId: string): Promise<FormularioExecucaoResponseDTO> {
    const { data } = await api.get<FormularioExecucaoResponseDTO>(
      `${BASE_URL}/rotinas/sessoes/${encodeURIComponent(sessaoId)}/execucao`
    );
    return data;
  },

  /**
   * Registra a execução real do treino, nível de esforço (RPE Borg CR-10)
   * e valores das métricas permitidas, confirmando a conclusão.
   */
  async registrarExecucao(
    sessaoId: string,
    payload: RegistrarExecucaoSessaoRequestDTO
  ): Promise<SessaoTreinoResponseDTO> {
    const { data } = await api.post<SessaoTreinoResponseDTO>(
      `${BASE_URL}/rotinas/sessoes/${encodeURIComponent(sessaoId)}/execucao`,
      payload
    );
    return data;
  },

  /**
   * Consulta o histórico de sessões executadas de uma rotina de forma paginada.
   */
  async consultarHistoricoRotina(
    rotinaId: string,
    params?: { page?: number; size?: number }
  ): Promise<SessaoTreinoResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<SessaoTreinoResponseDTO>>(
      `${BASE_URL}/rotinas/${encodeURIComponent(rotinaId)}/historico`,
      { params: { size: 100, ...params } }
    );
    return unpackPage(data);
  },

  /**
   * Consulta o dashboard dinâmico de evolução e esforço (RPE) do próprio aluno.
   */
  async consultarEvolucao(params?: {
    modalidadeId?: number;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<DashboardEvolucaoResponseDTO> {
    const { data } = await api.get<DashboardEvolucaoResponseDTO>(`${BASE_URL}/evolucao`, {
      params,
    });
    return data;
  },

  /**
   * Lista o histórico de observações do aluno e feedbacks enviados pelo personal.
   */
  async listarObservacoesEFeedbacks(params?: {
    page?: number;
    size?: number;
  }): Promise<ObservacaoFeedbackResponseDTO[]> {
    const { data } = await api.get<PageResponseDTO<ObservacaoFeedbackResponseDTO>>(
      `${BASE_URL}/observacoes-feedbacks`,
      { params: { size: 100, ...params } }
    );
    return unpackPage(data);
  },

  /**
   * Registra uma observação do aluno no seu perfil.
   */
  async registrarObservacao(conteudo: string): Promise<ObservacaoFeedbackResponseDTO> {
    const { data } = await api.post<ObservacaoFeedbackResponseDTO>(
      `${BASE_URL}/observacoes-feedbacks`,
      { conteudo }
    );
    return data;
  },
};
