import type { Role } from "./auth";
import type {
  AlunoResponseDTO,
  ModalidadeResponseDTO,
  RotinaTreinoResponseDTO,
  SessaoTreinoResponseDTO,
  ObservacaoFeedbackResponseDTO,
  TipoMetrica,
  ResponsavelPreenchimento,
} from "./student";

export type StudentFilterStatus = "all" | "active" | "pending" | "inactive";

export interface PersonalNotificationDTO {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  referenciaId?: string | null;
  dataCriacao: string;
}

export interface GerarConviteRequestDTO {
  modalidadeId: number;
  emailAluno?: string;
}

export interface ConviteResponseDTO {
  token: string;
  linkConvite: string;
  expiraEm: string;
}

export interface AlunoResumoTurmaDTO {
  id: string;
  nome: string | null;
  email: string | null;
}

export interface TurmaResponseDTO {
  id: string;
  nome: string;
  modalidadeId: number;
  nomeModalidade: string;
  horario?: string | null;
  quantidadeAlunos: number;
  alunos: AlunoResumoTurmaDTO[];
}

export interface MetricaPendenteDTO {
  sessaoId: string;
  semana: number;
  dataPlanejada: string;
  metricaId: string;
  tituloMetrica: string;
  tipoMetrica: TipoMetrica;
}

export interface SessaoAcompanhamentoDTO {
  sessaoId: string;
  semana: number;
  dataPlanejada: string;
  dataReal?: string | null;
  status: "PLANEJADA" | "CONCLUIDA" | "CANCELADA";
  concluidaAluno: boolean;
  validadaPersonal: boolean;
  temPendenciasPersonal: boolean;
  quantidadePendenciasPersonal: number;
  duracao?: number | null;
  atividades?: string | null;
}

export interface AcompanhamentoAlunoResponseDTO {
  alunoId: string;
  nomeAluno: string;
  emailAluno: string;
  rotinaAtivaId?: string | null;
  tituloRotinaAtiva?: string | null;
  modalidadeId?: number | null;
  nomeModalidade?: string | null;
  quantidadeMetricasPendentes: number;
  totalSessoesPlanejadas: number;
  totalSessoesConcluidas: number;
  todasMetricasPendentes: MetricaPendenteDTO[];
  sessoes: SessaoAcompanhamentoDTO[];
}

export interface AlunoPendenciaItemDTO {
  alunoId: string;
  nomeAluno: string;
  rotinaId?: string | null;
  tituloRotina?: string | null;
  quantidadePendencias: number;
}

export interface ResumoPendenciasResponseDTO {
  totalAlunosComPendencias: number;
  totalMetricasPendentes: number;
  alunos: AlunoPendenciaItemDTO[];
}

export interface UsuarioPerfilResponseDTO {
  id: string;
  nome: string;
  email: string;
  role: Role;
  cpf?: string;
  telefone?: string;
  ativo?: boolean;
}

export interface AlterarSenhaRequestDTO {
  senhaAtual: string;
  novaSenha: string;
  confirmacaoNovaSenha: string;
}

export interface MensagemResponseDTO {
  mensagem: string;
}
