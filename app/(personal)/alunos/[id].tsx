import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Calendar,
  Clock,
  Dumbbell,
  AlertCircle,
  MessageSquare,
  Send,
  UserX,
  UserCheck,
  CheckCircle2,
  TrendingUp,
} from "lucide-react-native";

import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Avatar, Badge, Button, Card, Header, SportTag } from "@/src/components/ui";
import { personalService } from "@/src/services/personalService";
import type { SessaoTreinoResponseDTO, ObservacaoFeedbackResponseDTO } from "@/src/types/student";
import type { AcompanhamentoAlunoResponseDTO } from "@/src/types/personal";

export default function DetalheAlunoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acompanhamento, setAcompanhamento] = useState<AcompanhamentoAlunoResponseDTO | null>(null);
  const [historico, setHistorico] = useState<SessaoTreinoResponseDTO[]>([]);
  const [feedbacks, setFeedbacks] = useState<ObservacaoFeedbackResponseDTO[]>([]);
  const [novoFeedback, setNovoFeedback] = useState("");
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  const [mutatingStatus, setMutatingStatus] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!id) return;
    try {
      const [resAcomp, resHist, resFeedbacks] = await Promise.allSettled([
        personalService.obterAcompanhamentoAluno(id),
        personalService.obterHistoricoAluno(id),
        personalService.listarObservacoesEFeedbacks(id),
      ]);

      if (resAcomp.status === "fulfilled") setAcompanhamento(resAcomp.value);
      if (resHist.status === "fulfilled") setHistorico(resHist.value);
      if (resFeedbacks.status === "fulfilled") setFeedbacks(resFeedbacks.value);
    } catch (err) {
      console.warn("Erro ao carregar detalhes do aluno:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarDados();
  }, [carregarDados]);

  // Enviar novo feedback
  async function handleEnviarFeedback() {
    if (!id || !novoFeedback.trim()) return;

    try {
      setEnviandoFeedback(true);
      await personalService.registrarFeedback(id, novoFeedback.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNovoFeedback("");
      // Recarrega apenas feedbacks
      const res = await personalService.listarObservacoesEFeedbacks(id);
      setFeedbacks(res);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Não foi possível registrar o feedback.");
    } finally {
      setEnviandoFeedback(false);
    }
  }

  // Desativar / Reativar Aluno
  async function handleAlternarStatus(alunoId: string, isAtivo: boolean) {
    const actionName = isAtivo ? "Desativar" : "Reativar";

    Alert.alert(
      `${actionName} Aluno`,
      isAtivo
        ? "Suspender temporariamente o acesso do atleta? O histórico continuará protegido."
        : "Restabelecer o acesso do atleta aos treinos?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: actionName,
          style: isAtivo ? "destructive" : "default",
          onPress: async () => {
            try {
              setMutatingStatus(true);
              if (isAtivo) {
                await personalService.desativarAluno(alunoId);
              } else {
                await personalService.reativarAluno(alunoId);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              carregarDados();
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Erro", `Não foi possível ${actionName.toLowerCase()} o atleta.`);
            } finally {
              setMutatingStatus(false);
            }
          },
        },
      ]
    );
  }

  // Progresso de sessões
  const totalPlanejadas = acompanhamento?.totalSessoesPlanejadas || 0;
  const totalConcluidas = acompanhamento?.totalSessoesConcluidas || 0;
  const taxaConclusao = totalPlanejadas > 0 ? (totalConcluidas / totalPlanejadas) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Header
        title="Perfil do Atleta"
        showBack
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Carregando perfil e histórico do atleta...</Text>
            </View>
          ) : (
            <>
              {/* Card de Identidade do Atleta */}
              <Card variant="elevated" padding="lg" style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Avatar name={acompanhamento?.nomeAluno || "Aluno"} size="lg" />
                  <View style={styles.heroInfo}>
                    <Text style={styles.heroName}>{acompanhamento?.nomeAluno || "Aluno"}</Text>
                    <Text style={styles.heroEmail}>{acompanhamento?.emailAluno}</Text>
                    {acompanhamento?.nomeModalidade && (
                      <View style={{ marginTop: 4 }}>
                        <SportTag sport={acompanhamento.nomeModalidade} size="sm" />
                      </View>
                    )}
                  </View>
                </View>

                {/* Ações de conta */}
                <View style={styles.heroActions}>
                  <Button
                    title="Desativar Aluno"
                    variant="ghost"
                    size="sm"
                    icon={<UserX size={14} color={colors.danger.base} />}
                    loading={mutatingStatus}
                    onPress={() => id && handleAlternarStatus(id, true)}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>

              {/* Visão da Rotina Ativa & Acompanhamento */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rotina Ativa</Text>
                {acompanhamento?.rotinaAtivaId ? (
                  <Card variant="outlined" padding="md" style={styles.routineCard}>
                    <View style={styles.routineHeader}>
                      <View style={styles.routineTitleContainer}>
                        <Dumbbell size={18} color={colors.primary[500]} />
                        <Text style={styles.routineTitle}>
                          {acompanhamento.tituloRotinaAtiva || "Rotina em Andamento"}
                        </Text>
                      </View>
                      <Badge tone="success">Ativa</Badge>
                    </View>

                    {/* Barra de Progresso de Treinos */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Sessões Concluídas</Text>
                        <Text style={styles.progressCount}>
                          {totalConcluidas} de {totalPlanejadas} ({Math.round(taxaConclusao)}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(taxaConclusao, 100)}%` },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Métricas Pendentes */}
                    {acompanhamento.quantidadeMetricasPendentes > 0 && (
                      <View style={styles.pendenciasAlert}>
                        <AlertCircle size={16} color={colors.warning.dark} />
                        <Text style={styles.pendenciasText}>
                          {acompanhamento.quantidadeMetricasPendentes} métrica(s) pendente(s) de validação pelo personal.
                        </Text>
                      </View>
                    )}
                  </Card>
                ) : (
                  <Card variant="flat" padding="md" style={styles.emptyRoutineCard}>
                    <Dumbbell size={24} color={colors.ink[400]} />
                    <Text style={styles.emptyRoutineText}>
                      Este atleta não possui uma rotina de treino ativa no momento.
                    </Text>
                  </Card>
                )}
              </View>

              {/* Histórico de Treinos Realizados */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Histórico de Treinos</Text>
                  <Badge tone="neutral">{historico.length} executado(s)</Badge>
                </View>

                {historico.length === 0 ? (
                  <Card variant="flat" padding="md" style={styles.emptyHistoryCard}>
                    <Clock size={20} color={colors.ink[400]} />
                    <Text style={styles.emptyHistoryText}>
                      Nenhum treino realizado foi registrado ainda.
                    </Text>
                  </Card>
                ) : (
                  historico.map((sessao) => (
                    <Card
                      key={sessao.id}
                      variant="outlined"
                      padding="md"
                      style={styles.sessionCard}
                    >
                      <View style={styles.sessionCardHeader}>
                        <View style={styles.sessionDateGroup}>
                          <Calendar size={14} color={colors.primary[500]} />
                          <Text style={styles.sessionDate}>
                            {sessao.dataReal || sessao.dataPlanejada}
                          </Text>
                        </View>
                        <Badge tone="success" icon={<CheckCircle2 size={12} color={colors.success.base} />}>
                          Concluído
                        </Badge>
                      </View>

                      {/* Duração & RPE */}
                      <View style={styles.sessionMetricsRow}>
                        {sessao.duracao !== undefined && sessao.duracao !== null && (
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Duração:</Text>
                            <Text style={styles.metricValue}>{sessao.duracao} min</Text>
                          </View>
                        )}

                        {sessao.desempenho?.nivelCansaco !== undefined &&
                          sessao.desempenho?.nivelCansaco !== null && (
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel}>RPE (Borg):</Text>
                              <Text style={styles.metricValue}>
                                {sessao.desempenho.nivelCansaco}/10
                              </Text>
                            </View>
                          )}
                      </View>

                      {/* Métricas registradas */}
                      {sessao.desempenho?.metricas && sessao.desempenho.metricas.length > 0 && (
                        <View style={styles.recordedMetricsList}>
                          {sessao.desempenho.metricas.map((m) => (
                            <View key={m.id} style={styles.recordedMetricChip}>
                              <Text style={styles.recordedMetricTitle}>
                                {m.tituloMetrica}:
                              </Text>
                              <Text style={styles.recordedMetricVal}>{m.valor}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </Card>
                  ))
                )}
              </View>

              {/* Feedbacks e Observações Imutáveis */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Mural de Feedbacks</Text>
                  <Badge tone="info">{feedbacks.length}</Badge>
                </View>

                {/* Caixa de Novo Feedback */}
                <Card variant="outlined" padding="sm" style={styles.feedbackInputCard}>
                  <TextInput
                    style={styles.feedbackInput}
                    placeholder="Escreva uma orientação ou feedback sobre a evolução do atleta..."
                    placeholderTextColor={colors.ink[400]}
                    value={novoFeedback}
                    onChangeText={setNovoFeedback}
                    multiline
                  />
                  <View style={styles.feedbackActionRow}>
                    <Button
                      title="Enviar Feedback"
                      variant="primary"
                      size="sm"
                      icon={<Send size={14} color={colors.surface} />}
                      loading={enviandoFeedback}
                      disabled={enviandoFeedback || !novoFeedback.trim()}
                      onPress={handleEnviarFeedback}
                      fullWidth={false}
                    />
                  </View>
                </Card>

                {/* Lista de Feedbacks */}
                {feedbacks.length === 0 ? (
                  <Text style={styles.emptyFeedbackText}>
                    Nenhum feedback registrado ainda. Envie o primeiro acima.
                  </Text>
                ) : (
                  feedbacks.map((fb) => (
                    <Card key={fb.id} variant="flat" padding="md" style={styles.feedbackCard}>
                      <View style={styles.feedbackHeader}>
                        <Text style={styles.feedbackAuthor}>{fb.autorNome}</Text>
                        <Text style={styles.feedbackDate}>
                          {new Date(fb.criadoEm).toLocaleDateString("pt-BR")}
                        </Text>
                      </View>
                      <Text style={styles.feedbackBody}>{fb.conteudo}</Text>
                    </Card>
                  ))
                )}
              </View>
            </>
          )}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
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
  heroCard: {
    backgroundColor: colors.surface,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
  },
  heroEmail: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  routineCard: {
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  routineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routineTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  routineTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  progressContainer: {
    gap: spacing.xs,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[600],
  },
  progressCount: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.primary[600],
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ink[100],
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary[500],
    borderRadius: 4,
  },
  pendenciasAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning.light,
    padding: spacing.sm,
    borderRadius: radii.control,
  },
  pendenciasText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.warning.dark,
  },
  emptyRoutineCard: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  emptyRoutineText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    textAlign: "center",
  },
  emptyHistoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  emptyHistoryText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  sessionCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  sessionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionDateGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sessionDate: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[800],
  },
  sessionMetricsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: 2,
  },
  metricItem: {
    flexDirection: "row",
    gap: 4,
  },
  metricLabel: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  metricValue: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.ink[800],
  },
  recordedMetricsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
  recordedMetricChip: {
    flexDirection: "row",
    backgroundColor: colors.ink[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.control,
    gap: 4,
  },
  recordedMetricTitle: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[600],
  },
  recordedMetricVal: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.primary[600],
  },
  feedbackInputCard: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  feedbackInput: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
    minHeight: 60,
    padding: spacing.xs,
    textAlignVertical: "top",
  },
  feedbackActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  feedbackCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedbackAuthor: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.ink[800],
  },
  feedbackDate: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
  },
  feedbackBody: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[700],
    lineHeight: 20,
  },
  emptyFeedbackText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});
