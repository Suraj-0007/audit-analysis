import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AuditViewerProps {
  targetUrl: string;
  onOpenLoginWindow: () => void;
  isLoginWindowOpen?: boolean;
}

export function AuditViewer({ targetUrl, onOpenLoginWindow, isLoginWindowOpen }: AuditViewerProps) {
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    // Reset states when URL changes
    setIframeBlocked(false);
    setIframeLoading(true);
  }, [targetUrl]);

  const handleIframeError = () => {
    setIframeBlocked(true);
    setIframeLoading(false);
  };

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  const LogoIcon = ({ className = '' }: { className?: string }) => (
    <img
      src="/Audivue-logo.png"
      alt="Audivue"
      className={className}
      draggable={false}
    />
  );

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Audit Session Viewer</CardTitle>
            <CardDescription className="truncate max-w-md">
              {targetUrl}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(targetUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Tab
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onOpenLoginWindow}
              disabled={isLoginWindowOpen}
            >
              <span className="w-4 h-4 mr-2 inline-flex items-center justify-center">
                <LogoIcon className="w-4 h-4 object-contain" />
              </span>
              {isLoginWindowOpen ? 'Window Open' : 'Open Login Window'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {iframeBlocked ? (
          <div className="h-[400px] flex items-center justify-center bg-muted/30 p-8">
            <Alert variant="default" className="max-w-lg">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Embedding Blocked</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-4">
                  This application blocks iframe embedding (X-Frame-Options or CSP policy).
                  This is a security feature and doesn't indicate a problem.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Use the "Open Login Window" button above to complete login in a secure
                  browser window controlled by our audit system.
                </p>
                <Button onClick={onOpenLoginWindow} className="w-full">
                  <span className="w-4 h-4 mr-2 inline-flex items-center justify-center">
                    <LogoIcon className="w-4 h-4 object-contain" />
                  </span>
                  Open Secure Login Window
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="relative h-[400px] bg-muted/10">
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-8 h-8 text-muted-foreground" />
                </motion.div>
              </div>
            )}
            <iframe
              src={targetUrl}
              className="w-full h-full border-0"
              onError={handleIframeError}
              onLoad={handleIframeLoad}
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
              title="Audit Target Preview"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
