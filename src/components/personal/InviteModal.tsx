import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { X, Share2, Copy, Check, Clock, UserPlus, AlertCircle } from "lucide-react-native";

import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";
import { Button, FormField, SportTag, Badge } from "@/src/components/ui";
import { personalService } from "@/src/services/personalService";
import type { ModalidadeResponseDTO } from "@/src/types/student";
import type { ConviteResponseDTO } from "@/src/types/personal";

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  onInviteGenerated?: () => void;
}

export default function InviteModal({ visible, onClose, onInviteGenerated }: InviteModalProps) {
  const [modalidades, setModalidades] = useState<ModalidadeResponseDTO[]>([]);
  const [selectedModalidadeId, setSelectedModalidadeId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [loadingModalidades, setLoadingModalidades] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [convite, setConvite] = useState<ConviteResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);

  useEffect(() => {
    if (visible) {
      loadModalidades();
      resetForm();
    }
  }, [visible]);

  useEffect(() => {
    if (!convite) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [convite]);

  async function loadModalidades() {
    try {
      setLoadingModalidades(true);
      const data = await personalService.listarModalidades();
      setModalidades(data);
      if (data.length > 0 && !selectedModalidadeId) {
        setSelectedModalidadeId(data[0].id);
      }
    } catch {
      setError("Não foi possível carregar as modalidades esportivas.");
    } finally {
      setLoadingModalidades(false);
    }
  }

  function resetForm() {
    setEmail("");
    setConvite(null);
    setError(null);
    setCopied(false);
    setSecondsLeft(15 * 60);
  }

  async function handleGerarConvite() {
    if (!selectedModalidadeId) {
      setError("Selecione a modalidade esportiva.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await personalService.gerarConvite({
        modalidadeId: selectedModalidadeId,
        emailAluno: email.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConvite(res);
      setSecondsLeft(15 * 60);
      onInviteGenerated?.();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err?.response?.data?.detail || "Erro ao gerar convite para o aluno.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    if (!convite) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        title: "Convite Gymnasion",
        message: `Olá! Seu treinador convidou você para o Gymnasion. Clique no link para criar sua conta: ${convite.linkConvite}`,
        url: convite.linkConvite,
      });
    } catch (err) {
      console.warn("Erro ao compartilhar", err);
    }
  }

  async function handleCopy() {
    if (!convite) return;
    await Clipboard.setStringAsync(convite.linkConvite);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.iconBadge}>
                <UserPlus size={18} color={colors.primary[500]} />
              </View>
              <Text style={styles.title}>Convidar Aluno</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color={colors.ink[400]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={colors.danger.dark} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!convite ? (
              <>
                <Text style={styles.description}>
                  Gere um link temporário exclusivo de 15 minutos para que o atleta realize o cadastro.
                </Text>

                {/* Seleção de Modalidade */}
                <Text style={styles.label}>Modalidade do Aluno *</Text>
                {loadingModalidades ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginVertical: 12 }} />
                ) : (
                  <View style={styles.modalidadesGrid}>
                    {modalidades.map((mod) => {
                      const isSelected = selectedModalidadeId === mod.id;
                      return (
                        <TouchableOpacity
                          key={mod.id}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedModalidadeId(mod.id);
                          }}
                          style={[
                            styles.modalidadeChip,
                            isSelected && styles.modalidadeChipSelected,
                          ]}
                        >
                          <SportTag sport={mod.nome} size="sm" />
                          {isSelected && (
                            <View style={styles.selectedCheck}>
                              <Check size={12} color={colors.surface} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* E-mail opcional */}
                <FormField
                  label="E-mail do Aluno (Opcional)"
                  placeholder="aluno@exemplo.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  hint="Se preenchido, o link ficará restrito a este endereço."
                />

                <Button
                  title="Gerar Link de Convite"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  disabled={submitting || !selectedModalidadeId}
                  onPress={handleGerarConvite}
                  style={styles.submitBtn}
                />
              </>
            ) : (
              <View style={styles.successContainer}>
                <Badge tone="success" style={styles.successBadge}>
                  Link de convite gerado com sucesso!
                </Badge>

                {/* Countdown */}
                <View style={styles.timerCard}>
                  <Clock size={18} color={colors.warning.base} />
                  <Text style={styles.timerText}>
                    Expira em: <Text style={styles.timerBold}>{formatCountdown(secondsLeft)}</Text>
                  </Text>
                </View>

                {/* Link Box */}
                <View style={styles.linkCard}>
                  <Text style={styles.linkLabel}>Link de Cadastro:</Text>
                  <Text style={styles.linkText} numberOfLines={2} selectable>
                    {convite.linkConvite}
                  </Text>
                </View>

                {/* Ações */}
                <View style={styles.actionButtons}>
                  <Button
                    title="Compartilhar no WhatsApp / Outros"
                    variant="primary"
                    size="md"
                    icon={<Share2 size={16} color={colors.surface} />}
                    onPress={handleShare}
                  />

                  <Button
                    title={copied ? "Link Copiado!" : "Copiar Link"}
                    variant={copied ? "secondary" : "ghost"}
                    size="md"
                    icon={copied ? <Check size={16} color={colors.success.base} /> : <Copy size={16} color={colors.ink[600]} />}
                    onPress={handleCopy}
                  />

                  <Button
                    title="Gerar Outro Convite"
                    variant="secondary"
                    size="sm"
                    onPress={resetForm}
                    style={{ marginTop: spacing.sm }}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "88%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.control,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title2,
    color: colors.ink[900],
  },
  closeBtn: {
    padding: spacing.xs,
  },
  contentContainer: {
    padding: spacing.xl,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[600],
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
    marginBottom: spacing.xs,
  },
  modalidadesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalidadeChip: {
    position: "relative",
    padding: 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  modalidadeChipSelected: {
    borderColor: colors.primary[500],
  },
  selectedCheck: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.primary[500],
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.danger.light,
    padding: spacing.md,
    borderRadius: radii.control,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.danger.dark,
  },
  successContainer: {
    alignItems: "center",
  },
  successBadge: {
    marginBottom: spacing.lg,
  },
  timerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning.light,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
  },
  timerText: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.warning.dark,
  },
  timerBold: {
    fontFamily: fonts.bold,
  },
  linkCard: {
    width: "100%",
    backgroundColor: colors.ink[100],
    padding: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  linkLabel: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    textTransform: "uppercase",
    marginBottom: 4,
  },
  linkText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[800],
  },
  actionButtons: {
    width: "100%",
    gap: spacing.sm,
  },
});
