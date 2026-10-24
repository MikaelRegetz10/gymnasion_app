import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
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
  Activity,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/contexts/AuthContext";
import { authService } from "@/src/services/authService";
import { stravaService } from "@/src/services/stravaService";
import type { UsuarioResponseDTO } from "@/src/types/auth";
import type { StravaStatusResponse } from "@/src/types/strava";
import { colors, fonts, typography, radii, spacing } from "@/src/theme/tokens";
import { handleApiError } from "@/src/utils/handleApiError";
import { Button, FormField, Card, Avatar, Badge } from "@/src/components/ui";

export default function AlunoPerfilScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UsuarioResponseDTO | null>(null);

  // Integração com o Strava (US-14)
  const [stravaStatus, setStravaStatus] = useState<StravaStatusResponse | null>(null);
  const [loadingStrava, setLoadingStrava] = useState(true);
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [disconnectingStrava, setDisconnectingStrava] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);
  const [stravaSuccess, setStravaSuccess] = useState<string | null>(null);

  // Formulário de Alteração de Senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [userData, stravaData] = await Promise.allSettled([
          authService.getMe(),
          stravaService.obterStatus(),
        ]);
        if (userData.status === "fulfilled") setProfile(userData.value);
        if (stravaData.status === "fulfilled") setStravaStatus(stravaData.value);
      } catch {
        // Usa dados da sessão se offline
      } finally {
        setLoadingStrava(false);
      }
    }
    loadData();
  }, []);

  async function handleConnectStrava() {
    setConnectingStrava(true);
    setStravaError(null);
    setStravaSuccess(null);
    try {
      const status = await stravaService.iniciarConexao();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStravaStatus(status);
      setStravaSuccess(
        status.nomeAtleta
          ? `Strava conectado com sucesso como ${status.nomeAtleta}!`
          : "Conta Strava conectada com sucesso!"
      );
    } catch (err: any) {
      if (err.message && err.message.includes("cancelada")) {
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const parsed = handleApiError(err, "Não foi possível conectar ao Strava.");
      setStravaError(parsed.message);
    } finally {
      setConnectingStrava(false);
    }
  }

  function handleDisconnectStrava() {
    Alert.alert(
      "Desconectar Strava",
      "Deseja realmente desconectar sua conta do Strava? As métricas já registradas permanecerão salvas no seu histórico.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desconectar",
          style: "destructive",
          onPress: async () => {
            setDisconnectingStrava(true);
            setStravaError(null);
            setStravaSuccess(null);
            try {
              await stravaService.desconectar();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setStravaStatus({ conectado: false, expirado: false, mock: false });
              setStravaSuccess("Conta Strava desconectada com sucesso.");
            } catch (err) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              const parsed = handleApiError(err, "Não foi possível desconectar o Strava.");
              setStravaError(parsed.message);
            } finally {
              setDisconnectingStrava(false);
            }
          },
        },
      ]
    );
  }

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

          {/* Integração com Strava (US-14) */}
          <Card variant="elevated" padding="lg" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.stravaIconBox}>
                <Activity size={20} color="#fc5200" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.stravaTitleRow}>
                  <Text style={styles.sectionTitle}>Strava</Text>
                  {loadingStrava ? (
                    <ActivityIndicator size="small" color="#fc5200" />
                  ) : stravaStatus?.conectado && !stravaStatus?.expirado ? (
                    <Badge tone="success" icon={<CheckCircle2 size={12} color={colors.success.dark} />}>
                      Conectado
                    </Badge>
                  ) : stravaStatus?.expirado ? (
                    <Badge tone="warning" icon={<AlertCircle size={12} color={colors.warning.dark} />}>
                      Expirado
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Desconectado</Badge>
                  )}
                </View>
                <Text style={styles.stravaSubtitle}>
                  Sincronização de treinos e métricas esportivas
                </Text>
              </View>
            </View>

            {stravaError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={colors.danger.base} />
                <Text style={styles.errorText}>{stravaError}</Text>
              </View>
            )}

            {stravaSuccess && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={16} color={colors.success.base} />
                <Text style={styles.successText}>{stravaSuccess}</Text>
              </View>
            )}

            {stravaStatus?.conectado && !stravaStatus?.expirado ? (
              <View style={styles.stravaConnectedBox}>
                <View style={styles.athleteInfoRow}>
                  <Text style={styles.athleteLabel}>Atleta conectado:</Text>
                  <Text style={styles.athleteName}>{stravaStatus.nomeAtleta || "Atleta Strava"}</Text>
                </View>
                <Text style={styles.stravaConnectedDesc}>
                  Suas atividades do Strava serão importadas automaticamente ao finalizar treinos para preencher distâncias, tempos e batimentos com um toque.
                </Text>
                <Button
                  title="Desconectar Strava"
                  variant="secondary"
                  size="sm"
                  loading={disconnectingStrava}
                  onPress={handleDisconnectStrava}
                  style={styles.disconnectButton}
                />
              </View>
            ) : stravaStatus?.expirado ? (
              <View style={styles.stravaExpiredBox}>
                <Text style={styles.stravaExpiredText}>
                  Sua conexão com o Strava expirou. Reconecte sua conta para continuar sincronizando automaticamente.
                </Text>
                <Button
                  title="Reconectar Strava"
                  variant="primary"
                  size="md"
                  loading={connectingStrava}
                  onPress={handleConnectStrava}
                  style={styles.stravaConnectButton}
                />
              </View>
            ) : (
              <View style={styles.stravaDisconnectedBox}>
                <Text style={styles.sectionDesc}>
                  Conecte sua conta do Strava para importar automaticamente o ritmo, frequência cardíaca, distância e tempo das suas corridas, pedaladas ou natação para suas sessões.
                </Text>
                <Button
                  title="Conectar Strava"
                  variant="primary"
                  size="md"
                  icon={<Zap size={18} color={colors.surface} />}
                  loading={connectingStrava}
                  onPress={handleConnectStrava}
                  style={styles.stravaConnectButton}
                />
              </View>
            )}
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

  /* Estilos da Integração Strava */
  stravaIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    backgroundColor: "#fff4ef",
    alignItems: "center",
    justifyContent: "center",
  },
  stravaTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stravaSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
  },
  stravaConnectedBox: {
    backgroundColor: colors.background,
    borderRadius: radii.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  athleteInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  athleteLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  athleteName: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  stravaConnectedDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  disconnectButton: {
    alignSelf: "flex-start",
  },
  stravaDisconnectedBox: {
    marginTop: 2,
  },
  stravaConnectButton: {
    backgroundColor: "#fc5200",
  },
  stravaExpiredBox: {
    backgroundColor: colors.warning.light,
    borderRadius: radii.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning.base,
  },
  stravaExpiredText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.warning.dark,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
});
