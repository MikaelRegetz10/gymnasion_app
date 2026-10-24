export type CampoStrava =
  | "DISTANCIA_KM"
  | "DISTANCIA_METROS"
  | "TEMPO_MOVIMENTO"
  | "TEMPO_TOTAL"
  | "DURACAO_MINUTOS"
  | "VELOCIDADE_MEDIA_KMH"
  | "VELOCIDADE_MAXIMA_KMH"
  | "RITMO_MEDIO"
  | "FREQUENCIA_CARDIACA_MEDIA"
  | "FREQUENCIA_CARDIACA_MAXIMA"
  | "CADENCIA_MEDIA"
  | "POTENCIA_MEDIA_WATTS"
  | "POTENCIA_MAXIMA_WATTS"
  | "ELEVACAO_GANHO_METROS"
  | "CALORIAS"
  | "NENHUM";

export interface StravaAuthUrlResponse {
  authUrl: string;
  mock: boolean;
}

export interface StravaConectarRequest {
  code: string;
  scope?: string;
  state?: string;
}

export interface StravaStatusResponse {
  conectado: boolean;
  expirado: boolean;
  atletaId?: number | null;
  nomeAtleta?: string | null;
  mock: boolean;
}

export interface StravaAtividade {
  id: string;
  nome: string;
  tipo: string;
  esporte: string;
  data: string; // YYYY-MM-DD
  dataHora?: string;
  distanciaMetros?: number;
  distanciaKm?: number;
  distanciaFormatada?: string;
  tempoSegundos?: number;
  tempoFormatado?: string;
  duracaoMinutos?: number;
  frequenciaCardiacaMedia?: number | null;
  frequenciaCardiacaMaxima?: number | null;
  ritmoMedio?: string;
  tempoTotalFormatado?: string;
  cadenciaMedia?: number | null;
  potenciaMediaWatts?: number | null;
  potenciaMaximaWatts?: number | null;
  elevacaoGanhoMetros?: number | null;
  velocidadeMediaKmh?: number | null;
  velocidadeMaximaKmh?: number | null;
  calorias?: number | null;
}

export function formatStravaDate(isoDate?: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export function mapStravaActivityToMetrics(
  act: StravaAtividade,
  metrics: { id: string; tipo: string; titulo?: string; campoStrava?: CampoStrava | null }[]
): {
  duration?: number;
  dateReal?: string;
  metricValues: Record<string, string>;
  stravaFilled: Record<string, boolean>;
} {
  const metricValues: Record<string, string> = {};
  const stravaFilled: Record<string, boolean> = {};

  for (const m of metrics) {
    let val: string | null = null;
    const campo = m.campoStrava;

    // 1. Mapeamento Direto por Campo Strava
    if (campo && campo !== "NENHUM") {
      switch (campo) {
        case "DISTANCIA_KM":
          if (act.distanciaKm != null) val = String(act.distanciaKm);
          break;
        case "DISTANCIA_METROS":
          if (act.distanciaMetros != null) val = String(Math.round(act.distanciaMetros));
          break;
        case "TEMPO_MOVIMENTO":
          if (act.tempoFormatado) val = act.tempoFormatado;
          break;
        case "TEMPO_TOTAL":
          if (act.tempoTotalFormatado || act.tempoFormatado) {
            val = act.tempoTotalFormatado || act.tempoFormatado || "";
          }
          break;
        case "DURACAO_MINUTOS":
          if (act.duracaoMinutos != null) val = String(act.duracaoMinutos);
          break;
        case "FREQUENCIA_CARDIACA_MEDIA":
          if (act.frequenciaCardiacaMedia != null) val = String(act.frequenciaCardiacaMedia);
          break;
        case "FREQUENCIA_CARDIACA_MAXIMA":
          if (act.frequenciaCardiacaMaxima != null) val = String(act.frequenciaCardiacaMaxima);
          break;
        case "CADENCIA_MEDIA":
          if (act.cadenciaMedia != null) val = String(Math.round(act.cadenciaMedia));
          break;
        case "POTENCIA_MEDIA_WATTS":
          if (act.potenciaMediaWatts != null) val = String(Math.round(act.potenciaMediaWatts));
          break;
        case "POTENCIA_MAXIMA_WATTS":
          if (act.potenciaMaximaWatts != null) val = String(Math.round(act.potenciaMaximaWatts));
          break;
        case "ELEVACAO_GANHO_METROS":
          if (act.elevacaoGanhoMetros != null) val = String(Math.round(act.elevacaoGanhoMetros));
          break;
        case "VELOCIDADE_MEDIA_KMH":
          if (act.velocidadeMediaKmh != null) val = String(act.velocidadeMediaKmh);
          break;
        case "VELOCIDADE_MAXIMA_KMH":
          if (act.velocidadeMaximaKmh != null) val = String(act.velocidadeMaximaKmh);
          break;
        case "CALORIAS":
          if (act.calorias != null) val = String(Math.round(act.calorias));
          break;
        case "RITMO_MEDIO":
          if (act.ritmoMedio) val = act.ritmoMedio;
          break;
      }
    } else {
      // 2. Fallback Heurístico para métricas legadas sem campoStrava configurado
      const tipo = (m.tipo || "").toUpperCase();
      const titleLower = (m.titulo || "").toLowerCase();

      if (tipo === "FREQUENCIA_CARDIACA") {
        if (act.frequenciaCardiacaMedia != null) val = String(act.frequenciaCardiacaMedia);
      } else if (tipo === "TEMPO") {
        if (act.tempoFormatado) val = act.tempoFormatado;
      } else if (tipo === "NUMERICO") {
        if (titleLower.includes("dist") || titleLower.includes("km") || titleLower.includes("quilometr")) {
          if (act.distanciaKm != null) val = String(act.distanciaKm);
        } else if (titleLower.includes("metro") && !titleLower.includes("km")) {
          if (act.distanciaMetros != null) val = String(Math.round(act.distanciaMetros));
        } else if (titleLower.includes("cadenc") || titleLower.includes("passo") || titleLower.includes("spm")) {
          if (act.cadenciaMedia != null) val = String(Math.round(act.cadenciaMedia));
        } else if (titleLower.includes("potenc") || titleLower.includes("watt")) {
          if (act.potenciaMediaWatts != null) val = String(Math.round(act.potenciaMediaWatts));
        } else if (titleLower.includes("calori") || titleLower.includes("kcal") || titleLower.includes("gasto")) {
          if (act.calorias != null) val = String(Math.round(act.calorias));
        } else if (titleLower.includes("elevac") || titleLower.includes("altimetri")) {
          if (act.elevacaoGanhoMetros != null) val = String(Math.round(act.elevacaoGanhoMetros));
        } else if (titleLower.includes("velocidad") || titleLower.includes("km/h")) {
          if (act.velocidadeMediaKmh != null) val = String(act.velocidadeMediaKmh);
        }
      } else if (tipo === "TEXTO") {
        if (titleLower.includes("ritmo") || titleLower.includes("pace")) {
          if (act.ritmoMedio) val = act.ritmoMedio;
        }
      }
    }

    if (val != null && val !== "") {
      metricValues[m.id] = val;
      stravaFilled[m.id] = true;
    }
  }

  return {
    duration: act.duracaoMinutos,
    dateReal: act.data,
    metricValues,
    stravaFilled,
  };
}
