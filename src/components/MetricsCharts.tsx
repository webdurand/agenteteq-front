import { useTheme } from "../hooks/useTheme";
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

interface BaseChartProps {
  data: any[];
  xKey?: string;
  height?: number;
}

export function LineChart({ data, xKey = "name", lines, height = 300 }: BaseChartProps & { lines: { key: string; name: string; color: string }[] }) {
  const { dark } = useTheme();
  const textColor = dark ? "#9ca3af" : "#6b7280";
  const gridColor = dark ? "#374151" : "#e5e7eb";
  const tooltipBg = dark ? "#1f2937" : "#ffffff";
  const tooltipBorder = dark ? "#374151" : "#e5e7eb";

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer>
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', fontSize: '14px', color: dark ? '#f3f4f6' : '#111827' }} 
            itemStyle={{ color: dark ? '#f3f4f6' : '#111827' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: textColor, paddingTop: '10px' }} />
          {lines.map((line, i) => (
            <Line 
              key={line.key} 
              type="monotone" 
              dataKey={line.key} 
              name={line.name} 
              stroke={line.color || COLORS[i % COLORS.length]} 
              strokeWidth={2} 
              dot={{ r: 3, strokeWidth: 2 }} 
              activeDot={{ r: 5 }} 
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChart({ data, xKey = "name", barKey = "value", barName = "Valor", color = "#8b5cf6", height = 300 }: BaseChartProps & { barKey?: string; barName?: string; color?: string }) {
  const { dark } = useTheme();
  const textColor = dark ? "#9ca3af" : "#6b7280";
  const gridColor = dark ? "#374151" : "#e5e7eb";
  const tooltipBg = dark ? "#1f2937" : "#ffffff";
  const tooltipBorder = dark ? "#374151" : "#e5e7eb";

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer>
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', fontSize: '14px', color: dark ? '#f3f4f6' : '#111827' }} 
            cursor={{ fill: dark ? '#374151' : '#f3f4f6' }}
          />
          <Bar dataKey={barKey} name={barName} fill={color} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PieChart({ data, nameKey = "name", dataKey = "value", height = 300, innerRadius = "60%", outerRadius = "80%" }: BaseChartProps & { nameKey?: string; dataKey?: string; innerRadius?: number | string; outerRadius?: number | string }) {
  const { dark } = useTheme();
  const textColor = dark ? "#9ca3af" : "#6b7280";
  const tooltipBg = dark ? "#1f2937" : "#ffffff";
  const tooltipBorder = dark ? "#374151" : "#e5e7eb";

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={5}
            dataKey={dataKey}
            nameKey={nameKey}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index + entry}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', fontSize: '14px', color: dark ? '#f3f4f6' : '#111827' }} 
            itemStyle={{ color: dark ? '#f3f4f6' : '#111827' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: textColor }} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
