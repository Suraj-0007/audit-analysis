import { motion } from 'framer-motion';
import { Loader2, CheckCircle, FileSearch, Globe, Terminal, Gauge, Shield, Accessibility } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AuditProgress } from '@/lib/api';

interface ProgressDisplayProps {
  progress: AuditProgress;
  className?: string;
}

const checkIcons = {
  'Initializing': FileSearch,
  'Crawling': Globe,
  'console': Terminal,
  'network': Globe,
  'UI': FileSearch,
  'performance': Gauge,
  'security': Shield,
  'accessibility': Accessibility,
  'Generating': FileSearch,
};

function getIcon(step: string) {
  for (const [key, Icon] of Object.entries(checkIcons)) {
    if (step.toLowerCase().includes(key.toLowerCase())) {
      return Icon;
    }
  }
  return FileSearch;
}

export function ProgressDisplay({ progress, className }: ProgressDisplayProps) {
  const StepIcon = getIcon(progress.current_step);
  const isComplete = progress.status === 'completed';

  return (
    <Card className={cn('glass overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isComplete ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              )}
              {isComplete ? 'Audit Complete' : 'Audit in Progress'}
            </CardTitle>
            <CardDescription>
              {isComplete
                ? 'Your audit report is ready'
                : `Elapsed: ${Math.floor(progress.elapsed_seconds / 60)}m ${progress.elapsed_seconds % 60}s`}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{progress.progress}%</p>
            <p className="text-sm text-muted-foreground">
              {progress.findings_count} findings
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.pages_crawled} pages crawled</span>
            <span>{progress.current_step}</span>
          </div>
        </div>

        {/* Current step indicator */}
        <motion.div
          key={progress.current_step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <StepIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{progress.current_step}</p>
            <p className="text-sm text-muted-foreground">
              {isComplete
                ? 'All checks completed successfully'
                : 'Please wait while we analyze your application'}
            </p>
          </div>
        </motion.div>

        {/* Live stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Pages Crawled"
            value={progress.pages_crawled.toString()}
            icon={Globe}
          />
          <StatCard
            label="Findings"
            value={progress.findings_count.toString()}
            icon={FileSearch}
          />
          <StatCard
            label="Time Elapsed"
            value={`${Math.floor(progress.elapsed_seconds / 60)}:${(progress.elapsed_seconds % 60).toString().padStart(2, '0')}`}
            icon={Gauge}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 text-center">
      <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
