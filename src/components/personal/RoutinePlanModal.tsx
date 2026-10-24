import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { X, Calendar, Dumbbell, ChevronRight, AlertCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Badge, SportTag } from "@/src/components/ui";
import { personalService } from "@/src/services/personalService";
import { parseAtividades } from "@/src/utils/activityParser";
import type { PlanejamentoRotinaResponseDTO, SessaoTreinoResponseDTO } from "@/src/types/student";

interface RoutinePlanModalProps {
  visible: boolean;
  rotinaId: string | null;
  rotinaTitulo?: string;
  modalidadeNome?: string;
  onClose: () => void;
}

export default function RoutinePlanModal({
  visible,
  rotinaId,
  rotinaTitulo,
  modalidadeNome,
  onClose,
}: RoutinePlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [planejamento, setPlanejamento] = useState<PlanejamentoRotinaResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemana, setSelectedSemana] = useState<number>(1);

  useEffect(() => {
    if (visible && rotinaId) {
      carregarPlanejamento(rotinaId);
    }
  }, [visible, rotinaId]);

  async function carregarPlanejamento(id: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await personalService.consultarPlanejamentoRotina(id);
      setPlanejamento(res);
      if (res.semanas && res.semanas.length > 0) {
        setSelectedSemana(res.semanas[0].numeroSemana);
      }
    } catch {
      setError("Não foi possível carregar o planejamento semanal da rotina.");
    } finally {
      setLoading(false);
    }
  }

  const currentSemanaData = planejamento?.semanas.find(
    (s) => s.numeroSemana === selectedSemana
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {rotinaTitulo || planejamento?.tituloRotina || "Planejamento Semanal"}
              </Text>
              {modalidadeNome && <SportTag sport={modalidadeNome} size="sm" />}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color={colors.ink[400]} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Carregando semanas e sessões...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={24} color={colors.danger.base} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : !planejamento || planejamento.semanas.length === 0 ? (
            <View style={styles.center}>
              <Dumbbell size={36} color={colors.ink[400]} />
              <Text style={styles.emptyText}>Nenhuma semana cadastrada nesta rotina.</Text>
            </View>
          ) : (
            <>
              {/* Barra de Seleção de Semanas */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.weeksBar}
              >
                {planejamento.semanas.map((sem) => {
                  const isSelected = selectedSemana === sem.numeroSemana;
                  return (
                    <TouchableOpacity
                      key={sem.numeroSemana}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedSemana(sem.numeroSemana);
                      }}
                      style={[styles.weekTab, isSelected && styles.weekTabSelected]}
                    >
                      <Text
                        style={[styles.weekTabText, isSelected && styles.weekTabTextSelected]}
                      >
                        Semana {sem.numeroSemana}
                      </Text>
                      <Badge
                        tone={isSelected ? "primary" : "neutral"}
                        showDot={false}
                        style={styles.weekBadge}
                      >
                        {sem.sessoes.length} {sem.sessoes.length === 1 ? "sessão" : "sessões"}
                      </Badge>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Lista de Sessões da Semana */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sessionsList}
              >
                {currentSemanaData?.sessoes.map((sessao, index) => {
                  const parsed = parseAtividades(sessao.atividades);
                  const isConcluida = sessao.status === "CONCLUIDA";

                  return (
                    <View key={sessao.id} style={styles.sessionCard}>
                      <View style={styles.sessionHeader}>
                        <View style={styles.sessionNumberBadge}>
                          <Text style={styles.sessionNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.sessionTitleGroup}>
                          <Text style={styles.sessionTitle}>
                            {parsed.sessionName || `Treino ${index + 1}`}
                          </Text>
                          <View style={styles.sessionMeta}>
                            <Calendar size={12} color={colors.ink[400]} />
                            <Text style={styles.sessionDate}>
                              Data prevista: {sessao.dataPlanejada}
                            </Text>
                          </View>
                        </View>
                        <Badge tone={isConcluida ? "success" : "neutral"} showDot={false}>
                          {isConcluida ? "Concluída" : "Planejada"}
                        </Badge>
                      </View>

                      {/* Lista de Atividades */}
                      {parsed.activities.length > 0 && (
                        <View style={styles.activitiesContainer}>
                          {parsed.activities.map((act, actIdx) => (
                            <View key={actIdx} style={styles.activityItem}>
                              <View style={styles.bullet} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.activityTitle}>{act.title}</Text>
                                {Boolean(act.description) && (
                                  <Text style={styles.activityDesc}>{act.description}</Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Orientações */}
                      {Boolean(parsed.orientations) && (
                        <View style={styles.orientationsBox}>
                          <Text style={styles.orientationsText}>
                            💡 {parsed.orientations}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    height: "85%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    flexShrink: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.body,
    color: colors.ink[500],
    textAlign: "center",
  },
  errorContainer: {
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.body,
    color: colors.danger.base,
    textAlign: "center",
  },
  weeksBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  weekTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.ink[100],
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    gap: 4,
  },
  weekTabSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  weekTabText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
  },
  weekTabTextSelected: {
    color: colors.primary[600],
  },
  weekBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  sessionsList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sessionNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.control,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  sessionNumberText: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.caption,
    color: colors.primary[600],
  },
  sessionTitleGroup: {
    flex: 1,
  },
  sessionTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  sessionDate: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },
  activitiesContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
    gap: spacing.xs,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[500],
    marginTop: 6,
  },
  activityTitle: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[800],
  },
  activityDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },
  orientationsBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.warning.light,
    padding: spacing.sm,
    borderRadius: radii.control,
  },
  orientationsText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.warning.dark,
    lineHeight: 16,
  },
});
