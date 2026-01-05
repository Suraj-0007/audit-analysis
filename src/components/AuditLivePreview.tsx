import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, RefreshCw, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  auditId: string;
  /** When false, the preview stops auto-refreshing (final frame stays visible). */
  isRunning: boolean;
  className?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export function AuditLivePreview({ auditId, isRunning, className }: Props) {
  const [tick, setTick] = useState(0);
  const [hadFrame, setHadFrame] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Poll while running; stop once completed.
  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const src = useMemo(() => {
    // Cache-bust so the browser fetches a fresh frame.
    return `${API_BASE_URL}/audits/${encodeURIComponent(auditId)}/preview.jpg?ts=${Date.now()}_${tick}`;
  }, [auditId, tick]);

  return (
    <Card className={cn('glass overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Live Preview
        </CardTitle>
        <CardDescription>
          {isRunning ? 'Updates automatically during the audit' : 'Final frame captured'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {blocked ? (
          <div className="h-[320px] flex items-center justify-center bg-muted/30 p-6">
            <div className="text-center max-w-sm">
              <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium text-foreground">Preview unavailable</p>
              <p className="text-sm text-muted-foreground mt-1">
                The server hasn&apos;t provided preview frames yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative h-[320px] bg-muted/10">
            {!hadFrame && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-8 h-8 text-muted-foreground" />
                </motion.div>
              </div>
            )}
            <img
              src={src}
              alt="Audit live preview"
              className="w-full h-full object-cover"
              onLoad={() => setHadFrame(true)}
              onError={() => {
                // 404 is expected until the first screenshot is captured.
                // Keep showing the loader until we either get a frame or the audit ends.
                if (!isRunning && !hadFrame) setBlocked(true);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
