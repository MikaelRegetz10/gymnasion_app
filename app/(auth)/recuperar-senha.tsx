import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { KeyRound, Mail, ArrowLeft, CheckCircle2, Info } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { colors, fonts, typography, radii, shadows, spacing } from "@/src/theme/tokens";
import { Button, FormField, Card } from "@/src/components/ui";

export default function RecuperarSenhaScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSend() {
    if (!email.trim()) {
      setError("Por favor, digite seu e-mail cadastrado.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Informe um formato de e-mail válido.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setError(null);
    setSubmitting(true);

    // Simulação com delay para feedback visual ergonômico
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1200);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Botão Superior Voltar */}
        <View style={styles.topNav}>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            icon={<ArrowLeft size={18} color={colors.ink[700]} />}
            title="Voltar ao login"
            fullWidth={false}
          />
        </View>

        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <KeyRound size={28} color={colors.primary[500]} />
          </View>
          <Text style={styles.brandTitle}>Esqueceu sua senha?</Text>
          <Text style={styles.brandSubtitle}>
            Recupere o acesso à sua conta Gymnasion informando seu e-mail.
          </Text>
        </View>

        <Card variant="elevated" padding="lg">
          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={36} color={colors.success.base} />
              </View>
              <Text style={styles.successTitle}>Solicitação enviada!</Text>
              <Text style={styles.successDesc}>
                Se o e-mail <Text style={styles.highlightEmail}>{email}</Text> constar
                em nossa base, você receberá as instruções em instantes.
              </Text>

              <Button
                title="Ir para o Login"
                variant="primary"
                size="md"
                onPress={() => router.replace("/(auth)/login")}
                style={styles.returnButton}
              />
            </View>
          ) : (
            <>
              {/* Aviso Informativo do Sistema */}
              <View style={styles.noticeBox}>
                <Info size={18} color={colors.info.base} style={styles.noticeIcon} />
                <Text style={styles.noticeText}>
                  Um link temporário com instruções para criar uma nova senha será
                  enviado para sua caixa de entrada.
                </Text>
              </View>

              <FormField
                label="E-mail da sua conta"
                placeholder="seu.email@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (error) setError(null);
                }}
                error={error || undefined}
                leftIcon={<Mail size={18} color={colors.ink[400]} />}
                hint="Digite o e-mail que você usa para acessar o Gymnasion"
              />

              <Button
                title="Enviar link de recuperação"
                variant="primary"
                size="md"
                loading={submitting}
                onPress={handleSend}
                style={styles.submitButton}
              />

              <Button
                title="Cancelar e voltar"
                variant="ghost"
                size="sm"
                onPress={() => router.back()}
                style={styles.cancelButton}
              />
            </>
          )}
        </Card>
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
  topNav: {
    alignSelf: "flex-start",
    marginBottom: spacing.base,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadows.card,
  },
  brandTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
    textAlign: "center",
  },
  brandSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[500],
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  noticeBox: {
    flexDirection: "row",
    backgroundColor: colors.info.light,
    borderRadius: radii.control,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: "flex-start",
  },
  noticeIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
    lineHeight: 18,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success.light,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  successTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
    marginBottom: spacing.xs,
  },
  successDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  highlightEmail: {
    fontFamily: fonts.semiBold,
    color: colors.ink[900],
  },
  returnButton: {
    width: "100%",
  },
});
