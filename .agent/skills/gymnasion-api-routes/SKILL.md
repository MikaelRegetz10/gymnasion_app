---
name: gymnasion-api-routes
description: Guia completo e fonte de verdade de todas as rotas e endpoints REST da API do Gymnasion implementadas no backend Spring Boot. Use sempre que for desenvolver, integrar, testar ou refatorar telas do front-end ou clientes da API. Detalha URLs, métodos HTTP, permissões por perfil (PERSONAL_TRAINER e ALUNO), DTOs de requisição e resposta, cabeçalhos, tratamento de erros RFC 7807 (ProblemDetail), regras de negócio e exemplos de payloads.
---

# Gymnasion API — Guia de Rotas e Contratos do Back-end

Este skill é a **fonte oficial de integração** entre o back-end Spring Boot e o front-end do projeto Gymnasion.
Ele documenta todas as rotas atualmente implementadas e funcionais, os contratos de entrada/saída (DTOs), cabeçalhos esperados, status codes e mapeamento com as regras do DRS v3 (US-01 a US-27).

> [!IMPORTANT]
> **DIRETRIZ DE DESENVOLVIMENTO: PROIBIDO DADOS ESTÁTICOS / HARDCODED**
> - **Nenhuma tela, componente, hook ou serviço deve conter dados estáticos (hardcoded)** ou mocks locais simulando respostas quando houver rotas ou se os dados pertencerem ao ciclo de vida da aplicação.
> - **Tudo deve ser consumido diretamente do back-end Spring Boot** através dos serviços em `src/services/` e refletido reativamente no estado dos contextos e componentes.
> - Se for identificado que o back-end não possui um endpoint, DTO ou campo necessário para atender ao layout/requisito, **o front-end deve solicitar a criação/ajuste no back-end** (com aprovação do usuário) em vez de criar mocks ou simulações permanentes.
> - Em caso de estado inicial antes do carregamento ou lista vazia, utilize spinners/skeletons e **Empty States reais**, nunca listas falsas hardcoded.

---

## 1. Visão Geral da Arquitetura & Comunicação

* **Base URL da API**: `http://localhost:8080` (em desenvolvimento)
* **CORS Configurado**: Origem `http://localhost:5173` permitida com credenciais habilitadas (`allowCredentials: true`). Métodos: `GET, POST, PUT, DELETE, PATCH, OPTIONS`.
* **Autenticação**: Padrão JWT (JSON Web Token) enviado via header:
  ```http
  Authorization: Bearer <seu_token_jwt>
  ```
* **Formatos de Dados**: Requisições e respostas utilizam `application/json; charset=UTF-8`.
* **Datas**: Formato ISO-8601 (`YYYY-MM-DD` para `LocalDate` e `YYYY-MM-DD'T'HH:mm:ssXXX` para `OffsetDateTime`).
* **Identificadores (IDs)**:
  * `UUID` para Alunos, Personal Trainers, Rotinas, Sessões, Métricas Personalizadas, Turmas, Notificações, Auditorias e Feedbacks.
  * `Long` (numérico sequencial) para Modalidades Esportivas do catálogo.
* **Padrão de Paginação Spring Boot (`Page<T>`)**:
  Endpoints de listagem (`GET`) retornam dados paginados no envelope padrão do Spring Boot:
  ```json
  {
    "content": [],
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 0,
    "totalPages": 0,
    "first": true,
    "last": true
  }
  ```
  * **Query Params suportados**:
    * `page`: Índice da página (base 0, padrão: 0).
    * `size`: Quantidade de itens por página (padrão: 20; pode ser solicitado `size: 100` para listagens completas no front-end).
    * `sort`: Ordenação opcional (ex: `nome,asc` ou `dataReal,desc`).
  * **Tratamento no Front-end**: No cliente TypeScript/React, utilize o tipo `PageResponse<T>` e a função auxiliar `unpackPage<T>(response.data)` (definidos em `src/types/api.ts`) para lidar transparentemente com retornos paginados ou listas diretas sem quebrar o estado da UI.

---

## 2. Padrão Global de Erros (RFC 7807 ProblemDetail)

Quando uma requisição falha (status `4xx` ou `5xx`), a API responde uniformemente com o padrão `ProblemDetail`:

```json
{
  "type": "https://api.gymnasion.com/errors/erro-validacao",
  "title": "Erro de Validação",
  "status": 400,
  "detail": "Um ou mais campos apresentam erros de validação.",
  "timestamp": "2026-10-15T18:00:00Z",
  "invalidFields": {
    "email": "O email deve ser válido.",
    "password": "A senha é obrigatória."
  }
}
```

### Principais Status Codes e Tipos de Erro da API:
* **`400 Bad Request`** (`erro-validacao`, `requisicao-invalida`): DTO com campos inválidos, convite expirado ou frequência fora de 1..7. O mapa `invalidFields` lista campo e mensagem.
* **`401 Unauthorized`** (`credenciais-invalidas`): Credenciais de login inválidas ("E-mail ou senha inválidos.") ou ausência de token.
* **`403 Forbidden`** (`acesso-negado`): Usuário autenticado tentando acessar recurso de outro papel (ex: Aluno tentando rota `/personal-trainers/**`).
* **`404 Not Found`** (`not-found`): Entidade não encontrada ou aluno/rotina não pertence ao usuário logado (garantia de isolamento de dados RN-005/RN-006).
* **`409 Conflict`** (`conflito-dados`, `conflito-regra-negocio`): E-mail/CPF duplicado, métrica já existente com o mesmo nome na mesma modalidade (RN-016), etc.
* **`422 Unprocessable Entity`** (`regra-de-negocio`, `conta-bloqueada`, `metricas-invalidas`):
  * Conta bloqueada por 5 min após 5 tentativas de login (RN-010).
  * Aluno inativo tentando logar ou registrar dados (RN-014).
  * Formato inválido para o tipo configurado da métrica (RN-015).
  * Tentativa de exclusão de rotina com treinos já executados (RN-012 / US-12).
  * Tentativa de alteração do tipo de métrica que já possui histórico (RN-017 / US-19).

---

## 3. Matriz Rápida de Rotas por Domínio

### 3.1. Autenticação & Convites (`/auth` e `/personal-trainers`)
| Método | Endpoint | Perfil | Resumo / DRS |
|---|---|---|---|
| `POST` | `/auth/registro-personal` | Público | Cadastro de Personal Trainer + modalidade inicial (US-01) |
| `POST` | `/auth/login` | Público | Autenticação, bloqueio após 5 falhas e filtro inativo (US-02, RN-010/014) |
| `POST` | `/auth/registro-aluno-convite?token={token}` | Público | Auto-cadastro do aluno via link temporário (US-04) |
| `POST` | `/personal-trainers/convites` | Personal | Gera link de convite válido por 15 minutos (US-03) |
| `GET` | `/personal-trainers/alunos` | Personal | Lista alunos ativos vinculados ao personal (US-03) `[Paginado]` |
| `GET` | `/personal-trainers/alunos/pendentes` | Personal | Lista solicitações de alunos aguardando aprovação (US-03) `[Paginado]` |
| `GET` | `/personal-trainers/alunos/inativos` | Personal | Lista alunos desativados (US-05) `[Paginado]` |
| `PATCH` | `/personal-trainers/alunos/{id}/aprovar` | Personal | Aprova solicitação do aluno para ATIVO (US-03) |
| `PATCH` | `/personal-trainers/alunos/{id}/recusar` | Personal | Recusa e expurga cadastro do aluno (US-03) |
| `PATCH` | `/personal-trainers/alunos/{id}/desativar`| Personal | Desativa aluno temporariamente mantendo histórico (US-05, RN-014) |
| `PATCH` | `/personal-trainers/alunos/{id}/reativar` | Personal | Reativa aluno desativado (US-05) |

### 3.2. Modalidades & Métricas Personalizadas
| Método | Endpoint | Perfil | Resumo / DRS |
|---|---|---|---|
| `GET` | `/modalidades` | Público | Lista catálogo oficial de modalidades (US-27) `[Paginado]` |
| `GET` | `/modalidades/{id}` | Público | Detalha modalidade específica |
| `POST` | `/modalidades` | Autenticado | Cadastra nova modalidade no catálogo |
| `POST` | `/personal-trainers/metricas` | Personal | Cria métrica personalizada por modalidade (US-18, RN-015/016) |
| `GET` | `/personal-trainers/metricas?modalidadeId={id}` | Personal | Lista métricas do personal na modalidade + contagem de uso (US-18) `[Paginado]` |
| `PUT` | `/personal-trainers/metricas/{id}` | Personal | Atualiza título/tipo (bloqueia tipo se houver histórico - RN-017) |
| `DELETE` | `/personal-trainers/metricas/{id}` | Personal | Exclusão física (sem histórico) ou lógica (com histórico - RN-017) |

### 3.3. Turmas & Rotinas de Treino
| Método | Endpoint | Perfil | Resumo / DRS |
|---|---|---|---|
| `POST` | `/personal-trainers/turmas` | Personal | Cria turma com alunos e modalidade (US-07) |
| `GET` | `/personal-trainers/turmas` | Personal | Lista turmas do personal (US-08) `[Paginado]` |
| `GET` | `/personal-trainers/turmas/{id}` | Personal | Detalhes completos da turma (US-08) |
| `PUT` | `/personal-trainers/turmas/{id}` | Personal | Atualiza nome e modalidade da turma (US-09 C1) |
| `POST` | `/personal-trainers/turmas/{id}/alunos/{alunoId}` | Personal | Adiciona aluno à turma (US-09 C3) |
| `DELETE` | `/personal-trainers/turmas/{id}/alunos/{alunoId}` | Personal | Remove aluno da turma (apaga turma se ficar sem alunos - US-09 C5/C6) |
| `POST` | `/personal-trainers/rotinas` | Personal | Cria rotina vinculando métricas e alunos (US-09, RN-012) |
| `GET` | `/personal-trainers/rotinas` | Personal | Lista todas as rotinas criadas pelo personal (US-09) `[Paginado]` |
| `GET` | `/personal-trainers/rotinas/aluno/{alunoId}` | Personal | Lista rotinas associadas a um aluno específico (US-11) `[Paginado]` |
| `GET` | `/personal-trainers/rotinas/{id}` | Personal | Detalhes da rotina, alunos e métricas vinculadas |
| `DELETE` | `/personal-trainers/rotinas/{id}` | Personal | Exclui rotina sem treinos realizados (US-12, RN-012) |
| `POST` | `/personal-trainers/rotinas/{id}/alunos` | Personal | Vincula novos alunos (máx 1 rotina ativa por aluno - US-11) |
| `DELETE` | `/personal-trainers/rotinas/{id}/alunos/{alunoId}`| Personal | Desvincula aluno da rotina (mínimo 1 aluno - RN-012) |
| `PATCH` | `/personal-trainers/rotinas/{id}/encerrar` | Personal | Encerra rotina ativa e remove sessões futuras não feitas (US-25 C6/C7) |
| `POST` | `/personal-trainers/rotinas/{id}/reutilizar` | Personal | Clona rotina como modelo p/ outro aluno c/ nova data início (US-25 C1) |
| `POST` | `/personal-trainers/rotinas/aluno/{alunoId}/atribuir` | Personal | Atribui rotina existente a partir do perfil do aluno (US-25 C2) |

### 3.4. Planejamento, Execução & Correção de Desempenho
| Método | Endpoint | Perfil | Resumo / DRS |
|---|---|---|---|
| `POST` | `/personal-trainers/rotinas/{id}/sessoes` | Personal | Adiciona sessão ao planejamento semanal (US-10 C1) |
| `GET` | `/personal-trainers/rotinas/{id}/planejamento` | Personal | Consulta planejamento semanal da rotina (US-10 C1) |
| `PUT` | `/personal-trainers/rotinas/sessoes/{sessaoId}` | Personal | Edita sessão futura não executada (bloqueia se executada - US-10 C2) |
| `POST` | `/personal-trainers/rotinas/sessoes/{sessaoId}/execucao`| Personal | Registra execução de treino pelo personal (US-10/13/22) |
| `PATCH` | `/personal-trainers/rotinas/sessoes/{sessaoId}/validar`| Personal | Valida treino executado pelo aluno (US-10 C6) |
| `GET` | `/personal-trainers/rotinas/{id}/historico` | Personal | Histórico de sessões executadas da rotina (US-10/21) `[Paginado]` |
| `GET` | `/personal-trainers/rotinas/aluno/{alunoId}/historico`| Personal | Histórico completo de treinos do aluno (US-10) `[Paginado]` |
| `GET` | `/alunos/rotinas/{id}/planejamento` | Aluno | Visualiza planejamento semanal da rotina (US-10 C1 / US-21) |
| `GET` | `/alunos/rotinas/sessoes/{sessaoId}/execucao` | Aluno | Obtém formulário pré-configurado de execução com métricas (US-22 C1) |
| `POST` | `/alunos/rotinas/sessoes/{sessaoId}/execucao` | Aluno | Registra execução pelo aluno com RPE e métricas (US-22, RN-015/018) |
| `GET` | `/alunos/rotinas/{id}/historico` | Aluno | Histórico de treinos executados do aluno (US-21) `[Paginado]` |
| `GET` | `/personal-trainers/rotinas/sessoes/{sessaoId}/desempenho` | Personal | Visualiza dados do treino para correção (US-23 C1) |
| `PATCH` | `/personal-trainers/rotinas/sessoes/{sessaoId}/desempenho` | Personal | Corrige data real, métricas e audita alterações (US-23 C2..C7) |
| `GET` | `/personal-trainers/rotinas/sessoes/{sessaoId}/desempenho/auditoria` | Personal | Histórico cronológico de alterações de desempenho (US-23) `[Paginado]` |

### 3.5. Acompanhamento, Notificações, Feedbacks & Dashboards
| Método | Endpoint | Perfil | Resumo / DRS |
|---|---|---|---|
| `GET` | `/personal-trainers/alunos/{alunoId}/acompanhamento` | Personal | Visão da rotina ativa, sessões e pendências do aluno (US-24 C1/C2/C9/C10) |
| `GET` | `/personal-trainers/acompanhamento/pendencias` | Personal | Resumo global de alunos e métricas pendentes (US-24 C3) |
| `GET` | `/personal-trainers/notificacoes` | Personal | Central de notificações do personal (US-24 C4) `[Paginado]` |
| `PATCH` | `/personal-trainers/notificacoes/{id}/ler` | Personal | Marca notificação como lida (não remove pendência - US-24 C7) |
| `PATCH` | `/personal-trainers/notificacoes/marcar-como-lidas` | Personal | Marca todas as notificações como lidas |
| `GET` | `/personal-trainers/notificacoes/contagem-nao-lidas` | Personal | Total não lidas para badge do menu |
| `GET` | `/alunos/me` | Aluno | Perfil cadastral, modalidade e dados do personal vinculado |
| `GET` | `/alunos/rotinas` | Aluno | Listagem paginada das rotinas do próprio aluno `[Paginado]` |
| `GET` | `/alunos/notificacoes` | Aluno | Central de notificações do aluno `[Paginado]` |
| `PATCH` | `/alunos/notificacoes/{id}/ler` | Aluno | Marca notificação do aluno como lida |
| `PATCH` | `/alunos/notificacoes/marcar-como-lidas` | Aluno | Marca todas as notificações do aluno como lidas |
| `GET` | `/alunos/notificacoes/contagem-nao-lidas` | Aluno | Badge de notificações não lidas do aluno |
| `POST` | `/personal-trainers/alunos/{alunoId}/observacoes-feedbacks`| Personal | Registra feedback imutável no perfil do aluno (US-26 C2) |
| `GET` | `/personal-trainers/alunos/{alunoId}/observacoes-feedbacks` | Personal | Histórico de observações e feedbacks (US-26 C1/C4) `[Paginado]` |
| `POST` | `/alunos/observacoes-feedbacks` | Aluno | Registra observação imutável no próprio perfil (US-26 C3) |
| `GET` | `/alunos/observacoes-feedbacks` | Aluno | Histórico pelo próprio aluno (US-26 C1) `[Paginado]` |
| `POST` | `/observacoes-feedbacks/alunos/{alunoId}` | Ambos | Endpoint polimórfico de registro de feedback/observação (US-26) |
| `GET` | `/observacoes-feedbacks/alunos/{alunoId}` | Ambos | Histórico pelo personal ou próprio aluno (US-26) `[Paginado]` |
| `GET` | `/personal-trainers/alunos/{alunoId}/evolucao` | Personal | Dashboard e dados temporais de evolução (mín 3 treinos - US-15/20) |
| `GET` | `/alunos/evolucao` | Aluno | Dashboard de evolução do próprio aluno (US-15 C3 / US-20 C3) |

### 3.6. Integração Strava (OAuth 2.0 & Atividades - US-14)
| Método | Endpoint | Perfil | Resumo / DRS |
|---|---|---|---|
| `GET` | `/alunos/strava/auth-url` | Aluno | Retorna a URL de redirecionamento para autorização OAuth 2.0 no Strava (US-14 C1) |
| `POST` | `/alunos/strava/conectar` | Aluno | Envia o `code`, `scope` e `state` recebidos no callback para vincular a conta (US-14 C1) |
| `GET` | `/alunos/strava/status` | Aluno | Consulta status da conexão Strava do próprio aluno (`conectado`, `expirado`, atleta) |
| `DELETE` | `/alunos/strava/desconectar` | Aluno | Desconecta a conta, revoga permissões no Strava e limpa notificações de expiração |
| `GET` | `/alunos/strava/atividades` | Aluno | Lista atividades recentes com métricas convertidas para preenchimento de treinos (US-14 C2) |
| `GET` | `/personal-trainers/alunos/{alunoId}/strava/status` | Personal | Consulta status da conexão Strava de um aluno vinculado |
| `GET` | `/personal-trainers/alunos/{alunoId}/strava/atividades` | Personal | Lista atividades sincronizadas do aluno para consulta e acompanhamento |

---

## 4. Detalhes Completos nas Referências

Consulte a pasta `references/` para ver payloads completos, parâmetros, regras detalhadas e exemplos de integração:
* [`references/01-auth-e-alunos.md`](references/01-auth-e-alunos.md) — Login, cadastro, convites de 15 min, aprovação e ativação/desativação.
* [`references/02-modalidades-e-metricas.md`](references/02-modalidades-e-metricas.md) — Catálogo de modalidades, criação, edição e ciclo de vida de métricas (RN-015, RN-016, RN-017).
* [`references/03-turmas-e-rotinas.md`](references/03-turmas-e-rotinas.md) — Gestão de turmas, rotinas semanais, regras de reutilização e encerramento (US-25).
* [`references/04-sessoes-execucao-e-correcao.md`](references/04-sessoes-execucao-e-correcao.md) — Registro de execução pelo aluno/personal, escala Borg CR-10 (RPE), correção de desempenho e auditoria (US-23).
* [`references/05-acompanhamento-notificacoes-feedbacks-dashboards.md`](references/05-acompanhamento-notificacoes-feedbacks-dashboards.md) — Resumo de pendências, notificações, feedbacks imutáveis e agregação de dados para gráficos.
* [`references/06-strava.md`](references/06-strava.md) — Fluxo completo OAuth 2.0 do Strava, rota `/strava/callback`, ciclo de vida do token, status de conexão, listagem de atividades e sincronização com métricas do treino (US-14).
