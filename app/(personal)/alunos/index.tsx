import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Search,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  UserX,
  UserCheck,
  ChevronRight,
} from "lucide-react-native";

import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Avatar, Badge, Button, Card, EmptyState, SportTag } from "@/src/components/ui";
import { personalService } from "@/src/services/personalService";
import type { AlunoResponseDTO } from "@/src/types/student";
import type { StudentFilterStatus } from "@/src/types/personal";
import InviteModal from "@/src/components/personal/InviteModal";

export default function AlunosListScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StudentFilterStatus>("all");
  const [search, setSearch] = useState("");
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const [ativos, setAtivos] = useState<AlunoResponseDTO[]>([]);
  const [pendentes, setPendentes] = useState<AlunoResponseDTO[]>([]);
  const [inativos, setInativos] = useState<AlunoResponseDTO[]>([]);

  const carregarAlunos = useCallback(async () => {
    try {
      const [resAtivos, resPendentes, resInativos] = await Promise.allSettled([
        personalService.listarAlunos(),
        personalService.listarAlunosPendentes(),
        personalService.listarAlunosInativos(),
      ]);

      if (resAtivos.status === "fulfilled") setAtivos(resAtivos.value);
      if (resPendentes.status === "fulfilled") setPendentes(resPendentes.value);
      if (resInativos.status === "fulfilled") setInativos(resInativos.value);
    } catch (err) {
      console.warn("Erro ao carregar lista de alunos:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarAlunos();
  }, [carregarAlunos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarAlunos();
  }, [carregarAlunos]);

  // Lista unificada e filtrada
  const todosAlunos = useMemo(() => {
    const map = new Map<string, AlunoResponseDTO>();
    ativos.forEach((a) => map.set(a.id, a));
    pendentes.forEach((a) => map.set(a.id, a));
    inativos.forEach((a) => map.set(a.id, a));
    return Array.from(map.values());
  }, [ativos, pendentes, inativos]);

  const alunosFiltrados = useMemo(() => {
    let list: AlunoResponseDTO[] = [];
    if (filterStatus === "all") list = todosAlunos;
    else if (filterStatus === "active") list = ativos;
    else if (filterStatus === "pending") list = pendentes;
    else if (filterStatus === "inactive") list = inativos;

    const query = search.trim().toLowerCase();
    if (!query) return list;

    return list.filter(
      (a) =>
        a.usuario.nome.toLowerCase().includes(query) ||
        a.usuario.email.toLowerCase().includes(query)
    );
  }, [filterStatus, todosAlunos, ativos, pendentes, inativos, search]);

  // Ações de Gestão de Alunos
  async function handleAprovar(aluno: AlunoResponseDTO) {
    try {
      setMutatingId(aluno.id);
      await personalService.aprovarAluno(aluno.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Sucesso", `${aluno.usuario.nome} foi aprovado(a) como atleta ativo!`);
      carregarAlunos();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Não foi possível aprovar a solicitação.");
    } finally {
      setMutatingId(null);
    }
  }

  async function handleRecusar(aluno: AlunoResponseDTO) {
    Alert.alert(
      "Recusar Solicitação",
      `Deseja realmente recusar o cadastro de ${aluno.usuario.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Recusar",
          style: "destructive",
          onPress: async () => {
            try {
              setMutatingId(aluno.id);
              await personalService.recusarAluno(aluno.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Recusado", "A solicitação foi recusada.");
              carregarAlunos();
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Erro", "Não foi possível recusar o cadastro.");
            } finally {
              setMutatingId(null);
            }
          },
        },
      ]
    );
  }

  async function handleDesativar(aluno: AlunoResponseDTO) {
    Alert.alert(
      "Desativar Aluno",
      `Deseja suspender temporariamente o acesso de ${aluno.usuario.nome}? O histórico de treinos será preservado.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desativar",
          style: "destructive",
          onPress: async () => {
            try {
              setMutatingId(aluno.id);
              await personalService.desativarAluno(aluno.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Aluno Desativado", "O acesso foi suspenso.");
              carregarAlunos();
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Erro", "Não foi possível desativar o aluno.");
            } finally {
              setMutatingId(null);
            }
          },
        },
      ]
    );
  }

  async function handleReativar(aluno: AlunoResponseDTO) {
    try {
      setMutatingId(aluno.id);
      await personalService.reativarAluno(aluno.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Aluno Reativado", `${aluno.usuario.nome} agora está ativo novamente!`);
      carregarAlunos();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", "Não foi possível reativar o aluno.");
    } finally {
      setMutatingId(null);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ATIVO":
        return <Badge tone="success">Ativo</Badge>;
      case "PENDENTE":
        return <Badge tone="warning">Pendente</Badge>;
      case "INATIVO":
        return <Badge tone="neutral">Inativo</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Meus Alunos</Text>
          <Text style={styles.subtitle}>
            {todosAlunos.length} atleta(s) cadastrado(s)
          </Text>
        </View>
        <Button
          title="Convidar"
          variant="primary"
          size="sm"
          icon={<UserPlus size={16} color={colors.surface} />}
          onPress={() => setInviteModalVisible(true)}
          fullWidth={false}
        />
      </View>

      {/* Barra de Busca */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.ink[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou e-mail..."
          placeholderTextColor={colors.ink[400]}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCapitalize="none"
        />
      </View>

      {/* Filtros por Status */}
      <View style={styles.filtersBar}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilterStatus("all");
          }}
          style={[styles.filterChip, filterStatus === "all" && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filterStatus === "all" && styles.filterTextActive]}>
            Todos ({todosAlunos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilterStatus("active");
          }}
          style={[styles.filterChip, filterStatus === "active" && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filterStatus === "active" && styles.filterTextActive]}>
            Ativos ({ativos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilterStatus("pending");
          }}
          style={[
            styles.filterChip,
            filterStatus === "pending" && styles.filterChipActive,
            pendentes.length > 0 && filterStatus !== "pending" && { backgroundColor: colors.warning.light },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              filterStatus === "pending" && styles.filterTextActive,
              pendentes.length > 0 && filterStatus !== "pending" && { color: colors.warning.dark },
            ]}
          >
            Pendentes ({pendentes.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilterStatus("inactive");
          }}
          style={[styles.filterChip, filterStatus === "inactive" && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filterStatus === "inactive" && styles.filterTextActive]}>
            Inativos ({inativos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Alunos */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Carregando atletas...</Text>
        </View>
      ) : (
        <FlatList
          data={alunosFiltrados}
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
              title="Nenhum aluno encontrado"
              description={
                search
                  ? `Nenhum resultado corresponde a "${search}".`
                  : "Convide seus alunos para começarem a treinar com você."
              }
              icon={Users}
            />
          }
          renderItem={({ item: aluno }) => {
            const isMutating = mutatingId === aluno.id;

            return (
              <Card
                variant="outlined"
                padding="md"
                style={styles.alunoCard}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(personal)/alunos/${aluno.id}` as any)}
                  style={styles.cardHeaderRow}
                >
                  <Avatar name={aluno.usuario.nome} size="md" />
                  <View style={styles.alunoInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.alunoName}>{aluno.usuario.nome}</Text>
                      {getStatusBadge(aluno.status)}
                    </View>
                    <Text style={styles.alunoEmail}>{aluno.usuario.email}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.ink[400]} />
                </TouchableOpacity>

                {/* Modalidades */}
                {aluno.modalidades.length > 0 && (
                  <View style={styles.modalidadesRow}>
                    {aluno.modalidades.map((m) => (
                      <SportTag key={m.id} sport={m.nome} size="sm" />
                    ))}
                  </View>
                )}

                {/* Ações contextuais rápidas */}
                <View style={styles.actionsRow}>
                  {aluno.status === "PENDENTE" && (
                    <>
                      <Button
                        title="Aprovar"
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle size={14} color={colors.surface} />}
                        loading={isMutating}
                        disabled={Boolean(mutatingId)}
                        onPress={() => handleAprovar(aluno)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Recusar"
                        variant="danger"
                        size="sm"
                        icon={<XCircle size={14} color={colors.danger.base} />}
                        disabled={Boolean(mutatingId)}
                        onPress={() => handleRecusar(aluno)}
                        style={{ flex: 1 }}
                      />
                    </>
                  )}

                  {aluno.status === "ATIVO" && (
                    <>
                      <Button
                        title="Ver Perfil"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push(`/(personal)/alunos/${aluno.id}` as any)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Desativar"
                        variant="ghost"
                        size="sm"
                        icon={<UserX size={14} color={colors.danger.base} />}
                        disabled={Boolean(mutatingId)}
                        onPress={() => handleDesativar(aluno)}
                        fullWidth={false}
                      />
                    </>
                  )}

                  {aluno.status === "INATIVO" && (
                    <>
                      <Button
                        title="Ver Histórico"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push(`/(personal)/alunos/${aluno.id}` as any)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Reativar Aluno"
                        variant="primary"
                        size="sm"
                        icon={<UserCheck size={14} color={colors.surface} />}
                        loading={isMutating}
                        disabled={Boolean(mutatingId)}
                        onPress={() => handleReativar(aluno)}
                        style={{ flex: 1 }}
                      />
                    </>
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Modal de Convite */}
      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        onInviteGenerated={carregarAlunos}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  filtersBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[600],
  },
  filterTextActive: {
    color: colors.surface,
    fontFamily: fonts.bold,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
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
  alunoCard: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  alunoInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  alunoName: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
    flexShrink: 1,
  },
  alunoEmail: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
  },
  modalidadesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
});
