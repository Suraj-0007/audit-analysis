import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EthicalUsePanelProps {
  className?: string;
  variant?: 'full' | 'compact';
}

const whatWeDo = [
  'Non-destructive technical readiness checks',
  'Console and runtime error detection',
  'Network request failure analysis',
  'Performance and accessibility auditing',
  'Security header verification',
  'Safe, read-only UI exploration',
];

const whatWeDontDo = [
  'Penetration testing or vulnerability exploitation',
  'Credential storage or transmission',
  'Destructive actions (form submissions, deletions)',
  'Brute force or authentication attacks',
  'Data exfiltration or modification',
  'Any actions beyond technical readiness checks',
];

export function EthicalUsePanel({ className, variant = 'full' }: EthicalUsePanelProps) {
  const LogoIcon = ({ className = '' }: { className?: string }) => (
    <img
      src="/Audivue-logo.png"
      alt="Audivue"
      className={className}
      draggable={false}
    />
  );

  if (variant === 'compact') {
    return (
      <div className={cn('p-4 rounded-lg bg-accent/10 border border-accent/20', className)}>
        <div className="flex items-start gap-3">
          {/* ✅ logo instead of Shield */}
          <div className="w-5 h-5 flex-shrink-0 mt-0.5">
            <LogoIcon className="w-5 h-5 object-contain" />
          </div>

          <div>
            <h4 className="font-medium text-foreground text-sm">Ethical Use Commitment</h4>
            <p className="text-xs text-muted-foreground mt-1">
              This tool performs non-destructive technical readiness checks only.
              No penetration testing, no credential storage, no destructive actions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('glass border-accent/20', className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {/* ✅ logo instead of Shield */}
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center overflow-hidden">
            <LogoIcon className="w-6 h-6 object-contain" />
          </div>

          <div>
            <CardTitle>Safety & Ethical Use</CardTitle>
            <CardDescription>
              Our commitment to responsible technical auditing
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* What We Do */}
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              What We Do
            </h4>
            <ul className="space-y-2">
              {whatWeDo.map((item, index) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* What We Don't Do */}
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <X className="w-4 h-4 text-destructive" />
              What We Don't Do
            </h4>
            <ul className="space-y-2">
              {whatWeDontDo.map((item, index) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.3 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <X className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Legal Notice:</strong> Audivue is designed
            for testing applications you own or have explicit authorization to test. Unauthorized
            testing of third-party applications may violate terms of service or applicable laws.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
