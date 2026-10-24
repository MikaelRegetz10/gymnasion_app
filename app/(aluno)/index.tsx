import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Activity,
  Flame,
  Heart,
  Layers,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Check,
  Info,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/src/contexts/AuthContext";
import { alunoService } from "@/src/services/alunoService";
import type {
  AlunoResponseDTO,
  RotinaTreinoResponseDTO,
  SessaoTreinoResponseDTO,
  DashboardEvolucaoResponseDTO,
  ObservacaoFeedbackResponseDTO,
  PlanejamentoRotinaResponseDTO,
} from "@/src/types/student";
import { parseAtividades } from "@/src/utils/activityParser";
import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Button, Card, Badge, Avatar, SportTag, SvgLineChart } from "@/src/components/ui";

const WEEKDAYS_LABELS = [
  { short: "S", full: "Seg" },
  { short: "T", full: "Ter" },
  { short: "Q", full: "Qua" },
  { short: "Q", full: "Qui" },
  { short: "S", full: "Sex" },
  { short: "S", full: "Sáb" },
  { short: "D", full: "Dom" },
];

function formatHeaderDate(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const day = now.toLocaleDateString("pt-BR", { day: "2-digit" });
  const month = now.toLocaleDateString("pt-BR", { month: "long" });
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized}, ${day} de ${month} · Bora treinar?`;
}

function parseDateBadge(dateIso?: string | null): { weekday: string; dayMonth: string } {
  if (!dateIso) return { weekday: "HOJE", dayMonth: "--/--" };
  try {
    const [year, month, day] = dateIso.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    const weekdayShort = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
    return {
      weekday: weekdayShort,
      dayMonth: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
    };
  } catch {
    return { weekday: "TREINO", dayMonth: dateIso };
  }
}

export default function AlunoHomeScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados dos Dados
  const [perfil, setPerfil] = useState<AlunoResponseDTO | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<RotinaTreinoResponseDTO | null>(null);
  const [planejamento, setPlanejamento] = useState<PlanejamentoRotinaResponseDTO | null>(null);
  const [evolucao, setEvolucao] = useState<DashboardEvolucaoResponseDTO | null>(null);
  const [feedbacks, setFeedbacks] = useState<ObservacaoFeedbackResponseDTO[]>([]);
  const [stravaStatus, setStravaStatus] = useState<{ conectado: boolean; expirado?: boolean; nomeAtleta?: string }>({ conectado: false });

  const [todaySession, setTodaySession] = useState<SessaoTreinoResponseDTO | null>(null);
  const [pendingRpeSession, setPendingRpeSession] = useState<SessaoTreinoResponseDTO | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [resPerfil, resRotinas, resEvolucao, resFeedbacks, resStrava] = await Promise.allSettled([
        alunoService.obterMeuPerfil(),
        alunoService.listarRotinas(),
        alunoService.consultarEvolucao(),
        alunoService.listarObservacoesEFeedbacks(),
        alunoService.obterStatusStrava(),
      ]);

      if (resPerfil.status === "fulfilled") setPerfil(resPerfil.value);
      if (resEvolucao.status === "fulfilled") setEvolucao(resEvolucao.value);
      if (resFeedbacks.status === "fulfilled") setFeedbacks(resFeedbacks.value);
      if (resStrava.status === "fulfilled") setStravaStatus(resStrava.value);

      if (resRotinas.status === "fulfilled" && resRotinas.value.length > 0) {
        const routine = resRotinas.value[0];
        setActiveRoutine(routine);

        try {
          const plan = await alunoService.consultarPlanejamento(routine.id);
          setPlanejamento(plan);

          const allSessions: SessaoTreinoResponseDTO[] = [];
          plan.semanas?.forEach((w) => allSessions.push(...w.sessoes));

          const todayIso = new Date().toISOString().split("T")[0];

          // 1. Prioriza sessão planejada para hoje
          // 2. Se não houver, próxima sessão pendente ("PLANEJADA")
          // 3. Se todas concluídas, a última sessão
          const pendingSession =
            allSessions.find((s) => s.dataPlanejada === todayIso && s.status === "PLANEJADA") ||
            allSessions.find((s) => s.status === "PLANEJADA") ||
            allSessions.find((s) => s.dataPlanejada === todayIso) ||
            allSessions[allSessions.length - 1] ||
            null;

          setTodaySession(pendingSession);

          // Verifica se há treino recente concluído sem RPE informado
          const needsRpe = allSessions.find(
            (s) => s.status === "CONCLUIDA" && (s.desempenho?.nivelCansaco === null || s.desempenho?.nivelCansaco === undefined)
          );
          setPendingRpeSession(needsRpe || null);
        } catch (planErr) {
          console.warn("Erro ao consultar planejamento:", planErr);
        }
      }
    } catch (err) {
      console.warn("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  const studentName = perfil?.usuario?.nome || "Atleta";
  const personalName = perfil?.nomePersonal || "Personal Trainer";
  const todayDayIdx = (new Date().getDay() + 6) % 7; // 0 = Segunda, 6 = Domingo

  // Estatísticas Calculadas para os 4 KPI Cards
  const allSessions = useMemo(() => {
    const list: SessaoTreinoResponseDTO[] = [];
    planejamento?.semanas?.forEach((w) => list.push(...w.sessoes));
    return list;
  }, [planejamento]);

  const completedSessions = useMemo(() => {
    return allSessions.filter((s) => s.status === "CONCLUIDA");
  }, [allSessions]);

  const completedSessionsCount = completedSessions.length;

  const averageRpe = useMemo(() => {
    const withRpe = completedSessions.filter(
      (s) => typeof s.desempenho?.nivelCansaco === "number" && s.desempenho.nivelCansaco > 0
    );
    if (withRpe.length === 0) return "—";
    const sum = withRpe.reduce((acc, curr) => acc + (curr.desempenho?.nivelCansaco || 0), 0);
    return (sum / withRpe.length).toFixed(1).replace(".", ",");
  }, [completedSessions]);

  const currentWeekNumber = useMemo(() => {
    if (!planejamento?.semanas || planejamento.semanas.length === 0) return 1;
    // Encontra a semana da próxima sessão planejada ou a primeira semana com pendência
    const weekWithPending = planejamento.semanas.find((w) =>
      w.sessoes.some((s) => s.status === "PLANEJADA")
    );
    return weekWithPending ? weekWithPending.numeroSemana : planejamento.semanas.length;
  }, [planejamento]);

  const totalWeeks = planejamento?.semanas?.length || 1;

  // Sessões da Semana Atual para o Card "Minha Semana"
  const currentWeekData = useMemo(() => {
    return planejamento?.semanas?.find((w) => w.numeroSemana === currentWeekNumber) || planejamento?.semanas?.[0];
  }, [planejamento, currentWeekNumber]);

  const currentWeekSessions = currentWeekData?.sessoes || [];
  const completedInCurrentWeek = currentWeekSessions.filter((s) => s.status === "CONCLUIDA").length;
  const totalInCurrentWeek = currentWeekSessions.length;

  // Mapeamento dos 7 dias da semana atual
  const weekDaysStatus = useMemo(() => {
    return WEEKDAYS_LABELS.map((item, idx) => {
      const isToday = idx === todayDayIdx;
      // Procura sessão nessa posição da semana
      const sessionForDay = currentWeekSessions.find((s) => {
        if (!s.dataPlanejada) return false;
        try {
          const [y, m, d] = s.dataPlanejada.split("-").map(Number);
          const dayOfWeek = (new Date(y, m - 1, d).getDay() + 6) % 7;
          return dayOfWeek === idx;
        } catch {
          return false;
        }
      });

      const isCompleted = sessionForDay?.status === "CONCLUIDA";
      const isPlanned = sessionForDay?.status === "PLANEJADA";
      const isRest = !sessionForDay;

      return {
        label: item.short,
        full: item.full,
        isToday,
        isCompleted,
        isPlanned,
        isRest,
        sessionId: sessionForDay?.id,
      };
    });
  }, [currentWeekSessions, todayDayIdx]);

  // Dados do Card "Minha Evolução"
  const evolutionSummary = useMemo(() => {
    // 1. Tenta pegar a primeira métrica com histórico
    const firstMetric = evolucao?.metricas?.find((m) => m.pontos && m.pontos.length > 0);
    if (firstMetric && firstMetric.pontos.length > 0) {
      const lastPonto = firstMetric.pontos[firstMetric.pontos.length - 1];
      const chartPoints = firstMetric.pontos.map((p, idx) => ({
        label: `S1·${idx + 1}`,
        value: p.valorNumerico ?? (parseFloat(p.valor.replace(",", ".")) || 0),
      }));

      return {
        hasData: chartPoints.length >= 2,
        title: firstMetric.titulo,
        subtitle: `${firstMetric.pontos.length} sessões registradas na rotina`,
        latestValue: lastPonto.formatado || lastPonto.valor,
        badgeText: "Atualizado",
        points: chartPoints,
      };
    }

    // 2. Fallback para RPE Borg CR-10
    if (evolucao?.evolucaoRpe?.pontos && evolucao.evolucaoRpe.pontos.length > 0) {
      const rpePoints = evolucao.evolucaoRpe.pontos;
      const lastRpe = rpePoints[rpePoints.length - 1];
      const chartPoints = rpePoints.map((p, idx) => ({
        label: `S1·${idx + 1}`,
        value: p.nivelCansaco,
      }));

      return {
        hasData: chartPoints.length >= 2,
        title: "Esforço percebido (RPE)",
        subtitle: `Escala Borg CR-10 · ${rpePoints.length} sessões`,
        latestValue: `${lastRpe.nivelCansaco}/10`,
        badgeText: "Registrado",
        points: chartPoints,
      };
    }

    return {
      hasData: false,
      title: "Minha evolução",
      subtitle: "Aguardando conclusão das primeiras sessões",
      latestValue: "—",
      badgeText: "Pendente",
      points: [],
    };
  }, [evolucao]);

  // Atividades do treino em destaque
  const parsedToday = parseAtividades(todaySession?.atividades);
  const dateBadge = parseDateBadge(todaySession?.dataPlanejada);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
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
              <Text style={styles.dateSubtitle}>{formatHeaderDate()}</Text>
              <Text style={styles.personalSubtitle}>Treinador: {personalName}</Text>
            </View>
          </TouchableOpacity>

          <Button
            variant="ghost"
            size="sm"
            icon={<Sparkles size={18} color={colors.primary[600]} />}
            onPress={() => router.push("/modal")}
            fullWidth={false}
          />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Carregando seu painel de treinos...</Text>
          </View>
        ) : (
          <>
            {/* ROW 1: 4 KPI Cards (Grid 2x2 Fiel à Web) */}
            <View style={styles.kpiGrid}>
              {/* Card 1: Sessões finalizadas */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconBadge, { backgroundColor: colors.primary[50] }]}>
                    <Activity size={16} color={colors.primary[600]} />
                  </View>
                  <Badge tone="success" style={styles.kpiBadge}>
                    Rotina atual
                  </Badge>
                </View>
                <Text style={styles.kpiValue}>{completedSessionsCount}</Text>
                <Text style={styles.kpiLabel}>Sessões finalizadas</Text>
              </View>

              {/* Card 2: Frequência semanal */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconBadge, { backgroundColor: colors.warning.light }]}>
                    <Flame size={16} color={colors.warning.base} />
                  </View>
                  <Badge tone="warning" style={styles.kpiBadge}>
                    Meta
                  </Badge>
                </View>
                <Text style={styles.kpiValue}>
                  {activeRoutine ? `${activeRoutine.frequenciaSemanal}x` : "—"}
                </Text>
                <Text style={styles.kpiLabel}>Frequência semanal</Text>
              </View>

              {/* Card 3: RPE médio */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconBadge, { backgroundColor: colors.danger.light }]}>
                    <Heart size={16} color={colors.danger.base} />
                  </View>
                  <Badge tone="neutral" style={styles.kpiBadge}>
                    Borg CR-10
                  </Badge>
                </View>
                <Text style={styles.kpiValue}>{averageRpe}</Text>
                <Text style={styles.kpiLabel}>RPE médio</Text>
              </View>

              {/* Card 4: Semana da rotina ativa */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconBadge, { backgroundColor: colors.info.light }]}>
                    <Layers size={16} color={colors.info.base} />
                  </View>
                  <Badge tone="info" style={styles.kpiBadge}>
                    {activeRoutine?.modalidade?.nome || "Pilates"}
                  </Badge>
                </View>
                <Text style={styles.kpiValue}>
                  {activeRoutine ? `${currentWeekNumber}/${totalWeeks}` : "—"}
                </Text>
                <Text style={styles.kpiLabel}>Semana da rotina ativa</Text>
              </View>
            </View>

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
                      Você concluiu uma sessão! Registre como se sentiu na escala de 1 a 10.
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

            {/* ROW 2: Próxima Sessão / Treino do Dia (Redesenhado Fiel à Web) */}
            {todaySession ? (
              <Card variant="elevated" padding="none" style={styles.nextSessionCard}>
                <View style={styles.nextSessionInner}>
                  {/* Bloco de Data Laranja */}
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateWeekday}>{dateBadge.weekday}</Text>
                    <Text style={styles.dateDayMonth}>{dateBadge.dayMonth}</Text>
                    <Text style={styles.dateTime}>
                      {todaySession.duracao ? `${todaySession.duracao} min` : "Treino"}
                    </Text>
                  </View>

                  {/* Conteúdo Principal */}
                  <View style={styles.nextSessionContent}>
                    <Text style={styles.nextEyebrow}>
                      {todaySession.status === "CONCLUIDA"
                        ? "SESSÃO FINALIZADA"
                        : `PRÓXIMA SESSÃO · SEMANA ${todaySession.semana}`}
                    </Text>

                    <View style={styles.nextTitleRow}>
                      <Text style={styles.nextTitle} numberOfLines={1}>
                        {parsedToday.sessionName || `Sessão ${todaySession.semana}`}
                      </Text>
                      <SportTag sport={activeRoutine?.modalidade?.nome} size="sm" />
                    </View>

                    <Text style={styles.nextSubtitle} numberOfLines={2}>
                      {activeRoutine?.titulo ? `${activeRoutine.titulo} · ` : ""}
                      Planejado por {personalName}
                    </Text>

                    {/* Preview da Atividade Programada */}
                    {parsedToday.activities.length > 0 && (
                      <View style={styles.activityPill}>
                        <View style={styles.activityNumBadge}>
                          <Text style={styles.activityNumText}>1</Text>
                        </View>
                        <Text style={styles.activityPillText} numberOfLines={1}>
                          <Text style={styles.activityPillBold}>
                            {parsedToday.activities[0].title}
                          </Text>
                          {parsedToday.activities[0].description
                            ? ` · ${parsedToday.activities[0].description}`
                            : ""}
                        </Text>
                      </View>
                    )}

                    {/* Botões de Ação lado a lado */}
                    <View style={styles.nextActionsRow}>
                      <Button
                        title="Ver sessão"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push(`/(aluno)/treinos/${todaySession.id}`)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title={
                          todaySession.status === "CONCLUIDA"
                            ? "Rever Treino"
                            : "Finalizar sessão"
                        }
                        variant="primary"
                        size="sm"
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          router.push(`/(aluno)/treinos/${todaySession.id}`);
                        }}
                        style={{ flex: 1.2 }}
                      />
                    </View>
                  </View>
                </View>
              </Card>
            ) : (
              <Card variant="outlined" padding="lg" style={styles.noWorkoutCard}>
                <Text style={styles.noWorkoutTitle}>Todas as sessões concluídas! 🎉</Text>
                <Text style={styles.noWorkoutDesc}>
                  Você finalizou os treinos planejados desta semana. Bom descanso!
                </Text>
              </Card>
            )}

            {/* ROW 3: Minha Semana (Consistência Semanal Fiel à Web) */}
            <Card variant="outlined" padding="md" style={styles.weekCard}>
              <View style={styles.weekCardHeader}>
                <View>
                  <Text style={styles.weekCardTitle}>Minha semana</Text>
                  <Text style={styles.weekCardSubtitle}>
                    {totalInCurrentWeek > 0
                      ? `${completedInCurrentWeek} de ${totalInCurrentWeek} sessões finalizadas`
                      : "Sem sessões agendadas para esta semana"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/(aluno)/treinos")}
                  style={styles.linkRow}
                  hitSlop={8}
                >
                  <Text style={styles.linkText}>Meus treinos</Text>
                  <ArrowRight size={14} color={colors.primary[600]} />
                </TouchableOpacity>
              </View>

              {/* Strip dos 7 Dias */}
              <View style={styles.weekDaysStrip}>
                {weekDaysStatus.map((day, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.weekDayCol,
                      day.isToday && styles.weekDayColToday,
                      day.isCompleted && styles.weekDayColCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekDayLabel,
                        day.isToday && styles.weekDayLabelToday,
                      ]}
                    >
                      {day.label}
                    </Text>

                    {day.isCompleted ? (
                      <View style={styles.completedCheck}>
                        <Check size={12} color={colors.primary[600]} strokeWidth={3} />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.statusDot,
                          day.isToday && styles.statusDotToday,
                          day.isPlanned && styles.statusDotPlanned,
                          day.isRest && styles.statusDotRest,
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>

              {/* Legenda */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary[500] }]} />
                  <Text style={styles.legendText}>
                    {activeRoutine?.modalidade?.nome || "Treino"}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.ink[300] }]} />
                  <Text style={styles.legendText}>Descanso</Text>
                </View>
              </View>
            </Card>

            {/* ROW 4: Minha Evolução (Preview com Gráfico SVG Curvo) */}
            <Card variant="outlined" padding="md" style={styles.evolutionCard}>
              <View style={styles.weekCardHeader}>
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={styles.weekCardTitle}>Minha evolução</Text>
                  <Text style={styles.weekCardSubtitle} numberOfLines={1}>
                    {evolutionSummary.title} · {evolutionSummary.subtitle}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/(aluno)/evolucao")}
                  style={styles.linkRow}
                  hitSlop={8}
                >
                  <Text style={styles.linkText}>Ver completo</Text>
                  <ArrowRight size={14} color={colors.primary[600]} />
                </TouchableOpacity>
              </View>

              {/* Valor em Destaque */}
              <View style={styles.evolutionMetricRow}>
                <Text style={styles.evolutionMetricValue}>{evolutionSummary.latestValue}</Text>
                <Badge tone="success" style={{ marginLeft: spacing.sm }}>
                  {evolutionSummary.badgeText}
                </Badge>
              </View>

              {/* Gráfico Vetorial em Linha Suave */}
              {evolutionSummary.hasData ? (
                <View style={styles.chartContainer}>
                  <SvgLineChart
                    data={evolutionSummary.points}
                    color={colors.primary[500]}
                    height={150}
                  />
                </View>
              ) : (
                <View style={styles.emptyEvolutionBox}>
                  <Activity size={22} color={colors.ink[400]} />
                  <Text style={styles.emptyEvolutionText}>
                    Finalize suas sessões de treino para acompanhar sua evolução e esforço físico neste gráfico.
                  </Text>
                </View>
              )}
            </Card>

            {/* ROW 5: Feedbacks do Personal & Métricas da Rotina */}
            <Card variant="outlined" padding="md" style={styles.feedbacksCard}>
              <View style={styles.weekCardHeader}>
                <Text style={styles.weekCardTitle}>Feedbacks do personal</Text>
                <Badge tone="primary">
                  {feedbacks.length} {feedbacks.length === 1 ? "registro" : "registros"}
                </Badge>
              </View>

              {feedbacks.length === 0 ? (
                <Text style={styles.emptyFeedbacksText}>
                  Nenhum feedback registrado pelo seu personal ainda.
                </Text>
              ) : (
                <View style={styles.latestFeedbackBox}>
                  <View style={styles.feedbackHeaderRow}>
                    <Avatar name={feedbacks[0].autorNome} size="sm" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.feedbackAuthor}>{feedbacks[0].autorNome}</Text>
                      <Text style={styles.feedbackDate}>
                        {new Date(feedbacks[0].criadoEm).toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackContent}>{feedbacks[0].conteudo}</Text>
                </View>
              )}

              {/* Métricas Solicitadas ao Finalizar Sessão */}
              {activeRoutine?.metricas && activeRoutine.metricas.length > 0 && (
                <View style={styles.metricsBox}>
                  <View style={styles.metricsHeaderRow}>
                    <Activity size={14} color={colors.primary[600]} />
                    <Text style={styles.metricsBoxTitle}>
                      Métricas solicitadas ao finalizar sessão
                    </Text>
                  </View>
                  <View style={styles.metricChipsRow}>
                    {activeRoutine.metricas.map((m) => (
                      <View key={m.id} style={styles.metricChip}>
                        <Text style={styles.metricChipText}>
                          {m.titulo}
                          {m.obrigatoria ? " *" : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Widget Strava Sincronizado */}
              <View style={styles.stravaWidget}>
                <View style={styles.stravaLeft}>
                  <View style={styles.stravaIconBadge}>
                    <Flame size={16} color="#fc5200" />
                  </View>
                  <View style={styles.stravaInfo}>
                    <Text style={styles.stravaTitle}>
                      {stravaStatus.conectado
                        ? `Strava sincronizado (${stravaStatus.nomeAtleta || studentName})`
                        : "Conectar com o Strava"}
                    </Text>
                    <Text style={styles.stravaDesc}>
                      {stravaStatus.conectado
                        ? "Treinos recentes preenchem suas métricas automaticamente."
                        : "Sincronize suas atividades com métricas de treino."}
                    </Text>
                  </View>
                </View>
                <Badge tone={stravaStatus.conectado ? "success" : "neutral"}>
                  {stravaStatus.conectado ? "Conectado" : "Disponível"}
                </Badge>
              </View>
            </Card>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  userText: {
    flex: 1,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
  },
  dateSubtitle: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
    marginTop: 2,
  },
  personalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
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

  // KPI Grid (2x2)
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  kpiIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  kpiValue: {
    fontFamily: fonts.extraBold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
    marginTop: 2,
  },
  kpiLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
  },

  // Card Próxima Sessão (Fiel à Web)
  nextSessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  nextSessionInner: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
  },
  dateBlock: {
    width: 68,
    backgroundColor: colors.primary[500],
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    gap: 2,
  },
  dateWeekday: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  dateDayMonth: {
    fontFamily: fonts.extraBold,
    fontSize: typography.sizes.cardTitle,
    color: colors.surface,
  },
  dateTime: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: "rgba(255, 255, 255, 0.85)",
  },
  nextSessionContent: {
    flex: 1,
    gap: 4,
  },
  nextEyebrow: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.primary[600],
    letterSpacing: 0.5,
  },
  nextTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  nextTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
    flex: 1,
  },
  nextSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },
  activityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.ink[100],
    borderRadius: radii.pill,
    paddingRight: spacing.sm,
    paddingLeft: 2,
    paddingVertical: 2,
    marginTop: 4,
    gap: spacing.xs,
  },
  activityNumBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  activityNumText: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.surface,
  },
  activityPillText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[700],
    flex: 1,
  },
  activityPillBold: {
    fontFamily: fonts.bold,
  },
  nextActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  // Alerta RPE
  rpeAlertCard: {
    backgroundColor: colors.warning.light,
    borderColor: colors.warning.base,
  },
  rpeAlertRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  rpeAlertIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
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
  },
  rpeAlertBtn: {
    marginTop: spacing.sm,
  },

  noWorkoutCard: {
    backgroundColor: colors.surface,
    alignItems: "center",
    padding: spacing.lg,
  },
  noWorkoutTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  noWorkoutDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    textAlign: "center",
    marginTop: 4,
  },

  // Card Minha Semana
  weekCard: {
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  weekCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weekCardTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  weekCardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  linkText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.primary[600],
  },
  weekDaysStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  weekDayCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: 8,
    borderRadius: radii.control,
    backgroundColor: colors.ink[100],
    minWidth: 42,
    gap: 6,
  },
  weekDayColToday: {
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[500],
  },
  weekDayColCompleted: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekDayLabel: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
  },
  weekDayLabelToday: {
    color: colors.primary[600],
    fontFamily: fonts.bold,
  },
  completedCheck: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotToday: {
    backgroundColor: colors.primary[500],
  },
  statusDotPlanned: {
    backgroundColor: colors.primary[500],
  },
  statusDotRest: {
    backgroundColor: colors.ink[300],
  },
  legendRow: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },

  // Card Minha Evolução
  evolutionCard: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  evolutionMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  evolutionMetricValue: {
    fontFamily: fonts.extraBold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
  },
  chartContainer: {
    marginTop: spacing.xs,
  },
  emptyEvolutionBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyEvolutionText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    textAlign: "center",
    maxWidth: "85%",
  },

  // Card Feedbacks & Strava
  feedbacksCard: {
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  emptyFeedbacksText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  latestFeedbackBox: {
    backgroundColor: colors.ink[100],
    padding: spacing.md,
    borderRadius: radii.control,
    gap: spacing.xs,
  },
  feedbackHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  feedbackAuthor: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.ink[900],
  },
  feedbackDate: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
  },
  feedbackContent: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
    lineHeight: 18,
  },
  metricsBox: {
    backgroundColor: colors.primary[50],
    padding: spacing.sm,
    borderRadius: radii.control,
    gap: spacing.xs,
  },
  metricsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricsBoxTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.ink[900],
  },
  metricChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 2,
  },
  metricChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  metricChipText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.primary[600],
  },
  stravaWidget: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.ink[100],
    padding: spacing.sm,
    borderRadius: radii.control,
    gap: spacing.sm,
  },
  stravaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  stravaIconBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.control,
    backgroundColor: "#fff0eb",
    alignItems: "center",
    justifyContent: "center",
  },
  stravaInfo: {
    flex: 1,
  },
  stravaTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.ink[900],
  },
  stravaDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 1,
  },
});
