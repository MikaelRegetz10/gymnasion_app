import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Dumbbell,
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle2,
  Play,
  Flame,
  Award,
  Sparkles,
  TrendingUp,
  Repeat,
  Check,
  ChevronDown,
  Layers,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { alunoService } from "@/src/services/alunoService";
import type {
  RotinaTreinoResponseDTO,
  PlanejamentoRotinaResponseDTO,
  SessaoTreinoResponseDTO,
} from "@/src/types/student";
import { parseAtividades } from "@/src/utils/activityParser";
import { colors, fonts, radii, spacing, typography, shadows } from "@/src/theme/tokens";
import { Card, Badge, SportTag, EmptyState, Button } from "@/src/components/ui";

type FilterMode = "PENDENTES" | "TODOS" | "CONCLUIDOS";

function formatSessionDate(dateIso?: string | null): {
  badge: string;
  isToday: boolean;
  isTomorrow: boolean;
  formatted: string;
} {
  if (!dateIso) return { badge: "Programado", isToday: false, isTomorrow: false, formatted: "Data a definir" };
  try {
    const [year, month, day] = dateIso.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffMs = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const weekdayShort = targetDate.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const formatted = `${weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1)}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;

    if (diffDays === 0) {
      return { badge: "Hoje", isToday: true, isTomorrow: false, formatted };
    }
    if (diffDays === 1) {
      return { badge: "Amanhã", isToday: false, isTomorrow: true, formatted };
    }
    if (diffDays === -1) {
      return { badge: "Ontem", isToday: false, isTomorrow: false, formatted };
    }
    return { badge: formatted, isToday: false, isTomorrow: false, formatted };
  } catch {
    return { badge: dateIso, isToday: false, isTomorrow: false, formatted: dateIso };
  }
}

function getRpeClassification(rpe?: number | null): string {
  if (!rpe) return "";
  if (rpe <= 2) return `RPE ${rpe} · Muito Leve`;
  if (rpe <= 4) return `RPE ${rpe} · Moderado`;
  if (rpe <= 6) return `RPE ${rpe} · Intenso`;
  if (rpe <= 8) return `RPE ${rpe} · Difícil`;
  if (rpe <= 9) return `RPE ${rpe} · Muito Difícil`;
  return `RPE ${rpe} · Exaustivo`;
}

export default function AlunoTreinosIndex() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rotinas, setRotinas] = useState<RotinaTreinoResponseDTO[]>([]);
  const [activeRoutine, setActiveRoutine] = useState<RotinaTreinoResponseDTO | null>(null);
  const [planejamento, setPlanejamento] = useState<PlanejamentoRotinaResponseDTO | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [filterMode, setFilterMode] = useState<FilterMode>("TODOS");
  const [routineModalVisible, setRoutineModalVisible] = useState(false);

  async function loadData(targetRoutineId?: string) {
    try {
      const rotinasList = await alunoService.listarRotinas();
      setRotinas(rotinasList);

      if (rotinasList.length > 0) {
        let routineToSelect = rotinasList[0];
        if (targetRoutineId) {
          const matched = rotinasList.find((r) => r.id === targetRoutineId);
          if (matched) routineToSelect = matched;
        } else {
          const active = rotinasList.find((r) => r.ativo);
          if (active) routineToSelect = active;
        }

        setActiveRoutine(routineToSelect);

        const plan = await alunoService.consultarPlanejamento(routineToSelect.id);
        setPlanejamento(plan);

        if (plan?.semanas?.length > 0) {
          // Seleciona de forma inteligente a primeira semana com treinos pendentes
          const currentWeekWithPending = plan.semanas.find((w) =>
            w.sessoes.some((s) => s.status !== "CONCLUIDA" && !s.concluidaAluno)
          );
          setSelectedWeek(
            currentWeekWithPending
              ? currentWeekWithPending.numeroSemana
              : plan.semanas[0].numeroSemana
          );
        }
      }
    } catch {
      // Tratamento de falha silenciosa para manter interface resiliente
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadData(activeRoutine?.id);
  }

  const currentWeekData = planejamento?.semanas?.find(
    (w) => w.numeroSemana === selectedWeek
  );

  // Separação inteligente entre pendentes e concluídos
  const { pendingSessions, completedSessions, nextSession, otherPendingSessions } = useMemo(() => {
    const sessoes = currentWeekData?.sessoes || [];
    const pending = sessoes.filter((s) => s.status !== "CONCLUIDA" && !s.concluidaAluno);
    const completed = sessoes.filter((s) => s.status === "CONCLUIDA" || s.concluidaAluno);

    return {
      pendingSessions: pending,
      completedSessions: completed,
      nextSession: pending.length > 0 ? pending[0] : null,
      otherPendingSessions: pending.length > 1 ? pending.slice(1) : [],
    };
  }, [currentWeekData]);

  // Estatísticas gerais da rotina
  const { totalRoutineSessions, completedRoutineSessions, routineProgressPercent } = useMemo(() => {
    if (!planejamento?.semanas) {
      return { totalRoutineSessions: 0, completedRoutineSessions: 0, routineProgressPercent: 0 };
    }
    let total = 0;
    let done = 0;
    for (const w of planejamento.semanas) {
      total += w.sessoes.length;
      done += w.sessoes.filter((s) => s.status === "CONCLUIDA" || s.concluidaAluno).length;
    }
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      totalRoutineSessions: total,
      completedRoutineSessions: done,
      routineProgressPercent: pct,
    };
  }, [planejamento]);

  // Estatísticas da semana selecionada
  const totalWeekSessions = currentWeekData?.sessoes?.length || 0;
  const completedWeekSessions = completedSessions.length;
  const isWeekFullyCompleted =
    totalWeekSessions > 0 && completedWeekSessions === totalWeekSessions;

  function handleSelectRoutine(routine: RotinaTreinoResponseDTO) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveRoutine(routine);
    setRoutineModalVisible(false);
    setLoading(true);
    loadData(routine.id);
  }

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
        {/* Cabeçalho da Tela */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Meus Treinos</Text>
            <Text style={styles.subtitle}>
              Seu planejamento sob medida e sessões organizadas
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Carregando seu plano de treinos...</Text>
          </View>
        ) : !activeRoutine || !planejamento ? (
          <EmptyState
            icon={Dumbbell}
            title="Nenhuma rotina ativa"
            description="Você ainda não possui rotinas atribuídas. Converse com seu Personal Trainer para iniciar seu cronograma."
            actionLabel="Atualizar"
            onAction={onRefresh}
          />
        ) : (
          <>
            {/* Card Hero da Rotina Ativa */}
            <Card variant="elevated" padding="md" style={styles.routineHeroCard}>
              <View style={styles.routineHeaderTop}>
                <View style={styles.tagsRow}>
                  <SportTag sport={activeRoutine.modalidade?.nome} />
                  {activeRoutine.ativo !== false && (
                    <Badge tone="success" icon={<CheckCircle2 size={12} color={colors.success.dark} />}>
                      Ativa
                    </Badge>
                  )}
                  {activeRoutine.frequenciaSemanal > 0 && (
                    <Badge tone="neutral" icon={<Repeat size={11} color={colors.ink[600]} />}>
                      {activeRoutine.frequenciaSemanal}x / sem
                    </Badge>
                  )}
                </View>

                {rotinas.length > 1 && (
                  <TouchableOpacity
                    style={styles.switchRoutineBtn}
                    onPress={() => setRoutineModalVisible(true)}
                  >
                    <Layers size={14} color={colors.primary[600]} />
                    <Text style={styles.switchRoutineText}>Trocar</Text>
                    <ChevronDown size={14} color={colors.primary[600]} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.routineTitle}>{activeRoutine.titulo}</Text>
              {activeRoutine.objetivos ? (
                <Text style={styles.routineDesc} numberOfLines={2}>
                  {activeRoutine.objetivos}
                </Text>
              ) : null}

              {/* Barra de Progresso Global da Rotina */}
              <View style={styles.progressContainer}>
                <View style={styles.progressLabelRow}>
                  <View style={styles.progressTitleGroup}>
                    <TrendingUp size={14} color={colors.ink[600]} />
                    <Text style={styles.progressTitle}>Progresso da Rotina</Text>
                  </View>
                  <Text style={styles.progressCounter}>
                    {completedRoutineSessions} de {totalRoutineSessions} sessões ({routineProgressPercent}%)
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(routineProgressPercent, 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </Card>

            {/* Seletor de Semanas com Micro-Progresso */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Cronograma de Semanas</Text>
              <Text style={styles.sectionSubHeading}>
                Semana {selectedWeek} de {planejamento.semanas.length}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weeksScroll}
            >
              {planejamento.semanas.map((w) => {
                const isSelected = selectedWeek === w.numeroSemana;
                const completedInWeek = w.sessoes.filter(
                  (s) => s.status === "CONCLUIDA" || s.concluidaAluno
                ).length;
                const totalInWeek = w.sessoes.length;
                const isFinished = totalInWeek > 0 && completedInWeek === totalInWeek;

                return (
                  <TouchableOpacity
                    key={w.numeroSemana}
                    style={[
                      styles.weekPill,
                      isSelected && styles.weekPillActive,
                      isFinished && !isSelected && styles.weekPillFinished,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedWeek(w.numeroSemana);
                    }}
                  >
                    <View style={styles.weekPillHeader}>
                      <Text
                        style={[
                          styles.weekPillText,
                          isSelected && styles.weekPillTextActive,
                        ]}
                      >
                        Semana {w.numeroSemana}
                      </Text>
                      {isFinished && (
                        <CheckCircle2
                          size={13}
                          color={isSelected ? colors.primary[500] : colors.success.base}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.weekPillSub,
                        isSelected && styles.weekPillSubActive,
                      ]}
                    >
                      {completedInWeek}/{totalInWeek} concluídos
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Filtros Rápidos (Todos, Pendentes, Concluídos) */}
            <View style={styles.filterBar}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterMode === "TODOS" && styles.filterChipActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilterMode("TODOS");
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterMode === "TODOS" && styles.filterChipTextActive,
                  ]}
                >
                  Todos ({totalWeekSessions})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterMode === "PENDENTES" && styles.filterChipActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilterMode("PENDENTES");
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterMode === "PENDENTES" && styles.filterChipTextActive,
                  ]}
                >
                  Pendentes ({pendingSessions.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterMode === "CONCLUIDOS" && styles.filterChipActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilterMode("CONCLUIDOS");
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterMode === "CONCLUIDOS" && styles.filterChipTextActive,
                  ]}
                >
                  Concluídos ({completedSessions.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Se toda a semana foi concluída com sucesso */}
            {isWeekFullyCompleted && filterMode !== "PENDENTES" && (
              <Card variant="elevated" padding="md" style={styles.weekCelebrationCard}>
                <View style={styles.celebrationIconBox}>
                  <Award size={28} color={colors.primary[500]} />
                </View>
                <View style={styles.celebrationContent}>
                  <Text style={styles.celebrationTitle}>Semana {selectedWeek} Concluída!</Text>
                  <Text style={styles.celebrationText}>
                    Você finalizou todas as {totalWeekSessions} sessões planejadas para esta semana.
                  </Text>
                </View>
                {selectedWeek < planejamento.semanas.length && (
                  <Button
                    title={`Ver Semana ${selectedWeek + 1}`}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    icon={<ChevronRight size={14} color={colors.ink[800]} />}
                    iconPosition="right"
                    onPress={() => setSelectedWeek(selectedWeek + 1)}
                    style={styles.celebrationNextBtn}
                  />
                )}
              </Card>
            )}

            {/* HERO CARD: PRÓXIMO TREINO PROGRAMADO */}
            {filterMode !== "CONCLUIDOS" && nextSession && (
              <View style={styles.nextSessionSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.heroSectionTitleRow}>
                    <Flame size={16} color={colors.primary[500]} />
                    <Text style={styles.heroSectionTitle}>Próximo Treino Programado</Text>
                  </View>
                  <Badge tone="primary">Destaque</Badge>
                </View>

                {(() => {
                  const parsed = parseAtividades(nextSession.atividades);
                  const dateInfo = formatSessionDate(nextSession.dataPlanejada);
                  const sessionIndex =
                    (currentWeekData?.sessoes.findIndex((s) => s.id === nextSession.id) ?? 0) + 1;

                  return (
                    <Card variant="elevated" padding="lg" style={styles.heroCard}>
                      <View style={styles.heroHeader}>
                        <View style={styles.heroBadgeRow}>
                          <Badge
                            tone={dateInfo.isToday ? "danger" : dateInfo.isTomorrow ? "warning" : "primary"}
                            icon={<Calendar size={12} color={dateInfo.isToday ? colors.danger.dark : colors.primary[600]} />}
                          >
                            {dateInfo.badge}
                          </Badge>
                          {nextSession.duracao && (
                            <Badge tone="neutral" icon={<Clock size={12} color={colors.ink[600]} />}>
                              {nextSession.duracao} min
                            </Badge>
                          )}
                          <Text style={styles.heroSessionIndex}>Sessão {sessionIndex}</Text>
                        </View>
                      </View>

                      <Text style={styles.heroTitle}>
                        {parsed.sessionName || `Sessão ${sessionIndex}`}
                      </Text>

                      <View style={styles.heroMetaLine}>
                        <Text style={styles.heroMetaText}>
                          Data planejada: {dateInfo.formatted}
                        </Text>
                      </View>

                      {/* Chips de Exercícios da Sessão Hero */}
                      {parsed.activities.length > 0 && (
                        <View style={styles.exercisesChipWrapper}>
                          <Text style={styles.exercisesChipLabel}>
                            {parsed.activities.length} exercício(s) programado(s):
                          </Text>
                          <View style={styles.chipsRow}>
                            {parsed.activities.slice(0, 3).map((act, idx) => (
                              <View key={idx} style={styles.exerciseChip}>
                                <Text style={styles.exerciseChipText} numberOfLines={1}>
                                  {act.title}
                                </Text>
                              </View>
                            ))}
                            {parsed.activities.length > 3 && (
                              <View style={styles.exerciseChipMore}>
                                <Text style={styles.exerciseChipMoreText}>
                                  +{parsed.activities.length - 3} mais
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Botão de Ação Primária em Destaque */}
                      <Button
                        title="Iniciar Treino Agora"
                        variant="primary"
                        size="lg"
                        icon={<Play size={16} color="#ffffff" fill="#ffffff" />}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          router.push(`/(aluno)/treinos/${nextSession.id}`);
                        }}
                        style={styles.heroStartButton}
                      />
                    </Card>
                  );
                })()}
              </View>
            )}

            {/* LISTA DE DEMAIS SESSÕES PENDENTES */}
            {filterMode !== "CONCLUIDOS" && otherPendingSessions.length > 0 && (
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>
                  Outras Sessões Desta Semana ({otherPendingSessions.length})
                </Text>
                <View style={styles.sessionsList}>
                  {otherPendingSessions.map((sessao) => {
                    const parsed = parseAtividades(sessao.atividades);
                    const dateInfo = formatSessionDate(sessao.dataPlanejada);
                    const sessionIndex =
                      (currentWeekData?.sessoes.findIndex((s) => s.id === sessao.id) ?? 0) + 1;

                    return (
                      <Card
                        key={sessao.id}
                        variant="elevated"
                        padding="md"
                        style={styles.pendingCard}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/(aluno)/treinos/${sessao.id}`);
                        }}
                      >
                        <View style={styles.pendingCardHeader}>
                          <View style={styles.pendingIndexCircle}>
                            <Text style={styles.pendingIndexText}>{sessionIndex}</Text>
                          </View>
                          <View style={styles.sessionTitleContainer}>
                            <Text style={styles.sessionTitle}>
                              {parsed.sessionName || `Sessão ${sessionIndex}`}
                            </Text>
                            <View style={styles.sessionMetaRow}>
                              <View style={styles.metaItem}>
                                <Calendar size={13} color={colors.ink[400]} />
                                <Text style={styles.metaText}>{dateInfo.formatted}</Text>
                              </View>
                              {sessao.duracao && (
                                <View style={styles.metaItem}>
                                  <Clock size={13} color={colors.ink[400]} />
                                  <Text style={styles.metaText}>{sessao.duracao} min</Text>
                                </View>
                              )}
                              {parsed.activities.length > 0 && (
                                <Text style={styles.metaText}>
                                  · {parsed.activities.length} ex.
                                </Text>
                              )}
                            </View>
                          </View>
                          <ChevronRight size={18} color={colors.primary[500]} />
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </View>
            )}

            {/* LISTA DE SESSÕES CONCLUÍDAS */}
            {filterMode !== "PENDENTES" && completedSessions.length > 0 && (
              <View style={styles.subSection}>
                <View style={styles.subSectionHeaderRow}>
                  <Text style={styles.subSectionTitle}>
                    Treinos Concluídos ({completedSessions.length})
                  </Text>
                  <Text style={styles.subSectionSub}>Histórico da Semana</Text>
                </View>

                <View style={styles.sessionsList}>
                  {completedSessions.map((sessao) => {
                    const parsed = parseAtividades(sessao.atividades);
                    const sessionIndex =
                      (currentWeekData?.sessoes.findIndex((s) => s.id === sessao.id) ?? 0) + 1;
                    const rpeVal = sessao.desempenho?.nivelCansaco;

                    return (
                      <Card
                        key={sessao.id}
                        variant="elevated"
                        padding="md"
                        style={styles.completedCard}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/(aluno)/treinos/${sessao.id}`);
                        }}
                      >
                        <View style={styles.completedCardHeader}>
                          <View style={styles.completedCheckCircle}>
                            <Check size={16} color={colors.success.base} />
                          </View>

                          <View style={styles.sessionTitleContainer}>
                            <View style={styles.completedTitleRow}>
                              <Text style={styles.completedTitle}>
                                {parsed.sessionName || `Sessão ${sessionIndex}`}
                              </Text>
                              <Badge tone="success" icon={<CheckCircle2 size={11} color={colors.success.dark} />}>
                                Concluído
                              </Badge>
                            </View>

                            <View style={styles.sessionMetaRow}>
                              <View style={styles.metaItem}>
                                <Calendar size={13} color={colors.ink[400]} />
                                <Text style={styles.metaText}>
                                  {sessao.dataReal || sessao.dataPlanejada}
                                </Text>
                              </View>
                              {sessao.duracao && (
                                <View style={styles.metaItem}>
                                  <Clock size={13} color={colors.ink[400]} />
                                  <Text style={styles.metaText}>{sessao.duracao} min</Text>
                                </View>
                              )}
                              {rpeVal ? (
                                <Text style={styles.completedRpeTag}>
                                  {getRpeClassification(rpeVal)}
                                </Text>
                              ) : null}
                            </View>
                          </View>

                          <ChevronRight size={18} color={colors.ink[400]} />
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Estados de Lista Vazia conforme Filtro */}
            {filterMode === "PENDENTES" && pendingSessions.length === 0 && (
              <View style={styles.emptyFilterBox}>
                <CheckCircle2 size={36} color={colors.success.base} />
                <Text style={styles.emptyFilterTitle}>Nenhum treino pendente</Text>
                <Text style={styles.emptyFilterDesc}>
                  Todas as sessões da Semana {selectedWeek} já foram concluídas com sucesso.
                </Text>
                <Button
                  title="Ver Treinos Concluídos"
                  variant="secondary"
                  size="sm"
                  onPress={() => setFilterMode("CONCLUIDOS")}
                  style={styles.emptyFilterBtn}
                />
              </View>
            )}

            {filterMode === "CONCLUIDOS" && completedSessions.length === 0 && (
              <View style={styles.emptyFilterBox}>
                <Dumbbell size={36} color={colors.ink[400]} />
                <Text style={styles.emptyFilterTitle}>Nenhum treino concluído ainda</Text>
                <Text style={styles.emptyFilterDesc}>
                  Você ainda não finalizou sessões na Semana {selectedWeek}. Inicie sua próxima sessão para registrar seu progresso!
                </Text>
                <Button
                  title="Ver Treinos Pendentes"
                  variant="secondary"
                  size="sm"
                  onPress={() => setFilterMode("PENDENTES")}
                  style={styles.emptyFilterBtn}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal de Seleção de Rotinas (quando o aluno tem mais de uma) */}
      <Modal
        visible={routineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoutineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Rotina</Text>
              <TouchableOpacity onPress={() => setRoutineModalVisible(false)}>
                <Text style={styles.modalCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.routinesListScroll}>
              {rotinas.map((r) => {
                const isCurrent = r.id === activeRoutine?.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.routineOptionItem, isCurrent && styles.routineOptionItemActive]}
                    onPress={() => handleSelectRoutine(r)}
                  >
                    <View style={styles.routineOptionInfo}>
                      <Text style={[styles.routineOptionTitle, isCurrent && styles.routineOptionTitleActive]}>
                        {r.titulo}
                      </Text>
                      <View style={styles.routineOptionMeta}>
                        <SportTag sport={r.modalidade?.nome} />
                        {r.ativo && <Badge tone="success">Ativa</Badge>}
                      </View>
                    </View>
                    {isCurrent && <Check size={18} color={colors.primary[500]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: spacing.md,
  },

  /* Card da Rotina */
  routineHeroCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  routineHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  switchRoutineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primary[50],
    borderRadius: radii.pill,
  },
  switchRoutineText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    color: colors.primary[600],
  },
  routineTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
    marginBottom: 4,
  },
  routineDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  progressContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  progressTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  progressTitle: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    color: colors.ink[700],
  },
  progressCounter: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.ink[100],
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary[500],
    borderRadius: radii.pill,
  },

  /* Seletor de Semanas */
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  sectionSubHeading: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },
  weeksScroll: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  weekPill: {
    minWidth: 110,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
  },
  weekPillActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  weekPillFinished: {
    borderColor: colors.success.light,
    backgroundColor: colors.surface,
  },
  weekPillHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weekPillText: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
  },
  weekPillTextActive: {
    color: colors.primary[500],
  },
  weekPillSub: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
    marginTop: 2,
  },
  weekPillSubActive: {
    color: colors.primary[600],
    fontFamily: fonts.medium,
  },

  /* Filtros Rápidos */
  filterBar: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.ink[900],
    borderColor: colors.ink[900],
  },
  filterChipText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[600],
  },
  filterChipTextActive: {
    color: colors.surface,
    fontFamily: fonts.bold,
  },

  /* Semana Concluída */
  weekCelebrationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.success.light,
    borderWidth: 1,
    borderColor: colors.success.base,
    marginBottom: spacing.lg,
  },
  celebrationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  celebrationContent: {
    flex: 1,
  },
  celebrationTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.success.dark,
  },
  celebrationText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[700],
    marginTop: 2,
  },
  celebrationNextBtn: {
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },

  /* HERO CARD: Próximo Treino */
  nextSessionSection: {
    marginBottom: spacing.lg,
  },
  heroSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  heroCard: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: radii.card,
    ...shadows.card,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  heroSessionIndex: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.primary[600],
    marginLeft: 4,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
    marginTop: 4,
    marginBottom: 4,
  },
  heroMetaLine: {
    marginBottom: spacing.sm,
  },
  heroMetaText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  exercisesChipWrapper: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exercisesChipLabel: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    color: colors.ink[600],
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  exerciseChip: {
    backgroundColor: colors.ink[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.ink[200],
    maxWidth: "80%",
  },
  exerciseChipText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[700],
  },
  exerciseChipMore: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exerciseChipMoreText: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.primary[600],
  },
  heroStartButton: {
    marginTop: spacing.xs,
  },

  /* Seções Secundárias */
  subSection: {
    marginBottom: spacing.lg,
  },
  subSectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  subSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[800],
    marginBottom: spacing.xs,
  },
  subSectionSub: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
  },
  sessionsList: {
    gap: spacing.sm,
  },

  /* Card de Sessão Pendente */
  pendingCard: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  pendingIndexCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  pendingIndexText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary[500],
  },
  sessionTitleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },

  /* Card de Sessão Concluída */
  completedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  completedCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success.light,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  completedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  completedTitle: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.body,
    color: colors.ink[800],
    flex: 1,
  },
  completedRpeTag: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[600],
    backgroundColor: colors.ink[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  /* Estados Vazios de Filtro */
  emptyFilterBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  emptyFilterTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginTop: spacing.sm,
  },
  emptyFilterDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  emptyFilterBtn: {
    marginTop: spacing.md,
  },

  /* Modal de Troca de Rotinas */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.lg,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
  },
  modalCloseText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.body,
    color: colors.primary[500],
  },
  routinesListScroll: {
    marginBottom: spacing.lg,
  },
  routineOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  routineOptionItemActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  routineOptionInfo: {
    flex: 1,
  },
  routineOptionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
    marginBottom: 4,
  },
  routineOptionTitleActive: {
    color: colors.primary[500],
  },
  routineOptionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
