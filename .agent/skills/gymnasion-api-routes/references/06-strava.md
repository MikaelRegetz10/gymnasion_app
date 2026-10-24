# Integração Strava no Front-end (US-14)

Este documento orienta os desenvolvedores do front-end (`Gymnasion_web`) na implementação e integração de telas, componentes e serviços com a funcionalidade de sincronização do Strava.

---

## 1. Visão Geral da Funcionalidade

A integração com o Strava segue o protocolo **OAuth 2.0 (Authorization Code Grant)**:
1. O aluno inicia a conexão no perfil ou configurações ("Conectar Strava").
2. O front-end consulta o back-end para obter a URL oficial de autorização do Strava com proteção CSRF (`state` assinado com HMAC SHA-256).
3. O aluno é redirecionado para a tela de permissões do Strava (`https://www.strava.com/oauth/authorize`).
4. Ao autorizar, o Strava redireciona o navegador de volta para a rota do front-end:
   `http://localhost:5173/strava/callback?code=...&scope=read,activity:read_all&state=...`
5. A página de callback extrai os parâmetros, chama o endpoint de conexão do back-end (`POST /alunos/strava/conectar`) e redireciona de volta para a aplicação com feedback de sucesso ou erro.
6. Uma vez conectado, as atividades recentes do Strava ficam disponíveis para exibição e podem ser aproveitadas no preenchimento de execuções de treinos (US-22).
7. O Personal Trainer também pode visualizar se o aluno possui o Strava conectado e consultar suas atividades sincronizadas.

---

## 2. Tipos e Contratos TypeScript

Recomenda-se adicionar ou exportar os seguintes tipos em `src/types/strava.ts` (ou `src/types/api.ts`):

```typescript
export interface StravaAuthUrlResponse {
  authUrl: string;
  mock: boolean;
}

export interface StravaConectarRequest {
  code: string;
  scope?: string;
  state?: string;
}

export interface StravaStatusResponse {
  conectado: boolean;
  expirado: boolean;
  atletaId?: number | null;
  nomeAtleta?: string | null;
  mock: boolean;
}

export interface StravaAtividade {
  id: string;
  nome: string;
  tipo: string; // Run, Ride, Swim, Walk, etc.
  esporte: string; // Nome em português: Corrida, Ciclismo, Natação, Caminhada
  data: string; // YYYY-MM-DD (data local no fuso do atleta)
  dataHora?: string; // ISO-8601 OffsetDateTime
  distanciaMetros?: number;
  distanciaKm?: number; // Ex: 5.23 (compatível com métrica NUMERICO)
  distanciaFormatada?: string; // Ex: "5,23 km"
  tempoSegundos?: number;
  tempoFormatado?: string; // MM:SS ou HH:MM:SS (compatível com métrica TEMPO)
  duracaoMinutos?: number; // Duração inteira para a sessão
  frequenciaCardiacaMedia?: number; // bpm (compatível com métrica FREQUENCIA_CARDIACA)
  frequenciaCardiacaMaxima?: number; // bpm
  ritmoMedio?: string; // Ex: "05:13 min/km", "01:45 min/100m" ou "28.5 km/h"
  calorias?: number;
}
```

---

## 3. Endpoints Disponíveis

### 3.1. Visão do Aluno (`/alunos/strava/**`)
| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/alunos/strava/auth-url` | Retorna URL de autorização (`StravaAuthUrlResponse`) |
| `POST` | `/alunos/strava/conectar` | Conecta com `{ code, scope, state }` e retorna `StravaStatusResponse` |
| `GET` | `/alunos/strava/status` | Retorna `StravaStatusResponse` do aluno logado |
| `DELETE` | `/alunos/strava/desconectar` | Desconecta a conta e revoga autorização (retorna `204 No Content`) |
| `GET` | `/alunos/strava/atividades?limite=10` | Lista atividades recentes (`StravaAtividade[]`, limite 1 a 30) |

### 3.2. Visão do Personal Trainer (`/personal-trainers/alunos/{alunoId}/strava/**`)
| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/personal-trainers/alunos/{alunoId}/strava/status` | Retorna `StravaStatusResponse` do aluno especificado |
| `GET` | `/personal-trainers/alunos/{alunoId}/strava/atividades?limite=10` | Lista atividades do aluno (`StravaAtividade[]`) |

> [!NOTE]
> Se o Personal Trainer tentar acessar um `alunoId` que não seja dele, a API responderá com `404 Not Found` (isolamento de dados RN-005).

---

## 4. Implementação Passo a Passo

### 4.1. Camada de Serviço (`src/services/stravaService.ts`)

```typescript
import api from './api';
import {
  StravaAuthUrlResponse,
  StravaConectarRequest,
  StravaStatusResponse,
  StravaAtividade
} from '../types/strava';

export const stravaService = {
  // Aluno
  async obterAuthUrl(): Promise<StravaAuthUrlResponse> {
    const res = await api.get<StravaAuthUrlResponse>('/alunos/strava/auth-url');
    return res.data;
  },

  async conectar(dados: StravaConectarRequest): Promise<StravaStatusResponse> {
    const res = await api.post<StravaStatusResponse>('/alunos/strava/conectar', dados);
    return res.data;
  },

  async obterStatus(): Promise<StravaStatusResponse> {
    const res = await api.get<StravaStatusResponse>('/alunos/strava/status');
    return res.data;
  },

  async desconectar(): Promise<void> {
    await api.delete('/alunos/strava/desconectar');
  },

  async listarAtividades(limite = 10): Promise<StravaAtividade[]> {
    const res = await api.get<StravaAtividade[]>('/alunos/strava/atividades', {
      params: { limite }
    });
    return res.data;
  },

  // Personal Trainer
  async obterStatusAluno(alunoId: string): Promise<StravaStatusResponse> {
    const res = await api.get<StravaStatusResponse>(`/personal-trainers/alunos/${alunoId}/strava/status`);
    return res.data;
  },

  async listarAtividadesAluno(alunoId: string, limite = 10): Promise<StravaAtividade[]> {
    const res = await api.get<StravaAtividade[]>(`/personal-trainers/alunos/${alunoId}/strava/atividades`, {
      params: { limite }
    });
    return res.data;
  }
};
```

---

### 4.2. Rota de Callback (`/strava/callback`)

Crie uma rota protegida (ou pública que valide autenticação) em `App.tsx`:
```tsx
<Route path="/strava/callback" element={<StravaCallbackPage />} />
```

Fluxo do componente `StravaCallbackPage`:
1. Lê parâmetros da URL via `useSearchParams`:
   * `code = searchParams.get('code')`
   * `scope = searchParams.get('scope')`
   * `state = searchParams.get('state')`
   * `error = searchParams.get('error')` (caso o usuário tenha clicado em "Cancelar" no Strava)
2. Se `error === 'access_denied'` ou sem `code`:
   * Redireciona para as configurações com alerta: `"Autorização cancelada no Strava."`.
3. Se possuir `code`:
   * Exibe spinner / indicador de carregamento ("Conectando sua conta Strava...").
   * Dispara `stravaService.conectar({ code, scope, state })`.
   * Em caso de sucesso: feedback positivo ("Conta Strava conectada com sucesso!") e redirecionamento para o perfil/configurações.
   * Em caso de erro RFC 7807: exibe o `detail` retornado pela API (ex: `"O acesso às atividades do Strava não foi autorizado. Reconecte sua conta e permita o acesso às atividades."` ou `"Erro ao conectar conta Strava. Entre em contato com o administrador."`).

---

### 4.3. Tratamento de Estados na UI

#### No Perfil / Configurações do Aluno:
* **Não Conectado (`conectado === false`)**:
  * Botão: `"Conectar Strava"`.
  * Ao clicar: chama `stravaService.obterAuthUrl()`, obtém `authUrl` e redireciona via `window.location.href = authUrl`.
* **Conectado e Ativo (`conectado === true && expirado === false`)**:
  * Exibe selo/badge: `"Strava Conectado"`.
  * Exibe nome do atleta: `"Atleta: {nomeAtleta}"`.
  * Botão: `"Desconectar Strava"` (chama `stravaService.desconectar()`).
* **Token Expirado / Revogado (`conectado === true && expirado === true`)**:
  * Exibe alerta de aviso (banner amarelo/laranja):
    `"Sua conexão com o Strava expirou. Reconecte sua conta para continuar sincronizando."`
  * Botão em destaque: `"Reconectar Strava"` (chama `obterAuthUrl` novamente).
  * O aluno também receberá uma notificação do sistema do tipo `STRAVA_EXPIRADO`.

#### No Preenchimento de Sessão (US-22 / StudentRpeModal):
* Se o aluno possui Strava conectado, um dropdown no topo do modal lista as atividades recentes (a mais recente vem pré-selecionada por padrão).
* Ao selecionar a atividade:
  * **Data Real** $\leftarrow$ `atividade.data`.
  * **Duração** $\leftarrow$ `atividade.duracaoMinutos`.
  * **Métricas Personalizadas**:
    * Mapeadas diretamente pelo `campoStrava` configurado na métrica.
    * Para métricas legadas (`campoStrava = null`), utiliza fallback heurístico seguro por palavras-chave (`distancia`, `km`, `tempo`, etc.).
    * Métricas exclusivas do personal (`quemPreenche === PERSONAL`) que vierem preenchidas do Strava são exibidas travadas para edição do aluno e gravadas automaticamente no backend ao concluir a sessão.
    * Campos que vieram do Strava ganham tag `⚡ Strava` e permanecem editáveis pelo aluno.
    * Métricas obrigatórias que não vierem no Strava (ex: FC média nula) permanecem vazias com aviso de preenchimento manual obrigatório.
  * O aluno pode optar por `"✍️ Não importar do Strava (Preencher manualmente)"` a qualquer momento.

---

## 5. Invariantes de Front-end

1. **Sem Mock Hardcoded**:
   * Nunca simule retornos com arrays estáticos no código de produção.
   * Quando o backend estiver com `STRAVA_MOCK_ENABLED=true`, ele próprio já gerará respostas mock estruturadas na API.
2. **Mensagens Literais**:
   * Sempre apresente os erros do backend fielmente baseando-se no `ProblemDetail.detail`.
3. **Observações Limpas**:
   * Não polui o campo de observações da sessão com textos artificiais sobre o Strava; os dados são salvos puramente nas métricas e campos nativos.
