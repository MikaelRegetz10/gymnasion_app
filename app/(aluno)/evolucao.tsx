import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import {
  TrendingUp,
  Activity,
  Flame,
  Clock,
  Percent,
  CheckCircle2,
  TrendingDown,
  Minus,
} from "lucide-react-native";

import { alunoService } from "@/src/services/alunoService";
import type { DashboardEvolucaoResponseDTO } from "@/src/types/student";
import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Card, Badge, SportTag, SvgLineChart, EmptyState } from "@/src/components/ui";

function formatPointDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length >= 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr.slice(5);
  } catch {
    return dateStr;
  }
}

export default function AlunoEvolucaoScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardEvolucaoResponseDTO | null>(null);

  const loadEvolution = useCallback(async () => {
    try {
      const data = await alunoService.consultarEvolucao();
      setDashboard(data);
    } catch {
      // Mantém estado resiliente em caso de falha de rede
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recarrega automaticamente ao focar na aba de evolução
  useFocusEffect(
    useCallback(() => {
      loadEvolution();
    }, [loadEvolution])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadEvolution();
  }

  const rpePoints =
    dashboard?.evolucaoRpe?.pontos?.map((p) => ({
      label: formatPointDate(p.data),
      value: p.nivelCansaco,
    })) || [];

  const resumo = dashboard?.resumoGeral;
  const hasData = dashboard?.possuiDadosSuficientes;

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
        {/* Cabeçalho da Tela */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>Minha Evolução</Text>
            {dashboard?.modalidade && (
              <SportTag sport={dashboard.modalidade.nome} size="sm" />
            )}
          </View>
          <Text style={styles.subtitle}>
            Progresso de carga, desempenho e percepção de esforço
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Calculando suas métricas...</Text>
          </View>
        ) : !hasData && rpePoints.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Ainda sem registros suficientes"
            description="Conclua suas sessões de treinamento informando a percepção de esforço (RPE) para visualizar seus gráficos de linha e tendências."
            actionLabel="Atualizar gráficos"
            onAction={onRefresh}
          />
        ) : (
          <>
            {/* Cartões de Resumo Geral (Grid 3 Colunas Responsivo) */}
            {resumo && (
              <View style={styles.summaryGrid}>
                <Card variant="elevated" padding="sm" style={styles.summaryCard}>
                  <View style={styles.summaryIconCircle}>
                    <CheckCircle2 size={16} color={colors.success.base} />
                  </View>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {resumo.totalSessoesConcluidasPeriodo}
                  </Text>
                  <Text style={styles.summaryLabel} numberOfLines={1}>
                    Treinos Feitos
                  </Text>
                </Card>

                <Card variant="elevated" padding="sm" style={styles.summaryCard}>
                  <View style={[styles.summaryIconCircle, { backgroundColor: colors.info.light }]}>
                    <Clock size={16} color={colors.info.base} />
                  </View>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {resumo.duracaoMediaMinutos ? Math.round(resumo.duracaoMediaMinutos) : 0} min
                  </Text>
                  <Text style={styles.summaryLabel} numberOfLines={1}>
                    Média Duração
                  </Text>
                </Card>

                <Card variant="elevated" padding="sm" style={styles.summaryCard}>
                  <View style={[styles.summaryIconCircle, { backgroundColor: colors.primary[50] }]}>
                    <Percent size={16} color={colors.primary[500]} />
                  </View>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {resumo.taxaAdesaoPercentual ? `${Math.round(resumo.taxaAdesaoPercentual)}%` : "0%"}
                  </Text>
                  <Text style={styles.summaryLabel} numberOfLines={1}>
                    Adesão
                  </Text>
                </Card>
              </View>
            )}

            {/* Gráfico 1: Evolução do Esforço Percebido (RPE) */}
            <Card variant="elevated" padding="md" style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleContainer}>
                  <Text style={styles.chartTitle}>Percepção de Esforço (RPE)</Text>
                  <Text style={styles.chartSubtitle}>
                    Média de cansaço informado na escala Borg CR-10
                  </Text>
                </View>

                {dashboard?.evolucaoRpe?.mediaRpe !== undefined && dashboard.evolucaoRpe.mediaRpe > 0 && (
                  <Badge tone="warning" style={styles.headerBadge}>
                    Média {dashboard.evolucaoRpe.mediaRpe.toFixed(1)}/10
                  </Badge>
                )}
              </View>

              <SvgLineChart
                data={rpePoints}
                color={colors.primary[500]}
                height={190}
                yAxisSuffix=""
                emptyMessage="Nenhuma sessão com RPE concluída ainda"
              />
            </Card>

            {/* Gráficos das Métricas Personalizadas da Modalidade */}
            {dashboard?.metricas && dashboard.metricas.length > 0 && (
              <View style={styles.metricsSection}>
                <Text style={styles.metricsSectionTitle}>
                  Métricas da Modalidade
                </Text>

                {dashboard.metricas.map((m) => {
                  const points = m.pontos.map((p) => ({
                    label: formatPointDate(p.data),
                    value: p.valorNumerico || parseFloat(p.valor) || 0,
                  }));

                  const isImprovement = m.tendencia?.direcao === "MELHORIA";
                  const isRegression = m.tendencia?.direcao === "REGRESSAO";

                  return (
                    <Card key={m.metricaId} variant="elevated" padding="md" style={styles.metricCard}>
                      <View style={styles.chartHeader}>
                        <View style={styles.chartTitleContainer}>
                          <Text style={styles.chartTitle}>{m.titulo}</Text>
                          <Text style={styles.chartSubtitle} numberOfLines={2}>
                            {m.tendencia?.resumo || "Evolução temporal das sessões"}
                          </Text>
                        </View>

                        {m.tendencia && (
                          <Badge
                            tone={isImprovement ? "success" : isRegression ? "danger" : "neutral"}
                            style={styles.headerBadge}
                            icon={
                              isImprovement ? (
                                <TrendingUp size={12} color={colors.success.dark} />
                              ) : isRegression ? (
                                <TrendingDown size={12} color={colors.danger.dark} />
                              ) : (
                                <Minus size={12} color={colors.ink[700]} />
                              )
                            }
                          >
                            {m.tendencia.percentualVariacao !== undefined
                              ? `${m.tendencia.percentualVariacao > 0 ? "+" : ""}${m.tendencia.percentualVariacao.toFixed(1)}%`
                              : m.tendencia.direcao}
                          </Badge>
                        )}
                      </View>

                      <SvgLineChart
                        data={points}
                        color={colors.info.base}
                        height={180}
                        emptyMessage="Ainda sem registros para esta métrica"
                      />
                    </Card>
                  );
                })}
              </View>
            )}
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
    paddingBottom: 120, // Folga adequada para não sobrepor o menu inferior flutuante
  },
  header: {
    marginBottom: spacing.base,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
    flex: 1,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
    lineHeight: 18,
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

  /* Resumo Geral 3 Colunas */
  summaryGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
  },
  summaryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success.light,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  summaryValue: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.ink[900],
    textAlign: "center",
  },
  summaryLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
    textAlign: "center",
  },

  /* Cards de Gráfico */
  chartCard: {
    marginBottom: spacing.base,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  chartTitleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  chartTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  chartSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
    lineHeight: 16,
  },
  headerBadge: {
    flexShrink: 0,
    alignSelf: "flex-start",
  },

  /* Seção de Métricas */
  metricsSection: {
    marginTop: spacing.xs,
  },
  metricsSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: spacing.sm,
  },
  metricCard: {
    marginBottom: spacing.base,
  },
});
