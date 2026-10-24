# Módulo 05: Acompanhamento, Pendências, Notificações, Feedbacks e Dashboards

Este módulo detalha os painéis de acompanhamento pedagógico, central de notificações e pendências de métricas, registro de notas/feedbacks imutáveis e agregação de dados para gráficos dinâmicos de evolução (US-15, US-20, US-24 e US-26).

---

## 1. Acompanhamento de Treinos & Pendências (US-24)
Todas as rotas exigem perfil `ROLE_PERSONAL_TRAINER`.

### 1.1. Acompanhar Estado dos Treinamentos do Aluno (US-24 C1, C2, C9, C10)
* **Método / Rota**: `GET /personal-trainers/alunos/{alunoId}/acompanhamento`
* **Path Variable**: `alunoId` (UUID do atleta)
* **Resposta `200 OK`**: Retorna `AcompanhamentoAlunoResponseDTO`:
  ```json
  {
    "alunoId": "d2a1b3c4-e5f6-7890-abcd-ef1234567890",
    "alunoNome": "Mariana Atleta",
    "rotinaId": "7f8e9d0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
    "rotinaTitulo": "Preparação Travessia 1.500m",
    "totalSessoes": 12,
    "sessoesConcluidas": 5,
    "sessoesPendentes": 7,
    "possuiPendenciasPreenchimento": true,
    "metricasPendentes": [
      {
        "sessaoId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
        "dataExecucao": "2026-10-21",
        "metricaId": "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f",
        "metricaTitulo": "Lactato Sanguíneo (Pós-Treino)",
        "tipo": "NUMERICO"
      }
    ]
  }
  ```

### 1.2. Resumo Geral de Pendências de Métricas (US-24 C3)
Retorna o panorama global de todos os alunos sob a responsabilidade do treinador que possuem métricas técnicas aguardando preenchimento.
* **Método / Rota**: `GET /personal-trainers/acompanhamento/pendencias`
* **Resposta `200 OK`**: Retorna `ResumoPendenciasResponseDTO` com a contagem total de alunos e pendências por aluno.

---

## 2. Central de Notificações (US-24)

### 2.1. Visão do Personal Trainer (`/personal-trainers/notificacoes`)
* **Listar Notificações [Paginado]**: `GET /personal-trainers/notificacoes`
  * **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20, ou `size=100`), `sort`.
  * **Resposta `200 OK`**: `PageResponse<NotificacaoResponseDTO>` (Spring Boot Page):
    ```json
    {
      "content": [
        {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "alunoId": "d2a1b3c4-e5f6-7890-abcd-ef1234567890",
          "alunoNome": "Mariana Atleta",
          "tipo": "TREINO_CONCLUIDO",
          "mensagem": "Mariana concluiu o treino de Natação.",
          "dataHora": "2026-10-21T18:30:00Z",
          "lida": false
        }
      ],
      "pageNumber": 0,
      "pageSize": 20,
      "totalElements": 1,
      "totalPages": 1,
      "first": true,
      "last": true
    }
    ```
* **Marcar como Lida**: `PATCH /personal-trainers/notificacoes/{id}/ler`
  * **Invariante DRS (US-24 C7)**: Apenas abrir/ler a notificação marca o aviso como visualizado, mas **NÃO resolve nem remove a pendência** de preenchimento da métrica.
* **Marcar Todas como Lidas**: `PATCH /personal-trainers/notificacoes/marcar-como-lidas` (ou `/ler-todas`)
* **Badge de Contagem**: `GET /personal-trainers/notificacoes/contagem-nao-lidas` (retorna número inteiro `Long` para badge na barra de navegação).

### 2.2. Visão do Aluno (`/alunos/notificacoes`)
* **Listar Notificações [Paginado]**: `GET /alunos/notificacoes`
  * **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20), `sort`.
  * **Resposta `200 OK`**: `PageResponse<NotificacaoResponseDTO>` contendo as notificações direcionadas ao aluno.
* **Marcar como Lida**: `PATCH /alunos/notificacoes/{id}/ler`
* **Marcar Todas como Lidas**: `PATCH /alunos/notificacoes/marcar-como-lidas` (ou `/ler-todas`)
* **Badge de Contagem**: `GET /alunos/notificacoes/contagem-nao-lidas`

---

## 3. Observações e Feedbacks Imutáveis (US-26)
Permite ao personal registrar feedbacks no perfil do atleta e ao aluno registrar notas sobre suas dificuldades e sensações.

### Regra de Ouro (US-26 C5):
* **Registros Imutáveis**: Observações e feedbacks **nunca podem ser editados e nunca sofrem exclusão** (nem física nem lógica). São gravações permanentes da linha do tempo pedagógica.

### 3.1. Visão do Personal Trainer
* **Registrar Feedback**: `POST /personal-trainers/alunos/{alunoId}/observacoes-feedbacks`
  * **Body (Request)**:
    ```json
    {
      "conteudo": "Excelente adaptação de braçada. Manter o cotovelo alto nas séries finais."
    }
    ```
  * **Validações**: `conteudo` não pode ser vazio e tem limite de 2000 caracteres.
  * **Resposta `201 Created`**: Retorna `ObservacaoFeedbackResponseDTO`.
* **Consultar Histórico [Paginado]**: `GET /personal-trainers/alunos/{alunoId}/observacoes-feedbacks`
  * **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20), `sort`.
  * **Resposta `200 OK`**: `PageResponse<ObservacaoFeedbackResponseDTO>` com histórico cronológico decrescente (mais recente primeiro).

### 3.2. Visão do Aluno
* **Registrar Observação**: `POST /alunos/observacoes-feedbacks`
  * **Body (Request)**:
    ```json
    {
      "conteudo": "Senti leve cansaço na lombar durante as séries de perna com prancha."
    }
    ```
  * **Resposta `201 Created`**: Retorna `ObservacaoFeedbackResponseDTO`.
* **Consultar Histórico [Paginado]**: `GET /alunos/observacoes-feedbacks`
  * **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20), `sort`.
  * **Resposta `200 OK`**: `PageResponse<ObservacaoFeedbackResponseDTO>` contendo histórico do aluno e os feedbacks deixados pelo seu treinador.

### 3.3. Endpoint Polimórfico (`/observacoes-feedbacks`)
* **Registrar**: `POST /observacoes-feedbacks/alunos/{alunoId}`
* **Consultar Histórico [Paginado]**: `GET /observacoes-feedbacks/alunos/{alunoId}`
  * **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20), `sort`.
  * **Resposta `200 OK`**: `PageResponse<ObservacaoFeedbackResponseDTO>`.

#### Exemplo de Resposta Paginada (`PageResponse<ObservacaoFeedbackResponseDTO>`):
```json
{
  "content": [
    {
      "id": "e2f1a0b9-8c7d-6e5f-4a3b-2c1d0e9f8a7b",
      "autorNome": "Carlos Personal",
      "autorRole": "ROLE_PERSONAL_TRAINER",
      "conteudo": "Excelente adaptação de braçada. Manter o cotovelo alto nas séries finais.",
      "dataHora": "2026-10-21T19:00:00Z"
    }
  ],
  "pageNumber": 0,
  "pageSize": 20,
  "totalElements": 1,
  "totalPages": 1,
  "first": true,
  "last": true
}
```

---

## 4. Dashboards Dinâmicos de Evolução (US-15 & US-20 C3)
Retorna séries temporais agregadas para renderização visual em gráficos de linha (ex: Recharts / Shadcn).

### 4.1. Visão do Personal Trainer
* **Método / Rota**: `GET /personal-trainers/alunos/{alunoId}/evolucao`
* **Query Params Opcionais**:
  * `modalidadeId`: Filtra métricas de uma modalidade específica.
  * `dataInicio`: Formato `YYYY-MM-DD`.
  * `dataFim`: Formato `YYYY-MM-DD`.
* **Regras de Negócio**:
  * Exige ao menos **3 sessões registradas** para consolidar os gráficos de evolução temporal.
  * Tempo de resposta garantido inferior a 3 segundos (US-15 C2).

### 4.2. Visão do Aluno
* **Método / Rota**: `GET /alunos/evolucao`
* **Query Params Opcionais**: `modalidadeId`, `dataInicio`, `dataFim`.
* **Indicadores Visuais**: Fornece os pontos temporais e indicativo de tendência (melhoria ou regressão) com base nas métricas e na Escala de Borg CR-10 (RPE) ao longo do tempo.

### Exemplo de Resposta `200 OK`:
```json
{
  "alunoId": "d2a1b3c4-e5f6-7890-abcd-ef1234567890",
  "modalidadeId": 1,
  "modalidadeNome": "Natação",
  "totalSessoesAnalisadas": 8,
  "seriesRpe": [
    { "data": "2026-10-01", "valor": 8 },
    { "data": "2026-10-08", "valor": 7 },
    { "data": "2026-10-15", "valor": 6 }
  ],
  "seriesMetricas": [
    {
      "metricaId": "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f",
      "metricaTitulo": "Tempo 100m Livre",
      "tipo": "TEMPO_CRONOMETRO",
      "pontos": [
        { "data": "2026-10-01", "valor": "01:25", "valorNumerico": 85.0 },
        { "data": "2026-10-08", "valor": "01:20", "valorNumerico": 80.0 },
        { "data": "2026-10-15", "valor": "01:15", "valorNumerico": 75.0 }
      ],
      "tendencia": "MELHORIA"
    }
  ]
}
```
