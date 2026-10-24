import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Flame,
  Clock,
  Sparkles,
  Calendar,
  AlertTriangle,
  ChevronRight,
  User,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/contexts/AuthContext";
import { alunoService } from "@/src/services/alunoService";
import type {
  AlunoResponseDTO,
  RotinaTreinoResponseDTO,
  SessaoTreinoResponseDTO,
} from "@/src/types/student";
import { parseAtividades } from "@/src/utils/activityParser";
import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Button, Card, Badge, Avatar, SportTag } from "@/src/components/ui";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function AlunoHomeScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [perfil, setPerfil] = useState<AlunoResponseDTO | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<RotinaTreinoResponseDTO | null>(null);
  const [todaySession, setTodaySession] = useState<SessaoTreinoResponseDTO | null>(null);
  const [pendingRpeSession, setPendingRpeSession] = useState<SessaoTreinoResponseDTO | null>(null);

  async function loadDashboard() {
    try {
      // 1. Dados do Aluno & Personal
      const perfilData = await alunoService.obterMeuPerfil();
      setPerfil(perfilData);

      // 2. Rotinas & Treino Ativo
      const rotinas = await alunoService.listarRotinas();
      if (rotinas.length > 0) {
        const routine = rotinas[0];
        setActiveRoutine(routine);

        const plan = await alunoService.consultarPlanejamento(routine.id);
        const allSessions: SessaoTreinoResponseDTO[] = [];
        plan.semanas?.forEach((w) => allSessions.push(...w.sessoes));

        // Procura treino de hoje ou próximo em aberto
        const todayIso = new Date().toISOString().split("T")[0];
        const todayOrNext =
          allSessions.find((s) => s.dataPlanejada === todayIso) ||
          allSessions.find((s) => s.status === "PLANEJADA") ||
          allSessions[0] ||
          null;
        setTodaySession(todayOrNext);

        // Verifica se há treino recente concluído sem RPE informado
        const needsRpe = allSessions.find(
          (s) => s.status === "CONCLUIDA" && !s.desempenho?.nivelCansaco
        );
        setPendingRpeSession(needsRpe || null);
      }
    } catch {
      // Carregamento resiliente
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboard();
  }

  const parsedToday = parseAtividades(todaySession?.atividades);
  const studentName = perfil?.usuario.nome || "Atleta";
  const personalName = perfil?.nomePersonal || "Personal Trainer";

  // Dia da semana atual (0 = Dom, 1 = Seg...)
  const todayDayIdx = (new Date().getDay() + 6) % 7; // Ajusta para 0 = Seg

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Topbar com Identificação do Aluno */}
        <View style={styles.topbar}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => router.push("/(aluno)/perfil")}
            activeOpacity={0.8}
          >
            <Avatar name={studentName} size="md" tone="primary" />
            <View style={styles.userText}>
              <Text style={styles.greeting}>Olá, {studentName.split(" ")[0]}! 👋</Text>
              <Text style={styles.personalSubtitle}>Treinador: {personalName}</Text>
            </View>
          </TouchableOpacity>

          <Button
            variant="ghost"
            size="sm"
            icon={<Sparkles size={16} color={colors.primary[600]} />}
            onPress={() => router.push("/modal")}
            fullWidth={false}
          />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Carregando seu painel...</Text>
          </View>
        ) : (
          <>
            {/* Alerta de RPE Pendente (se houver) */}
            {pendingRpeSession && (
              <Card variant="elevated" padding="md" style={styles.rpeAlertCard}>
                <View style={styles.rpeAlertRow}>
                  <View style={styles.rpeAlertIcon}>
                    <AlertTriangle size={20} color={colors.warning.dark} />
                  </View>
                  <View style={styles.rpeAlertContent}>
                    <Text style={styles.rpeAlertTitle}>Avaliação de Esforço Pendente</Text>
                    <Text style={styles.rpeAlertDesc}>
                      Você concluiu uma sessão! Toque para registrar como se sentiu (escala de 1 a 10).
                    </Text>
                  </View>
                </View>
                <Button
                  title="Registrar Percepção de Esforço"
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push(`/(aluno)/treinos/${pendingRpeSession.id}`)}
                  style={styles.rpeAlertBtn}
                />
              </Card>
            )}

            {/* Destaque: Treino do Dia */}
            {todaySession ? (
              <Card variant="elevated" padding="lg" style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View style={styles.heroBadge}>
                    <Flame size={14} color={colors.primary[500]} />
                    <Text style={styles.heroBadgeText}>Treino de Hoje</Text>
                  </View>
                  <SportTag sport={activeRoutine?.modalidade?.nome} size="sm" />
                </View>

                <Text style={styles.heroTitle}>{parsedToday.sessionName}</Text>
                <Text style={styles.heroDesc}>
                  {parsedToday.activities.length} exercício(s) programado(s) para hoje.
                </Text>

                <View style={styles.heroMetaRow}>
                  <View style={styles.heroMetaItem}>
                    <Calendar size={14} color={colors.ink[400]} />
                    <Text style={styles.heroMetaText}>{todaySession.dataPlanejada}</Text>
                  </View>
                  {todaySession.duracao && (
                    <View style={styles.heroMetaItem}>
                      <Clock size={14} color={colors.ink[400]} />
                      <Text style={styles.heroMetaText}>{todaySession.duracao} min</Text>
                    </View>
                  )}
                </View>

                <Button
                  title={todaySession.status === "CONCLUIDA" ? "Ver Treino Realizado" : "Iniciar Treino Agora"}
                  variant="primary"
                  size="md"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/(aluno)/treinos/${todaySession.id}`);
                  }}
                  style={styles.heroActionBtn}
                />
              </Card>
            ) : (
              <Card variant="outlined" padding="lg" style={styles.noWorkoutCard}>
                <Text style={styles.noWorkoutTitle}>Nenhum treino para hoje 🎉</Text>
                <Text style={styles.noWorkoutDesc}>
                  Aproveite seu descanso ou confira as próximas semanas no menu de treinos.
                </Text>
              </Card>
            )}

            {/* Fita de Consistência Semanal */}
            <Card variant="outlined" padding="md" style={styles.adherenceCard}>
              <Text style={styles.adherenceTitle}>Frequência da Semana</Text>
              <View style={styles.weekStrip}>
                {WEEKDAYS.map((day, idx) => {
                  const isToday = idx === todayDayIdx;
                  return (
                    <View key={day} style={[styles.dayCol, isToday && styles.dayColToday]}>
                      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                        {day}
                      </Text>
                      <View style={[styles.dayDot, isToday && styles.dayDotToday]} />
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* Atalho Rápido para a Aba Treinos */}
            <TouchableOpacity
              style={styles.allWorkoutsRow}
              onPress={() => router.push("/(aluno)/treinos")}
              activeOpacity={0.8}
            >
              <View>
                <Text style={styles.allWorkoutsTitle}>Ver todas as semanas</Text>
                <Text style={styles.allWorkoutsSub}>
                  Rotina: {activeRoutine?.titulo || "Planejamento ativo"}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.primary[500]} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
    flex: 1,
  },
  userText: {
    justifyContent: "center",
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
  },
  personalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
  },
  loadingBox: {
    paddingVertical: spacing.xxl * 2,
    alignItems: "center",
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: spacing.md,
  },
  rpeAlertCard: {
    backgroundColor: colors.warning.light,
    borderColor: colors.warning.base,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  rpeAlertRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rpeAlertIcon: {
    marginTop: 2,
  },
  rpeAlertContent: {
    flex: 1,
  },
  rpeAlertTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.warning.dark,
  },
  rpeAlertDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.warning.dark,
    marginTop: 2,
    lineHeight: 16,
  },
  rpeAlertBtn: {
    marginTop: spacing.xs,
  },
  heroCard: {
    marginBottom: spacing.base,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  heroBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.primary[500],
    marginLeft: 4,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
    marginBottom: 4,
  },
  heroDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[500],
    marginBottom: spacing.md,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroMetaText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  heroActionBtn: {
    marginTop: spacing.xs,
  },
  noWorkoutCard: {
    marginBottom: spacing.base,
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  noWorkoutTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: 4,
  },
  noWorkoutDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    textAlign: "center",
  },
  adherenceCard: {
    marginBottom: spacing.base,
  },
  adherenceTitle: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: spacing.md,
  },
  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCol: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radii.control,
  },
  dayColToday: {
    backgroundColor: colors.primary[50],
  },
  dayLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginBottom: 6,
  },
  dayLabelToday: {
    fontFamily: fonts.bold,
    color: colors.primary[500],
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ink[300],
  },
  dayDotToday: {
    backgroundColor: colors.primary[500],
  },
  allWorkoutsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  allWorkoutsTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.ink[900],
  },
  allWorkoutsSub: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
  },
});
