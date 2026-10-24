import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import Button from "./Button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Icon size={32} color={colors.primary[500]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          variant="secondary"
          size="sm"
          onPress={onAction}
          style={styles.actionButton}
          fullWidth={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    marginVertical: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    textAlign: "center",
    marginBottom: 6,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[500],
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actionButton: {
    marginTop: spacing.xs,
  },
});
