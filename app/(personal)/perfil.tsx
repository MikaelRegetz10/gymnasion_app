import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  LogOut,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/contexts/AuthContext";
import { authService } from "@/src/services/authService";
import type { UsuarioResponseDTO } from "@/src/types/auth";
import { colors, fonts, typography, radii, spacing } from "@/src/theme/tokens";
import { handleApiError } from "@/src/utils/handleApiError";
import { Button, FormField, Card, Avatar, Badge } from "@/src/components/ui";

export default function PersonalPerfilScreen() {
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
        // Usa dados da sessão caso falhe
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

  function handleLogout() {
    Alert.alert(
      "Sair do Aplicativo",
      "Deseja realmente encerrar sua sessão?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  }

  const displayName = profile?.nome || "Personal Trainer";
  const displayEmail = profile?.email || "treinador@gymnasion.com";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Topbar */}
          <View style={styles.topbar}>
            <Text style={styles.topbarTitle}>Meu Perfil</Text>
          </View>

          {/* Card de Identificação */}
          <Card variant="elevated" padding="lg" style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <Avatar name={displayName} size="lg" tone="info" />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <View style={styles.badgeRow}>
                  <Badge
                    tone="info"
                    icon={<ShieldCheck size={12} color={colors.info.base} />}
                  >
                    Personal Trainer
                  </Badge>
                </View>
              </View>
            </View>

            <View style={styles.contactList}>
              <View style={styles.contactItem}>
                <Mail size={16} color={colors.ink[400]} />
                <Text style={styles.contactText}>{displayEmail}</Text>
              </View>
              {profile?.telefone && (
                <View style={styles.contactItem}>
                  <Phone size={16} color={colors.ink[400]} />
                  <Text style={styles.contactText}>{profile.telefone}</Text>
                </View>
              )}
            </View>

            <View style={styles.accountFooter}>
              <Text style={styles.accountIdText}>
                ID da Conta: {user?.id || profile?.id || "N/A"}
              </Text>
            </View>
          </Card>

          {/* Atalho Design System */}
          <Card variant="outlined" padding="md" style={styles.designSystemCard}>
            <View style={styles.designSystemRow}>
              <View style={styles.designSystemIconBadge}>
                <Sparkles size={20} color={colors.primary[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.designSystemTitle}>Design System Gymnasion</Text>
                <Text style={styles.designSystemDesc}>
                  Acesse o mostruário visual de componentes e tokens do app.
                </Text>
              </View>
              <Button
                title="Abrir"
                variant="secondary"
                size="sm"
                onPress={() => router.push("/modal")}
                fullWidth={false}
              />
            </View>
          </Card>

          {/* Alteração de Senha */}
          <Card variant="outlined" padding="lg" style={styles.passwordCard}>
            <View style={styles.passwordHeader}>
              <Lock size={18} color={colors.primary[500]} />
              <Text style={styles.cardSectionTitle}>Alterar Senha</Text>
            </View>
            <Text style={styles.passwordDesc}>
              Sua nova senha deve conter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos (RN-002).
            </Text>

            {passwordSuccess && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={18} color={colors.success.dark} />
                <Text style={styles.successBannerText}>{passwordSuccess}</Text>
              </View>
            )}

            {passwordError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color={colors.danger.dark} />
                <Text style={styles.errorBannerText}>{passwordError}</Text>
              </View>
            )}

            <FormField
              label="Senha Atual"
              placeholder="Digite sua senha atual"
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              isPassword
            />

            <FormField
              label="Nova Senha"
              placeholder="Mínimo de 8 caracteres"
              value={novaSenha}
              onChangeText={setNovaSenha}
              isPassword
              hint="Ex: Gym@2026! segura"
            />

            <FormField
              label="Confirmar Nova Senha"
              placeholder="Repita a nova senha"
              value={confirmacaoSenha}
              onChangeText={setConfirmacaoSenha}
              isPassword
            />

            <Button
              title="Salvar Nova Senha"
              variant="primary"
              size="md"
              loading={submittingPassword}
              onPress={handlePasswordChange}
              style={styles.savePasswordBtn}
            />
          </Card>

          {/* Botão de Logout */}
          <Button
            title="Sair da Conta"
            variant="danger"
            size="lg"
            icon={<LogOut size={18} color={colors.danger.base} />}
            onPress={handleLogout}
            style={styles.logoutBtn}
          />
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
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  topbar: {
    marginBottom: spacing.xs,
  },
  topbarTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
  },
  profileCard: {
    backgroundColor: colors.surface,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
  },
  contactList: {
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  contactText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
  },
  accountFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
  accountIdText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
  },
  designSystemCard: {
    backgroundColor: colors.surface,
  },
  designSystemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  designSystemIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.control,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  designSystemTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.ink[900],
  },
  designSystemDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
  },
  passwordCard: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  passwordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  passwordDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  savePasswordBtn: {
    marginTop: spacing.xs,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.success.light,
    padding: spacing.md,
    borderRadius: radii.control,
  },
  successBannerText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.success.dark,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.danger.light,
    padding: spacing.md,
    borderRadius: radii.control,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.danger.dark,
  },
  logoutBtn: {
    marginTop: spacing.sm,
  },
});
