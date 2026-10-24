/**
 * Gymnasion Mobile App - Design Tokens
 * 
 * Mapeamento fiel das variáveis de estilo do Gymnasion v2 (Figma 409:4876)
 * para objetos TypeScript no React Native.
 */

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
    800: "#1e293b",
    700: "#334155", // Texto secundário
    600: "#475569",
    500: "#64748b", // Texto terciário / placeholders
    400: "#94a3b8", // Ícones inativos / bordas sutis
    300: "#cbd5e1", // Divisores
    200: "#e2e8f0",
    100: "#f1f5f9",
  },

  // Superfícies e Backgrounds
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

  // Modalidades Esportivas Oficiais
  sports: {
    natacao: { base: "#2e90fa", light: "#eff8ff", label: "Natação" },
    tenis: { base: "#65a30d", light: "#f3fce8", label: "Tênis" },
    academia: { base: "#7a5af8", light: "#f4f3ff", label: "Academia" },
    corrida: { base: "#e11d48", light: "#fff1f3", label: "Corrida" },
    ciclismo: { base: "#0e9384", light: "#f0fdf9", label: "Ciclismo" },
    funcional: { base: "#dc6803", light: "#fef6ee", label: "Funcional" },
  },
} as const;

export type SportKey = keyof typeof colors.sports;

export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extraBold: "PlusJakartaSans_800ExtraBold",
} as const;

export const typography = {
  sizes: {
    display: 34,
    title1: 28,
    title2: 22,
    cardTitle: 18,
    body: 16,
    caption: 14,
    tiny: 12,
  },
  lineHeights: {
    heading: 1.25,
    body: 1.45,
  },
} as const;

export const radii = {
  control: 10,  // Botões e inputs
  card: 16,     // Cartões de treino e métricas
  sheet: 24,    // Topo de Bottom Sheets e modais móveis
  pill: 999,    // Badges e SportTags
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

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
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;
