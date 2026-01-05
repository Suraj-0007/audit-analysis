import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanSearch,
  FileText,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/audit', label: 'Audit', icon: ScanSearch, enabled: true },
  { path: '/reports', label: 'Reports', icon: FileText, enabled: true },
  { path: '/history', label: 'History', icon: History, enabled: false, badge: 'Coming Soon' },
  { path: '/settings', label: 'Settings', icon: Settings, enabled: false, badge: 'Coming Soon' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  // Set dark mode by default
  if (!document.documentElement.classList.contains('dark') && isDark) {
    document.documentElement.classList.add('dark');
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 240 }}
        className="fixed left-0 top-0 h-full z-40 flex flex-col border-r border-border bg-card"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            {/* ✅ use PNG logo instead of Shield icon */}
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-primary/10">
              <img
                src="/Audivue-logo.png"
                alt="Audivue logo"
                className="w-6 h-6 object-contain"
                draggable={false}
              />
            </div>

            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-semibold text-foreground whitespace-nowrap overflow-hidden"
                >
                  Audivue
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/audit' && location.pathname.startsWith('/audit'));

            return (
              <Link
                key={item.path}
                to={item.enabled ? item.path : '#'}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : item.enabled
                    ? 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    : 'text-muted-foreground/50 cursor-not-allowed'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm overflow-hidden whitespace-nowrap"
                >
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm overflow-hidden whitespace-nowrap"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          collapsed ? 'ml-[72px]' : 'ml-[240px]'
        )}
      >
        {children}
      </main>
    </div>
  );
}
