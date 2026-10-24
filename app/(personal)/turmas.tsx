import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Layers, Clock, Users } from "lucide-react-native";

import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Avatar, Badge, Card, EmptyState, SportTag } from "@/src/components/ui";
import { personalService } from "@/src/services/personalService";
import type { TurmaResponseDTO } from "@/src/types/personal";

export default function TurmasScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [turmas, setTurmas] = useState<TurmaResponseDTO[]>([]);

  const carregarTurmas = useCallback(async () => {
    try {
      const data = await personalService.listarTurmas();
      setTurmas(data);
    } catch (err) {
      console.warn("Erro ao listar turmas:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarTurmas();
  }, [carregarTurmas]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarTurmas();
  }, [carregarTurmas]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Turmas de Treino</Text>
        <Text style={styles.subtitle}>
          {turmas.length} grupo(s) de atletas cadastrado(s)
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Carregando turmas...</Text>
        </View>
      ) : (
        <FlatList
          data={turmas}
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
              title="Nenhuma turma cadastrada"
              description="Você pode organizar seus alunos em turmas para facilitar o acompanhamento e atribuição de treinos em grupo."
              icon={Layers}
            />
          }
          renderItem={({ item: turma }) => (
            <Card variant="outlined" padding="md" style={styles.turmaCard}>
              <View style={styles.turmaHeader}>
                <View style={styles.turmaTitleGroup}>
                  <Text style={styles.turmaNome}>{turma.nome}</Text>
                  {turma.horario && (
                    <View style={styles.horarioRow}>
                      <Clock size={12} color={colors.ink[400]} />
                      <Text style={styles.horarioText}>{turma.horario}</Text>
                    </View>
                  )}
                </View>

                <SportTag sport={turma.nomeModalidade} size="sm" />
              </View>

              <View style={styles.alunosCountRow}>
                <Badge tone="info" icon={<Users size={12} color={colors.info.base} />}>
                  {turma.quantidadeAlunos} {turma.quantidadeAlunos === 1 ? "atleta" : "atletas"}
                </Badge>
              </View>

              {/* Chips de Alunos da Turma */}
              {turma.alunos && turma.alunos.length > 0 && (
                <View style={styles.alunosList}>
                  {turma.alunos.map((aluno) => (
                    <View key={aluno.id} style={styles.alunoChip}>
                      <Avatar name={aluno.nome || "A"} size="sm" />
                      <Text style={styles.alunoChipText} numberOfLines={1}>
                        {aluno.nome}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )}
        />
      )}
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
  turmaCard: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  turmaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  turmaTitleGroup: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  turmaNome: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  horarioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  horarioText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  alunosCountRow: {
    flexDirection: "row",
  },
  alunosList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
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
    maxWidth: "48%",
  },
  alunoChipText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.tiny,
    color: colors.ink[800],
  },
});
