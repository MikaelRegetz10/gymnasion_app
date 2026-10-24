import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Gauge, X, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radii, spacing, typography, shadows } from "@/src/theme/tokens";
import { Button } from "../ui";

export interface RpePickerSheetProps {
  visible: boolean;
  value: number | null;
  onChange: (val: number) => void;
  onClose: () => void;
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
  { val: 10, label: "Esforço Máximo", desc: "Exaustão total, não consegue continuar", color: colors.danger.dark },
];

export default function RpePickerSheet({
  visible,
  value,
  onChange,
  onClose,
}: RpePickerSheetProps) {
  function handleSelect(v: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(v);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <Gauge size={20} color={colors.primary[500]} />
              <Text style={styles.sheetTitle}>Percepção de Esforço (RPE)</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.ink[400]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetSubtitle}>
            Escala Borg CR-10: Selecione quão desafiador foi este treinamento para você.
          </Text>

          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {RPE_LEVELS.map((item) => {
              const isSelected = value === item.val;

              return (
                <TouchableOpacity
                  key={item.val}
                  style={[
                    styles.levelRow,
                    isSelected && styles.levelRowSelected,
                    isSelected && { borderColor: item.color },
                  ]}
                  onPress={() => handleSelect(item.val)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.numberBadge, { backgroundColor: item.color }]}>
                    <Text style={styles.numberBadgeText}>{item.val}</Text>
                  </View>

                  <View style={styles.textContainer}>
                    <Text style={[styles.levelLabel, isSelected && { color: item.color }]}>
                      {item.label}
                    </Text>
                    <Text style={styles.levelDesc}>{item.desc}</Text>
                  </View>

                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: item.color }]}>
                      <Check size={14} color={colors.surface} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Button
            title="Confirmar Nível de Esforço"
            variant="primary"
            size="md"
            onPress={onClose}
            style={styles.confirmBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: "85%",
    ...shadows.lg,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
  },
  sheetSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginBottom: spacing.base,
    lineHeight: 18,
  },
  listContainer: {
    marginBottom: spacing.base,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginBottom: spacing.sm,
  },
  levelRowSelected: {
    backgroundColor: colors.surface,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  numberBadgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    color: colors.surface,
  },
  textContainer: {
    flex: 1,
  },
  levelLabel: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
  },
  levelDesc: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  confirmBtn: {
    marginTop: spacing.xs,
  },
});
