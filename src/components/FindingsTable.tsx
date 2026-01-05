import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ExternalLink,
  Terminal,
  Globe,
  Gauge,
  Accessibility,
  Layout,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Finding } from '@/lib/api';

interface FindingsTableProps {
  findings: Finding[];
  className?: string;
}

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' },
  high: { icon: AlertCircle, color: 'text-chart-4', bg: 'bg-chart-4/10', badge: 'default' },
  medium: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', badge: 'secondary' },
  low: { icon: Info, color: 'text-info', bg: 'bg-info/10', badge: 'outline' },
  info: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted/50', badge: 'outline' },
} as const;

// ✅ Use logo instead of Shield icon for "security" category
const categoryConfig = {
  console: { icon: Terminal, label: 'Console Errors' },
  network: { icon: Globe, label: 'Network/API' },
  ui_flow: { icon: Layout, label: 'UI Flows' },
  performance: { icon: Gauge, label: 'Performance' },
  security: { icon: null, label: 'Security' }, // special case
  accessibility: { icon: Accessibility, label: 'Accessibility' },
} as const;

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <img
      src="/Audivue-logo.png"
      alt="Audivue"
      className={className}
      draggable={false}
    />
  );
}

export function FindingsTable({ findings, className }: FindingsTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredFindings = findings.filter((finding) => {
    if (categoryFilter !== 'all' && finding.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && finding.severity !== severityFilter) return false;
    return true;
  });

  const groupedFindings = filteredFindings.reduce((acc, finding) => {
    if (!acc[finding.category]) {
      acc[finding.category] = [];
    }
    acc[finding.category].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  return (
    <Card className={cn('glass', className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Findings</CardTitle>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredFindings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No findings match the selected filters
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {Object.entries(groupedFindings).map(([category, categoryFindings]) => {
              const config = categoryConfig[category as keyof typeof categoryConfig];
              const CategoryIcon = config.icon;

              return (
                <AccordionItem
                  key={category}
                  value={category}
                  className="border rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      {category === 'security' ? (
                        <div className="w-5 h-5 flex items-center justify-center">
                          <LogoMark className="w-5 h-5 object-contain" />
                        </div>
                      ) : (
                        CategoryIcon && <CategoryIcon className="w-5 h-5 text-primary" />
                      )}
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="secondary">{categoryFindings.length}</Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3 pt-2">
                      {categoryFindings.map((finding, index) => (
                        <FindingItem key={finding.id} finding={finding} index={index} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function FindingItem({ finding, index }: { finding: Finding; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const severity = severityConfig[finding.severity];
  const SeverityIcon = severity.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn('rounded-lg border', severity.bg)}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <SeverityIcon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', severity.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={severity.badge as 'default' | 'secondary' | 'destructive' | 'outline'}
              className="text-xs"
            >
              {finding.severity.toUpperCase()}
            </Badge>
            <span className="font-medium text-foreground">{finding.title}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {finding.description}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4 ml-8">
              {/* Affected URL */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Affected URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-foreground bg-muted/50 px-2 py-1 rounded flex-1 truncate">
                    {finding.affected_url}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(finding.affected_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Evidence */}
              {finding.evidence && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Evidence</p>
                  <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto font-mono">
                    {finding.evidence}
                  </pre>
                </div>
              )}

              {/* Recommended Fix */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Fix</p>
                <p className="text-sm text-foreground">{finding.recommended_fix}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
