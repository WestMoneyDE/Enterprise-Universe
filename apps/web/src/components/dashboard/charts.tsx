"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// ═══════════════════════════════════════════════════════════════════════════════
// CHARTS - Cyberpunk styled chart components using Recharts
// ═══════════════════════════════════════════════════════════════════════════════

// Color palette for charts
const CHART_COLORS = {
  cyan: "#00F0FF",
  purple: "#A855F7",
  green: "#00FF88",
  gold: "#FFD700",
  red: "#FF3366",
  blue: "#0080FF",
  orange: "#FF6B00",
  pink: "#FF00FF",
};

// Custom tooltip styling
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border border-neon-cyan/30 bg-void-surface/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      {label && (
        <p className="mb-1 text-xs font-medium text-gray-400">{label}</p>
      )}
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

// Area Chart
interface AreaChartWidgetProps {
  title: string;
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xAxisKey?: string;
  color?: keyof typeof CHART_COLORS;
  className?: string;
  height?: number;
  showGrid?: boolean;
  showAxis?: boolean;
}

export function AreaChartWidget({
  title,
  data,
  dataKey,
  xAxisKey = "name",
  color = "cyan",
  className,
  height = 300,
  showGrid = true,
  showAxis = true,
}: AreaChartWidgetProps) {
  const chartColor = CHART_COLORS[color];

  return (
    <Card variant="holo" className={className}>
      <CardHeader>
        <CardTitle className="text-neon-cyan font-display text-sm uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`areaGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.1)" />
            )}
            {showAxis && (
              <>
                <XAxis
                  dataKey={xAxisKey}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(0, 240, 255, 0.2)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(0, 240, 255, 0.2)" }}
                  tickLine={false}
                />
              </>
            )}
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={chartColor}
              strokeWidth={2}
              fill={`url(#areaGradient-${color})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Bar Chart
interface BarChartWidgetProps {
  title: string;
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xAxisKey?: string;
  color?: keyof typeof CHART_COLORS;
  className?: string;
  height?: number;
  horizontal?: boolean;
}

export function BarChartWidget({
  title,
  data,
  dataKey,
  xAxisKey = "name",
  color = "cyan",
  className,
  height = 300,
  horizontal = false,
}: BarChartWidgetProps) {
  const chartColor = CHART_COLORS[color];

  return (
    <Card variant="holo" className={className}>
      <CardHeader>
        <CardTitle className="text-neon-cyan font-display text-sm uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.1)" />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <YAxis
                  dataKey={xAxisKey}
                  type="category"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  width={100}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xAxisKey}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(0, 240, 255, 0.2)" }}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(0, 240, 255, 0.2)" }}
                />
              </>
            )}
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={dataKey}
              fill={chartColor}
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Multi-line Chart
interface LineChartWidgetProps {
  title: string;
  data: Array<Record<string, unknown>>;
  lines: Array<{ dataKey: string; color: keyof typeof CHART_COLORS; name?: string }>;
  xAxisKey?: string;
  className?: string;
  height?: number;
}

export function LineChartWidget({
  title,
  data,
  lines,
  xAxisKey = "name",
  className,
  height = 300,
}: LineChartWidgetProps) {
  return (
    <Card variant="holo" className={className}>
      <CardHeader>
        <CardTitle className="text-neon-cyan font-display text-sm uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.1)" />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "rgba(0, 240, 255, 0.2)" }}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "rgba(0, 240, 255, 0.2)" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span className="text-gray-300 text-sm">{value}</span>
              )}
            />
            {lines.map((line, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={CHART_COLORS[line.color]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[line.color], strokeWidth: 0, r: 4 }}
                name={line.name || line.dataKey}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Donut/Pie Chart
interface PieChartWidgetProps {
  title: string;
  data: Array<{ name: string; value: number; color?: keyof typeof CHART_COLORS }>;
  className?: string;
  height?: number;
  innerRadius?: number;
  showLabels?: boolean;
}

export function PieChartWidget({
  title,
  data,
  className,
  height = 300,
  innerRadius = 60,
  showLabels = true,
}: PieChartWidgetProps) {
  const defaultColors = Object.values(CHART_COLORS);

  return (
    <Card variant="holo" className={className}>
      <CardHeader>
        <CardTitle className="text-neon-cyan font-display text-sm uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={innerRadius + 40}
              dataKey="value"
              label={showLabels ? ({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : false}
              labelLine={showLabels}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color ? CHART_COLORS[entry.color] : defaultColors[index % defaultColors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
