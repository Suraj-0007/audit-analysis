import { motion } from 'framer-motion';
import { Lock, Eye, Trash2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LoginInstructionsProps {
  onOpenLoginWindow: () => void;
  onConfirmLoggedIn: () => void;
  isLoading?: boolean;
  isLoginWindowOpen?: boolean;
}

const securityFeatures = [
  {
    icon: Lock,
    title: 'Secure Browser Context',
    description: 'Login occurs in an isolated browser session',
  },
  {
    icon: Eye,
    title: 'No Credential Storage',
    description: 'We never see or store your credentials',
  },
  {
    icon: Trash2,
    title: 'Auto-Cleanup',
    description: 'Session data deleted after audit or 30-minute timeout',
  },
];

export function LoginInstructions({
  onOpenLoginWindow,
  onConfirmLoggedIn,
  isLoading,
  isLoginWindowOpen,
}: LoginInstructionsProps) {
  const LogoIcon = ({ className = '' }: { className?: string }) => (
    <img
      src="/Audivue-logo.png"
      alt="Audivue"
      className={className}
      draggable={false}
    />
  );

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center gap-3">
          {/* ✅ logo instead of Shield */}
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
            <LogoIcon className="w-6 h-6 object-contain" />
          </div>

          <div>
            <CardTitle>Manual Login Required</CardTitle>
            <CardDescription>
              Complete login to enable authenticated auditing
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">How it works:</h4>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                1
              </span>
              <span>
                Click "Open Login Window" to launch a secure browser window with your target application
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                2
              </span>
              <span>
                Log in using your credentials in that window (we cannot see what you type)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                3
              </span>
              <span>
                Return here and click "I'm logged in, continue audit" to proceed
              </span>
            </li>
          </ol>
        </div>

        {/* Security Features */}
        <div className="grid gap-3">
          {securityFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
            >
              <feature.icon className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onOpenLoginWindow}
            disabled={isLoginWindowOpen}
            className="w-full"
          >
            <Lock className="w-4 h-4 mr-2" />
            {isLoginWindowOpen ? 'Login Window is Open' : 'Open Login Window'}
          </Button>

          <Button
            variant="outline"
            onClick={onConfirmLoggedIn}
            disabled={isLoading}
            className="w-full"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving session...' : "I'm logged in, continue audit"}
          </Button>
        </div>

        {/* Ethical Notice */}
        <p className="text-xs text-muted-foreground text-center">
          This tool performs non-destructive technical readiness checks only.
          No penetration testing or credential storage occurs.
        </p>
      </CardContent>
    </Card>
  );
}
