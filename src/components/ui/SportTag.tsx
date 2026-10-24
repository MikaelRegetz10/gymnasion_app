import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import {
  Waves,
  CircleDot,
  Dumbbell,
  Footprints,
  Bike,
  Target,
  Activity,
  type LucideIcon,
} from "lucide-react-native";
import { colors, fonts, radii, typography, type SportKey } from "@/src/theme/tokens";

export interface SportTagProps {
  sport?: string | null;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

const sportConfig: Record<
  SportKey,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  natacao: {
    label: "Natação",
    icon: Waves,
    color: colors.sports.natacao.base,
    bg: colors.sports.natacao.light,
  },
  tenis: {
    label: "Tênis",
    icon: CircleDot,
    color: colors.sports.tenis.base,
    bg: colors.sports.tenis.light,
  },
  academia: {
    label: "Academia",
    icon: Dumbbell,
    color: colors.sports.academia.base,
    bg: colors.sports.academia.light,
  },
  corrida: {
    label: "Corrida",
    icon: Footprints,
    color: colors.sports.corrida.base,
    bg: colors.sports.corrida.light,
  },
  ciclismo: {
    label: "Ciclismo",
    icon: Bike,
    color: colors.sports.ciclismo.base,
    bg: colors.sports.ciclismo.light,
  },
  funcional: {
    label: "Funcional",
    icon: Target,
    color: colors.sports.funcional.base,
    bg: colors.sports.funcional.light,
  },
};

export default function SportTag({ sport, size = "md", style }: SportTagProps) {
  const rawLabel = sport?.trim() || "Modalidade";
  const normalizedKey = rawLabel
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase() as SportKey;

  const config = sportConfig[normalizedKey] || {
    label: rawLabel,
    icon: Activity,
    color: colors.ink[700],
    bg: colors.ink[300],
  };

  const IconComponent = config.icon;
  const iconSize = size === "sm" ? 11 : 13;

  return (
    <View
      style={[
        styles.tag,
        size === "sm" ? styles.tag_sm : styles.tag_md,
        { backgroundColor: config.bg },
        style,
      ]}
    >
      <IconComponent size={iconSize} color={config.color} style={styles.icon} />
      <Text
        style={[
          styles.text,
          size === "sm" ? styles.text_sm : styles.text_md,
          { color: config.color },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  tag_sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tag_md: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontFamily: fonts.semiBold,
  },
  text_sm: {
    fontSize: typography.sizes.tiny,
  },
  text_md: {
    fontSize: typography.sizes.caption,
  },
});
