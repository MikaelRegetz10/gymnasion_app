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
  Calendar,
  Clock,
  Info,
  Check,
  AlertCircle,
  Heart,
  Activity,
  Layers,
  Timer,
  Flame,
  Gauge,
  TrendingUp,
  Dumbbell,
  Award,
  ChevronDown,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";

import { alunoService } from "@/src/services/alunoService";
import { stravaService } from "@/src/services/stravaService";
import type {
  FormularioExecucaoResponseDTO,
  RegistrarResultadoMetricaDTO,
} from "@/src/types/student";
import {
  type StravaStatusResponse,
  type StravaAtividade,
  mapStravaActivityToMetrics,
  formatStravaDate,
} from "@/src/types/strava";
import { parseAtividades } from "@/src/utils/activityParser";
import { colors, fonts, radii, spacing, typography, shadows } from "@/src/theme/tokens";
import { Button, Card, Badge, Header, FormField } from "@/src/components/ui";
import RestTimerModal from "@/src/components/workout/RestTimerModal";
import { handleApiError } from "@/src/utils/handleApiError";

function StravaIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.008 13.828h4.172"
        fill="#fc5200"
      />
    </Svg>
  );
}

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

function formatCompletedDate(dateIso?: string | null): string {
  if (!dateIso) return "Data não informada";
  try {
    const [year, month, day] = dateIso.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capitalized}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  } catch {
    return dateIso;
  }
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Mantém a tela ligada durante a atividade na academia
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

  // Estado de Integração Strava (US-14 / US-22)
  const [stravaStatus, setStravaStatus] = useState<StravaStatusResponse | null>(null);
  const [stravaActivities, setStravaActivities] = useState<StravaAtividade[]>([]);
  const [loadingStrava, setLoadingStrava] = useState(false);
  const [selectedStravaId, setSelectedStravaId] = useState<string | null>(null);
  const [stravaFilledMap, setStravaFilledMap] = useState<Record<string, boolean>>({});
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [showStravaDropdown, setShowStravaDropdown] = useState(false);
  const [executionDate, setExecutionDate] = useState<string>(new Date().toISOString().split("T")[0]);

  async function loadStrava(currentMetrics = formData?.metricas) {
    setLoadingStrava(true);
    try {
      const status = await stravaService.obterStatus();
      setStravaStatus(status);
      if (status.conectado && !status.expirado) {
        const acts = await stravaService.listarAtividades(10);
        setStravaActivities(acts);
        if (acts.length > 0 && !selectedStravaId) {
          applyStravaActivity(acts[0], currentMetrics);
        }
      }
    } catch {
      setStravaStatus({ conectado: false, expirado: false, mock: false });
    } finally {
      setLoadingStrava(false);
    }
  }

  function applyStravaActivity(act: StravaAtividade, metricsList = formData?.metricas) {
    setSelectedStravaId(act.id);
    if (act.duracaoMinutos) {
      setRealDuration(String(act.duracaoMinutos));
    }
    if (act.data) {
      setExecutionDate(act.data);
    }
    if (metricsList && metricsList.length > 0) {
      const mapped = mapStravaActivityToMetrics(act, metricsList);
      setMetricValues((prev) => ({ ...prev, ...mapped.metricValues }));
      setStravaFilledMap(mapped.stravaFilled);
    }
  }

  function clearStravaSelection() {
    setSelectedStravaId(null);
    setStravaFilledMap({});
  }

  async function handleConnectStravaFromModal() {
    setConnectingStrava(true);
    setSubmitError(null);
    try {
      const status = await stravaService.iniciarConexao();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStravaStatus(status);
      if (status.conectado && !status.expirado) {
        const acts = await stravaService.listarAtividades(10);
        setStravaActivities(acts);
        if (acts.length > 0) {
          applyStravaActivity(acts[0]);
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes("cancelada")) {
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const parsed = handleApiError(err, "Não foi possível conectar ao Strava.");
      setSubmitError(parsed.message);
    } finally {
      setConnectingStrava(false);
    }
  }

  function openFinishModal() {
    setSubmitError(null);
    setFieldErrors({});
    setFinishModalVisible(true);
    loadStrava();
  }

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

    // 2. Validação das Métricas do Aluno
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
        dataReal: executionDate || new Date().toISOString().split("T")[0],
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
  const isCompleted = sessao.status === "CONCLUIDA" || Boolean(sessao.concluidaAluno);
  const completedExercisesCount = Object.values(checkedExercises).filter(Boolean).length;
  const rpeValue = sessao.desempenho?.nivelCansaco || selectedRpe;
  const activeRpeLevel = RPE_LEVELS.find((l) => l.val === rpeValue) || RPE_LEVELS[6];
  const selectedStravaActivity = stravaActivities.find((a) => a.id === selectedStravaId);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Header
        title={parsed.sessionName || `Sessão ${sessao.semana}`}
        subtitle={`Semana ${sessao.semana} · ${formatCompletedDate(sessao.dataReal || sessao.dataPlanejada)}`}
        showBack
      />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: !isCompleted && registroPermitido ? 96 : spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================== */}
        {/* MODO 1: TREINO CONCLUÍDO (Sumário Hero Inspirado em Hevy / NTC) */}
        {/* ============================================================== */}
        {isCompleted ? (
          <>
            {/* Card Hero Celebrativo de Conclusão */}
            <Card variant="elevated" padding="lg" style={styles.completedHeroCard}>
              <View style={styles.completedHeroHeader}>
                <Badge tone="success" icon={<CheckCircle2 size={14} color={colors.success.dark} />}>
                  Treino Concluído
                </Badge>
                <View style={styles.completedHeroDateRow}>
                  <Calendar size={14} color={colors.ink[500]} />
                  <Text style={styles.completedHeroDateText}>
                    {formatCompletedDate(sessao.dataReal || sessao.dataPlanejada)}
                  </Text>
                </View>
              </View>

              <Text style={styles.completedHeroTitle}>
                {parsed.sessionName || `Sessão ${sessao.semana}`}
              </Text>
              <Text style={styles.completedHeroSubtitle}>
                Semana {sessao.semana} · Execução registrada e validada no cronograma
              </Text>

              {/* 3 KPIs em Destaque do Treino Realizado */}
              <View style={styles.completedKpisGrid}>
                {/* Duração Real */}
                <View style={styles.completedKpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: colors.primary[50] }]}>
                    <Clock size={18} color={colors.primary[500]} />
                  </View>
                  <Text style={styles.completedKpiValue}>
                    {sessao.duracao ? `${sessao.duracao} min` : "45 min"}
                  </Text>
                  <Text style={styles.completedKpiLabel}>Tempo Real</Text>
                </View>

                {/* Nível de Esforço RPE */}
                <View style={styles.completedKpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: activeRpeLevel.color + "18" }]}>
                    <Flame size={18} color={activeRpeLevel.color} />
                  </View>
                  <Text style={[styles.completedKpiValue, { color: activeRpeLevel.color }]}>
                    {sessao.desempenho?.nivelCansaco ? `${sessao.desempenho.nivelCansaco}/10` : "—"}
                  </Text>
                  <Text style={styles.completedKpiLabel}>Esforço (RPE)</Text>
                </View>

                {/* Exercícios Feitos */}
                <View style={styles.completedKpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: colors.success.light }]}>
                    <CheckCircle2 size={18} color={colors.success.base} />
                  </View>
                  <Text style={styles.completedKpiValue}>
                    {parsed.activities.length}
                  </Text>
                  <Text style={styles.completedKpiLabel}>Exercício(s)</Text>
                </View>
              </View>
            </Card>

            {/* Card de Nível de Esforço Borg CR-10 com Medidor Visual */}
            {sessao.desempenho?.nivelCansaco && (
              <Card variant="elevated" padding="lg" style={styles.rpeSummaryCard}>
                <View style={styles.rpeSummaryHeader}>
                  <View style={[styles.rpeBadgeBox, { backgroundColor: activeRpeLevel.color }]}>
                    <Text style={styles.rpeBadgeBoxText}>{activeRpeLevel.val}</Text>
                  </View>
                  <View style={styles.rpeSummaryTextWrapper}>
                    <View style={styles.rpeCategoryRow}>
                      <Badge tone={activeRpeLevel.val >= 8 ? "danger" : activeRpeLevel.val >= 5 ? "warning" : "success"}>
                        Borg CR-10
                      </Badge>
                    </View>
                    <Text style={[styles.rpeSummaryTitle, { color: activeRpeLevel.color }]}>
                      Nível {activeRpeLevel.val} · {activeRpeLevel.label}
                    </Text>
                    <Text style={styles.rpeSummaryDesc}>
                      {activeRpeLevel.desc}
                    </Text>
                  </View>
                </View>

                {/* Régua de Intensidade Visual de 1 a 10 Segmentos */}
                <View style={styles.rpeSegmentsBar}>
                  {RPE_LEVELS.map((item) => {
                    const isFilled = (sessao.desempenho?.nivelCansaco || 0) >= item.val;
                    return (
                      <View
                        key={item.val}
                        style={[
                          styles.rpeSegment,
                          isFilled && { backgroundColor: item.color },
                        ]}
                      />
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Métricas Registradas da Sessão */}
            {sessao.desempenho?.metricas && sessao.desempenho.metricas.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>Métricas Registradas da Sessão</Text>
                <View style={styles.metricsListGroup}>
                  {sessao.desempenho.metricas.map((m) => {
                    const def = formData.metricas?.find((x) => x.id === m.metricaId);
                    const tipo = def?.tipo || m.tipoMetrica;

                    let icon = <Activity size={18} color={colors.primary[500]} />;
                    let iconBg: string = colors.primary[50];
                    if (tipo === "FREQUENCIA_CARDIACA") {
                      icon = <Heart size={18} color={colors.danger.base} />;
                      iconBg = colors.danger.light;
                    } else if (tipo === "TEMPO") {
                      icon = <Timer size={18} color={colors.info.base} />;
                      iconBg = colors.info.light;
                    } else if (tipo === "NUMERICO") {
                      icon = <Dumbbell size={18} color={colors.primary[500]} />;
                      iconBg = colors.primary[50];
                    }

                    return (
                      <Card key={m.id} variant="elevated" padding="md" style={styles.metricCardItem}>
                        <View style={styles.metricItemLeft}>
                          <View style={[styles.metricItemIconBox, { backgroundColor: iconBg }]}>
                            {icon}
                          </View>
                          <View style={styles.metricItemInfo}>
                            <Text style={styles.metricItemTitle}>{m.tituloMetrica}</Text>
                            {def?.unidade ? (
                              <Text style={styles.metricItemUnit}>Unidade: {def.unidade}</Text>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.metricItemRight}>
                          <Text style={styles.metricItemValue}>{m.valor}</Text>
                          {def?.unidade ? (
                            <Text style={styles.metricItemUnitBadge}>{def.unidade}</Text>
                          ) : null}
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Exercícios Concluídos */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Exercícios Concluídos</Text>
                <Badge tone="success">{parsed.activities.length} séries</Badge>
              </View>

              <View style={styles.activitiesList}>
                {parsed.activities.map((act) => (
                  <Card key={act.id} variant="elevated" padding="md" style={styles.completedExerciseCard}>
                    <View style={styles.completedExerciseRow}>
                      <View style={styles.exerciseCompletedCheck}>
                        <Check size={16} color={colors.success.dark} />
                      </View>
                      <View style={styles.exerciseContentWrapper}>
                        <View style={styles.exerciseTitleLine}>
                          <Text style={styles.completedExerciseTitle}>{act.title}</Text>
                          <Badge tone="success">Concluído</Badge>
                        </View>
                        {act.description ? (
                          <Text style={styles.completedExerciseDesc}>{act.description}</Text>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>

            {/* Orientações do Treinador */}
            {parsed.orientations ? (
              <View style={styles.orientationsBox}>
                <Info size={20} color={colors.primary[500]} style={styles.infoIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.orientationsHeading}>Orientações do Treinador</Text>
                  <Text style={styles.orientationsText}>{parsed.orientations}</Text>
                </View>
              </View>
            ) : null}

            {/* Ações Finais de Navegação */}
            <View style={styles.completedActionsContainer}>
              <Button
                title="Voltar para Meus Treinos"
                variant="primary"
                size="lg"
                icon={<Calendar size={18} color={colors.surface} />}
                onPress={() => router.push("/(aluno)/treinos")}
              />
              <Button
                title="Acompanhar Minha Evolução"
                variant="secondary"
                size="md"
                icon={<TrendingUp size={16} color={colors.primary[600]} />}
                onPress={() => router.push("/(aluno)/evolucao")}
              />
            </View>
          </>
        ) : (
          /* ============================================================== */
          /* MODO 2: TREINO AO VIVO / EXECUÇÃO                              */
          /* ============================================================== */
          <>
            {/* Status Card do Treino em Aberto */}
            <Card variant="elevated" padding="md" style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={{ flex: 1 }}>
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
                <Badge tone="info">Em Aberto</Badge>
              </View>
            </Card>

            {/* Orientações do Treinador */}
            {parsed.orientations ? (
              <View style={styles.orientationsBox}>
                <Info size={18} color={colors.primary[500]} style={styles.infoIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.orientationsHeading}>Orientações do Treinador</Text>
                  <Text style={styles.orientationsText}>{parsed.orientations}</Text>
                </View>
              </View>
            ) : null}

            {/* Checklist de Exercícios Interativo */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Exercícios Programados</Text>
              {parsed.activities.length > 0 && (
                <Text style={styles.checklistProgress}>
                  {completedExercisesCount}/{parsed.activities.length} séries feitas
                </Text>
              )}
            </View>

            <View style={styles.activitiesList}>
              {parsed.activities.map((act, index) => {
                const isChecked = Boolean(checkedExercises[act.id]);

                return (
                  <TouchableOpacity
                    key={act.id}
                    style={[styles.activityItem, isChecked && styles.activityItemChecked]}
                    onPress={() => toggleExercise(act.id)}
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
          </>
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
            onPress={openFinishModal}
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
              {/* Integração com Strava no Checkout (US-14 / US-22) */}
              {stravaStatus?.conectado && !stravaStatus?.expirado ? (
                <View style={styles.stravaSyncCard}>
                  <View style={styles.stravaSyncHeader}>
                    <View style={styles.stravaSyncHeaderLeft}>
                      <StravaIcon size={18} />
                      <Text style={styles.stravaSyncTitle}>
                        Sincronizar com atividade do Strava
                      </Text>
                    </View>
                    {selectedStravaId ? (
                      <Badge tone="primary">Atividade vinculada</Badge>
                    ) : null}
                  </View>

                  {loadingStrava ? (
                    <View style={styles.stravaLoadingRow}>
                      <ActivityIndicator size="small" color="#fc5200" />
                      <Text style={styles.stravaLoadingText}>
                        Carregando atividades recentes do Strava...
                      </Text>
                    </View>
                  ) : stravaActivities.length > 0 ? (
                    <View style={styles.stravaPickerWrapper}>
                      <Text style={styles.stravaPickerLabel}>
                        Escolha a atividade para preencher os dados automaticamente:
                      </Text>

                      {/* Botão Seletor Principal */}
                      <TouchableOpacity
                        style={styles.stravaPickerButton}
                        onPress={() => setShowStravaDropdown((prev) => !prev)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          {selectedStravaActivity ? (
                            <>
                              <Text style={styles.stravaSelectedTitle} numberOfLines={1}>
                                {selectedStravaActivity.esporte || selectedStravaActivity.tipo}: {selectedStravaActivity.nome}
                              </Text>
                              <Text style={styles.stravaSelectedSubtitle}>
                                {formatStravaDate(selectedStravaActivity.data)} · {selectedStravaActivity.distanciaFormatada || (selectedStravaActivity.distanciaKm ? `${selectedStravaActivity.distanciaKm} km` : "")} {selectedStravaActivity.tempoFormatado ? `· ${selectedStravaActivity.tempoFormatado}` : ""}
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.stravaPlaceholderText}>
                              Não importar do Strava (Preencher manualmente)
                            </Text>
                          )}
                        </View>
                        <ChevronDown
                          size={18}
                          color={colors.ink[500]}
                          style={{ transform: [{ rotate: showStravaDropdown ? "180deg" : "0deg" }] }}
                        />
                      </TouchableOpacity>

                      {/* Dropdown com opções de atividades recentes */}
                      {showStravaDropdown && (
                        <View style={styles.stravaDropdownList}>
                          {stravaActivities.map((act) => {
                            const isSelected = selectedStravaId === act.id;
                            return (
                              <TouchableOpacity
                                key={act.id}
                                style={[
                                  styles.stravaDropdownItem,
                                  isSelected && styles.stravaDropdownItemSelected,
                                ]}
                                onPress={() => {
                                  applyStravaActivity(act);
                                  setShowStravaDropdown(false);
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text
                                    style={[
                                      styles.stravaItemTitle,
                                      isSelected && { color: colors.primary[600], fontFamily: fonts.bold },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {act.esporte || act.tipo}: {act.nome}
                                  </Text>
                                  <Text style={styles.stravaItemSubtitle}>
                                    {formatStravaDate(act.data)} · {act.distanciaFormatada || (act.distanciaKm ? `${act.distanciaKm} km` : "")} {act.tempoFormatado ? `· ${act.tempoFormatado}` : ""}
                                  </Text>
                                </View>
                                {isSelected && (
                                  <Check size={16} color={colors.primary[600]} style={{ marginLeft: 8 }} />
                                )}
                              </TouchableOpacity>
                            );
                          })}

                          {/* Opção Manual */}
                          <TouchableOpacity
                            style={[
                              styles.stravaDropdownItem,
                              !selectedStravaId && styles.stravaDropdownItemSelected,
                              { borderTopWidth: 1, borderTopColor: colors.border },
                            ]}
                            onPress={() => {
                              clearStravaSelection();
                              setShowStravaDropdown(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.stravaItemManualText}>
                              Não importar do Strava (Preencher manualmente)
                            </Text>
                            {!selectedStravaId && (
                              <Check size={16} color={colors.ink[700]} style={{ marginLeft: 8 }} />
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.stravaEmptyText}>
                      Nenhuma atividade recente encontrada no Strava.
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.stravaBannerDashed}>
                  <View style={styles.stravaBannerLeft}>
                    <StravaIcon size={18} />
                    <Text style={styles.stravaBannerText}>
                      Conecte o <Text style={{ fontFamily: fonts.bold }}>Strava</Text> para preencher métricas deste treino automaticamente.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleConnectStravaFromModal}
                    disabled={connectingStrava}
                    style={styles.stravaBannerLink}
                    activeOpacity={0.7}
                  >
                    {connectingStrava ? (
                      <ActivityIndicator size="small" color="#fc5200" />
                    ) : (
                      <Text style={styles.stravaBannerLinkText}>Conectar Strava →</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

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

                      const isStravaImported = Boolean(stravaFilledMap[m.id]);

                      return (
                        <FormField
                          key={m.id}
                          label={`${m.titulo}${m.obrigatoria ? " *" : ""}${m.unidade ? ` (${m.unidade})` : ""}${isStravaImported ? " · Strava" : ""}`}
                          placeholder={placeholderText}
                          hint={
                            isStravaImported
                              ? "Preenchido automaticamente pelo Strava · você pode editar"
                              : hintText
                          }
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ============================================================== */
  /* ESTILOS DE TREINO CONCLUÍDO (Sumário Hero Inspirado nos Top Apps) */
  /* ============================================================== */
  completedHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
    ...shadows.card,
  },
  completedHeroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  completedHeroDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  completedHeroDateText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
  },
  completedHeroTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
    marginBottom: 4,
  },
  completedHeroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[600],
    marginBottom: spacing.base,
    lineHeight: 22,
  },
  completedKpisGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completedKpiCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.control,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  completedKpiValue: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
    textAlign: "center",
  },
  completedKpiLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
    textAlign: "center",
  },

  /* Card RPE Borg CR-10 com Barra de 10 Segmentos */
  rpeSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  rpeSummaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  rpeBadgeBox: {
    width: 48,
    height: 48,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    marginTop: 2,
  },
  rpeBadgeBoxText: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.surface,
  },
  rpeSummaryTextWrapper: {
    flex: 1,
  },
  rpeCategoryRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  rpeSummaryTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    marginBottom: 2,
  },
  rpeSummaryDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
    lineHeight: 18,
  },
  rpeSegmentsBar: {
    flexDirection: "row",
    gap: 4,
    height: 8,
  },
  rpeSegment: {
    flex: 1,
    height: "100%",
    backgroundColor: colors.ink[200],
    borderRadius: radii.pill,
  },

  /* Seções e Títulos */
  sectionBlock: {
    marginBottom: spacing.base,
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  /* Métricas Registradas da Sessão */
  metricsListGroup: {
    gap: spacing.sm,
  },
  metricCardItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  metricItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.md,
  },
  metricItemIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  metricItemInfo: {
    flex: 1,
  },
  metricItemTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  metricItemUnit: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
  },
  metricItemRight: {
    alignItems: "flex-end",
  },
  metricItemValue: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  metricItemUnitBadge: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[400],
    marginTop: 2,
  },

  /* Exercícios Concluídos */
  completedExerciseCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  completedExerciseRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseCompletedCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success.light,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  exerciseContentWrapper: {
    flex: 1,
  },
  exerciseTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completedExerciseTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
    flex: 1,
    marginRight: spacing.sm,
  },
  completedExerciseDesc: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
    marginTop: 4,
    lineHeight: 18,
  },
  completedActionsContainer: {
    marginTop: spacing.base,
    gap: spacing.sm,
  },

  /* ============================================================== */
  /* ESTILOS DE TREINO AO VIVO / EXECUÇÃO                           */
  /* ============================================================== */
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
  orientationsHeading: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.primary[600],
    marginBottom: 2,
  },
  orientationsText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
    lineHeight: 20,
  },
  checklistProgress: {
    fontFamily: fonts.bold,
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
    opacity: 0.85,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 13,
    color: colors.surface,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: fonts.bold,
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
    color: colors.ink[600],
    marginTop: 3,
    lineHeight: 18,
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

  /* ============================================================== */
  /* MODAL DE CHECKOUT / CONCLUSÃO                                  */
  /* ============================================================== */
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
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
  },
  checkoutSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 2,
    marginBottom: spacing.base,
    lineHeight: 20,
  },
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  rpeFeedbackBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 15,
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
    lineHeight: 16,
  },
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

  /* ============================================================== */
  /* ESTILOS DE INTEGRAÇÃO STRAVA NO CHECKOUT                       */
  /* ============================================================== */
  stravaBannerDashed: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: radii.control,
    padding: spacing.md,
    marginBottom: spacing.base,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  stravaBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stravaBannerText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
    lineHeight: 18,
  },
  stravaBannerLink: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  stravaBannerLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: "#fc5200",
    textDecorationLine: "underline",
  },
  stravaSyncCard: {
    backgroundColor: "#f8fafc",
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  stravaSyncHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  stravaSyncHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  stravaSyncTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.ink[900],
  },
  stravaLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stravaLoadingText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
  },
  stravaPickerWrapper: {
    marginTop: 2,
  },
  stravaPickerLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginBottom: 6,
  },
  stravaPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  stravaSelectedTitle: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.ink[900],
  },
  stravaSelectedSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
  },
  stravaPlaceholderText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  stravaDropdownList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    marginTop: 6,
    overflow: "hidden",
    ...shadows.sm,
  },
  stravaDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[100],
  },
  stravaDropdownItemSelected: {
    backgroundColor: "#fff4ef",
  },
  stravaItemTitle: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.ink[900],
  },
  stravaItemSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
  },
  stravaItemManualText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
  },
  stravaEmptyText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    fontStyle: "italic",
    paddingVertical: 4,
  },
});
