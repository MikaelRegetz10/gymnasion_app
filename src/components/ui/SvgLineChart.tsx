import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, LayoutChangeEvent } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors, fonts, typography, radii, spacing } from "@/src/theme/tokens";

export interface DataPoint {
  label: string;
  value: number;
}

export interface SvgLineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  yAxisSuffix?: string;
  emptyMessage?: string;
}

const { width: WINDOW_WIDTH } = Dimensions.get("window");

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function SvgLineChart({
  data,
  color = colors.primary[500],
  height = 190,
  yAxisSuffix = "",
  emptyMessage = "Sem dados suficientes para este gráfico",
}: SvgLineChartProps) {
  const [containerWidth, setContainerWidth] = useState<number>(0);

  function handleLayout(e: LayoutChangeEvent) {
    const width = Math.floor(e.nativeEvent.layout.width);
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  }

  if (!data || data.length < 2) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  // Largura calculada responsivamente a partir do container pai
  const chartWidth = containerWidth > 0 ? containerWidth : WINDOW_WIDTH - spacing.lg * 2 - 32;
  const paddingX = 24;
  const paddingTop = 32; // Folga no topo para o valor do ponto não ser cortado
  const paddingBottom = 26; // Folga inferior para as labels de data
  const drawWidth = Math.max(chartWidth - paddingX * 2, 10);
  const drawHeight = Math.max(height - paddingTop - paddingBottom, 10);

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * drawWidth;
    const y = height - paddingBottom - ((d.value - minVal) / range) * drawHeight;
    return { x, y, ...d };
  });

  // Filtro inteligente para evitar colisão de rótulos de data no eixo X
  const visibleLabelIndices = useMemo(() => {
    if (data.length <= 4) return new Set(data.map((_, i) => i));

    const set = new Set<number>();
    let lastX = -999;
    const minSpacing = 36;

    data.forEach((d, idx) => {
      const x = paddingX + (idx / (data.length - 1)) * drawWidth;
      const isSameDateAsPrev = idx > 0 && data[idx - 1].label === d.label;
      if (isSameDateAsPrev) return;

      if (x - lastX >= minSpacing || idx === 0 || idx === data.length - 1) {
        set.add(idx);
        lastX = x;
      }
    });

    return set;
  }, [data, drawWidth, paddingX]);

  const pathD = buildSmoothPath(points);
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const gradientId = `chartGrad_${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <View style={styles.chartWrapper} onLayout={handleLayout}>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.25" />
            <Stop offset="1" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Linha de Grade Superior */}
        <Line
          x1={paddingX}
          y1={paddingTop}
          x2={chartWidth - paddingX}
          y2={paddingTop}
          stroke={colors.border}
          strokeDasharray="4 4"
          strokeWidth="1"
        />

        {/* Linha de Grade Inferior */}
        <Line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={chartWidth - paddingX}
          y2={height - paddingBottom}
          stroke={colors.border}
          strokeWidth="1"
        />

        {/* Área Sombreada Suave com Gradiente */}
        <Path d={areaD} fill={`url(#${gradientId})`} />

        {/* Curva Suave Principal */}
        <Path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos e Rótulos */}
        {points.map((p, idx) => {
          const showLabel = visibleLabelIndices.has(idx);

          return (
            <React.Fragment key={idx}>
              <Circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill={colors.surface}
                stroke={color}
                strokeWidth="2.5"
              />

              {/* Rótulo de Data no Eixo X */}
              {showLabel && (
                <SvgText
                  x={p.x}
                  y={height - 8}
                  fontSize="10"
                  fontFamily={fonts.medium}
                  fill={colors.ink[400]}
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              )}

              {/* Valor Acima do Ponto com Folga Segura */}
              <SvgText
                x={p.x}
                y={p.y - 8}
                fontSize="11"
                fontFamily={fonts.bold}
                fill={colors.ink[900]}
                textAnchor="middle"
              >
                {p.value}
                {yAxisSuffix}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.xs,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: radii.control,
    padding: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.caption,
    color: colors.ink[500],
    textAlign: "center",
  },
});
