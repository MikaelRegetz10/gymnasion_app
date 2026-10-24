# Módulo 02: Modalidades Esportivas e Métricas Personalizadas

Este módulo descreve o catálogo oficial de modalidades esportivas e o ciclo de vida completo de métricas personalizadas criadas pelo Personal Trainer para cada modalidade (US-18 e US-19).

---

## 1. Modalidades Esportivas (`/modalidades`)

### 1.1. Listar Todas as Modalidades (US-27) [Paginado]
* **Método / Rota**: `GET /modalidades`
* **Acesso**: Público (Sem autenticação)
* **Query Params Opcionais**:
  * `page` (inteiro, padrão: 0): índice da página.
  * `size` (inteiro, padrão: 20): quantidade de registros por página (ex: `size=100`).
  * `sort` (string opcional): ordenação (ex: `nome,asc`).
* **Resposta `200 OK`**: `PageResponse<ModalidadeResponseDTO>` (Spring Boot Page):
  ```json
  {
    "content": [
      {
        "id": 1,
        "nome": "Natação",
        "descricao": "Treinamento aquático em piscina ou águas abertas",
        "ativa": true
      },
      {
        "id": 2,
        "nome": "Musculação",
        "descricao": "Treinamento resistido com pesos livres e máquinas",
        "ativa": true
      }
    ],
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 2,
    "totalPages": 1,
    "first": true,
    "last": true
  }
  ```

### 1.2. Buscar Modalidade por ID
* **Método / Rota**: `GET /modalidades/{id}`
* **Acesso**: Público
* **Resposta `200 OK`**: Retorna o objeto da modalidade solicitada.
* **Resposta `404 Not Found`**: Caso o ID não exista.

### 1.3. Criar Nova Modalidade
* **Método / Rota**: `POST /modalidades`
* **Acesso**: Autenticado
* **Body (Request)**:
  ```json
  {
    "nome": "Ciclismo",
    "descricao": "Treino de estrada e pista"
  }
  ```
* **Resposta `201 Created`**: Retorna a modalidade criada com o `id` gerado.

---

## 2. Métricas Personalizadas (`/personal-trainers/metricas`)
Todas as rotas exigem `ROLE_PERSONAL_TRAINER` e header `Authorization: Bearer <token>`.

### Enums Fundamentais:
* **`TipoMetrica`** (RN-015):
  * `NUMERICO`: Valores inteiros ou decimais (ex: carga em kg, repetições, distância em km, séries).
  * `TEMPO`: Formato de tempo (ex: `MM:SS`, `HH:MM:SS` ou segundos).
  * `FREQUENCIA_CARDIACA`: Frequência cardíaca em bpm (ex: `145 bpm`).
  * `TEXTO`: Campo textual para anotações do desempenho.
  *(Valores aceitos pela classe enum Spring Boot: `[FREQUENCIA_CARDIACA, TEXTO, TEMPO, NUMERICO]`)*
* **`ResponsavelPreenchimento`**:
  * `ALUNO`: Preenchimento feito na visão do aluno durante o treino.
  * `PERSONAL`: Métrica técnica exclusiva do Personal (o aluno vê como pendente do personal).
  * `AMBOS`: Ambos os atores podem registrar.

---

### 2.1. Criar Nova Métrica Personalizada (US-18)
* **Método / Rota**: `POST /personal-trainers/metricas`
* **Body (Request)**:
  ```json
  {
    "modalidadeId": 1,
    "titulo": "Tempo 100m Livre",
    "tipo": "TEMPO",
    "obrigatoria": true,
    "quemPreenche": "ALUNO"
  }
  ```
* **Regras de Validação**:
  * O título é obrigatório (máximo 100 caracteres).
  * **RN-016 (Unicidade)**: Não é permitido criar duas métricas com o mesmo nome na mesma modalidade para o mesmo personal trainer. Retorna `409 Conflict` se duplicado ("Já existe uma métrica com esse nome nessa modalidade.").
* **Resposta `201 Created`**:
  ```json
  {
    "id": "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f",
    "titulo": "Tempo 100m Livre",
    "tipo": "TEMPO",
    "obrigatoria": true,
    "quemPreenche": "ALUNO",
    "modalidadeId": 1,
    "quantidadeAlunosComRegistro": 0,
    "descontinuada": false
  }
  ```

---

### 2.2. Listar Métricas da Modalidade (US-18) [Paginado]
* **Método / Rota**: `GET /personal-trainers/metricas?modalidadeId={modalidadeId}`
* **Query Params**:
  * `modalidadeId` (Long obrigatório): ID da modalidade esportiva.
  * `page` (inteiro opcional, padrão: 0): índice da página.
  * `size` (inteiro opcional, padrão: 20): quantidade de registros por página (ex: `size=100`).
  * `sort` (string opcional): campo de ordenação.
* **Resposta `200 OK`**: `PageResponse<MetricaResponseDTO>` (Spring Boot Page) com métricas vinculadas à modalidade e ao personal trainer autenticado, incluindo `quantidadeAlunosComRegistro` para o front-end saber se a métrica possui histórico:
  ```json
  {
    "content": [
      {
        "id": "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f",
        "titulo": "Tempo 100m Livre",
        "tipo": "TEMPO",
        "obrigatoria": true,
        "quemPreenche": "ALUNO",
        "modalidadeId": 1,
        "quantidadeAlunosComRegistro": 3,
        "descontinuada": false
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

### 2.3. Editar Métrica (US-19)
* **Método / Rota**: `PUT /personal-trainers/metricas/{id}`
* **Path Variable**: `id` (UUID da métrica)
* **Body (Request)**:
  ```json
  {
    "titulo": "Tempo 100m Nado Livre (Atualizado)",
    "tipo": "TEMPO_CRONOMETRO",
    "obrigatoria": false,
    "quemPreenche": "AMBOS"
  }
  ```
* **Regras de Negócio (RN-017)**:
  * O título pode ser atualizado a qualquer momento.
  * **Imutabilidade do Tipo**: Se a métrica já possui registros de desempenho de alunos (`quantidadeAlunosComRegistro > 0`), a alteração de seu `tipo` é terminantemente bloqueada e retorna **`422 Unprocessable Entity`** com mensagem `"Não é possível alterar o tipo de uma métrica com histórico."`.
* **Resposta `200 OK`**: Retorna o `MetricaResponseDTO` atualizado.

---

### 2.4. Excluir ou Descontinuar Métrica (US-19, RN-017)
* **Método / Rota**: `DELETE /personal-trainers/metricas/{id}`
* **Path Variable**: `id` (UUID da métrica)
* **Regras de Negócio (RN-017 - Exclusão Inteligente)**:
  * **Sem Histórico**: Se nenhum treino jamais utilizou a métrica, é efetuada **remoção física** do banco de dados. Resposta: `"Métrica excluída com sucesso."`.
  * **Com Histórico**: Se já houver registros de execução associados, a exclusão física é impedida para não corromper o histórico do atleta. Ocorre **soft-delete (descontinuação)** (`descontinuada = true`). Ela deixa de aparecer no formulário de novas sessões, mas permanece acessível em relatórios e dashboards com status de "métrica descontinuada". Resposta: `"Métrica descontinuada com sucesso para preservar o histórico."`.
* **Resposta `200 OK`**:
  ```json
  {
    "mensagem": "Métrica descontinuada com sucesso para preservar o histórico."
  }
  ```
