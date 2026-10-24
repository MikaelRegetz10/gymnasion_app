---
name: gymnasion-app
description: Guia arquitetural completo, tokens de design, modelo de domínio, contratos da API Spring Boot (projeto tcc) e plano de ação em fases para o desenvolvimento do aplicativo mobile Gymnasion utilizando React Native e Expo.
---

# Gymnasion Mobile App — Guia Arquitetural & Plano de Ação

Este documento é a **skill e especificação central** para o desenvolvimento do aplicativo mobile do Gymnasion (`gymnasion_app`), utilizando **React Native com Expo (Expo Router)** e TypeScript.

O app transporta fielmente toda a identidade visual e o modelo de negócio já consolidados no `Gymnasion_web`, integrando-se diretamente com a API REST Spring Boot oficial (projeto `tcc` em `~/Documents/tcc`) e agregando as capacidades e ergonomias nativas do ecossistema mobile.

---

## 1. Análise do Back-end (`tcc` Spring Boot)

O back-end do Gymnasion é um projeto Spring Boot 4.x robusto, construído em **Java 21**, com PostgreSQL e Flyway (migrations de `V1` a `V17`).

### 1.1. Comunicação & Configuração de Rede
* **Context Path do Servidor:** `/api`
  * Exemplo: `http://localhost:8080/api/auth/login`
* **Endereçamento no Mobile (React Native):**
  * **Emulador Android:** `http://10.0.2.2:8080/api`
  * **Simulador iOS:** `http://localhost:8080/api`
  * **Dispositivo Físico (Expo Go / Wi-Fi):** `http://<IP_LOCAL_MAQUINA>:8080/api` (ex: `http://192.168.1.15:8080/api`)
  * O app deve parametrizar a URL via variável de ambiente: `EXPO_PUBLIC_API_URL`.
* **Autenticação:** JWT Bearer enviado via cabeçalho `Authorization: Bearer <token>`.
* **Paginação:** Padrão Spring Data encapsulado no envelope `PageResponseDTO<T>`:
  ```json
  {
    "content": [...],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 25,
    "totalPages": 3,
    "first": true,
    "last": false
  }
  ```

### 1.2. Padrão Global de Erros (RFC 7807 ProblemDetail)
Todas as exceções do back-end são capturadas pelo `RestExceptionHandler` e devolvem `ProblemDetail`:
* **Validação de Formulário (`400 BAD_REQUEST`):** Contém `invalidFields` com mapa de `{ campo: mensagem }`.
* **Credenciais Inválidas (`401 UNAUTHORIZED`):** E-mail ou senha incorretos.
* **Bloqueio Temporário (`422 UNPROCESSABLE_ENTITY` - `ContaBloqueadaException`):** Após 5 tentativas inválidas consecutivas, a conta é bloqueada por 5 minutos (retorna `minutosRestantes` e `bloqueadoAte`).
* **Aluno Inativo (`422 UNPROCESSABLE_ENTITY` - `RN-014`):** Bloqueia operações de alunos desativados ou pendentes de aprovação.
* **Métricas Inválidas (`422 UNPROCESSABLE_ENTITY` - `MetricasInvalidasException`):** Ocorre se os tipos de dados ou faixas não coincidirem com o configurado para a modalidade.
* **Acesso Negado (`403 FORBIDDEN`):** Tentativa de acessar rota de outro papel.

### 1.3. Regras de Negócio Críticas do Back-end
1. **Papéis do Sistema (`Role`):**
   * `ROLE_PERSONAL_TRAINER`: Acesso às rotas `/api/personal-trainers/**`.
   * `ROLE_ALUNO`: Acesso às rotas `/api/alunos/**`.
   * Ambos compartilham `/api/usuarios/me` (perfil, preferências, troca de senha).
2. **Tipos de Métricas (`TipoMetrica`):**
   * `NUMERICO`: Valores inteiros ou decimais (ex: carga 80kg, repetições 12, distância em metros).
   * `TEMPO`: Formato de tempo (ex: `01:15` ou segundos).
   * `FREQUENCIA_CARDIACA`: Batimentos por minuto (bpm).
   * `TEXTO`: Anotações ou campos qualitativos.
3. **Quem Preenche a Métrica (`ResponsavelPreenchimento`):**
   * `ALUNO`: Preenchimento feito unicamente pelo aluno na execução.
   * `PERSONAL`: Métrica técnica exclusiva do Personal; o aluno **não tem permissão** de preencher nem alterar (se enviar, o back-end rejeita com erro 422).
   * `AMBOS`: Pode ser preenchida pelo aluno ou complementada pelo personal.
4. **Ciclo de Vida da Sessão (`StatusSessaoTreino`):**
   * Nasce como `PLANEJADA`.
   * Ao aluno submeter a execução com data real, RPE e métricas, passa para `CONCLUIDA` (`concluidaAluno: true`).
   * **Imutabilidade pós-conclusão:** O aluno não pode editar uma sessão já concluída. Se houver erro, a correção é feita pelo Personal Trainer via tela de Auditoria/Correção (`CorrecaoDesempenhoController`).
5. **Nível de Esforço (RPE Borg CR-10):**
   * Campo opcional `nivelCansaco`, aceitando inteiros de **1 a 10** (1 = Muito fácil, 10 = Esforço exaustivo/máximo).
6. **Controle de Vínculo de Alunos:**
   * Status do convite: `PENDENTE`, `ATIVO`, `INATIVO`, `RECUSADO`.
   * Um aluno só pode ter **1 rotina ativa por modalidade** simultaneamente.

---

## 2. Análise do Front-end Web (`Gymnasion_web`)

* **Framework & Bundler:** React 18 + TypeScript + Vite.
* **Design System & Tokens:** Baseado em variáveis CSS em `src/styles/tokens.css` derivadas do Figma oficial v2.
* **Foco do Aplicativo Mobile:**
  * O Personal Trainer utiliza o desktop para tarefas densas (montagem de rotinas complexas, relatórios detalhados).
  * O Aluno usa quase exclusivamente o smartphone na academia para consultar o treino do dia, acompanhar o descanso e registrar os resultados.
  * O app mobile dará foco primordial na **Área do Aluno**, oferecendo também uma visão rápida/de bolso para o Personal Trainer.

---

## 3. Design Tokens: Tradução Web para React Native

No React Native, os tokens são exportados como constantes TypeScript tipadas em `src/theme/tokens.ts`.

### 3.1. Paleta de Cores (`colors`)
```typescript
export const colors = {
  // Brand Principal
  primary: {
    50: "#fff4ef",
    100: "#ffe4d9",
    500: "#f05a28", // Cor primária oficial Gymnasion
    600: "#d9461a",
  },

  // Escala Neutra (Ink / Textos / Bordas)
  ink: {
    900: "#0f172a", // Texto principal / títulos
    700: "#334155", // Texto secundário
    500: "#64748b", // Texto terciário / placeholders
    400: "#94a3b8", // Ícones inativos / bordas sutis
    300: "#cbd5e1", // Divisores
  },

  // Superfícies
  surface: "#ffffff",
  background: "#f6f7fb",
  border: "#e7eaf0",

  // Feedback Semântico
  success: {
    base: "#12b76a",
    light: "#ecfdf3",
    dark: "#067647",
  },
  warning: {
    base: "#f79009",
    light: "#fffaeb",
    dark: "#b54708",
  },
  danger: {
    base: "#f04438",
    light: "#fef3f2",
    dark: "#b42318",
  },
  info: {
    base: "#2e90fa",
    light: "#eff8ff",
  },

  // Modalidades Esportivas
  sports: {
    natacao: { base: "#2e90fa", light: "#eff8ff" },
    tenis: { base: "#65a30d", light: "#f3fce8" },
    academia: { base: "#7a5af8", light: "#f4f3ff" },
    corrida: { base: "#e11d48", light: "#fff1f3" },
    ciclismo: { base: "#0e9384", light: "#f0fdf9" },
    funcional: { base: "#dc6803", light: "#fef6ee" },
  },
};
```

### 3.2. Tipografia (`typography`)
* **Família da Fonte:** `Plus Jakarta Sans` (carregada via `expo-font`).
  * `PlusJakartaSans-Regular` (400)
  * `PlusJakartaSans-Medium` (500)
  * `PlusJakartaSans-SemiBold` (600)
  * `PlusJakartaSans-Bold` (700)
  * `PlusJakartaSans-ExtraBold` (800)

```typescript
export const typography = {
  sizes: {
    display: 36,
    title1: 28,
    title2: 22,
    cardTitle: 16,
    body: 14,
    caption: 12,
    tiny: 10,
  },
  lineHeights: {
    heading: 1.2,
    body: 1.45,
  },
};
```

### 3.3. Espaçamentos, Raios e Sombras (`layout`)
```typescript
export const radii = {
  control: 10,  // Botões e inputs
  card: 16,     // Cartões de treino e métricas
  sheet: 24,    // Topo de Bottom Sheets e modais móveis
  pill: 999,    // Badges e SportTags
};

export const shadows = {
  sm: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
};
```

---

## 4. Melhorias Nativas Mobile (Mobile-First UX)

1. **Navegação por Abas Inferiores (Bottom Tabs):**
   * Substituição do sidebar da web por uma barra de navegação inferior com ícones claros (`lucide-react-native`) e feedback tátil ao trocar de aba.
2. **Modo Treino Ativo ("Workout Live Mode"):**
   * **Manter Tela Ligada (`expo-keep-awake`):** O smartphone não bloqueia a tela enquanto o aluno estiver no meio do treino.
   * **Cronômetro de Descanso com Haptics:** Entre uma série e outra, botão de descanso rápido (ex: 45s, 60s, 90s) com vibração sutil (`expo-haptics`) quando o tempo zerar.
   * **Teclado Otimizado:** Inputs de carga e repetições abrem diretamente o teclado numérico (`keyboardType="decimal-pad"`).
3. **Modais em Formato Bottom Sheet:**
   * O formulário de registro dinâmico retornado por `GET /api/alunos/rotinas/sessoes/{sessaoId}/execucao` e a seleção de RPE (Borg CR-10) sobem como gavetas inferiores (`@gorhom/bottom-sheet`) com gesto de arrastar para fechar (*swipe to dismiss*).
4. **Cache & Resiliência Offline:**
   * Como academias frequentemente têm sinal de celular fraco, o app armazena em cache local a rotina ativa da semana e permite visualizar os exercícios mesmo sem conexão à internet.
5. **Autenticação Segura:**
   * Utilização do `expo-secure-store` para guardar o JWT (muito mais seguro que `localStorage` web).

---

## 5. Estrutura de Diretórios Recomendada (`gymnasion_app`)

Utilizando a arquitetura moderna com **Expo Router**:

```text
gymnasion_app/
├── app/                          # Rotas do Expo Router
│   ├── (auth)/                   # Fluxo público / autenticação
│   │   ├── login.tsx             # Login (POST /api/auth/login)
│   │   └── recuperar-senha.tsx   # Recuperação de senha
│   ├── (aluno)/                  # Tabs e telas da Área do Aluno
│   │   ├── _layout.tsx           # Bottom Tabs Navigation
│   │   ├── index.tsx             # Tab 1: Painel do Aluno (Hoje, RPE, Feedback)
│   │   ├── treinos/              # Tab 2: Meus Treinos
│   │   │   ├── index.tsx         # Lista de rotinas e semanas
│   │   │   ├── [id].tsx          # Detalhes da sessão
│   │   │   └── live.tsx          # Modo execução ao vivo (timer, séries)
│   │   ├── evolucao.tsx          # Tab 3: Gráficos dinâmicos de evolução
│   │   └── perfil.tsx            # Tab 4: Configurações e perfil do aluno
│   ├── (personal)/               # Tabs e telas do Personal Trainer
│   │   ├── _layout.tsx           # Bottom Tabs Navigation
│   │   ├── index.tsx             # Tab 1: Dashboard e estatísticas
│   │   ├── alunos/               # Tab 2: Gestão de Alunos
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx          # Perfil do aluno
│   │   ├── turmas/               # Tab 3: Gestão de Turmas
│   │   ├── rotinas/              # Tab 4: Rotinas e prescrições
│   │   └── perfil.tsx            # Tab 5: Configurações do personal
│   ├── _layout.tsx               # Root Layout (Providers, Fonts, Splash)
│   └── index.tsx                 # Splash / Gatekeeper de autenticação
├── src/
│   ├── components/               # Componentes visuais do Design System
│   │   ├── ui/                   # Button, FormField, Badge, SportTag, Avatar, Card
│   │   ├── workout/              # RestTimer, ExerciseCard, RpePickerSheet
│   │   └── navigation/           # TopHeader, TabBarCustom
│   ├── contexts/                 # AuthContext, WorkoutContext
│   ├── services/                 # api.ts, authService, alunoService, rotinaService
│   ├── types/                    # auth.ts, student.ts, rotina.ts, api.ts
│   ├── theme/                    # tokens.ts, colors.ts, typography.ts
│   └── utils/                    # date.ts, handleApiError.ts, secureStorage.ts
├── assets/                       # Fontes, ícones e splash screen
├── app.json                      # Configuração do Expo
├── package.json
└── tsconfig.json
```

---

## 6. Plano de Ação em Fases de Implementação

O projeto será implementado em **6 fases bem delineadas**:

### Fase 1: Fundação & Setup do Ambiente (Concluída ✅)
* [x] Inicializar o projeto Expo na pasta `gymnasion_app` com TypeScript (Expo SDK 58 + Expo Router).
* [x] Configurar Expo Router, SafeAreaProvider e SplashScreen.
* [x] Carregar as fontes oficiais do Google Fonts (`Plus Jakarta Sans` via `@expo-google-fonts/plus-jakarta-sans`).
* [x] Instalar dependências nucleares (`lucide-react-native`, `react-native-svg`, `axios`, `expo-secure-store`, `expo-haptics`).
* [x] Implementar a camada oficial de design tokens em `src/theme/tokens.ts` (cores, tipografia, raios, espaçamentos, sombras).
* [x] Criar a camada HTTP em `src/services/api.ts` apontando para `/api` com interceptor de autenticação JWT e tratamento do RFC 7807 (`ProblemDetail`).
* [x] Implementar `session.ts` com `expo-secure-store` para persistência segura e `AuthContext.tsx` com gatekeeper inteligente em `app/index.tsx`.
* [x] Criar layout e tela inicial de Login em `app/(auth)/login.tsx` com validações, toggle de senha e suporte ao bloqueio RN-010.
* [x] Estruturar navegação inferior (Bottom Tabs) para a Área do Aluno (`app/(aluno)`) e Personal (`app/(personal)`).

### Fase 2: Componentes Core do Design System (Concluída ✅)
* [x] **`Button`**: Variantes `primary`, `secondary`, `ghost`, `danger`, tamanhos `sm`/`md`/`lg`, suporte a ícone, feedback tátil (`expo-haptics`) e estado `loading`.
* [x] **`FormField`**: Label semântica, validação com borda vermelha e mensagem de erro, suporte a ícones, hint e toggle dinâmico de senha.
* [x] **`Badge`**: Variações de tons (`success`, `warning`, `danger`, `neutral`, `info`, `primary`) com dot indicador e tipografia oficial.
* [x] **`SportTag`**: Pílulas coloridas com ícones vetoriais específicos para as 6 modalidades oficiais (Natação, Tênis, Academia, Corrida, Ciclismo, Funcional).
* [x] **`Avatar`**: Suporte a foto remota, fallback automático para iniciais (ex: "AS"), tamanhos responsivos e tons semânticos.
* [x] **`Card`**: Container unificado com variantes `elevated`, `outlined`, `flat` e elevação/sombras oficiais.
* [x] **`Header`**: Barra de navegação superior nativa com título, subtítulo, botão de retorno e ações contextuais.
* [x] **`EmptyState`**: Apresentação de estados vazios reais sem dados hardcoded.
* [x] **Galeria Design System (`app/modal.tsx`)**: Vitrine visual interativa de todos os componentes acessível diretamente no app.

### Fase 3: Autenticação & Roteamento Inteligente (Concluída ✅)
* [x] **`AuthContext` & `SecureStore`**: Inicialização silenciosa de sessão com encriptação nativa no hardware e sincronização de token.
* [x] **Tela de Login (`/login`)**: Validações de campos obrigatórios, toggle de senha, feedback tátil e tratamento em tempo real do bloqueio temporário (RN-010 com contagem regressiva em minutos e segundos).
* [x] **Redirecionamento Inteligente pós-login**:
  * Papel `ROLE_ALUNO` $\rightarrow$ navega para `(aluno)` com Bottom Tabs.
  * Papel `ROLE_PERSONAL_TRAINER` $\rightarrow$ navega para `(personal)` com Bottom Tabs.
* [x] **Tela de Recuperação de Senha (`/recuperar-senha`)**: Formulário com validação de formato de e-mail, aviso amigável de disponibilidade e confirmação de solicitação com botão de retorno ao login.
* [x] **Ação de Logout Global**: Limpeza profunda de cache, destruição de credenciais no `SecureStore` e redirecionamento instantâneo via `router.replace` para `/(auth)/login`.
* [x] **Alteração de Senha Segura (`/perfil`)**: Integração com `PATCH /api/usuarios/me/senha` com validação de política de senha forte (RN-002: maiúscula, minúscula, número e símbolo).

### Fase 4: Área do Aluno (MVP Central para Mobile) (Concluída ✅)
* [x] **Painel Inicial (`(aluno)/index`)**:
  * Consumo de perfil (`GET /api/alunos/me`) e rotina ativa (`GET /api/alunos/rotinas`).
  * Card do **Treino de Hoje** em destaque com tag de modalidade, duração prevista e botão "Iniciar Treino Agora".
  * Alerta inteligente de RPE pendente com disparo de modal para avaliação pós-treino.
  * Fita de consistência semanal (Seg a Dom) com indicadores dinâmicos do dia atual.
* [x] **Lista de Treinos & Semanas (`(aluno)/treinos`)**:
  * Navegação interativa entre semanas da rotina (`GET /api/alunos/rotinas/{id}/planejamento`).
  * Listagem de sessões com data planejada, exercícios previstos e badges de status (`PLANEJADA` / `CONCLUIDA`).
* [x] **Modo de Treino ao Vivo & Execução (`(aluno)/treinos/[id]`)**:
  * Consumo de `GET /api/alunos/rotinas/sessoes/{sessaoId}/execucao`.
  * Parser automático de blocos de exercícios e orientações (`parseAtividades`).
  * Checklist interativo de exercícios/séries com feedback tátil.
  * **Tela Sempre Ligada (`useKeepAwake`)** durante os treinos na academia.
  * **Cronômetro de Descanso Nativo (`RestTimerModal`)**: Presets (30s, 45s, 60s, 90s, 120s), controles de play/pause/+15s e vibração tátil ao zerar.
  * **Checkout e Conclusão de Treino**: Seleção de RPE Borg CR-10 (`RpePickerSheet`), input de duração real e campos dinâmicos para métricas configuradas, enviando para `POST /api/alunos/rotinas/sessoes/{sessaoId}/execucao`.
* [x] **Minha Evolução (`(aluno)/evolucao`)**:
  * Consumo de `GET /api/alunos/evolucao`.
  * Cartões de resumo de consistência (treinos concluídos, duração média, taxa de adesão).
  * **Gráficos em Linha Nativos (`SvgLineChart`)**: Curvas suaves com gradiente para percepção de esforço (RPE) e métricas personalizadas com badges de tendência (melhoria/regressão).
* [x] **Perfil do Aluno (`(aluno)/perfil`)**:
  * Exibição de dados do aluno e personal vinculado.
  * Alteração de senha conectada ao `PATCH /api/usuarios/me/senha` (RN-002).
  * Logout com encerramento de sessão no SecureStore.

### Fase 5: Área do Personal Trainer no Mobile (Concluída ✅)
* [x] **Dashboard (`(personal)/index`):**
  * Estatísticas gerais em Grid 2x2 (alunos ativos, pendentes, turmas cadastradas, pendências de métricas).
  * Painel de aprovações pendentes com decisão rápida (Aprovar / Recusar) e feedback tátil (`expo-haptics`).
  * Lista de atletas ativos sem rotina vinculada com chamada para ação.
  * Notificações recentes com marcação de leitura e pull-to-refresh.
* [x] **Gestão de Alunos (`(personal)/alunos`):**
  * Lista unificada com busca instantânea por nome e e-mail e filtros por status (Todos, Ativos, Pendentes, Inativos).
  * Modal de Convite rápido (`InviteModal`): geração de link temporário de 15 minutos (US-03) com contagem regressiva, compartilhamento nativo (`Share.share`) e cópia para área de transferência (`expo-clipboard`).
  * Ações rápidas contextuais (Aprovar, Recusar, Desativar e Reativar) conectadas ao back-end Spring Boot.
* [x] **Detalhe do Aluno (`(personal)/alunos/[id]`):**
  * Perfil do atleta com modalidades e ações de conta.
  * Acompanhamento da rotina ativa com barra de progresso de treinos concluídos e contador de métricas pendentes (`/acompanhamento`).
  * Histórico cronológico de sessões executadas com RPE Borg CR-10 e métricas registradas.
  * Mural de feedbacks e observações imutáveis com campo de envio de novo feedback (US-26).
* [x] **Turmas (`(personal)/turmas`):**
  * Listagem de grupos cadastrados com tag de modalidade (`SportTag`), horário e contagem de atletas.
  * Chips de identificação dos membros da turma e EmptyState real.
* [x] **Rotinas (`(personal)/rotinas`):**
  * Listagem de rotinas criadas com status (Ativa/Encerrada), modalidade e frequência semanal.
  * Modal de Planejamento Semanal (`RoutinePlanModal`) com navegação entre semanas e detalhamento de exercícios/orientações via `parseAtividades`.
* [x] **Perfil do Treinador (`(personal)/perfil`):**
  * Dados cadastrais, identificador da conta e atalho para o Design System.
  * Alteração de senha conectada ao `PATCH /api/usuarios/me/senha` com validação de política forte (RN-002).
  * Encerramento de sessão seguro via SecureStore.

### Fase 6: Polimento Mobile, Notificações & Build (Concluída ✅)
* [x] **Pull-to-refresh nativo** em todas as listagens de treinos, evolução, alunos, turmas, rotinas e dashboard.
* [x] **Feedback tátil (`expo-haptics`)** em todas as ações-chave (iniciar treino, toggle de exercício, botão de descanso, submissão de RPE, aprovação/recusa de aluno e cópia de link).
* [x] **Notificações (`expo-notifications`)**:
  * Configuração do serviço centralizado em `src/services/notificationService.ts`.
  * Solicitação de permissão no boot (`app/_layout.tsx`) e canal de alta prioridade no Android.
  * Agendamento automático de lembrete diário de consistência e alerta de término de cronômetro de descanso (`RestTimerModal`).
* [x] **Configuração de Build EAS (`eas.json`)**:
  * Perfis `development`, `preview` (APK direto no Android / simulador iOS) e `production` (AAB para Google Play e IPA para App Store).
  * `app.json` configurado com permissões de notificação, ícones adaptativos, splash screen e bundle identifiers (`com.gymnasion.app`).

---

## 7. Diretrizes de Qualidade e Código

1. **PROIBIDO DADOS ESTÁTICOS / HARDCODED:**
   * Todas as listagens, perfis e execuções devem consumir os serviços conectados à API Spring Boot.
   * Utilizar esqueletos de carregamento (Skeletons) e Empty States reais para listas vazias.
2. **Tratamento Resiliente de Erros:**
   * Erros de rede ou validação do back-end devem ser apresentados ao usuário através de Toasts ou alertas claros mapeados do RFC 7807 (`ProblemDetail.detail`).
3. **Ergonomia e Acessibilidade:**
   * Altura mínima de toque de 44x44 dp para botões e links.
   * Suporte a teclado virtual sem cobrir inputs (`KeyboardAvoidingView`).
   * Respeito às áreas seguras de todos os aparelhos (`SafeAreaView`).
