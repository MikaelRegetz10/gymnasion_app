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
  AlertCircle,
  Heart,
  Activity,
  Layers,
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
import { handleApiError } from "@/src/utils/handleApiError";

const RPE_LEVELS = [
  { val: 1, label: "Muito leve", desc: "Esforço quase imperceptível", color: colors.success.base },
  { val: 2, label: "Leve", desc: "Respiração normal, ritmo confortável", color: colors.success.base },
  { val: 3, label: "Moderado", desc: "Ritmo constante, conversa fácil", color: colors.info.base },
  { val: 4, label: "Levemente difícil", desc: "Aceleração da respiração", color: colors.info.base },
  { val: 5, label: "Difícil", desc: "Conversa em frases curtas", color: colors.warning.base },
  { val: 6, label: "Desafiador", desc: "Sensação clara de fadiga muscular", color: colors.warning.base },
  { val: 7, label: "Muito difícil", desc: "Esforço intenso, poucas palavras", color: colors.primary[500] },
  { val: 8, label: "Muito pesado", desc: "Foco total na execução", color: colors.primary[600] },
  { val: 9, label: "Quase exaustivo", desc: "No limite, quase sem fôlego", color: colors.danger.base },
  { val: 10, label: "Esforço Máximo", desc: "Exaustão total, limite atingido", color: colors.danger.dark },
];

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

  // Estado do Checkout de Conclusão
  const [realDuration, setRealDuration] = useState("50");
  const [selectedRpe, setSelectedRpe] = useState<number>(7);
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  function handleRpeSelect(levelVal: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRpe(levelVal);
  }

  async function handleFinishWorkout() {
    if (!id) return;

    setSubmitError(null);
    const errors: Record<string, string> = {};

    // 1. Validação de Duração Real
    const duracaoNum = parseInt(realDuration, 10);
    if (!realDuration || isNaN(duracaoNum) || duracaoNum <= 0) {
      errors["duracao"] = "Informe a duração real em minutos (mínimo 1 minuto).";
    }

    // 2. Validação das Métricas do Aluno (conforme regras de negócio RN-015 / US-22)
    const resultados: RegistrarResultadoMetricaDTO[] = [];
    if (formData?.metricas) {
      for (const m of formData.metricas) {
        if (m.quemPreenche === "PERSONAL") continue;

        const rawVal = metricValues[m.id]?.trim() || "";

        // Verificação de métricas obrigatórias
        if (m.obrigatoria && !rawVal) {
          errors[m.id] = `A métrica '${m.titulo}' é obrigatória e deve ser preenchida.`;
          continue;
        }

        if (rawVal) {
          if (m.tipo === "TEMPO") {
            const tempoRegex = /^\d{2,}:[0-5]\d$/;
            if (!tempoRegex.test(rawVal)) {
              errors[m.id] = `Formato inválido para '${m.titulo}'. Use mm:ss (ex: 05:30 ou 01:15).`;
            }
          } else if (m.tipo === "FREQUENCIA_CARDIACA") {
            const bpm = parseInt(rawVal, 10);
            if (isNaN(bpm) || bpm < 30 || bpm > 250) {
              errors[m.id] = `Frequência cardíaca para '${m.titulo}' deve estar entre 30 e 250 bpm.`;
            }
          } else if (m.tipo === "NUMERICO") {
            const num = Number(rawVal.replace(",", "."));
            if (isNaN(num)) {
              errors[m.id] = `Valor inválido para '${m.titulo}'. Deve ser um número (ex: 10 ou 10.5).`;
            }
          }

          resultados.push({ metricaId: m.id, valor: rawVal });
        }
      }
    }

    // Se houver erros client-side, interrompe a requisição e destaca os campos
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError(
        "Existem campos com valores inválidos ou não preenchidos. Corrija os itens destacados abaixo."
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

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

      if (parsed.invalidFields && Object.keys(parsed.invalidFields).length > 0) {
        setFieldErrors(parsed.invalidFields);
      }
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
  const activeRpeLevel = RPE_LEVELS.find((l) => l.val === selectedRpe) || RPE_LEVELS[6];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Header
        title={parsed.sessionName || `Sessão ${sessao.semana}`}
        subtitle={`Semana ${sessao.semana} · ${sessao.dataPlanejada}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Status Card */}
        <Card variant="elevated" padding="md" style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusHeading}>{parsed.sessionName || "Treino Programado"}</Text>
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
            onPress={() => {
              setSubmitError(null);
              setFieldErrors({});
              setFinishModalVisible(true);
            }}
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

      {/* Modal de Conclusão / Checkout */}
      <Modal visible={finishModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.checkoutSheet}>
            <Text style={styles.checkoutTitle}>Concluir Treinamento</Text>
            <Text style={styles.checkoutSubtitle}>
              Confirme a duração real e como se sentiu durante o treino.
            </Text>

            {/* Banner de Erros com Lista Detalhada */}
            {submitError && (
              <View style={styles.checkoutError}>
                <View style={styles.checkoutErrorHeader}>
                  <AlertCircle size={16} color={colors.danger.dark} />
                  <Text style={styles.checkoutErrorTitle}>Atenção aos dados informados</Text>
                </View>
                <Text style={styles.checkoutErrorText}>{submitError}</Text>
                {Object.keys(fieldErrors).length > 0 && (
                  <View style={styles.errorBulletContainer}>
                    {Object.entries(fieldErrors).map(([key, msg]) => (
                      <Text key={key} style={styles.errorBulletItem}>
                        • {msg}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            <ScrollView style={styles.checkoutScroll} showsVerticalScrollIndicator={false}>
              {/* Campo Duração Real */}
              <FormField
                label="Duração Real (minutos) *"
                placeholder="Ex: 50"
                keyboardType="numeric"
                value={realDuration}
                error={fieldErrors["duracao"]}
                hint="Tempo total de treino em minutos"
                onChangeText={(val) => {
                  setRealDuration(val);
                  if (fieldErrors["duracao"]) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy["duracao"];
                      return copy;
                    });
                  }
                }}
                leftIcon={<Clock size={18} color={colors.ink[400]} />}
              />

              {/* Seletor Inline de RPE Borg CR-10 (1 a 10) */}
              <View style={styles.rpeSection}>
                <Text style={styles.rpeLabel}>Nível de Esforço (RPE Borg CR-10) *</Text>
                <Text style={styles.rpeSubLabel}>Toque em um número de 1 a 10:</Text>

                {/* Grid de 10 Pílulas Interativas */}
                <View style={styles.rpeGrid}>
                  <View style={styles.rpeRow}>
                    {RPE_LEVELS.slice(0, 5).map((item) => {
                      const isSelected = selectedRpe === item.val;
                      return (
                        <TouchableOpacity
                          key={item.val}
                          style={[
                            styles.rpePill,
                            isSelected && {
                              backgroundColor: item.color,
                              borderColor: item.color,
                            },
                          ]}
                          onPress={() => handleRpeSelect(item.val)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.rpePillText,
                              isSelected && styles.rpePillTextSelected,
                            ]}
                          >
                            {item.val}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.rpeRow}>
                    {RPE_LEVELS.slice(5, 10).map((item) => {
                      const isSelected = selectedRpe === item.val;
                      return (
                        <TouchableOpacity
                          key={item.val}
                          style={[
                            styles.rpePill,
                            isSelected && {
                              backgroundColor: item.color,
                              borderColor: item.color,
                            },
                          ]}
                          onPress={() => handleRpeSelect(item.val)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.rpePillText,
                              isSelected && styles.rpePillTextSelected,
                            ]}
                          >
                            {item.val}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Card Descritivo do Nível Selecionado */}
                <View
                  style={[
                    styles.rpeFeedbackCard,
                    { borderLeftColor: activeRpeLevel.color },
                  ]}
                >
                  <View
                    style={[
                      styles.rpeFeedbackBadge,
                      { backgroundColor: activeRpeLevel.color },
                    ]}
                  >
                    <Text style={styles.rpeFeedbackBadgeText}>{activeRpeLevel.val}</Text>
                  </View>
                  <View style={styles.rpeFeedbackContent}>
                    <Text
                      style={[
                        styles.rpeFeedbackTitle,
                        { color: activeRpeLevel.color },
                      ]}
                    >
                      Nível {activeRpeLevel.val} · {activeRpeLevel.label}
                    </Text>
                    <Text style={styles.rpeFeedbackDesc}>
                      {activeRpeLevel.desc}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Inputs de Métricas Configuradas */}
              {metricas && metricas.length > 0 && (
                <View style={styles.metricsFormBlock}>
                  <Text style={styles.metricsFormTitle}>Métricas da Sessão</Text>
                  {metricas
                    .filter((m) => m.quemPreenche === "ALUNO" || m.quemPreenche === "AMBOS")
                    .map((m) => {
                      const errorMsg = fieldErrors[m.id];

                      let hintText = "";
                      let placeholderText = "";
                      let keyboardType: any = "default";

                      if (m.tipo === "TEMPO") {
                        hintText = "Formato esperado: mm:ss (ex: 05:30 ou 01:15)";
                        placeholderText = "00:00";
                        keyboardType = "numbers-and-punctuation";
                      } else if (m.tipo === "FREQUENCIA_CARDIACA") {
                        hintText = "Frequência em bpm (faixa válida: 30 a 250 bpm)";
                        placeholderText = "Ex: 145";
                        keyboardType = "numeric";
                      } else if (m.tipo === "NUMERICO") {
                        hintText = m.unidade ? `Valor numérico em ${m.unidade}` : "Valor numérico";
                        placeholderText = "Ex: 10";
                        keyboardType = "decimal-pad";
                      } else {
                        hintText = "Texto livre";
                        placeholderText = "Digite a observação...";
                        keyboardType = "default";
                      }

                      return (
                        <FormField
                          key={m.id}
                          label={`${m.titulo}${m.obrigatoria ? " *" : ""}${m.unidade ? ` (${m.unidade})` : ""}`}
                          placeholder={placeholderText}
                          hint={hintText}
                          error={errorMsg}
                          keyboardType={keyboardType}
                          value={metricValues[m.id] || ""}
                          onChangeText={(val) => {
                            setMetricValues((prev) => ({ ...prev, [m.id]: val }));
                            if (fieldErrors[m.id]) {
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next[m.id];
                                return next;
                              });
                            }
                          }}
                        />
                      );
                    })}
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
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.primary[600],
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
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
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
    backgroundColor: colors.ink[100],
    borderColor: colors.border,
    opacity: 0.8,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink[400],
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
    maxHeight: "90%",
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

  /* Banner de Erros */
  checkoutError: {
    backgroundColor: colors.danger.light,
    borderWidth: 1,
    borderColor: colors.danger.base,
    padding: spacing.md,
    borderRadius: radii.control,
    marginBottom: spacing.base,
  },
  checkoutErrorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  checkoutErrorTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.danger.dark,
  },
  checkoutErrorText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.danger.dark,
    lineHeight: 18,
  },
  errorBulletContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(240, 68, 56, 0.2)",
    gap: 3,
  },
  errorBulletItem: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.danger.dark,
    lineHeight: 16,
  },

  checkoutScroll: {
    marginBottom: spacing.base,
  },

  /* Seletor Inline RPE */
  rpeSection: {
    marginBottom: spacing.base,
  },
  rpeLabel: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.ink[800],
    marginBottom: 2,
  },
  rpeSubLabel: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginBottom: spacing.sm,
  },
  rpeGrid: {
    gap: 6,
    marginBottom: spacing.sm,
  },
  rpeRow: {
    flexDirection: "row",
    gap: 6,
  },
  rpePill: {
    flex: 1,
    height: 42,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rpePillText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.ink[800],
  },
  rpePillTextSelected: {
    color: colors.surface,
  },
  rpeFeedbackCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  rpeFeedbackBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  rpeFeedbackBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.surface,
  },
  rpeFeedbackContent: {
    flex: 1,
  },
  rpeFeedbackTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
  },
  rpeFeedbackDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[600],
    marginTop: 2,
  },

  /* Métricas */
  metricsFormBlock: {
    marginTop: spacing.xs,
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
