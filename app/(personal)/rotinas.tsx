import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dumbbell, Calendar, Users, Eye } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Avatar, Badge, Button, Card, EmptyState, SportTag } from "@/src/components/ui";
import { personalService } from "@/src/services/personalService";
import type { RotinaTreinoResponseDTO } from "@/src/types/student";
import RoutinePlanModal from "@/src/components/personal/RoutinePlanModal";

export default function RotinasScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rotinas, setRotinas] = useState<RotinaTreinoResponseDTO[]>([]);

  // Estado para visualização do planejamento
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [selectedRotina, setSelectedRotina] = useState<RotinaTreinoResponseDTO | null>(null);

  const carregarRotinas = useCallback(async () => {
    try {
      const data = await personalService.listarRotinas();
      setRotinas(data);
    } catch (err) {
      console.warn("Erro ao listar rotinas:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarRotinas();
  }, [carregarRotinas]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarRotinas();
  }, [carregarRotinas]);

  function handleAbrirPlanejamento(rotina: RotinaTreinoResponseDTO) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRotina(rotina);
    setPlanModalVisible(true);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Rotinas de Treino</Text>
        <Text style={styles.subtitle}>
          {rotinas.length} prescrição(ões) cadastrada(s)
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Carregando rotinas...</Text>
        </View>
      ) : (
        <FlatList
          data={rotinas}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Nenhuma rotina cadastrada"
              description="Você ainda não prescreveu nenhuma rotina de treinos para seus atletas."
              icon={Dumbbell}
            />
          }
          renderItem={({ item: rotina }) => {
            const isEncerrada = rotina.status === "ENCERRADA";

            return (
              <Card variant="outlined" padding="md" style={styles.rotinaCard}>
                <View style={styles.rotinaHeader}>
                  <View style={styles.rotinaTitleGroup}>
                    <Text style={styles.rotinaTitulo}>{rotina.titulo}</Text>
                    <View style={styles.rotinaMetaRow}>
                      <Calendar size={12} color={colors.ink[400]} />
                      <Text style={styles.rotinaMetaText}>
                        {rotina.frequenciaSemanal}x por semana
                      </Text>
                    </View>
                  </View>

                  <Badge tone={isEncerrada ? "neutral" : "success"}>
                    {isEncerrada ? "Encerrada" : "Ativa"}
                  </Badge>
                </View>

                {/* Modalidade */}
                <View style={styles.modalidadeRow}>
                  <SportTag sport={rotina.modalidade?.nome} size="sm" />
                </View>

                {/* Objetivos */}
                {Boolean(rotina.objetivos) && (
                  <Text style={styles.objetivosText} numberOfLines={2}>
                    🎯 {rotina.objetivos}
                  </Text>
                )}

                {/* Alunos Vinculados */}
                {rotina.alunos && rotina.alunos.length > 0 && (
                  <View style={styles.alunosContainer}>
                    <View style={styles.alunosHeader}>
                      <Users size={12} color={colors.ink[400]} />
                      <Text style={styles.alunosLabel}>
                        {rotina.alunos.length} atleta(s) vinculado(s):
                      </Text>
                    </View>
                    <View style={styles.alunosChips}>
                      {rotina.alunos.map((aluno) => (
                        <View key={aluno.id} style={styles.alunoChip}>
                          <Avatar name={aluno.nome || "A"} size="sm" />
                          <Text style={styles.alunoChipText}>{aluno.nome}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Botão para ver planejamento semanal */}
                <View style={styles.actionsContainer}>
                  <Button
                    title="Ver Planejamento Semanal"
                    variant="secondary"
                    size="sm"
                    icon={<Eye size={14} color={colors.ink[600]} />}
                    onPress={() => handleAbrirPlanejamento(rotina)}
                  />
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Modal de Planejamento da Rotina */}
      <RoutinePlanModal
        visible={planModalVisible}
        rotinaId={selectedRotina?.id || null}
        rotinaTitulo={selectedRotina?.titulo}
        modalidadeNome={selectedRotina?.modalidade?.nome}
        onClose={() => {
          setPlanModalVisible(false);
          setSelectedRotina(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
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
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  rotinaCard: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  rotinaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rotinaTitleGroup: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  rotinaTitulo: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  rotinaMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rotinaMetaText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },
  modalidadeRow: {
    flexDirection: "row",
  },
  objetivosText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
    lineHeight: 18,
  },
  alunosContainer: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
    gap: spacing.xs,
  },
  alunosHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  alunosLabel: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
  },
  alunosChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  alunoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.ink[100],
    paddingRight: spacing.sm,
    paddingLeft: 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
    gap: spacing.xs,
  },
  alunoChipText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[800],
  },
  actionsContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
});
