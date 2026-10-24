import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/contexts/AuthContext";
import { colors, fonts, typography } from "@/src/theme/tokens";
import { isAluno, isPersonal } from "@/src/types/auth";

export default function Index() {
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/(auth)/login");
    } else if (isAluno(user.role)) {
      router.replace("/(aluno)");
    } else if (isPersonal(user.role)) {
      router.replace("/(personal)");
    } else {
      router.replace("/(auth)/login");
    }
  }, [isLoading, isAuthenticated, user]);

  return (
    <View style={styles.container}>
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>G</Text>
        </View>
        <Text style={styles.title}>gymnasion</Text>
        <Text style={styles.subtitle}>Carregando seu ambiente...</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary[500]} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  brandContainer: {
    alignItems: "center",
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  logoBadgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    color: colors.surface,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[500],
    marginTop: 8,
  },
  spinner: {
    marginTop: 32,
  },
});
