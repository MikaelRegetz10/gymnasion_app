import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { Play, Pause, RotateCcw, Plus, X, Timer } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radii, spacing, typography, shadows } from "@/src/theme/tokens";
import { Button } from "../ui";
import { notificationService } from "@/src/services/notificationService";

export interface RestTimerModalProps {
  visible: boolean;
  onClose: () => void;
  defaultSeconds?: number;
}

const PRESETS = [30, 45, 60, 90, 120];

export default function RestTimerModal({
  visible,
  onClose,
  defaultSeconds = 60,
}: RestTimerModalProps) {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (visible) {
      setSeconds(defaultSeconds);
      setTotalSeconds(defaultSeconds);
      setIsRunning(true);
    }
  }, [visible, defaultSeconds]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            // Vibração de alerta ao zerar o descanso
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, seconds]);

  function handleAddSeconds(extra: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeconds((prev) => prev + extra);
    setTotalSeconds((prev) => prev + extra);
  }

  function handleSelectPreset(val: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSeconds(val);
    setTotalSeconds(val);
    setIsRunning(true);
    notificationService.agendarAlertaDescanso(val);
  }

  function handleClose() {
    notificationService.cancelarTodas();
    onClose();
  }

  function formatTime(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  const isCompleted = seconds === 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <Timer size={20} color={colors.primary[500]} />
              <Text style={styles.sheetTitle}>Descanso entre Séries</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.ink[400]} />
            </TouchableOpacity>
          </View>

          {/* Display Digital */}
          <View style={[styles.timerCircle, isCompleted && styles.timerCircleFinished]}>
            <Text style={[styles.timerDisplay, isCompleted && styles.timerDisplayFinished]}>
              {formatTime(seconds)}
            </Text>
            <Text style={styles.timerSubtitle}>
              {isCompleted ? "Tempo Esgotado! Próxima série!" : "Tempo de recuperação"}
            </Text>
          </View>

          {/* Presets Rápidos */}
          <View style={styles.presetsRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => handleSelectPreset(p)}
                style={[
                  styles.presetBtn,
                  totalSeconds === p && styles.presetBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.presetBtnText,
                    totalSeconds === p && styles.presetBtnTextActive,
                  ]}
                >
                  {p}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Controles Principais */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSeconds(totalSeconds);
                setIsRunning(false);
              }}
            >
              <RotateCcw size={22} color={colors.ink[700]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainPlayBtn, isRunning && styles.mainPauseBtn]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsRunning((prev) => !prev);
              }}
            >
              {isRunning ? (
                <Pause size={28} color={colors.surface} />
              ) : (
                <Play size={28} color={colors.surface} style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => handleAddSeconds(15)}
            >
              <View style={styles.addSecondsContainer}>
                <Plus size={16} color={colors.ink[700]} />
                <Text style={styles.addSecondsText}>15s</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Button
            title="Concluir Descanso"
            variant="secondary"
            size="md"
            onPress={handleClose}
            style={styles.closeBtn}
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
    paddingBottom: spacing.xxl + 10,
    ...shadows.lg,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
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
  timerCircle: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
    borderRadius: radii.card,
    marginBottom: spacing.lg,
  },
  timerCircleFinished: {
    backgroundColor: colors.success.light,
  },
  timerDisplay: {
    fontFamily: fonts.extraBold,
    fontSize: 54,
    color: colors.ink[900],
    letterSpacing: -1,
  },
  timerDisplayFinished: {
    color: colors.success.dark,
  },
  timerSubtitle: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    marginTop: 4,
  },
  presetsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  presetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBtnActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  presetBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
  },
  presetBtnTextActive: {
    color: colors.primary[500],
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  addSecondsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  addSecondsText: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.tiny,
    color: colors.ink[700],
  },
  mainPlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  mainPauseBtn: {
    backgroundColor: colors.ink[900],
  },
  closeBtn: {
    marginTop: spacing.xs,
  },
});
