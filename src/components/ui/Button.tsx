import React, { type ReactNode } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radii, shadows, spacing } from "@/src/theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  title?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  haptics?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Button({
  title,
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  fullWidth = true,
  haptics = true,
  onPress,
  style,
  textStyle,
}: ButtonProps) {
  function handlePress() {
    if (disabled || loading) return;
    if (haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  }

  const spinnerColor =
    variant === "primary"
      ? colors.surface
      : variant === "danger"
      ? colors.danger.base
      : colors.primary[500];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        variant === "primary" && !disabled && shadows.sm,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <Text style={styles.iconLeft}>{icon}</Text>
          )}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`text_${size}`],
              textStyle,
            ]}
          >
            {title || children}
          </Text>
          {icon && iconPosition === "right" && (
            <Text style={styles.iconRight}>{icon}</Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.55,
  },

  // Variantes
  primary: {
    backgroundColor: colors.primary[500],
  },
  secondary: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.danger.light,
    borderWidth: 1,
    borderColor: colors.danger.base,
  },

  // Tamanhos
  sm: {
    height: 38,
    paddingHorizontal: spacing.md,
  },
  md: {
    height: 48,
    paddingHorizontal: spacing.base,
  },
  lg: {
    height: 54,
    paddingHorizontal: spacing.xl,
  },

  // Tipografia do texto
  text: {
    fontFamily: fonts.semiBold,
    textAlign: "center",
  },
  text_primary: {
    color: colors.surface,
  },
  text_secondary: {
    color: colors.primary[600],
  },
  text_ghost: {
    color: colors.ink[700],
  },
  text_danger: {
    color: colors.danger.dark,
  },

  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 14,
  },
  text_lg: {
    fontSize: 16,
  },

  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
