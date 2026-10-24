# Gymnasion Mobile App 📱🏋️

Aplicativo mobile oficial da plataforma **Gymnasion**, construído com **React Native**, **Expo SDK 58**, **Expo Router** e **TypeScript**.

O app consome a API REST Spring Boot oficial do ecossistema Gymnasion e traduz a identidade visual e ergonomia do produto para dispositivos móveis, com foco na experiência de alta performance tanto para alunos quanto para personal trainers.

---

## 🎯 Arquitetura & Stack Tecnológica

* **Framework:** React Native 0.88 + Expo SDK 58 (Expo Router v58).
* **Linguagem:** TypeScript 5.8 (tipagem estrita, 0 erros).
* **Tipografia Oficial:** *Plus Jakarta Sans* (400, 500, 600, 700, 800) via `@expo-google-fonts/plus-jakarta-sans`.
* **Design Tokens:** Tokens centralizados em `src/theme/tokens.ts` mapeando fielmente cores, tipografia, raios (`radii`), espaçamentos (`spacing`) e elevação/sombras (`shadows`) do Figma Gymnasion v2.
* **Ícones:** `lucide-react-native`.
* **Comunicação HTTP:** Axios com interceptors de JWT (`Bearer <token>`), renovação e tratamento de RFC 7807 (`ProblemDetail`).
* **Sessão & Segurança:** `expo-secure-store` para persistência encriptada de JWT e sessão de usuário.
* **Modo Treino Ativo:**
  * Tela sempre ligada via `expo-keep-awake`.
  * Cronômetro de descanso nativo com presets (30s a 120s) e feedback tátil (`expo-haptics`).
  * Notificações locais automáticas de término de descanso (`expo-notifications`).
* **Notificações:** `expo-notifications` configurado para lembrete diário de consistência e alertas locais.
* **Gráficos de Evolução:** Curvas SVG vetoriais suaves (`react-native-svg`) para RPE Borg CR-10 e métricas personalizadas.
* **Builds:** Configuração pronta para **EAS Build** (`eas.json`) para Android (APK/AAB) e iOS (IPA/TestFlight).

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
* Node.js (>= 20)
* Xcode (para simulador iOS no macOS) ou Android Studio (para emulador Android)
* Back-end Spring Boot executando na porta 8080 (`/api`)

### 2. Instalação e Configuração
```bash
# Entrar no diretório do app
cd ~/Documents/Projetos/gymnasion_app

# Instalar dependências (caso necessário)
npm install

# Copiar arquivo de ambiente
cp .env.example .env
```

> **Atenção à URL da API (`.env`):**
> * No **Simulador iOS**: use `http://localhost:8080`
> * No **Emulador Android**: use `http://10.0.2.2:8080`
> * No **Celular Físico (Expo Go)**: use o IP local da sua máquina, ex: `http://192.168.1.15:8080`

### 3. Iniciando o App
```bash
# Iniciar o servidor de desenvolvimento Expo
npx expo start

# Atalhos no terminal:
# Pressione 'i' para abrir diretamente no simulador iOS do Xcode
# Pressione 'a' para abrir no emulador Android
# Pressione 'r' para recarregar o bundle
```

---

## 📦 Como Gerar os Builds (EAS Build)

O projeto possui o arquivo `eas.json` pronto com os perfis `development`, `preview` e `production`:

```bash
# 1. Instalar o EAS CLI globalmente (caso não tenha)
npm install -g eas-cli

# 2. Login na conta Expo
eas login

# 3. Gerar APK de teste para Android (instalação direta sem loja)
eas build --platform android --profile preview

# 4. Gerar build para iOS Simulator
eas build --platform ios --profile preview

# 5. Gerar build de produção para as lojas (Google Play AAB e Apple App Store IPA)
eas build --platform all --profile production
```

---

## 📋 Status das Fases de Desenvolvimento

* [x] **Fase 1: Fundação & Setup do Ambiente Expo SDK 58**
* [x] **Fase 2: Componentes Core do Design System (Button, FormField, Badge, SportTag, Avatar, Card, EmptyState)**
* [x] **Fase 3: Autenticação, Gatekeeper, Bloqueio RN-010 & Recuperação de Senha**
* [x] **Fase 4: Área do Aluno (Home, Treinos, Modo ao Vivo, Borg CR-10, Evolução SVG, Perfil)**
* [x] **Fase 5: Área do Personal Trainer (Dashboard, Alunos, Convite 15min, Turmas, Rotinas, Perfil)**
* [x] **Fase 6: Polimento Mobile, Notificações (`expo-notifications`), Haptics & EAS Build**
