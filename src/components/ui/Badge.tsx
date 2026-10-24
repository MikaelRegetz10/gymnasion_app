import React, { type ReactNode } from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info" | "primary";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  showDot?: boolean;
}

const toneStyles = {
  success: {
    bg: colors.success.light,
    text: colors.success.dark,
    dot: colors.success.base,
  },
  warning: {
    bg: colors.warning.light,
    text: colors.warning.dark,
    dot: colors.warning.base,
  },
  danger: {
    bg: colors.danger.light,
    text: colors.danger.dark,
    dot: colors.danger.base,
  },
  neutral: {
    bg: colors.ink[300],
    text: colors.ink[700],
    dot: colors.ink[500],
  },
  info: {
    bg: colors.info.light,
    text: colors.info.base,
    dot: colors.info.base,
  },
  primary: {
    bg: colors.primary[50],
    text: colors.primary[600],
    dot: colors.primary[500],
  },
};

export default function Badge({
  tone = "neutral",
  children,
  icon,
  style,
  textStyle,
  showDot = true,
}: BadgeProps) {
  const currentTone = toneStyles[tone];

  return (
    <View style={[styles.badge, { backgroundColor: currentTone.bg }, style]}>
      {icon ? (
        <View style={styles.iconContainer}>{icon}</View>
      ) : showDot ? (
        <View style={[styles.dot, { backgroundColor: currentTone.dot }]} />
      ) : null}
      <Text style={[styles.text, { color: currentTone.text }, textStyle]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    letterSpacing: 0.1,
  },
});
