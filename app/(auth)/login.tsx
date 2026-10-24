import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Mail, Lock, AlertCircle, Clock } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/contexts/AuthContext";
import { colors, fonts, typography, radii, shadows, spacing } from "@/src/theme/tokens";
import { handleApiError, type ParsedApiError } from "@/src/utils/handleApiError";
import { Button, FormField, Card } from "@/src/components/ui";
import { isAluno } from "@/src/types/auth";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<ParsedApiError | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Contador regressivo para o bloqueio de 5 minutos (RN-010)
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  function formatLockout(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  async function handleLogin() {
    if (lockoutSeconds > 0) return;

    if (!email.trim() || !password) {
      setApiError({ message: "Por favor, preencha seu e-mail e sua senha." });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const response = await login({ email: email.trim(), password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (isAluno(response.role)) {
        router.replace("/(aluno)");
      } else {
        router.replace("/(personal)");
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const parsed = handleApiError(err, "Falha ao realizar login. Verifique suas credenciais.");
      setApiError(parsed);

      if (parsed.minutosRestantes !== undefined && parsed.minutosRestantes > 0) {
        setLockoutSeconds(parsed.minutosRestantes * 60);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isLockedOut = lockoutSeconds > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>G</Text>
          </View>
          <Text style={styles.brandTitle}>gymnasion</Text>
          <Text style={styles.brandSubtitle}>Entre na sua conta para continuar</Text>
        </View>

        <Card variant="elevated" padding="lg">
          <Text style={styles.cardTitle}>Acesse sua conta</Text>

          {/* Banner de Erro ou Bloqueio */}
          {apiError && (
            <View
              style={[
                styles.errorBanner,
                isLockedOut && styles.lockoutBanner,
              ]}
            >
              {isLockedOut ? (
                <Clock size={18} color={colors.warning.dark} />
              ) : (
                <AlertCircle size={18} color={colors.danger.base} />
              )}
              <View style={styles.errorTextContainer}>
                <Text
                  style={[
                    styles.errorBannerText,
                    isLockedOut && styles.lockoutBannerText,
                  ]}
                >
                  {apiError.message}
                </Text>
                {isLockedOut && (
                  <Text style={styles.countdownText}>
                    Aguarde {formatLockout(lockoutSeconds)} para tentar novamente.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Campo E-mail */}
          <FormField
            label="E-mail"
            placeholder="seu.email@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (apiError && !isLockedOut) setApiError(null);
            }}
            error={apiError?.invalidFields?.email}
            leftIcon={<Mail size={18} color={colors.ink[400]} />}
            editable={!isLockedOut}
          />

          {/* Campo Senha */}
          <FormField
            label="Senha"
            placeholder="Sua senha secreta"
            isPassword
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (apiError && !isLockedOut) setApiError(null);
            }}
            error={apiError?.invalidFields?.password}
            leftIcon={<Lock size={18} color={colors.ink[400]} />}
            editable={!isLockedOut}
          />

          {/* Link Esqueci Minha Senha */}
          <View style={styles.forgotPasswordContainer}>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/recuperar-senha")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
            </TouchableOpacity>
          </View>

          {/* Botão Entrar */}
          <Button
            title={isLockedOut ? `Bloqueado (${formatLockout(lockoutSeconds)})` : "Entrar no Gymnasion"}
            variant="primary"
            size="md"
            loading={submitting}
            disabled={isLockedOut}
            onPress={handleLogin}
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Gymnasion Mobile · Treinamento esportivo de alta performance
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadows.card,
  },
  logoBadgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    color: colors.surface,
  },
  brandTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[500],
    marginTop: 4,
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: spacing.lg,
  },
  errorBanner: {
    flexDirection: "row",
    backgroundColor: colors.danger.light,
    borderRadius: radii.control,
    padding: spacing.md,
    marginBottom: spacing.base,
    alignItems: "flex-start",
  },
  lockoutBanner: {
    backgroundColor: colors.warning.light,
    borderWidth: 1,
    borderColor: colors.warning.base,
  },
  errorTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  errorBannerText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.danger.dark,
  },
  lockoutBannerText: {
    color: colors.warning.dark,
  },
  countdownText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.warning.dark,
    marginTop: 4,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: spacing.base,
    marginTop: -spacing.xs,
  },
  forgotPasswordText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.primary[500],
  },
  submitButton: {
    marginTop: spacing.xs,
  },
  footer: {
    alignItems: "center",
    marginTop: spacing.xxl,
  },
  footerNote: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
    textAlign: "center",
  },
});
