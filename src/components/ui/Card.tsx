import React, { type ReactNode } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii, shadows, spacing } from "@/src/theme/tokens";

export interface CardProps {
  children: ReactNode;
  variant?: "elevated" | "outlined" | "flat";
  padding?: "none" | "sm" | "md" | "lg";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function Card({
  children,
  variant = "elevated",
  padding = "md",
  onPress,
  style,
}: CardProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.base,
        styles[variant],
        styles[`padding_${padding}`],
        variant === "elevated" && shadows.card,
        style,
      ]}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
  },
  elevated: {},
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  flat: {
    backgroundColor: colors.background,
  },

  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: spacing.sm,
  },
  padding_md: {
    padding: spacing.base,
  },
  padding_lg: {
    padding: spacing.xl,
  },
});
