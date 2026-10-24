import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Dumbbell, Calendar, Clock, ChevronRight, CheckCircle2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { alunoService } from "@/src/services/alunoService";
import type {
  RotinaTreinoResponseDTO,
  PlanejamentoRotinaResponseDTO,
  SessaoTreinoResponseDTO,
} from "@/src/types/student";
import { parseAtividades } from "@/src/utils/activityParser";
import { colors, fonts, radii, spacing, typography, shadows } from "@/src/theme/tokens";
import { Card, Badge, SportTag, EmptyState } from "@/src/components/ui";

export default function AlunoTreinosIndex() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rotinas, setRotinas] = useState<RotinaTreinoResponseDTO[]>([]);
  const [activeRoutine, setActiveRoutine] = useState<RotinaTreinoResponseDTO | null>(null);
  const [planejamento, setPlanejamento] = useState<PlanejamentoRotinaResponseDTO | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  async function loadData() {
    try {
      const rotinasList = await alunoService.listarRotinas();
      setRotinas(rotinasList);

      if (rotinasList.length > 0) {
        const routine = rotinasList[0];
        setActiveRoutine(routine);

        const plan = await alunoService.consultarPlanejamento(routine.id);
        setPlanejamento(plan);

        if (plan?.semanas?.length > 0) {
          setSelectedWeek(plan.semanas[0].numeroSemana);
        }
      }
    } catch {
      // Falha ao carregar
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
    await loadData();
  }

  const currentWeekData = planejamento?.semanas?.find(
    (w) => w.numeroSemana === selectedWeek
  );

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
        <Text style={styles.title}>Meus Treinos</Text>
        <Text style={styles.subtitle}>
          Rotinas organizadas por semanas e sessões programadas
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Buscando seu planejamento...</Text>
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
            {/* Resumo da Rotina Ativa */}
            <Card variant="elevated" padding="md" style={styles.routineHeaderCard}>
              <View style={styles.routineHeaderTop}>
                <SportTag sport={activeRoutine.modalidade?.nome} />
                <Badge tone="success">Ativa</Badge>
              </View>
              <Text style={styles.routineTitle}>{activeRoutine.titulo}</Text>
              {activeRoutine.objetivos && (
                <Text style={styles.routineDesc}>{activeRoutine.objetivos}</Text>
              )}
            </Card>

            {/* Seletor de Semanas */}
            <Text style={styles.sectionHeading}>Semanas do Treinamento</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weeksScroll}
            >
              {planejamento.semanas?.map((w) => {
                const isSelected = selectedWeek === w.numeroSemana;
                const completedCount = w.sessoes.filter(
                  (s) => s.status === "CONCLUIDA"
                ).length;

                return (
                  <TouchableOpacity
                    key={w.numeroSemana}
                    style={[styles.weekPill, isSelected && styles.weekPillActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedWeek(w.numeroSemana);
                    }}
                  >
                    <Text
                      style={[
                        styles.weekPillText,
                        isSelected && styles.weekPillTextActive,
                      ]}
                    >
                      Semana {w.numeroSemana}
                    </Text>
                    <Text
                      style={[
                        styles.weekPillSub,
                        isSelected && styles.weekPillSubActive,
                      ]}
                    >
                      {completedCount}/{w.sessoes.length} feitas
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Lista de Sessões da Semana Selecionada */}
            <View style={styles.sessionsList}>
              {currentWeekData?.sessoes?.map((sessao, index) => {
                const parsed = parseAtividades(sessao.atividades);
                const isCompleted = sessao.status === "CONCLUIDA";

                return (
                  <Card
                    key={sessao.id}
                    variant="elevated"
                    padding="md"
                    style={[
                      styles.sessionCard,
                      isCompleted && styles.sessionCardCompleted,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/(aluno)/treinos/${sessao.id}`);
                    }}
                  >
                    <View style={styles.sessionCardHeader}>
                      <View style={styles.sessionIndexBadge}>
                        <Text style={styles.sessionIndexText}>{index + 1}</Text>
                      </View>
                      <View style={styles.sessionTitleContainer}>
                        <Text style={styles.sessionTitle}>
                          {parsed.sessionName || `Sessão ${index + 1}`}
                        </Text>
                        <View style={styles.sessionMetaRow}>
                          <View style={styles.metaItem}>
                            <Calendar size={13} color={colors.ink[400]} />
                            <Text style={styles.metaText}>
                              {sessao.dataPlanejada}
                            </Text>
                          </View>
                          {sessao.duracao && (
                            <View style={styles.metaItem}>
                              <Clock size={13} color={colors.ink[400]} />
                              <Text style={styles.metaText}>
                                {sessao.duracao} min
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Badge
                        tone={isCompleted ? "success" : "info"}
                        icon={
                          isCompleted ? (
                            <CheckCircle2 size={12} color={colors.success.dark} />
                          ) : undefined
                        }
                      >
                        {isCompleted ? "Concluído" : "Planejado"}
                      </Badge>
                    </View>

                    {parsed.activities.length > 0 && (
                      <View style={styles.exercisesPreview}>
                        <Text style={styles.exercisesCount}>
                          {parsed.activities.length} exercício(s) programado(s)
                        </Text>
                      </View>
                    )}

                    <View style={styles.cardFooter}>
                      <Text style={styles.tapToOpen}>
                        {isCompleted ? "Ver histórico da sessão" : "Iniciar treinamento"}
                      </Text>
                      <ChevronRight size={16} color={colors.primary[500]} />
                    </View>
                  </Card>
                );
              })}
            </View>
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
  routineHeaderCard: {
    marginBottom: spacing.lg,
  },
  routineHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
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
    color: colors.ink[500],
    lineHeight: 18,
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: spacing.sm,
  },
  weeksScroll: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  weekPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  },
  sessionsList: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  sessionCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
  },
  sessionCardCompleted: {
    borderLeftColor: colors.success.base,
  },
  sessionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  sessionIndexText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary[500],
  },
  sessionTitleContainer: {
    flex: 1,
  },
  sessionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  sessionMetaRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 3,
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
  exercisesPreview: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exercisesCount: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  tapToOpen: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    color: colors.primary[500],
  },
});
