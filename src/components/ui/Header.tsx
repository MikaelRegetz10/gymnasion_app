import React, { type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { colors, fonts, spacing, typography } from "@/src/theme/tokens";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  borderBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  borderBottom = false,
  style,
}: HeaderProps) {
  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }

  return (
    <View style={[styles.container, borderBottom && styles.borderBottom, style]}>
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.ink[900]} />
          </TouchableOpacity>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: spacing.md,
    padding: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
  },
  rightContainer: {
    marginLeft: spacing.md,
  },
});
