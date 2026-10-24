import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  CheckCircle2,
  Circle,
  Timer,
  Calendar,
  Clock,
  Sparkles,
  Info,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";

import { alunoService } from "@/src/services/alunoService";
import type {
  FormularioExecucaoResponseDTO,
  RegistrarResultadoMetricaDTO,
} from "@/src/types/student";
import { parseAtividades } from "@/src/utils/activityParser";
import { colors, fonts, radii, spacing, typography, shadows } from "@/src/theme/tokens";
import { Button, Card, Badge, Header, FormField } from "@/src/components/ui";
import RestTimerModal from "@/src/components/workout/RestTimerModal";
import RpePickerSheet from "@/src/components/workout/RpePickerSheet";
import { handleApiError } from "@/src/utils/handleApiError";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Mantém a tela ligada durante o treino na academia
  useKeepAwake();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormularioExecucaoResponseDTO | null>(null);
  const [checkedExercises, setCheckedExercises] = useState<Record<string, boolean>>({});

  // Modais de Execução
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [rpeSheetVisible, setRpeSheetVisible] = useState(false);

  // Estado do Checkout de Conclusão
  const [realDuration, setRealDuration] = useState("50");
  const [selectedRpe, setSelectedRpe] = useState<number | null>(7);
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function loadSession() {
    if (!id) return;
    try {
      const data = await alunoService.obterFormularioExecucao(id);
      setFormData(data);
      if (data.sessao.duracao) {
        setRealDuration(String(data.sessao.duracao));
      }
      if (data.sessao.desempenho?.nivelCansaco) {
        setSelectedRpe(data.sessao.desempenho.nivelCansaco);
      }
    } catch (err) {
      const parsed = handleApiError(err, "Não foi possível carregar a sessão.");
      Alert.alert("Erro", parsed.message, [{ text: "Voltar", onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, [id]);

  function toggleExercise(actId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedExercises((prev) => ({
      ...prev,
      [actId]: !prev[actId],
    }));
  }

  async function handleFinishWorkout() {
    if (!id) return;
    setSubmitting(true);
    setSubmitError(null);

    const resultados: RegistrarResultadoMetricaDTO[] = [];
    if (formData?.metricas) {
      for (const m of formData.metricas) {
        const val = metricValues[m.id];
        if (val && val.trim()) {
          resultados.push({ metricaId: m.id, valor: val.trim() });
        }
      }
    }

    try {
      await alunoService.registrarExecucao(id, {
        dataReal: new Date().toISOString().split("T")[0],
        duracao: parseInt(realDuration, 10) || 50,
        nivelCansaco: selectedRpe || undefined,
        resultados: resultados.length > 0 ? resultados : undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFinishModalVisible(false);
      Alert.alert(
        "Treino Concluído!",
        "Seus resultados e percepção de esforço foram salvos e enviados ao seu Personal Trainer.",
        [{ text: "OK", onPress: () => loadSession() }]
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const parsed = handleApiError(err, "Falha ao registrar a execução do treino.");
      setSubmitError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !formData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Carregando treino" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  const { sessao, registroPermitido, metricas } = formData;
  const parsed = parseAtividades(sessao.atividades);
  const isCompleted = sessao.status === "CONCLUIDA";
  const completedExercisesCount = Object.values(checkedExercises).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Header
        title={parsed.sessionName}
        subtitle={`Semana ${sessao.semana} · ${sessao.dataPlanejada}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Status Card */}
        <Card variant="elevated" padding="md" style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusHeading}>{parsed.sessionName}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Calendar size={14} color={colors.ink[400]} />
                  <Text style={styles.metaText}>{sessao.dataPlanejada}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={14} color={colors.ink[400]} />
                  <Text style={styles.metaText}>{sessao.duracao || 60} minutos</Text>
                </View>
              </View>
            </View>
            <Badge tone={isCompleted ? "success" : "info"}>
              {isCompleted ? "Concluído" : "Em Aberto"}
            </Badge>
          </View>

          {isCompleted && sessao.desempenho && (
            <View style={styles.completedNotice}>
              <Text style={styles.completedTitle}>Treino Realizado!</Text>
              <Text style={styles.completedText}>
                Registrado em {sessao.dataReal || sessao.dataPlanejada} com RPE {sessao.desempenho.nivelCansaco}/10.
              </Text>
            </View>
          )}
        </Card>

        {/* Orientações do Treinador */}
        {parsed.orientations ? (
          <View style={styles.orientationsBox}>
            <Info size={16} color={colors.primary[500]} style={styles.infoIcon} />
            <Text style={styles.orientationsText}>{parsed.orientations}</Text>
          </View>
        ) : null}

        {/* Checklist de Exercícios */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Exercícios Programados</Text>
          {!isCompleted && parsed.activities.length > 0 && (
            <Text style={styles.checklistProgress}>
              {completedExercisesCount}/{parsed.activities.length} séries feitas
            </Text>
          )}
        </View>

        <View style={styles.activitiesList}>
          {parsed.activities.map((act, index) => {
            const isChecked = Boolean(checkedExercises[act.id]) || isCompleted;

            return (
              <TouchableOpacity
                key={act.id}
                style={[styles.activityItem, isChecked && styles.activityItemChecked]}
                onPress={() => !isCompleted && toggleExercise(act.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkCircle, isChecked && styles.checkCircleActive]}>
                  {isChecked ? (
                    <Check size={16} color={colors.surface} />
                  ) : (
                    <Text style={styles.exerciseIndex}>{index + 1}</Text>
                  )}
                </View>

                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, isChecked && styles.activityTitleChecked]}>
                    {act.title}
                  </Text>
                  {act.description ? (
                    <Text style={styles.activityDesc}>{act.description}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Métricas Registradas (se concluído) */}
        {isCompleted && sessao.desempenho?.metricas && sessao.desempenho.metricas.length > 0 && (
          <Card variant="outlined" padding="md" style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Métricas Registradas</Text>
            {sessao.desempenho.metricas.map((m) => (
              <View key={m.id} style={styles.resultRow}>
                <Text style={styles.resultLabel}>{m.tituloMetrica}</Text>
                <Text style={styles.resultValue}>{m.valor}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Floating Bottom Bar para Treino ao Vivo */}
      {!isCompleted && registroPermitido && (
        <View style={styles.stickyFooter}>
          <Button
            title="Descanso"
            variant="secondary"
            size="md"
            icon={<Timer size={18} color={colors.primary[600]} />}
            onPress={() => setTimerModalVisible(true)}
            style={styles.restBtn}
            fullWidth={false}
          />

          <Button
            title="Finalizar Treino"
            variant="primary"
            size="md"
            icon={<CheckCircle2 size={18} color={colors.surface} />}
            onPress={() => setFinishModalVisible(true)}
            style={styles.finishBtn}
            fullWidth={false}
          />
        </View>
      )}

      {/* Modal de Cronômetro de Descanso */}
      <RestTimerModal
        visible={timerModalVisible}
        onClose={() => setTimerModalVisible(false)}
      />

      {/* Sheet de Escolha de RPE */}
      <RpePickerSheet
        visible={rpeSheetVisible}
        value={selectedRpe}
        onChange={(val) => {
          setSelectedRpe(val);
          setRpeSheetVisible(false);
        }}
        onClose={() => setRpeSheetVisible(false)}
      />

      {/* Modal de Conclusão / Checkout */}
      <Modal visible={finishModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.checkoutSheet}>
            <Text style={styles.checkoutTitle}>Concluir Treinamento</Text>
            <Text style={styles.checkoutSubtitle}>
              Confirme a duração real e como se sentiu durante o treino.
            </Text>

            {submitError && (
              <View style={styles.checkoutError}>
                <Text style={styles.checkoutErrorText}>{submitError}</Text>
              </View>
            )}

            <ScrollView style={styles.checkoutScroll}>
              <FormField
                label="Duração Real (minutos)"
                placeholder="Ex: 50"
                keyboardType="numeric"
                value={realDuration}
                onChangeText={setRealDuration}
                leftIcon={<Clock size={18} color={colors.ink[400]} />}
              />

              {/* Botão Seletor de RPE */}
              <Text style={styles.rpeLabel}>Nível de Esforço (RPE Borg CR-10)</Text>
              <TouchableOpacity
                style={styles.rpeButton}
                onPress={() => setRpeSheetVisible(true)}
              >
                <View style={styles.rpeSelectedBadge}>
                  <Text style={styles.rpeNumber}>{selectedRpe || "?"}</Text>
                </View>
                <View style={styles.rpeButtonTextContainer}>
                  <Text style={styles.rpeButtonTitle}>
                    {selectedRpe ? `Nível ${selectedRpe} de 10` : "Toque para definir o esforço"}
                  </Text>
                  <Text style={styles.rpeButtonSub}>Toque para alterar na escala</Text>
                </View>
              </TouchableOpacity>

              {/* Inputs de Métricas Configuradas */}
              {metricas && metricas.length > 0 && (
                <View style={styles.metricsFormBlock}>
                  <Text style={styles.metricsFormTitle}>Métricas da Sessão</Text>
                  {metricas
                    .filter((m) => m.quemPreenche === "ALUNO" || m.quemPreenche === "AMBOS")
                    .map((m) => (
                      <FormField
                        key={m.id}
                        label={`${m.titulo}${m.unidade ? ` (${m.unidade})` : ""}`}
                        placeholder={m.tipo === "NUMERICO" ? "Ex: 80" : "Ex: 01:15"}
                        keyboardType={m.tipo === "NUMERICO" ? "decimal-pad" : "default"}
                        value={metricValues[m.id] || ""}
                        onChangeText={(val) =>
                          setMetricValues((prev) => ({ ...prev, [m.id]: val }))
                        }
                      />
                    ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.checkoutActions}>
              <Button
                title="Confirmar Conclusão"
                variant="primary"
                size="md"
                loading={submitting}
                onPress={handleFinishWorkout}
              />
              <Button
                title="Voltar ao Treino"
                variant="ghost"
                size="sm"
                onPress={() => setFinishModalVisible(false)}
                style={{ marginTop: spacing.xs }}
              />
            </View>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 3,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    marginBottom: spacing.base,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statusHeading: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  completedNotice: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completedTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.success.dark,
  },
  completedText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
    marginTop: 2,
  },
  orientationsBox: {
    flexDirection: "row",
    backgroundColor: colors.primary[50],
    borderRadius: radii.control,
    padding: spacing.md,
    marginBottom: spacing.base,
    alignItems: "flex-start",
  },
  infoIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  orientationsText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  checklistProgress: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    color: colors.primary[500],
  },
  activitiesList: {
    gap: spacing.sm,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityItemChecked: {
    backgroundColor: colors.success.light,
    borderColor: colors.success.base,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink[300],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  checkCircleActive: {
    backgroundColor: colors.success.base,
  },
  exerciseIndex: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.surface,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  activityTitleChecked: {
    color: colors.success.dark,
    textDecorationLine: "line-through",
  },
  activityDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
  },
  resultsCard: {
    marginTop: spacing.lg,
  },
  resultsTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: spacing.sm,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultLabel: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
  },
  resultValue: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.ink[900],
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    ...shadows.lg,
  },
  restBtn: {
    flex: 1,
  },
  finishBtn: {
    flex: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  checkoutSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: "85%",
  },
  checkoutTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
  },
  checkoutSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
    marginBottom: spacing.base,
  },
  checkoutError: {
    backgroundColor: colors.danger.light,
    padding: spacing.sm,
    borderRadius: radii.control,
    marginBottom: spacing.sm,
  },
  checkoutErrorText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.danger.dark,
  },
  checkoutScroll: {
    marginBottom: spacing.base,
  },
  rpeLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
    marginBottom: 6,
  },
  rpeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  rpeSelectedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  rpeNumber: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.surface,
  },
  rpeButtonTextContainer: {
    flex: 1,
  },
  rpeButtonTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  rpeButtonSub: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },
  metricsFormBlock: {
    marginTop: spacing.sm,
  },
  metricsFormTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: spacing.sm,
  },
  checkoutActions: {
    gap: spacing.xs,
  },
});
