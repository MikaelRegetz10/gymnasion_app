import type { ProblemDetail } from "./api";
import type { Role } from "./auth";

export type StatusSessaoTreino = "PLANEJADA" | "CONCLUIDA";
export type StatusConvite = "INATIVO" | "ATIVO" | "PENDENTE" | "RECUSADO";
export type TipoMetrica = "NUMERICO" | "TEMPO" | "FREQUENCIA_CARDIACA" | "TEXTO";
export type ResponsavelPreenchimento = "ALUNO" | "PERSONAL" | "AMBOS";

export interface ModalidadeResponseDTO {
  id: number;
  nome: string;
  descricao?: string;
}

export interface AlunoResponseDTO {
  id: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: Role;
    cpf?: string;
    telefone?: string;
  };
  personalId: string;
  nomePersonal: string;
  status: StatusConvite;
  modalidades: ModalidadeResponseDTO[];
}

export interface RegistroMetricaResponseDTO {
  id: string;
  metricaId: string;
  tituloMetrica: string;
  tipoMetrica: TipoMetrica;
  valor: string;
}

export interface DesempenhoResponseDTO {
  id: string;
  dataRegistro: string;
  nivelCansaco?: number | null; // RPE Borg CR-10 (1 a 10)
  registradoPor: string;
  alunoId: string;
  nomeAluno: string;
  observacoes?: string | null;
  metricas: RegistroMetricaResponseDTO[];
}

export interface SessaoTreinoResponseDTO {
  id: string;
  rotinaTreinoId: string;
  semana: number;
  dataPlanejada: string; // YYYY-MM-DD
  dataReal?: string | null; // YYYY-MM-DD
  duracao?: number | null; // minutos
  atividades?: string | null;
  status: StatusSessaoTreino;
  concluidaAluno?: boolean;
  validadaPersonal?: boolean;
  desempenho?: DesempenhoResponseDTO | null;
}

export interface SemanaPlanejamentoDTO {
  numeroSemana: number;
  sessoes: SessaoTreinoResponseDTO[];
}

export interface PlanejamentoRotinaResponseDTO {
  rotinaId: string;
  tituloRotina: string;
  modalidadeId: number;
  nomeModalidade: string;
  frequenciaSemanal: number;
  objetivos?: string;
  semanas: SemanaPlanejamentoDTO[];
}

import type { CampoStrava } from "./strava";

export interface MetricaResumoDTO {
  id: string;
  titulo: string;
  tipo: TipoMetrica;
  obrigatoria: boolean;
  quemPreenche: ResponsavelPreenchimento;
  unidade?: string;
  descricao?: string;
  campoStrava?: CampoStrava | null;
}

export interface RotinaTreinoResponseDTO {
  id: string;
  titulo: string;
  modalidadeId?: number;
  nomeModalidade?: string;
  modalidade?: ModalidadeResponseDTO;
  frequenciaSemanal: number;
  objetivos?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  ativo?: boolean;
  alunos?: { id: string; nome: string }[];
  metricas?: MetricaResumoDTO[];
}

export interface FormularioExecucaoResponseDTO {
  sessao: SessaoTreinoResponseDTO;
  registroPermitido: boolean;
  metricas: MetricaResumoDTO[];
}

export interface RegistrarResultadoMetricaDTO {
  metricaId: string;
  valor: string;
}

export interface RegistrarExecucaoSessaoRequestDTO {
  dataReal: string; // YYYY-MM-DD
  duracao: number; // minutos
  nivelCansaco?: number; // 1 a 10
  alunoId?: string;
  resultados?: RegistrarResultadoMetricaDTO[];
}

export interface ObservacaoFeedbackResponseDTO {
  id: string;
  autorNome: string;
  tipoRegistro: "OBSERVACAO_ALUNO" | "FEEDBACK_PERSONAL";
  conteudo: string;
  criadoEm: string;
}

// Dashboard de Evolução
export interface PontoMetricaDashboardDTO {
  sessaoId: string;
  data: string;
  valor: string;
  valorNumerico?: number;
  formatado: string;
}

export interface TendenciaMetricaDTO {
  valorInicial?: number;
  valorAtual?: number;
  variacaoAbsoluta?: number;
  percentualVariacao?: number;
  direcao: "MELHORIA" | "REGRESSAO" | "ESTAVEL";
  indicadorVisual?: string;
  resumo?: string;
}

export interface SerieMetricaDashboardDTO {
  metricaId: string;
  titulo: string;
  tipo: TipoMetrica;
  obrigatoria: boolean;
  quemPreenche: ResponsavelPreenchimento;
  descontinuada: boolean;
  statusMetrica: string;
  tendencia?: TendenciaMetricaDTO;
  pontos: PontoMetricaDashboardDTO[];
}

export interface PontoRpeDashboardDTO {
  sessaoId: string;
  data: string;
  nivelCansaco: number;
  descricao?: string;
}

export interface EvolucaoRpeDashboardDTO {
  totalSessoesComRpe: number;
  possuiDadosSuficientes: boolean;
  mensagem?: string;
  mediaRpe?: number;
  ultimoRpe?: number;
  direcaoTendencia?: string;
  pontos: PontoRpeDashboardDTO[];
}

export interface DashboardEvolucaoResponseDTO {
  aluno?: { id: string; nome: string; email: string };
  modalidade?: { id: number; nome: string };
  modalidadesDisponiveis?: { id: number; nome: string }[];
  periodo?: { dataInicio?: string; dataFim?: string };
  resumoGeral?: {
    totalSessoesHistorico: number;
    totalSessoesPeriodo: number;
    totalSessoesConcluidasPeriodo: number;
    duracaoMediaMinutos?: number;
    taxaAdesaoPercentual?: number;
  };
  possuiDadosSuficientes: boolean;
  mensagem?: string;
  metricas?: SerieMetricaDashboardDTO[];
  evolucaoRpe?: EvolucaoRpeDashboardDTO;
}
