import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CategoryScore, Finding } from '@/lib/api';

interface CategoryBreakdownChartProps {
  categoryScores: CategoryScore[];
  className?: string;
}

interface SeverityDistributionChartProps {
  findings: Finding[];
  className?: string;
}

const CATEGORY_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

const SEVERITY_COLORS = {
  critical: 'hsl(var(--destructive))',
  high: 'hsl(var(--chart-4))',
  medium: 'hsl(var(--warning))',
  low: 'hsl(var(--info))',
  info: 'hsl(var(--muted))',
};

export function CategoryBreakdownChart({ categoryScores, className }: CategoryBreakdownChartProps) {
  const data = categoryScores.map((cs) => ({
    name: cs.category,
    score: cs.score,
    findings: cs.findings_count,
  }));

  return (
    <Card className={cn('glass', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Category Scores</CardTitle>
        <CardDescription>Score breakdown by audit category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function SeverityDistributionChart({ findings, className }: SeverityDistributionChartProps) {
  const severityCounts = findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(severityCounts)
    .map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS],
    }))
    .sort((a, b) => {
      const order = ['Critical', 'High', 'Medium', 'Low', 'Info'];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  return (
    <Card className={cn('glass', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Severity Distribution</CardTitle>
        <CardDescription>Finding counts by severity level</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface FindingsTrendProps {
  categoryScores: CategoryScore[];
  className?: string;
}

export function FindingsByCategory({ categoryScores, className }: FindingsTrendProps) {
  const data = categoryScores.map((cs) => ({
    category: cs.category.replace(' ', '\n'),
    critical: cs.critical_count,
    high: cs.high_count,
    medium: cs.medium_count,
    low: cs.low_count,
  }));

  return (
    <Card className={cn('glass', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Findings by Category</CardTitle>
        <CardDescription>Severity breakdown per category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 10 }}>
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="critical" stackId="a" fill={SEVERITY_COLORS.critical} name="Critical" />
              <Bar dataKey="high" stackId="a" fill={SEVERITY_COLORS.high} name="High" />
              <Bar dataKey="medium" stackId="a" fill={SEVERITY_COLORS.medium} name="Medium" />
              <Bar dataKey="low" stackId="a" fill={SEVERITY_COLORS.low} name="Low" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
