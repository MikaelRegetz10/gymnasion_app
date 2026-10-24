# Módulo 01: Autenticação, Usuários e Gestão de Alunos

Este módulo cobre o cadastro de treinadores, fluxo de convite e auto-registo de alunos, autenticação JWT, aprovações e ciclo de vida de ativação de alunos.

---

## 1. `POST /auth/registro-personal` (US-01)
Registra um novo Personal Trainer e associa sua modalidade inicial.
* **Acesso**: Público (sem autenticação)
* **Headers**: `Content-Type: application/json`

### Body (Request):
```json
{
  "nome": "Carlos Personal",
  "email": "carlos.personal@example.com",
  "password": "senhaForte123",
  "cpf": "12345678901",
  "celular": "11987654321",
  "modalidade": 1
}
```
* **Validações**: `nome`, `email` válido, `password` (mínimo 6 chars), `cpf` (exatamente 11 dígitos numéricos), `celular` (até 13 chars), `modalidade` (ID de modalidade existente no catálogo).

### Respostas:
* **`201 Created`**:
  ```json
  {
    "id": "c1f7b8d4-5a34-4a23-8ef1-9b1e9c2f3a4b",
    "nome": "Carlos Personal",
    "email": "carlos.personal@example.com",
    "role": "ROLE_PERSONAL_TRAINER"
  }
  ```
* **`400 Bad Request`**: Dados de entrada inválidos (`invalidFields`).
* **`409 Conflict`**: E-mail ou CPF já cadastrado na plataforma.

---

## 2. `POST /auth/login` (US-02, RN-010, RN-014)
Autentica o usuário e gera o token JWT.
* **Acesso**: Público
* **Headers**: `Content-Type: application/json`

### Body (Request):
```json
{
  "email": "carlos.personal@example.com",
  "password": "senhaForte123"
}
```

### Respostas:
* **`200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tipo": "Bearer"
  }
  ```
* **`401 Unauthorized`**: E-mail ou senha incorretos (`detail: "E-mail ou senha inválidos."`).
* **`422 Unprocessable Entity`**:
  * Conta bloqueada temporariamente (RN-010): 5 tentativas consecutivas inválidas bloqueiam o acesso por 5 minutos.
  * Aluno inativo (RN-014): "O seu acesso encontra-se suspenso. Entre em contacto com o seu Personal Trainer."

---

## 3. `POST /personal-trainers/convites` (US-03)
Personal Trainer gera um link de convite temporário válido por 15 minutos com token criptográfico.
* **Acesso**: `ROLE_PERSONAL_TRAINER`
* **Headers**: `Authorization: Bearer <token_jwt>`, `Content-Type: application/json`

### Body (Request):
```json
{
  "modalidadeId": 1
}
```

### Respostas:
* **`201 Created`**:
  ```json
  {
    "token": "9f3e4c8d-12ab-4ef5-bc67-0123456789ab",
    "link": "http://localhost:5173/cadastro-aluno?token=9f3e4c8d-12ab-4ef5-bc67-0123456789ab",
    "expiraEm": "2026-10-15T18:15:00Z"
  }
  ```

---

## 4. `POST /auth/registro-aluno-convite` (US-04)
Auto-cadastro do aluno via link de convite recebido.
* **Acesso**: Público
* **Parâmetro de URL (Query Param)**: `token` (String obrigatória)
* **Headers**: `Content-Type: application/json`

### Body (Request):
```json
{
  "nome": "Mariana Atleta",
  "email": "mariana.atleta@example.com",
  "password": "senhaAluno123",
  "cpf": "98765432100",
  "celular": "11912345678"
}
```

### Respostas:
* **`201 Created`**: Retorna `AlunoResponseDTO` com status inicial `PENDENTE`.
* **`400 Bad Request`**: Convite expirado (> 15 minutos), convite já utilizado ou inativo.

---

## 5. Endpoints de Gestão de Alunos (`/personal-trainers/alunos/**`)
Todos requerem `ROLE_PERSONAL_TRAINER` e header `Authorization: Bearer <token_jwt>`.

### 5.1. Listar Alunos Vinculados (Ativos e Inativos) [Paginado]
* `GET /personal-trainers/alunos`
* **Query Params Opcionais**:
  * `page` (inteiro, padrão: 0): índice da página (base 0).
  * `size` (inteiro, padrão: 20): quantidade de registros por página (ex: `size=100` para listagem completa).
  * `sort` (string opcional): campo de ordenação (ex: `nome,asc`).
* **Resposta `200 OK`**: `PageResponse<AlunoResponseDTO>` (Spring Boot Page):
  ```json
  {
    "content": [
      {
        "id": "d2a1b3c4-e5f6-7890-abcd-ef1234567890",
        "nome": "Mariana Atleta",
        "email": "mariana.atleta@example.com",
        "cpf": "98765432100",
        "celular": "11912345678",
        "ativo": true,
        "status": "ATIVO",
        "modalidades": [
          {
            "id": 1,
            "nome": "Natação"
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

### 5.2. Listar Solicitações Pendentes de Aprovação [Paginado]
* `GET /personal-trainers/alunos/pendentes`
* **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20), `sort`
* **Resposta `200 OK`**: `PageResponse<AlunoResponseDTO>` contendo alunos com status `PENDENTE`.

### 5.3. Listar Alunos Inativos [Paginado]
* `GET /personal-trainers/alunos/inativos`
* **Query Params Opcionais**: `page` (padrão: 0), `size` (padrão: 20), `sort`
* **Resposta `200 OK`**: `PageResponse<AlunoResponseDTO>` contendo alunos desativados.

### 5.4. Aprovar Solicitação de Aluno
* `PATCH /personal-trainers/alunos/{alunoId}/aprovar`
* **Path Variable**: `alunoId` (UUID)
* **Resposta `200 OK`**: Retorna `AlunoResponseDTO` com `status: "ATIVO"`.

### 5.5. Recusar Solicitação de Aluno
* `PATCH /personal-trainers/alunos/{alunoId}/recusar`
* **Path Variable**: `alunoId` (UUID)
* **Resposta `200 OK`**:
  ```json
  {
    "mensagem": "Aluno recusado com sucesso."
  }
  ```
* **Efeito**: Remove o registro do aluno pendente e dispara e-mail notificando a recusa.

### 5.6. Desativar Aluno (US-05, RN-014)
* `PATCH /personal-trainers/alunos/{alunoId}/desativar`
* **Path Variable**: `alunoId` (UUID)
* **Resposta `200 OK`**:
  ```json
  {
    "mensagem": "Aluno desativado com sucesso."
  }
  ```
* **Regra de Negócio (RN-014)**: O aluno não é apagado (histórico preservado integralmente), mas perde imediatamente o acesso de login, não recebe novos treinos e fica de fora de listas de seleção rápida.

### 5.7. Reativar Aluno (US-05)
* `PATCH /personal-trainers/alunos/{alunoId}/reativar`
* **Path Variable**: `alunoId` (UUID)
* **Resposta `200 OK`**:
  ```json
  {
    "mensagem": "Aluno reativado com sucesso."
  }
  ```
