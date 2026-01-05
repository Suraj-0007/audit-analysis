import { motion } from 'framer-motion';
import { Settings, Lock, User, Bell, Palette, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';

const settingsCategories = [
  { icon: User, title: 'Account', description: 'Manage your profile and preferences' },
  { icon: Shield, title: 'Security', description: 'Configure authentication and access' },
  { icon: Bell, title: 'Notifications', description: 'Customize alert preferences' },
  { icon: Palette, title: 'Appearance', description: 'Theme and display settings' },
];

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-primary text-primary">
                Coming Soon
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your audit preferences and account settings
            </p>
          </div>

          <Card className="glass border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle>Settings Coming Soon</CardTitle>
                  <CardDescription>
                    We're building powerful customization options
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {settingsCategories.map((category, index) => (
                  <motion.div
                    key={category.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative p-4 rounded-lg bg-muted/30 border border-border/50 opacity-60"
                  >
                    <Lock className="absolute top-2 right-2 w-4 h-4 text-muted-foreground" />
                    <category.icon className="w-8 h-8 text-primary mb-3" />
                    <h4 className="font-medium text-foreground mb-1">{category.title}</h4>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
