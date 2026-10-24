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
  TouchableOpacity,
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
  ChevronDown,
  Dumbbell,
  Copy,
  Check,
  Shield,
  Unlink,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Svg, { Path } from "react-native-svg";

import { useAuth } from "@/src/contexts/AuthContext";
import { authService } from "@/src/services/authService";
import { alunoService } from "@/src/services/alunoService";
import { stravaService } from "@/src/services/stravaService";
import type { UsuarioResponseDTO } from "@/src/types/auth";
import type { AlunoResponseDTO } from "@/src/types/student";
import type { StravaStatusResponse } from "@/src/types/strava";
import { colors, fonts, typography, radii, spacing, shadows } from "@/src/theme/tokens";
import { handleApiError } from "@/src/utils/handleApiError";
import { Button, FormField, Card, Avatar, Badge } from "@/src/components/ui";

function StravaLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.008 13.828h4.172"
        fill="#fc5200"
      />
    </Svg>
  );
}

export default function AlunoPerfilScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UsuarioResponseDTO | null>(null);
  const [alunoData, setAlunoData] = useState<AlunoResponseDTO | null>(null);

  // Integração com o Strava (US-14)
  const [stravaStatus, setStravaStatus] = useState<StravaStatusResponse | null>(null);
  const [loadingStrava, setLoadingStrava] = useState(true);
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [disconnectingStrava, setDisconnectingStrava] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);
  const [stravaSuccess, setStravaSuccess] = useState<string | null>(null);

  // Accordion de Alteração de Senha
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Estado de Cópia do ID
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [userData, alunoResp, stravaData] = await Promise.allSettled([
          authService.getMe(),
          alunoService.obterMeuPerfil(),
          stravaService.obterStatus(),
        ]);
        if (userData.status === "fulfilled") setProfile(userData.value);
        if (alunoResp.status === "fulfilled") setAlunoData(alunoResp.value);
        if (stravaData.status === "fulfilled") setStravaStatus(stravaData.value);
      } catch {
        // Fallback para dados da sessão se offline
      } finally {
        setLoadingStrava(false);
      }
    }
    loadData();
  }, []);

  async function handleCopyId() {
    const idToCopy = alunoData?.id || profile?.id || user?.id;
    if (!idToCopy) return;
    await Clipboard.setStringAsync(idToCopy);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  }

  function togglePasswordAccordion() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPasswordExpanded((prev) => !prev);
  }

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
      "Deseja realmente desconectar sua conta do Strava? As métricas registradas permanecerão no seu histórico.",
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
      setTimeout(() => {
        setPasswordExpanded(false);
        setPasswordSuccess(null);
      }, 2500);
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
      "Sair da Conta",
      "Deseja realmente encerrar sua sessão no aplicativo Gymnasion?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            logout();
          },
        },
      ]
    );
  }

  const displayName = alunoData?.usuario?.nome || profile?.nome || "Atleta Gymnasion";
  const displayEmail = alunoData?.usuario?.email || profile?.email || "atleta@gymnasion.com";
  const displayId = alunoData?.id || profile?.id || user?.id || "N/A";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Cabeçalho da Tela */}
          <View style={styles.pageHeader}>
            <Text style={styles.title}>Meu Perfil</Text>
            <Text style={styles.subtitle}>Sua conta de atleta e preferências</Text>
          </View>

          {/* ============================================================== */}
          {/* 1. HERO CARD: IDENTIFICAÇÃO DO ATLETA                           */}
          {/* ============================================================== */}
          <Card variant="elevated" padding="lg" style={styles.heroCard}>
            <View style={styles.heroIdentityRow}>
              <View style={styles.avatarWrapper}>
                <Avatar name={displayName} size="lg" tone="primary" />
              </View>

              <View style={styles.heroIdentityDetails}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {displayName}
                </Text>

                <View style={styles.heroBadgeRow}>
                  <Badge tone="success" icon={<UserCheck size={12} color={colors.success.dark} />}>
                    {alunoData?.status === "ATIVO" ? "Aluno Ativo" : "Atleta Gymnasion"}
                  </Badge>
                </View>

                <View style={styles.heroEmailRow}>
                  <Mail size={14} color={colors.ink[400]} />
                  <Text style={styles.heroEmailText} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bloco de Detalhes Esportivos (Treinador, Contato e Modalidades) */}
            {(alunoData?.nomePersonal || profile?.telefone || (alunoData?.modalidades && alunoData.modalidades.length > 0)) && (
              <View style={styles.heroDetailsBlock}>
                {alunoData?.nomePersonal && (
                  <View style={styles.heroDetailItem}>
                    <View style={styles.heroDetailIconBox}>
                      <Dumbbell size={14} color={colors.primary[500]} />
                    </View>
                    <View style={styles.heroDetailTextBox}>
                      <Text style={styles.heroDetailLabel}>Treinador Responsável</Text>
                      <Text style={styles.heroDetailValue} numberOfLines={1}>
                        {alunoData.nomePersonal}
                      </Text>
                    </View>
                  </View>
                )}

                {profile?.telefone && (
                  <View style={styles.heroDetailItem}>
                    <View style={styles.heroDetailIconBox}>
                      <Phone size={14} color={colors.ink[400]} />
                    </View>
                    <View style={styles.heroDetailTextBox}>
                      <Text style={styles.heroDetailLabel}>Telefone / Celular</Text>
                      <Text style={styles.heroDetailValue} numberOfLines={1}>
                        {profile.telefone}
                      </Text>
                    </View>
                  </View>
                )}

                {alunoData?.modalidades && alunoData.modalidades.length > 0 && (
                  <View style={styles.heroModalidadesRow}>
                    {alunoData.modalidades.map((mod) => (
                      <View key={mod.id} style={styles.modalidadePill}>
                        <Text style={styles.modalidadePillText}>{mod.nome}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Chip de Identificador da Conta com Cópia Rápida */}
            <TouchableOpacity
              style={styles.accountIdChip}
              onPress={handleCopyId}
              activeOpacity={0.7}
            >
              <Text style={styles.accountIdText} numberOfLines={1}>
                ID: {displayId.length > 20 ? `${displayId.slice(0, 8)}...${displayId.slice(-4)}` : displayId}
              </Text>
              <View style={styles.copyActionRow}>
                {copiedId ? (
                  <>
                    <Check size={13} color={colors.success.dark} />
                    <Text style={[styles.copyActionText, { color: colors.success.dark }]}>Copiado</Text>
                  </>
                ) : (
                  <>
                    <Copy size={13} color={colors.ink[400]} />
                    <Text style={styles.copyActionText}>Copiar</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Card>

          {/* ============================================================== */}
          {/* 2. CONEXÕES & INTEGRAÇÕES (STRAVA)                             */}
          {/* ============================================================== */}
          <Text style={styles.sectionCategoryHeading}>CONEXÕES & INTEGRAÇÕES</Text>

          <Card variant="elevated" padding="lg" style={styles.sectionCard}>
            <View style={styles.integrationHeader}>
              <View style={styles.stravaLogoBox}>
                <StravaLogo size={22} />
              </View>
              <View style={styles.integrationHeaderText}>
                <View style={styles.integrationTitleRow}>
                  <Text style={styles.integrationTitle}>Strava</Text>
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
                <Text style={styles.integrationSubtitle}>
                  Sincronização de ritmo, batimentos e treinos
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

            {/* Estado: Conectado e Ativo */}
            {stravaStatus?.conectado && !stravaStatus?.expirado ? (
              <View style={styles.stravaConnectedBox}>
                <View style={styles.stravaBadgePill}>
                  <Activity size={13} color="#fc5200" />
                  <Text style={styles.stravaBadgePillText}>Atleta Vinculado</Text>
                </View>

                {/* Nome do Atleta com quebra suave e sem overflow */}
                <Text style={styles.stravaAthleteName} numberOfLines={2}>
                  {stravaStatus.nomeAtleta || "Atleta Strava"}
                </Text>

                <Text style={styles.stravaConnectedDesc}>
                  Suas atividades esportivas recentes são carregadas automaticamente ao finalizar sessões para preenchimento de tempos, distâncias e batimentos em um toque.
                </Text>

                <Button
                  title="Desconectar Strava"
                  variant="secondary"
                  size="sm"
                  icon={<Unlink size={15} color={colors.ink[600]} />}
                  loading={disconnectingStrava}
                  onPress={handleDisconnectStrava}
                  style={styles.disconnectButton}
                />
              </View>
            ) : stravaStatus?.expirado ? (
              <View style={styles.stravaExpiredBox}>
                <View style={styles.warningHeaderRow}>
                  <AlertCircle size={18} color={colors.warning.dark} />
                  <Text style={styles.warningTitle}>Autorização Expirada</Text>
                </View>
                <Text style={styles.stravaExpiredText}>
                  Sua autorização de acesso às atividades do Strava expirou. Reconecte sua conta para continuar sincronizando seus treinos automaticamente.
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
                <Text style={styles.stravaDisconnectedText}>
                  Vincule sua conta do Strava para que suas corridas, pedaladas e natação preencham automaticamente seus resultados sem digitação manual.
                </Text>
                <Button
                  title="Conectar com Strava"
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

          {/* ============================================================== */}
          {/* 3. SEGURANÇA DA CONTA (ACCORDION EXPANSÍVEL)                   */}
          {/* ============================================================== */}
          <Text style={styles.sectionCategoryHeading}>SEGURANÇA DA CONTA</Text>

          <Card variant="elevated" padding="none" style={styles.accordionCard}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={togglePasswordAccordion}
              activeOpacity={0.7}
            >
              <View style={styles.accordionHeaderLeft}>
                <View style={styles.lockIconBox}>
                  <Lock size={18} color={colors.primary[500]} />
                </View>
                <View style={styles.accordionTitleBox}>
                  <Text style={styles.accordionTitle}>Alterar Senha de Acesso</Text>
                  <Text style={styles.accordionSubtitle}>
                    {passwordExpanded ? "Recolher formulário de alteração" : "Atualize sua credencial de login"}
                  </Text>
                </View>
              </View>
              <ChevronDown
                size={20}
                color={colors.ink[400]}
                style={{
                  transform: [{ rotate: passwordExpanded ? "180deg" : "0deg" }],
                }}
              />
            </TouchableOpacity>

            {/* Conteúdo do Formulário (Exibido apenas quando expandido) */}
            {passwordExpanded && (
              <View style={styles.accordionContent}>
                <View style={styles.accordionDivider} />

                <Text style={styles.passwordHintText}>
                  A nova senha deve ter no mínimo 8 caracteres e incluir letras maiúsculas, minúsculas e números.
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
                  placeholder="Mínimo 8 caracteres"
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
                  variant="primary"
                  size="md"
                  loading={submittingPassword}
                  onPress={handlePasswordChange}
                  style={styles.savePasswordBtn}
                />
              </View>
            )}
          </Card>

          {/* ============================================================== */}
          {/* 4. SOBRE O GYMNASION & INFORMAÇÕES DO APP                      */}
          {/* ============================================================== */}
          <Text style={styles.sectionCategoryHeading}>SOBRE O APLICATIVO</Text>

          <Card variant="elevated" padding="md" style={styles.aboutCard}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Plataforma</Text>
              <Text style={styles.aboutValue}>Gymnasion Mobile</Text>
            </View>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Versão</Text>
              <Text style={styles.aboutValue}>1.0.0 (Build 2026)</Text>
            </View>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Status da Conta</Text>
              <Badge tone="success">Ativo & Verificado</Badge>
            </View>
          </Card>

          {/* ============================================================== */}
          {/* 5. AÇÃO DE LOGOUT / ENCERRAMENTO                               */}
          {/* ============================================================== */}
          <View style={styles.logoutSection}>
            <Button
              title="Sair da Conta"
              variant="danger"
              size="md"
              icon={<LogOut size={18} color={colors.danger.dark} />}
              onPress={handleLogout}
              style={styles.logoutButton}
            />
          </View>
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
  pageHeader: {
    marginBottom: spacing.base,
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
  },

  /* ============================================================== */
  /* HERO CARD: IDENTIFICAÇÃO DO ATLETA                             */
  /* ============================================================== */
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
    ...shadows.card,
  },
  heroIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
  },
  avatarWrapper: {
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  heroIdentityDetails: {
    flex: 1,
  },
  heroName: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
  },
  heroBadgeRow: {
    flexDirection: "row",
    marginTop: 4,
    marginBottom: 6,
  },
  heroEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroEmailText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
    flex: 1,
  },

  /* Bloco Esportivo & Treinador */
  heroDetailsBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
    gap: spacing.sm,
  },
  heroDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroDetailIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  heroDetailTextBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroDetailLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  heroDetailValue: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.ink[900],
    flex: 1,
  },
  heroModalidadesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  modalidadePill: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  modalidadePillText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    color: colors.primary[600],
  },

  /* Chip de ID da Conta */
  accountIdChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountIdText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    flex: 1,
  },
  copyActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: spacing.sm,
  },
  copyActionText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    color: colors.ink[600],
  },

  /* ============================================================== */
  /* TÍTULOS DE CATEGORIA ESTILO APPLE SETTINGS                     */
  /* ============================================================== */
  sectionCategoryHeading: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },

  /* ============================================================== */
  /* INTEGRAÇÕES & STRAVA                                           */
  /* ============================================================== */
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
    ...shadows.card,
  },
  integrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  stravaLogoBox: {
    width: 44,
    height: 44,
    borderRadius: radii.control,
    backgroundColor: "#fff4ef",
    alignItems: "center",
    justifyContent: "center",
  },
  integrationHeaderText: {
    flex: 1,
  },
  integrationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  integrationTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  integrationSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 1,
  },

  /* Strava Conectado: 100% Responsivo */
  stravaConnectedBox: {
    backgroundColor: "#f8fafc",
    borderRadius: radii.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  stravaBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff4ef",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  stravaBadgePillText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    color: "#fc5200",
  },
  stravaAthleteName: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: 6,
    flexWrap: "wrap",
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

  /* Strava Desconectado */
  stravaDisconnectedBox: {
    marginTop: spacing.xs,
  },
  stravaDisconnectedText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  stravaConnectButton: {
    backgroundColor: "#fc5200",
  },

  /* Strava Expirado */
  stravaExpiredBox: {
    backgroundColor: colors.warning.light,
    borderRadius: radii.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning.base,
    marginTop: spacing.xs,
  },
  warningHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  warningTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.warning.dark,
  },
  stravaExpiredText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.warning.dark,
    lineHeight: 18,
    marginBottom: spacing.md,
  },

  /* ============================================================== */
  /* SEGURANÇA DA CONTA (ACCORDION)                                 */
  /* ============================================================== */
  accordionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
    overflow: "hidden",
    ...shadows.card,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.base,
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  lockIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  accordionTitleBox: {
    flex: 1,
  },
  accordionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  accordionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
  },
  accordionContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: colors.ink[100],
    marginBottom: spacing.md,
  },
  passwordHintText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    lineHeight: 18,
    marginBottom: spacing.base,
  },
  savePasswordBtn: {
    marginTop: spacing.xs,
  },

  /* ============================================================== */
  /* SOBRE O GYMNASION                                              */
  /* ============================================================== */
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  aboutLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  aboutValue: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.ink[800],
  },
  aboutDivider: {
    height: 1,
    backgroundColor: colors.ink[100],
    marginVertical: 4,
  },

  /* ============================================================== */
  /* BANNERS DE FEEDBACK                                            */
  /* ============================================================== */
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

  /* ============================================================== */
  /* LOGOUT                                                         */
  /* ============================================================== */
  logoutSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  logoutButton: {
    marginTop: 0,
  },
});
