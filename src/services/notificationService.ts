import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { colors } from "@/src/theme/tokens";

// Configura o comportamento da notificação quando o app está em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldPresentAlert: true,
  } as any),
});

export const notificationService = {
  /**
   * Solicita permissão de notificações do sistema operacional (iOS e Android)
   * e configura o canal padrão no Android.
   */
  async solicitarPermissao(): Promise<boolean> {
    try {
      if (Platform.OS === "web") return false;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return false;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Notificações Gymnasion",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: colors.primary[500],
          sound: "default",
        });
      }

      return true;
    } catch (err) {
      console.warn("Erro ao solicitar permissão de notificações:", err);
      return false;
    }
  },

  /**
   * Agenda um lembrete diário de treino no horário especificado (ex: 08:00).
   */
  async agendarLembreteTreinoDiario(hora = 8, minuto = 0): Promise<string | null> {
    try {
      const permitiu = await notificationService.solicitarPermissao();
      if (!permitiu) return null;

      // Cancela lembretes anteriores para evitar duplicidade
      await Notifications.cancelAllScheduledNotificationsAsync();

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Hora do seu treino! 🏋️‍♂️",
          body: "Seu corpo agradece a consistência. Abra o Gymnasion e confira a rotina de hoje!",
          sound: true,
          data: { tipo: "LEMBRETE_TREINO" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hora,
          minute: minuto,
        },
      });

      return id;
    } catch (err) {
      console.warn("Erro ao agendar lembrete de treino:", err);
      return null;
    }
  },

  /**
   * Dispara uma notificação de cronômetro de descanso finalizado
   * (útil caso o usuário minimize o app durante o descanso).
   */
  async agendarAlertaDescanso(segundos: number): Promise<string | null> {
    try {
      if (segundos <= 0) return null;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Tempo de descanso encerrado! ⏱️",
          body: "Pronto para a próxima série? Mantenha o foco!",
          sound: true,
          data: { tipo: "TIMER_DESCANSO" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: segundos,
        },
      });

      return id;
    } catch (err) {
      console.warn("Erro ao agendar alerta de descanso:", err);
      return null;
    }
  },

  /**
   * Dispara uma notificação local instantânea no dispositivo.
   */
  async dispararNotificacaoLocal(
    titulo: string,
    corpo: string,
    dados?: Record<string, unknown>
  ): Promise<string | null> {
    try {
      const permitiu = await notificationService.solicitarPermissao();
      if (!permitiu) return null;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: corpo,
          sound: true,
          data: dados || {},
        },
        trigger: null, // Imediato
      });

      return id;
    } catch (err) {
      console.warn("Erro ao disparar notificação local:", err);
      return null;
    }
  },

  /**
   * Cancela todas as notificações locais agendadas.
   */
  async cancelarTodas(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      console.warn("Erro ao cancelar notificações:", err);
    }
  },
};
