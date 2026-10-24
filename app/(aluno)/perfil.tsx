import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  LogOut,
  UserCheck,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/contexts/AuthContext";
import { authService } from "@/src/services/authService";
import type { UsuarioResponseDTO } from "@/src/types/auth";
import { colors, fonts, typography, radii, spacing } from "@/src/theme/tokens";
import { handleApiError } from "@/src/utils/handleApiError";
import { Button, FormField, Card, Avatar, Badge } from "@/src/components/ui";

export default function AlunoPerfilScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UsuarioResponseDTO | null>(null);

  // Formulário de Alteração de Senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await authService.getMe();
        setProfile(data);
      } catch {
        // Usa dados da sessão se a requisição falhar offline
      }
    }
    loadProfile();
  }, []);

  async function handlePasswordChange() {
    if (!senhaAtual || !novaSenha || !confirmacaoSenha) {
      setPasswordError("Preencha todos os campos para alterar a senha.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (novaSenha !== confirmacaoSenha) {
      setPasswordError("A confirmação da nova senha não coincide.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (novaSenha.length < 8) {
      setPasswordError("A nova senha deve ter no mínimo 8 caracteres.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmittingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const response = await authService.alterarSenha({
        senhaAtual,
        novaSenha,
        confirmacaoSenha,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPasswordSuccess(response.mensagem || "Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacaoSenha("");
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const parsed = handleApiError(err, "Não foi possível alterar sua senha.");
      setPasswordError(parsed.message);
    } finally {
      setSubmittingPassword(false);
    }
  }

  const displayName = profile?.nome || "Atleta Gymnasion";
  const displayEmail = profile?.email || "atleta@gymnasion.com";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Meu Perfil</Text>
          <Text style={styles.subtitle}>Informações da sua conta e segurança</Text>

          {/* Cartão de Identificação do Aluno */}
          <Card variant="elevated" padding="lg" style={styles.profileCard}>
            <Avatar name={displayName} size="lg" tone="primary" />
            <Text style={styles.userName}>{displayName}</Text>

            <View style={styles.badgeWrapper}>
              <Badge tone="success" icon={<UserCheck size={12} color={colors.success.dark} />}>
                Aluno Ativo
              </Badge>
            </View>

            <View style={styles.infoRow}>
              <Mail size={16} color={colors.ink[400]} />
              <Text style={styles.infoText}>{displayEmail}</Text>
            </View>

            {profile?.telefone && (
              <View style={styles.infoRow}>
                <Phone size={16} color={colors.ink[400]} />
                <Text style={styles.infoText}>{profile.telefone}</Text>
              </View>
            )}

            <Text style={styles.userId}>ID: {user?.id || "N/A"}</Text>
          </Card>

          {/* Cartão de Alteração de Senha (RN-002) */}
          <Card variant="elevated" padding="lg" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Lock size={20} color={colors.primary[500]} />
              <Text style={styles.sectionTitle}>Alterar Senha</Text>
            </View>
            <Text style={styles.sectionDesc}>
              A senha deve conter no mínimo 8 caracteres, incluindo letras maiúsculas,
              minúsculas, números e caracteres especiais.
            </Text>

            {passwordSuccess && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={16} color={colors.success.base} />
                <Text style={styles.successText}>{passwordSuccess}</Text>
              </View>
            )}

            {passwordError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={colors.danger.base} />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            )}

            <FormField
              label="Senha Atual"
              placeholder="Digite sua senha atual"
              isPassword
              value={senhaAtual}
              onChangeText={setSenhaAtual}
            />

            <FormField
              label="Nova Senha"
              placeholder="Mínimo 8 caracteres fortes"
              isPassword
              value={novaSenha}
              onChangeText={setNovaSenha}
            />

            <FormField
              label="Confirmar Nova Senha"
              placeholder="Repita a nova senha"
              isPassword
              value={confirmacaoSenha}
              onChangeText={setConfirmacaoSenha}
            />

            <Button
              title="Salvar Nova Senha"
              variant="secondary"
              size="md"
              loading={submittingPassword}
              onPress={handlePasswordChange}
              style={styles.saveButton}
            />
          </Card>

          {/* Cartão de Sessão & Logout */}
          <Card variant="outlined" padding="md" style={styles.logoutCard}>
            <Button
              title="Sair da Conta"
              variant="danger"
              size="md"
              icon={<LogOut size={18} color={colors.danger.dark} />}
              onPress={logout}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[500],
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  profileCard: {
    alignItems: "center",
    marginBottom: spacing.base,
  },
  userName: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
    marginTop: spacing.md,
  },
  badgeWrapper: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 6,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[700],
  },
  userId: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
    marginTop: spacing.sm,
  },
  sectionCard: {
    marginBottom: spacing.base,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  sectionDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    lineHeight: 18,
    marginBottom: spacing.base,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success.light,
    padding: spacing.md,
    borderRadius: radii.control,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  successText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.success.dark,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.danger.light,
    padding: spacing.md,
    borderRadius: radii.control,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.danger.dark,
  },
  saveButton: {
    marginTop: spacing.xs,
  },
  logoutCard: {
    marginTop: spacing.xs,
  },
});
