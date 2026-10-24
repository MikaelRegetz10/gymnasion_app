import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SvgLineChart({
  data,
  color = colors.primary[500],
  height = 180,
  yAxisSuffix = "",
  emptyMessage = "Sem dados suficientes para este gráfico",
}: SvgLineChartProps) {
  if (!data || data.length < 2) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const chartWidth = SCREEN_WIDTH - spacing.lg * 2 - spacing.xl * 2;
  const paddingX = 30;
  const paddingY = 25;
  const drawWidth = chartWidth - paddingX * 2;
  const drawHeight = height - paddingY * 2;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * drawWidth;
    const y = height - paddingY - ((d.value - minVal) / range) * drawHeight;
    return { x, y, ...d };
  });

  // Gera o caminho da linha
  const pathD = points.reduce((acc, point, i) => {
    return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, "");

  // Gera o caminho da área com gradiente
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const gradientId = `chartGrad_${color.replace("#", "")}`;

  return (
    <View style={styles.chartWrapper}>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.25" />
            <Stop offset="1" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Linhas de Grade de Fundo */}
        <Line
          x1={paddingX}
          y1={paddingY}
          x2={chartWidth - paddingX}
          y2={paddingY}
          stroke={colors.border}
          strokeDasharray="4 4"
          strokeWidth="1"
        />
        <Line
          x1={paddingX}
          y1={height - paddingY}
          x2={chartWidth - paddingX}
          y2={height - paddingY}
          stroke={colors.border}
          strokeWidth="1"
        />

        {/* Área Sombreada com Gradiente */}
        <Path d={areaD} fill={`url(#${gradientId})`} />

        {/* Linha Principal da Curva */}
        <Path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Pontos e Valores */}
        {points.map((p, idx) => (
          <React.Fragment key={idx}>
            <Circle cx={p.x} cy={p.y} r="5" fill={colors.surface} stroke={color} strokeWidth="2.5" />
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
            {/* Valor acima do ponto */}
            <SvgText
              x={p.x}
              y={p.y - 10}
              fontSize="11"
              fontFamily={fonts.bold}
              fill={colors.ink[900]}
              textAnchor="middle"
            >
              {p.value}
              {yAxisSuffix}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.sm,
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
