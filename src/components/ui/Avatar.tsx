import React, { useState } from "react";
import { View, Text, Image, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts } from "@/src/theme/tokens";

export interface AvatarProps {
  name: string;
  initials?: string;
  src?: string;
  size?: "sm" | "md" | "lg" | number;
  tone?: "primary" | "info";
  style?: StyleProp<ViewStyle>;
}

export default function Avatar({
  name,
  initials,
  src,
  size = "md",
  tone = "primary",
  style,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Calcula iniciais caso não fornecidas explicitamente
  const computedInitials =
    initials ||
    (() => {
      const words = name.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return "?";
      if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    })();

  // Resolução de dimensões
  const dimension =
    typeof size === "number"
      ? size
      : size === "sm"
      ? 36
      : size === "lg"
      ? 64
      : 48;

  const fontSize = dimension * 0.4;
  const isInfo = tone === "info";

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: isInfo ? colors.info.light : colors.primary[50],
        },
        style,
      ]}
    >
      {src && !imageError ? (
        <Image
          source={{ uri: src }}
          onError={() => setImageError(true)}
          style={[
            styles.image,
            { width: dimension, height: dimension, borderRadius: dimension / 2 },
          ]}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize,
              color: isInfo ? colors.info.base : colors.primary[500],
            },
          ]}
        >
          {computedInitials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    resizeMode: "cover",
  },
  initials: {
    fontFamily: fonts.bold,
  },
});
