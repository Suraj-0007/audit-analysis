import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScoreCardProps {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const gradeColors = {
  A: 'text-success',
  B: 'text-chart-2',
  C: 'text-warning',
  D: 'text-chart-4',
  F: 'text-destructive',
};

const gradeBackgrounds = {
  A: 'from-success/20 to-success/5',
  B: 'from-chart-2/20 to-chart-2/5',
  C: 'from-warning/20 to-warning/5',
  D: 'from-chart-4/20 to-chart-4/5',
  F: 'from-destructive/20 to-destructive/5',
};

const sizes = {
  sm: { ring: 80, stroke: 6, text: 'text-xl', grade: 'text-3xl' },
  md: { ring: 120, stroke: 8, text: 'text-2xl', grade: 'text-4xl' },
  lg: { ring: 180, stroke: 10, text: 'text-4xl', grade: 'text-6xl' },
};

export function ScoreCard({ score, grade, label, size = 'md', className }: ScoreCardProps) {
  const config = sizes[size];
  const circumference = 2 * Math.PI * ((config.ring - config.stroke) / 2);
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: config.ring, height: config.ring }}>
        {/* Background gradient */}
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-b',
            gradeBackgrounds[grade]
          )}
        />

        {/* SVG Ring */}
        <svg
          width={config.ring}
          height={config.ring}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={(config.ring - config.stroke) / 2}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={config.stroke}
          />
          
          {/* Progress circle */}
          <motion.circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={(config.ring - config.stroke) / 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            className={gradeColors[grade]}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={cn('font-bold', config.grade, gradeColors[grade])}
          >
            {grade}
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={cn('font-semibold text-foreground', config.text)}
          >
            {score}
          </motion.span>
        </div>
      </div>

      {label && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 text-sm font-medium text-muted-foreground"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
