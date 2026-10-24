# Módulo 04: Sessões, Execução, RPE, Correção e Auditoria

Este módulo detalha o ciclo de vida operacional das sessões de treino: planejamento semanal, formulário de execução pelo aluno, preenchimento de métricas e RPE (Escala de Borg CR-10), validação do personal, correção de desempenho com auditoria completa (US-10, US-13, US-20, US-21, US-22 e US-23).

---

## 1. Planejamento Semanal de Sessões

### 1.1. Adicionar Sessão ao Planejamento (US-10 C1)
* **Método / Rota**: `POST /personal-trainers/rotinas/{id}/sessoes`
* **Perfil**: `ROLE_PERSONAL_TRAINER`
* **Body (Request)**:
  ```json
  {
    "semana": 1,
    "dataPlanejada": "2026-10-20",
    "duracao": 60,
    "atividades": "Aquecimento 10 min, 4x100m crawl ritmo moderado, descanso 45s, soltura 10 min."
  }
  ```
* **Resposta `201 Created`**: Retorna `SessaoTreinoResponseDTO`.

### 1.2. Consultar Planejamento por Semanas (US-10 C1 / US-21)
* **Pelo Personal**: `GET /personal-trainers/rotinas/{id}/planejamento`
* **Pelo Aluno**: `GET /alunos/rotinas/{id}/planejamento`
* **Resposta `200 OK`**: Retorna `PlanejamentoRotinaResponseDTO` contendo o mapa de sessões agrupadas por semanas (`semanas: [{ numero: 1, sessoes: [...] }]`).

### 1.3. Editar Sessão Futura (US-10 C2)
* **Método / Rota**: `PUT /personal-trainers/rotinas/sessoes/{sessaoId}`
* **Perfil**: `ROLE_PERSONAL_TRAINER`
* **Regra de Bloqueio**: Apenas sessões ainda **não executadas** podem ser editadas. Se a sessão já tiver sido concluída ou tiver execução registrada, retorna **`422 Unprocessable Entity`** ("Não é possível editar uma sessão já executada.").
* **Resposta `200 OK`**: Retorna a sessão atualizada.

---

## 2. Registro de Execução do Treino

### 2.1. Obter Formulário Dinâmico de Registro (US-22 C1)
Usado pelo front-end do aluno para montar a tela de registro de treino com os campos exatos de métricas configurados pelo treinador.
* **Método / Rota**: `GET /alunos/rotinas/sessoes/{sessaoId}/execucao`
* **Perfil**: `ROLE_ALUNO`
* **Resposta `200 OK`**:
  ```json
  {
    "sessaoId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
    "dataPlanejada": "2026-10-20",
    "duracaoPlanejada": 60,
    "atividades": "Aquecimento 10 min, 4x100m crawl...",
    "metricas": [
      {
        "id": "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f",
        "titulo": "Tempo 100m Livre",
        "tipo": "TEMPO_CRONOMETRO",
        "obrigatoria": true,
        "quemPreenche": "ALUNO"
      },
      {
        "id": "b7c8d9e0-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
        "titulo": "Frequência Cardíaca Pico",
        "tipo": "FREQUENCIA_CARDIACA",
        "obrigatoria": false,
        "quemPreenche": "AMBOS"
      }
    ]
  }
  ```

---

### 2.2. Confirmar Conclusão e Execução pelo Aluno (US-22, RN-015, RN-018)
* **Método / Rota**: `POST /alunos/rotinas/sessoes/{sessaoId}/execucao`
* **Perfil**: `ROLE_ALUNO`
* **Body (Request)**:
  ```json
  {
    "dataReal": "2026-10-21",
    "duracao": 55,
    "nivelCansaco": 7,
    "resultados": [
      {
        "metricaId": "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f",
        "valor": "01:15"
      },
      {
        "metricaId": "b7c8d9e0-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
        "valor": "168"
      }
    ]
  }
  ```
* **Regras de Negócio e Validações**:
  * `dataReal`: Data em que o treino foi realizado. **A `dataPlanejada` original é mantida intacta** (nunca é sobrescrita).
  * `duracao`: Duração real em minutos (mínimo 1).
  * `nivelCansaco`: **Escala de Borg CR-10** (RN-018), número inteiro de 1 a 10 (opcional).
  * **RN-015 (Validação de Tipos)**:
    * `NUMERICO`: Deve ser número válido.
    * `TEMPO_CRONOMETRO`: Formato de tempo válido (`MM:SS`, `HH:MM:SS` ou numérico).
    * `FREQUENCIA_CARDIACA`: Valor em bpm.
    * Se algum formato for inválido, retorna **`422 Unprocessable Entity`** com mapa `invalidFields` detalhando o campo com erro.
  * **Imutabilidade pós-confirmação**: Aluno só pode registrar uma vez. Se tentar registrar novamente sessão já concluída, retorna **`422 Unprocessable Entity`** (alterações posteriores são exclusivas do Personal via US-23).
* **Resposta `200 OK`**: Retorna `SessaoTreinoResponseDTO` com status `CONCLUIDA`.

---

### 2.3. Registro de Execução pelo Personal Trainer
* **Método / Rota**: `POST /personal-trainers/rotinas/sessoes/{sessaoId}/execucao`
* **Perfil**: `ROLE_PERSONAL_TRAINER`
* **Body**: Idêntico ao do aluno, incluindo opcionalmente `"alunoId": "..."` caso a rotina tenha múltiplos atletas.

---

### 2.4. Validação da Execução pelo Treinador (US-10 C6)
* **Método / Rota**: `PATCH /personal-trainers/rotinas/sessoes/{sessaoId}/validar`
* **Perfil**: `ROLE_PERSONAL_TRAINER`
* **Efeito**: Marca a sessão como validada pelo personal.
* **Invariante DRS**: A conclusão da sessão pelo aluno é independente e suficiente por si só; a validação do treinador é um ateste pedagógico adicional.
* **Resposta `200 OK`**: Retorna `SessaoTreinoResponseDTO`.

---

## 3. Correção de Desempenho e Auditoria (US-23)
Todas as operações de correção e auditoria exigem perfil `ROLE_PERSONAL_TRAINER`.

### 3.1. Acessar Registro de Desempenho para Correção (US-23 C1)
* **Método / Rota**: `GET /personal-trainers/rotinas/sessoes/{sessaoId}/desempenho`
* **Resposta `200 OK`**: Retorna `DesempenhoDetalheResponseDTO`, contendo:
  * Data real e planejada
  * Duração e nível de esforço RPE
  * Observações
  * Lista de métricas com valores atuais, indicação se podem ser corrigidas e indicação de **métricas pendentes do personal** que ainda precisam ser preenchidas.

---

### 3.2. Salvar Correção de Desempenho (US-23 C2 a C7)
Permite ao treinador corrigir valores digitados incorretamente pelo aluno, atualizar a data real, preencher métricas que estavam pendentes ou retificar observações.
* **Método / Rota**: `PATCH /personal-trainers/rotinas/sessoes/{sessaoId}/desempenho`
* **Body (Request)**:
  ```json
  {
    "dataReal": "2026-10-21",
    "observacoes": "Ajustado tempo da 2ª série após verificação do cronômetro oficial.",
    "metricas": [
      {
        "metricaId": "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f",
        "valor": "01:12"
      }
    ]
  }
  ```
* **Regras de Negócio e Auditoria**:
  * A `dataPlanejada` original é estritamente protegida e nunca muda.
  * Todas as alterações sofrem validação de formato de dados (RN-015).
  * Cada métrica corrigida ou incluída gera automaticamente uma linha de auditoria imutável no banco de dados.
* **Resposta `200 OK`**: Retorna `DesempenhoDetalheResponseDTO` atualizado.

---

### 3.3. Consultar Histórico de Auditoria do Treino (US-23 C5) [Paginado]
Permite visualizar todas as inclusões e correções feitas na sessão, em ordem cronológica.
* **Método / Rota**: `GET /personal-trainers/rotinas/sessoes/{sessaoId}/desempenho/auditoria`
* **Query Params Opcionais**:
  * `page` (inteiro, padrão: 0): índice da página.
  * `size` (inteiro, padrão: 20): quantidade de registros por página.
  * `sort` (string opcional): campo de ordenação.
* **Resposta `200 OK`**: `PageResponse<AuditoriaDesempenhoDTO>` (Spring Boot Page):
  ```json
  {
    "content": [
      {
        "id": "c9d8e7f6-5a4b-3c2d-1e0f-9a8b7c6d5e4f",
        "metricaTitulo": "Tempo 100m Livre",
        "tipoAlteracao": "CORRECAO",
        "valorAnterior": "01:15",
        "valorNovo": "01:12",
        "responsavelNome": "Carlos Personal",
        "responsavelRole": "ROLE_PERSONAL_TRAINER",
        "dataHoraAlteracao": "2026-10-21T19:30:00Z"
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

## 4. Histórico de Treinos Executados (US-10 C8 & US-21)
Endpoints para consulta do histórico de treinos concluídos/executados com suporte a paginação.

### 4.1. Treinos Concluídos da Rotina (Personal) [Paginado]
* **Método / Rota**: `GET /personal-trainers/rotinas/{id}/historico`
* **Perfil**: `ROLE_PERSONAL_TRAINER`
* **Path Variable**: `id` (UUID da rotina)
* **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20, ou `size=100`), `sort`.
* **Resposta `200 OK`**: `PageResponse<HistoricoTreinoDTO>` contendo as sessões executadas da rotina.

### 4.2. Todos os Treinos Concluídos do Aluno (Personal) [Paginado]
* **Método / Rota**: `GET /personal-trainers/rotinas/aluno/{alunoId}/historico`
* **Perfil**: `ROLE_PERSONAL_TRAINER`
* **Path Variable**: `alunoId` (UUID do aluno)
* **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20, ou `size=100`), `sort`.
* **Resposta `200 OK`**: `PageResponse<HistoricoTreinoDTO>` contendo todo o histórico cronológico de treinos executados pelo aluno.

### 4.3. Treinos Concluídos da Rotina (Aluno) [Paginado]
* **Método / Rota**: `GET /alunos/rotinas/{id}/historico`
* **Perfil**: `ROLE_ALUNO`
* **Path Variable**: `id` (UUID da rotina)
* **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20), `sort`.
* **Resposta `200 OK`**: `PageResponse<HistoricoTreinoDTO>` com os treinos realizados pelo aluno na rotina.

#### Exemplo de Resposta Paginada (`PageResponse<HistoricoTreinoDTO>`):
```json
{
  "content": [
    {
      "sessaoId": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      "rotinaId": "7f8e9d0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
      "dataPlanejada": "2026-10-20",
      "dataReal": "2026-10-21",
      "duracao": 55,
      "nivelCansaco": 7,
      "validadoPeloPersonal": true,
      "status": "CONCLUIDA",
      "resultados": [
        {
          "metricaId": "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f",
          "metricaTitulo": "Tempo 100m Livre",
          "tipo": "TEMPO_CRONOMETRO",
          "valor": "01:12"
        }
      ]
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
