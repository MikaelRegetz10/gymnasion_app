# Módulo 03: Turmas e Rotinas de Treino

Este módulo abrange a criação e gestão de Turmas e a criação, vinculação, encerramento e reutilização de Rotinas de Treino organizadas por semanas.

---

## 1. Gestão de Turmas (`/personal-trainers/turmas`)
Todas as rotas requerem perfil `ROLE_PERSONAL_TRAINER`.

### 1.1. Criar Turma (US-07)
* **Método / Rota**: `POST /personal-trainers/turmas`
* **Body (Request)**:
  ```json
  {
    "nome": "Turma Natação Manhã - Avançado",
    "modalidadeId": 1,
    "horario": "2026-10-20T08:00:00Z",
    "alunosIds": [
      "d2a1b3c4-e5f6-7890-abcd-ef1234567890",
      "e3c2b1a0-4f5e-6d7c-8b9a-0123456789ab"
    ]
  }
  ```
* **Regras**: `alunosIds` deve conter pelo menos 1 aluno ativo vinculado ao personal. Se vazio, retorna **`422 Unprocessable Entity`** ("Precisa ter pelo menos um aluno vinculado para conseguir criar uma turma.").
* **Resposta `201 Created`**: Retorna `TurmaResponseDTO`.

### 1.2. Listar Turmas do Personal (US-08) [Paginado]
* **Método / Rota**: `GET /personal-trainers/turmas`
* **Query Params Opcionais**:
  * `page` (inteiro, padrão: 0): índice da página.
  * `size` (inteiro, padrão: 20): quantidade de registros por página (ex: `size=100`).
  * `sort` (string opcional): campo de ordenação (ex: `nome,asc`).
* **Resposta `200 OK`**: `PageResponse<TurmaResponseDTO>` (Spring Boot Page):
  ```json
  {
    "content": [
      {
        "id": "b3f2e1d0-9a8b-4c5d-6e7f-8a9b0c1d2e3f",
        "nome": "Turma Natação Manhã - Avançado",
        "modalidade": {
          "id": 1,
          "nome": "Natação"
        },
        "horario": "2026-10-20T08:00:00Z",
        "alunos": [
          {
            "id": "d2a1b3c4-e5f6-7890-abcd-ef1234567890",
            "nome": "Mariana Atleta"
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

### 1.3. Buscar Turma por ID (US-08)
* **Método / Rota**: `GET /personal-trainers/turmas/{id}`
* **Path Variable**: `id` (UUID da turma)
* **Resposta `200 OK`**: Retorna os detalhes completos da turma (`TurmaResponseDTO` único).

### 1.4. Atualizar Dados da Turma (US-09 C1)
* **Método / Rota**: `PUT /personal-trainers/turmas/{id}`
* **Body (Request)**:
  ```json
  {
    "nome": "Turma Natação Manhã - Nível 2",
    "modalidadeId": 1,
    "horario": "2026-10-20T08:30:00Z"
  }
  ```
* **Resposta `200 OK`**: Retorna a turma com nome/modalidade/horário atualizados.

### 1.5. Adicionar Aluno à Turma (US-09 C3)
* **Método / Rota**: `POST /personal-trainers/turmas/{id}/alunos/{alunoId}`
* **Resposta `200 OK`**: `{"mensagem": "Aluno adicionado à turma com sucesso."}`.

### 1.6. Remover Aluno da Turma (US-09 C5, C6)
* **Método / Rota**: `DELETE /personal-trainers/turmas/{id}/alunos/{alunoId}`
* **Regra Especial (US-09 C6)**: Se a turma possuir apenas 1 aluno e ele for removido, a turma fica vazia e o sistema **remove a turma automaticamente**.
* **Resposta `200 OK`**: `{"mensagem": "Aluno removido da turma com sucesso."}` ou `{"mensagem": "Aluno removido e turma excluída por não possuir mais alunos."}`.

---

## 2. Rotinas de Treinamento (`/personal-trainers/rotinas`)
Todas as rotas requerem perfil `ROLE_PERSONAL_TRAINER`.

### 2.1. Criar Rotina de Treino (US-09, RN-012)
* **Método / Rota**: `POST /personal-trainers/rotinas`
* **Body (Request)**:
  ```json
  {
    "titulo": "Preparação Travessia 1.500m",
    "modalidadeId": 1,
    "frequenciaSemanal": 4,
    "objetivos": "Ganho de resistência aeróbica e controle de ritmo",
    "alunosIds": [
      "d2a1b3c4-e5f6-7890-abcd-ef1234567890"
    ],
    "metricasIds": [
      "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f"
    ]
  }
  ```
* **Regras de Negócio**:
  * `frequenciaSemanal`: número inteiro de 1 a 7 dias por semana.
  * `alunosIds`: mínimo de 1 aluno válido e ativo.
  * `metricasIds`: mínimo de 1 métrica da mesma modalidade esportiva.
  * **Regra de 1 rotina ativa**: O aluno não pode possuir outra rotina ativa simultaneamente (retorna `400 Bad Request`).
* **Resposta `201 Created`**: Retorna `RotinaTreinoResponseDTO`.

---

### 2.2. Listagens e Consultas de Rotinas
* **Listar Todas do Personal (US-09) [Paginado]**: `GET /personal-trainers/rotinas`
  * **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20, ou `size=100`), `sort`.
  * **Resposta `200 OK`**: `PageResponse<RotinaTreinoResponseDTO>` (Spring Boot Page).
* **Listar por Aluno (US-11) [Paginado]**: `GET /personal-trainers/rotinas/aluno/{alunoId}`
  * **Path Variable**: `alunoId` (UUID do aluno).
  * **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20), `sort`.
  * **Resposta `200 OK`**: `PageResponse<RotinaTreinoResponseDTO>` (Spring Boot Page).
* **Buscar por ID**: `GET /personal-trainers/rotinas/{id}`
  * **Resposta `200 OK`**: Retorna objeto único `RotinaTreinoResponseDTO`.

#### Exemplo de Resposta Paginada (`PageResponse<RotinaTreinoResponseDTO>`):
```json
{
  "content": [
    {
      "id": "7f8e9d0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
      "titulo": "Preparação Travessia 1.500m",
      "modalidade": {
        "id": 1,
        "nome": "Natação"
      },
      "frequenciaSemanal": 4,
      "objetivos": "Ganho de resistência aeróbica e controle de ritmo",
      "status": "ATIVA",
      "alunos": [
        {
          "id": "d2a1b3c4-e5f6-7890-abcd-ef1234567890",
          "nome": "Mariana Atleta"
        }
      ],
      "metricas": [
        {
          "id": "e4b2d3c1-9a8f-4e32-bf78-1a2b3c4d5e6f",
          "titulo": "Tempo 100m Livre",
          "tipo": "TEMPO_CRONOMETRO"
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

---

### 2.3. Excluir Rotina de Treino (US-12)
* **Método / Rota**: `DELETE /personal-trainers/rotinas/{id}`
* **Regra de Proteção de Histórico**:
  * Se a rotina NÃO tiver nenhum treino executado/concluído: ela é excluída fisicamente do banco de dados (`200 OK`: `"Rotina excluída com sucesso!"`).
  * Se a rotina JÁ POSSUI treinos executados: a exclusão física é **bloqueada** retornando **`422 Unprocessable Entity`** ("Não é possível excluir rotina com sessões já executadas"). O personal deve usar o encerramento de rotina (`/encerrar`).

---

### 2.4. Vincular e Desvincular Alunos (US-11)
* **Vincular Novos Alunos**: `POST /personal-trainers/rotinas/{id}/alunos`
  ```json
  {
    "alunosIds": ["a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"]
  }
  ```
  * Valida se algum aluno já está vinculado ou se já possui outra rotina ativa no momento.
* **Desvincular Aluno**: `DELETE /personal-trainers/rotinas/{id}/alunos/{alunoId}`
  * Exige que ao menos um aluno permaneça vinculado (RN-012).

---

### 2.5. Encerrar Rotina Ativa (US-25 C6, C7)
* **Método / Rota**: `PATCH /personal-trainers/rotinas/{id}/encerrar`
* **Efeito**: Altera o status da rotina para `ENCERRADA`, remove sessões futuras não executadas e desocupa o aluno para que possa receber uma nova rotina ativa. Preserva todo o histórico passado de sessões executadas.
* **Resposta `200 OK`**: Retorna `RotinaTreinoResponseDTO` com status atualizado.

---

### 2.6. Reutilização de Rotinas como Modelo (US-25 C1, C2)
* **Cenário 1 — A partir da lista de rotinas**: `POST /personal-trainers/rotinas/{id}/reutilizar`
  ```json
  {
    "alunoId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "dataInicio": "2026-11-01",
    "titulo": "Preparação Travessia 1.500m (Ciclo 2)",
    "objetivos": "Foco em viradas e ritmo constante"
  }
  ```
* **Cenário 2 — A partir do perfil do aluno**: `POST /personal-trainers/rotinas/aluno/{alunoId}/atribuir`
  ```json
  {
    "rotinaOrigemId": "7f8e9d0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
    "dataInicio": "2026-11-01",
    "titulo": "Preparação Travessia 1.500m (Ciclo 2)",
    "objetivos": "Foco em viradas e ritmo constante"
  }
  ```
* **Regras de Negócio Fundamentais**:
  * Cria uma **cópia 100% independente**.
  * Recalcula todas as datas planejadas a partir da nova `dataInicio`.
  * **NUNCA copia resultados, datas reais ou histórico de execução** da rotina anterior.
  * Valida se o aluno destino já possui outra rotina ativa (retorna `400 Bad Request` se possuir).
* **Resposta `201 Created`**: Retorna a nova `RotinaTreinoResponseDTO`.
