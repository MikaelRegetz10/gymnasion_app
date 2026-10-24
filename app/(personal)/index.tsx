import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Users,
  UserCheck,
  Layers,
  Activity,
  UserPlus,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
} from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Avatar, Badge, Button, Card, EmptyState, SportTag } from "@/src/components/ui";
import { personalService } from "@/src/services/personalService";
import type { AlunoResponseDTO, RotinaTreinoResponseDTO } from "@/src/types/student";
import type {
  PersonalNotificationDTO,
  ResumoPendenciasResponseDTO,
  TurmaResponseDTO,
  UsuarioPerfilResponseDTO,
} from "@/src/types/personal";
import InviteModal from "@/src/components/personal/InviteModal";

export default function PersonalDashboardScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  // Estados dos dados da API
  const [perfil, setPerfil] = useState<UsuarioPerfilResponseDTO | null>(null);
  const [alunosAtivos, setAlunosAtivos] = useState<AlunoResponseDTO[]>([]);
  const [alunosPendentes, setAlunosPendentes] = useState<AlunoResponseDTO[]>([]);
  const [turmas, setTurmas] = useState<TurmaResponseDTO[]>([]);
  const [rotinas, setRotinas] = useState<RotinaTreinoResponseDTO[]>([]);
  const [pendencias, setPendencias] = useState<ResumoPendenciasResponseDTO | null>(null);
  const [notificacoes, setNotificacoes] = useState<PersonalNotificationDTO[]>([]);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const [
        resPerfil,
        resAtivos,
        resPendentes,
        resTurmas,
        resRotinas,
        resPendencias,
        resNotificacoes,
      ] = await Promise.allSettled([
        personalService.obterMeuPerfil(),
        personalService.listarAlunos(),
        personalService.listarAlunosPendentes(),
        personalService.listarTurmas(),
        personalService.listarRotinas(),
        personalService.obterResumoPendencias(),
        personalService.listarNotificacoes(),
      ]);

      if (resPerfil.status === "fulfilled") setPerfil(resPerfil.value);
      if (resAtivos.status === "fulfilled") setAlunosAtivos(resAtivos.value);
      if (resPendentes.status === "fulfilled") setAlunosPendentes(resPendentes.value);
      if (resTurmas.status === "fulfilled") setTurmas(resTurmas.value);
      if (resRotinas.status === "fulfilled") setRotinas(resRotinas.value);
      if (resPendencias.status === "fulfilled") setPendencias(resPendencias.value);
      if (resNotificacoes.status === "fulfilled") setNotificacoes(resNotificacoes.value);
    } catch (err) {
      console.warn("Erro ao carregar dados do dashboard do personal:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarDados();
  }, [carregarDados]);

  // Alunos ativos sem rotina atribuída
  const alunosSemRotina = alunosAtivos.filter((aluno) => {
    return !rotinas.some(
      (rotina) =>
        rotina.status !== "ENCERRADA" &&
        rotina.alunos?.some((a) => a.id === aluno.id)
    );
  });

  // Ações de Aprovação / Recusa
  async function handleAprovar(aluno: AlunoResponseDTO) {
    try {
      setMutatingId(aluno.id);
      await personalService.aprovarAluno(aluno.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Sucesso", `${aluno.usuario.nome} foi aprovado(a) como atleta ativo!`);
      carregarDados();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Não foi possível aprovar a solicitação.");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleRecusar(aluno: AlunoResponseDTO) {
    Alert.alert(
      "Recusar Solicitação",
      `Tem certeza que deseja recusar o cadastro de ${aluno.usuario.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Recusar",
          style: "destructive",
          onPress: async () => {
            try {
              setMutatingId(aluno.id);
              await personalService.recusarAluno(aluno.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Solicitação Recusada", "O cadastro pendente foi removido.");
              carregarDados();
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Erro", "Não foi possível recusar o cadastro.");
            } finally {
              setMutatingId(null);
            }
          },
        },
      ]
    );
  }

  // Notificações não lidas
  const naoLidas = notificacoes.filter((n) => !n.lida);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Topbar */}
        <View style={styles.topbar}>
          <View style={styles.userInfo}>
            <Avatar
              name={perfil?.nome || "Personal Trainer"}
              size="md"
              tone="info"
            />
            <View style={styles.userText}>
              <Text style={styles.greeting}>
                Olá, {perfil?.nome ? perfil.nome.split(" ")[0] : "Treinador"}
              </Text>
              <Badge
                tone="info"
                icon={<ShieldCheck size={12} color={colors.info.base} />}
                style={styles.roleBadge}
              >
                Personal Trainer
              </Badge>
            </View>
          </View>

          <View style={styles.topbarActions}>
            <TouchableOpacity
              onPress={() => setInviteModalVisible(true)}
              style={styles.iconButton}
              hitSlop={8}
            >
              <UserPlus size={20} color={colors.primary[600]} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Carregando painel do treinador...</Text>
          </View>
        ) : (
          <>
            {/* Grid de Estatísticas (2x2) */}
            <View style={styles.statsGrid}>
              {/* Alunos Ativos */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/(personal)/alunos" as any)}
                style={styles.statCard}
              >
                <View style={[styles.statIconBadge, { backgroundColor: colors.primary[50] }]}>
                  <Users size={20} color={colors.primary[600]} />
                </View>
                <Text style={styles.statNumber}>{alunosAtivos.length}</Text>
                <Text style={styles.statLabel}>Alunos Ativos</Text>
              </TouchableOpacity>

              {/* Alunos Pendentes */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/(personal)/alunos" as any)}
                style={styles.statCard}
              >
                <View
                  style={[
                    styles.statIconBadge,
                    {
                      backgroundColor:
                        alunosPendentes.length > 0 ? colors.warning.light : colors.ink[100],
                    },
                  ]}
                >
                  <UserCheck
                    size={20}
                    color={
                      alunosPendentes.length > 0 ? colors.warning.base : colors.ink[500]
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.statNumber,
                    alunosPendentes.length > 0 && { color: colors.warning.dark },
                  ]}
                >
                  {alunosPendentes.length}
                </Text>
                <Text style={styles.statLabel}>Aprovações Pendentes</Text>
              </TouchableOpacity>

              {/* Turmas Cadastradas */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/(personal)/turmas" as any)}
                style={styles.statCard}
              >
                <View style={[styles.statIconBadge, { backgroundColor: colors.info.light }]}>
                  <Layers size={20} color={colors.info.base} />
                </View>
                <Text style={styles.statNumber}>{turmas.length}</Text>
                <Text style={styles.statLabel}>Turmas de Atletas</Text>
              </TouchableOpacity>

              {/* Pendências de Métricas */}
              <View style={styles.statCard}>
                <View style={[styles.statIconBadge, { backgroundColor: colors.danger.light }]}>
                  <Activity size={20} color={colors.danger.base} />
                </View>
                <Text style={styles.statNumber}>
                  {pendencias?.totalAlunosComPendencias ?? 0}
                </Text>
                <Text style={styles.statLabel}>Pendências de Métricas</Text>
              </View>
            </View>

            {/* Banner de Ação Rápida: Novo Convite */}
            <Card variant="elevated" padding="md" style={styles.actionBanner}>
              <View style={styles.actionBannerContent}>
                <View style={styles.actionBannerText}>
                  <Text style={styles.actionBannerTitle}>Convidar Novo Aluno</Text>
                  <Text style={styles.actionBannerDesc}>
                    Gere um link temporário para o atleta criar a conta já vinculado a você.
                  </Text>
                </View>
                <Button
                  title="Convidar"
                  variant="primary"
                  size="sm"
                  icon={<UserPlus size={16} color={colors.surface} />}
                  onPress={() => setInviteModalVisible(true)}
                  fullWidth={false}
                />
              </View>
            </Card>

            {/* Seção: Aprovações Pendentes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Solicitações de Alunos</Text>
                {alunosPendentes.length > 0 && (
                  <Badge tone="warning" showDot>
                    {alunosPendentes.length} pendente(s)
                  </Badge>
                )}
              </View>

              {alunosPendentes.length === 0 ? (
                <Card variant="outlined" padding="md" style={styles.emptyCard}>
                  <CheckCircle size={24} color={colors.success.base} />
                  <Text style={styles.emptyCardText}>
                    Tudo em dia! Nenhuma solicitação de aluno aguardando aprovação.
                  </Text>
                </Card>
              ) : (
                alunosPendentes.map((aluno) => {
                  const isMutating = mutatingId === aluno.id;
                  return (
                    <Card key={aluno.id} variant="outlined" padding="md" style={styles.pendingCard}>
                      <View style={styles.pendingHeader}>
                        <Avatar name={aluno.usuario.nome} size="sm" />
                        <View style={styles.pendingInfo}>
                          <Text style={styles.pendingName}>{aluno.usuario.nome}</Text>
                          <Text style={styles.pendingEmail}>{aluno.usuario.email}</Text>
                        </View>
                      </View>

                      {aluno.modalidades.length > 0 && (
                        <View style={styles.modalidadesRow}>
                          {aluno.modalidades.map((m) => (
                            <SportTag key={m.id} sport={m.nome} size="sm" />
                          ))}
                        </View>
                      )}

                      <View style={styles.pendingActions}>
                        <Button
                          title="Aprovar"
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle size={14} color={colors.surface} />}
                          loading={isMutating}
                          disabled={Boolean(mutatingId)}
                          onPress={() => handleAprovar(aluno)}
                          style={{ flex: 1 }}
                        />
                        <Button
                          title="Recusar"
                          variant="danger"
                          size="sm"
                          icon={<XCircle size={14} color={colors.danger.base} />}
                          disabled={Boolean(mutatingId)}
                          onPress={() => handleRecusar(aluno)}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </Card>
                  );
                })
              )}
            </View>

            {/* Seção: Alerta de Alunos Sem Rotina Ativa */}
            {alunosSemRotina.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Alunos sem Rotina Ativa</Text>
                  <Badge tone="danger" showDot>
                    {alunosSemRotina.length} sem treino
                  </Badge>
                </View>

                <Card variant="outlined" padding="md" style={styles.noRoutineCard}>
                  <View style={styles.noRoutineHeader}>
                    <AlertTriangle size={20} color={colors.danger.base} />
                    <Text style={styles.noRoutineText}>
                      Estes atletas estão ativos mas não têm rotina vinculada:
                    </Text>
                  </View>

                  <View style={styles.noRoutineList}>
                    {alunosSemRotina.slice(0, 3).map((aluno) => (
                      <TouchableOpacity
                        key={aluno.id}
                        onPress={() => router.push(`/(personal)/alunos/${aluno.id}` as any)}
                        style={styles.noRoutineItem}
                      >
                        <Avatar name={aluno.usuario.nome} size="sm" />
                        <Text style={styles.noRoutineName}>{aluno.usuario.nome}</Text>
                        <ChevronRight size={16} color={colors.ink[400]} />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {alunosSemRotina.length > 3 && (
                    <TouchableOpacity
                      onPress={() => router.push("/(personal)/alunos" as any)}
                      style={styles.seeMoreBtn}
                    >
                      <Text style={styles.seeMoreText}>
                        Ver mais {alunosSemRotina.length - 3} alunos sem rotina
                      </Text>
                    </TouchableOpacity>
                  )}
                </Card>
              </View>
            )}

            {/* Seção: Notificações Recentes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Notificações Recentes</Text>
                {naoLidas.length > 0 && (
                  <Badge tone="info" showDot>
                    {naoLidas.length} nova(s)
                  </Badge>
                )}
              </View>

              {notificacoes.length === 0 ? (
                <EmptyState
                  title="Nenhuma notificação"
                  description="Você receberá alertas aqui quando os alunos executarem treinos ou enviarem dados."
                  icon={Bell}
                />
              ) : (
                notificacoes.slice(0, 4).map((notif) => (
                  <Card
                    key={notif.id}
                    variant={notif.lida ? "flat" : "elevated"}
                    padding="sm"
                    style={[
                      styles.notifCard,
                      !notif.lida && { borderLeftWidth: 3, borderLeftColor: colors.primary[500] },
                    ]}
                  >
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifTitle, !notif.lida && styles.notifTitleUnread]}>
                        {notif.titulo}
                      </Text>
                      <Text style={styles.notifMessage} numberOfLines={2}>
                        {notif.mensagem}
                      </Text>
                    </View>
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal de Convite */}
      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        onInviteGenerated={carregarDados}
      />
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
  },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  userText: {
    justifyContent: "center",
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
  },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  topbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  centerLoading: {
    paddingVertical: spacing.xxl * 2,
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  statNumber: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
  },
  actionBanner: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[100],
    marginBottom: spacing.xl,
  },
  actionBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  actionBannerText: {
    flex: 1,
  },
  actionBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  actionBannerDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.primary[600],
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  emptyCardText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
  },
  pendingCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  pendingEmail: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  modalidadesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  pendingActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  noRoutineCard: {
    backgroundColor: colors.surface,
  },
  noRoutineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  noRoutineText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
  },
  noRoutineList: {
    gap: spacing.sm,
  },
  noRoutineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  noRoutineName: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: typography.sizes.body,
    color: colors.ink[800],
  },
  seeMoreBtn: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  seeMoreText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.primary[600],
  },
  notifCard: {
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  notifContent: {
    gap: 2,
  },
  notifTitle: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
  },
  notifTitleUnread: {
    fontFamily: fonts.bold,
    color: colors.ink[900],
  },
  notifMessage: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },
});
