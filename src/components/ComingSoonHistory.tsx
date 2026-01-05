import { motion } from 'framer-motion';
import { History, Lock, Users, FolderKanban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ComingSoonHistoryProps {
  className?: string;
}

const upcomingFeatures = [
  {
    icon: History,
    title: 'Audit History',
    description: 'Access all your past audits with full reports and trend analysis',
    status: 'In Development',
  },
  {
    icon: FolderKanban,
    title: 'Team Projects',
    description: 'Organize audits by project and share with team members',
    status: 'Planned',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite team members, assign findings, and track remediation',
    status: 'Planned',
  },
];

// Mock audit history data
const mockHistory = [
  { url: 'https://app.example.com', score: 85, date: '2 hours ago', status: 'completed' },
  { url: 'https://staging.demo.io', score: 72, date: 'Yesterday', status: 'completed' },
  { url: 'https://beta.product.co', score: 91, date: '3 days ago', status: 'completed' },
];

export function ComingSoonHistory({ className }: ComingSoonHistoryProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Coming Soon Banner */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <History className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Audit History & Team Features</CardTitle>
                <Badge variant="outline" className="border-primary text-primary">
                  Coming Soon
                </Badge>
              </div>
              <CardDescription>
                Track your audits over time and collaborate with your team
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {upcomingFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative p-4 rounded-lg bg-muted/30 border border-border/50"
              >
                <Badge
                  variant="secondary"
                  className="absolute top-2 right-2 text-[10px]"
                >
                  {feature.status}
                </Badge>
                <feature.icon className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-medium text-foreground mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mock History Preview (Disabled) */}
      <Card className="glass opacity-60 relative overflow-hidden">
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              Audit history requires account
            </p>
            <Button variant="outline" size="sm" className="mt-2" disabled>
              Sign up for early access
            </Button>
          </div>
        </div>

        <CardHeader>
          <CardTitle className="text-lg">Recent Audits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockHistory.map((audit, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div>
                  <p className="font-medium text-foreground">{audit.url}</p>
                  <p className="text-sm text-muted-foreground">{audit.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Score: {audit.score}</Badge>
                  <Button variant="ghost" size="sm" disabled>
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
