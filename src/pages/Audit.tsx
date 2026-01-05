import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  Play,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Stepper, type Step } from '@/components/Stepper';
import { AuditViewer } from '@/components/AuditViewer';
import { LoginInstructions } from '@/components/LoginInstructions';
import { ProgressDisplay } from '@/components/ProgressDisplay';
import { AuditLivePreview } from '@/components/AuditLivePreview';
import { EthicalUsePanel } from '@/components/EthicalUsePanel';
import { AppLayout } from '@/components/layout/AppLayout';

import {
  isValidUrl,
  startSession,
  openLoginWindow,
  markLoggedIn,
  startAudit as startAuditApi,
  getAuditStatus,
  getAuditResult,
} from '@/lib/api';

import type { AuditProgress, AuditResult, AuditOptions } from '@/lib/api';

const auditSteps: Step[] = [
  { id: 'session', label: 'Session', description: 'Create audit session' },
  { id: 'login', label: 'Login', description: 'Manual authentication' },
  { id: 'audit', label: 'Audit', description: 'Automated checks' },
  { id: 'report', label: 'Report', description: 'View results' },
];

const defaultOptions: AuditOptions = {
  check_console: true,
  check_network: true,
  check_ui_flows: true,
  check_performance: true,
  check_security: true,
  check_accessibility: true,
  max_pages: 20,
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Backend status mapping:
 * - Some backends return: queued|running|done|error
 * - Frontend types expect: pending|running|completed|failed
 * This adapter makes the UI stable without changing your backend.
 */
function normalizeStatus(s: any): 'pending' | 'running' | 'completed' | 'failed' {
  const v = String(s || '').toLowerCase();
  if (v === 'queued') return 'pending';
  if (v === 'pending') return 'pending';
  if (v === 'running') return 'running';
  if (v === 'done') return 'completed';
  if (v === 'completed') return 'completed';
  if (v === 'error') return 'failed';
  if (v === 'failed') return 'failed';
  return 'running';
}

function adaptProgress(raw: any): AuditProgress {
  // Support both shapes:
  // A) { audit_id, status, progress, current_step, pages_crawled, findings_count, started_at, elapsed_seconds }
  // B) { status, progress: { stage, percent }, partial_findings... }
  const audit_id = raw?.audit_id || raw?.id || 'unknown';
  const status = normalizeStatus(raw?.status);

  // percent
  const percent =
    typeof raw?.progress === 'number'
      ? raw.progress
      : typeof raw?.progress?.percent === 'number'
        ? raw.progress.percent
        : 0;

  const current_step =
    raw?.current_step ||
    raw?.progress?.stage ||
    raw?.progress?.message ||
    (status === 'completed' ? 'Completed' : status === 'failed' ? 'Failed' : 'Running...');

  const pages_crawled =
    typeof raw?.pages_crawled === 'number'
      ? raw.pages_crawled
      : typeof raw?.metrics?.pages_crawled === 'number'
        ? raw.metrics.pages_crawled
        : 0;

  const findings_count =
    typeof raw?.findings_count === 'number'
      ? raw.findings_count
      : typeof raw?.metrics?.findings_count === 'number'
        ? raw.metrics.findings_count
        : 0;

  const started_at = raw?.started_at || new Date().toISOString();
  const elapsed_seconds =
    typeof raw?.elapsed_seconds === 'number'
      ? raw.elapsed_seconds
      : typeof raw?.progress?.elapsed_seconds === 'number'
        ? raw.progress.elapsed_seconds
        : 0;

  return {
    audit_id,
    status,
    progress: percent,
    current_step,
    pages_crawled,
    findings_count,
    started_at,
    elapsed_seconds,
  };
}

export default function Audit() {
  const navigate = useNavigate();
  const pollTimer = useRef<number | null>(null);

  const [targetUrl, setTargetUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoginWindowOpen, setIsLoginWindowOpen] = useState(false);

  const [auditProgress, setAuditProgress] = useState<AuditProgress | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [options, setOptions] = useState<AuditOptions>(defaultOptions);
  const [showOptions, setShowOptions] = useState(false);

  // Validate URL
  useEffect(() => {
    if (targetUrl && !isValidUrl(targetUrl)) {
      setUrlError('Please enter a valid URL starting with http:// or https://');
    } else {
      setUrlError('');
    }
  }, [targetUrl]);

  // Cleanup poller on unmount
  useEffect(() => {
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, []);

  // Handle session start (REAL)
  const handleStartSession = async () => {
    if (!isValidUrl(targetUrl)) {
      setUrlError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setUrlError('');

    try {
      const session = await startSession(targetUrl);
      setSessionId(session.session_id);
      setCurrentStep(1);
    } catch (e: any) {
      setUrlError(e?.message || 'Failed to start session');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login window (REAL)
  const handleOpenLoginWindow = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setUrlError('');
    setIsLoginWindowOpen(true);

    try {
      // This triggers backend Playwright headed window opening on your machine
      await openLoginWindow(sessionId);
    } catch (e: any) {
      setUrlError(e?.message || 'Failed to open login window');
      setIsLoginWindowOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Start the audit (REAL) + poll progress + fetch result
  const startAudit = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setUrlError('');
    setCurrentStep(2);

    try {
      const { audit_id } = await startAuditApi(sessionId, targetUrl, options);

      setAuditProgress({
        audit_id,
        status: 'running',
        progress: 0,
        current_step: 'Initializing...',
        pages_crawled: 0,
        findings_count: 0,
        started_at: new Date().toISOString(),
        elapsed_seconds: 0,
      });

      // ✅ ONE poller only (no second while loop)
      if (pollTimer.current) window.clearInterval(pollTimer.current);

      let backoffMs = 2500; // start safe
      pollTimer.current = window.setInterval(async () => {
        try {
          const raw = await getAuditStatus(audit_id);
          const prog = adaptProgress(raw as any);
          setAuditProgress(prog);

          // done -> fetch result once
          if (prog.status === 'completed') {
            if (pollTimer.current) window.clearInterval(pollTimer.current);

            const result = await getAuditResult(audit_id);
            setAuditResult(result);
            setCurrentStep(3);
            localStorage.setItem('lastAuditResult', JSON.stringify(result));
            localStorage.setItem('lastAuditId', result.audit_id);
          }

          if (prog.status === 'failed') {
            if (pollTimer.current) window.clearInterval(pollTimer.current);
            setUrlError('Audit failed');
          }
        } catch (e: any) {
          // If backend rate limits, stop spamming and show a clear message
          const msg = e?.message || '';
          if (String(msg).includes('429')) {
            setUrlError('Rate limited by backend. Polling slowed down — please wait...');
            // no need to clear interval; but avoid extra spam by clearing it and re-starting slower
            if (pollTimer.current) window.clearInterval(pollTimer.current);
            // restart slower
            pollTimer.current = window.setInterval(() => {}, 6000) as any;
          }
        }
      }, backoffMs);
    } catch (e: any) {
      setUrlError(e?.message || 'Failed to run audit');
    } finally {
      setIsLoading(false);
      setIsLoginWindowOpen(false);
    }
  }, [sessionId, targetUrl, options]);


  // Handle login confirmation (REAL)
  const handleConfirmLoggedIn = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setUrlError('');

    try {
      await markLoggedIn(sessionId);
      setCurrentStep(2);
      setIsLoginWindowOpen(false);
      await startAudit();
    } catch (e: any) {
      setUrlError(e?.message || 'Failed to mark session logged-in');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to report
  const handleViewReport = () => {
    navigate('/reports');
  };

  // Skip login (for testing without auth)
  const handleSkipLogin = () => {
    setCurrentStep(2);
    startAudit();
  };

  return (
    <AppLayout>
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Technical Audit</h1>
            <p className="text-muted-foreground mt-1">
              Enter a URL to start a comprehensive technical readiness audit
            </p>
          </div>

          {/* Stepper */}
          <Stepper steps={auditSteps} currentStep={currentStep} />

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {/* Step 0: URL Input */}
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-2 gap-6"
              >
                {/* URL Input Card */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-primary" />
                      Target URL
                    </CardTitle>
                    <CardDescription>
                      Enter the URL of your staging, UAT, or development environment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="url">Application URL</Label>
                      <div className="relative">
                        <Input
                          id="url"
                          type="url"
                          placeholder="https://staging.yourapp.com"
                          value={targetUrl}
                          onChange={(e) => setTargetUrl(e.target.value)}
                          className={urlError ? 'border-destructive' : ''}
                        />
                        {targetUrl && !urlError && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-success" />
                        )}
                      </div>
                      {urlError && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {urlError}
                        </p>
                      )}
                    </div>

                    {/* Options toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowOptions(!showOptions)}
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        Audit Options
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-90' : ''}`}
                      />
                    </Button>

                    <AnimatePresence>
                      {showOptions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                            {[
                              { key: 'check_console', label: 'Console Errors' },
                              { key: 'check_network', label: 'Network/API' },
                              { key: 'check_ui_flows', label: 'UI Flows' },
                              { key: 'check_performance', label: 'Performance' },
                              { key: 'check_security', label: 'Security' },
                              { key: 'check_accessibility', label: 'Accessibility' },
                            ].map((option) => (
                              <div key={option.key} className="flex items-center justify-between">
                                <Label htmlFor={option.key}>{option.label}</Label>
                                <Switch
                                  id={option.key}
                                  checked={options[option.key as keyof AuditOptions] as boolean}
                                  onCheckedChange={(checked) =>
                                    setOptions({ ...options, [option.key]: checked })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleStartSession}
                      disabled={!targetUrl || !!urlError || isLoading}
                    >
                      {isLoading ? (
                        'Creating session...'
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Audit Session
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Ethical Use */}
                <EthicalUsePanel variant="full" />
              </motion.div>
            )}

            {/* Step 1: Login */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-2 gap-6"
              >
                <AuditViewer
                  targetUrl={targetUrl}
                  onOpenLoginWindow={handleOpenLoginWindow}
                  isLoginWindowOpen={isLoginWindowOpen}
                />

                <div className="space-y-6">
                  <LoginInstructions
                    onOpenLoginWindow={handleOpenLoginWindow}
                    onConfirmLoggedIn={handleConfirmLoggedIn}
                    isLoading={isLoading}
                    isLoginWindowOpen={isLoginWindowOpen}
                  />

                  <Alert>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Testing without authentication?</span>
                      <Button variant="outline" size="sm" onClick={handleSkipLogin}>
                        Skip Login
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              </motion.div>
            )}

            {/* Step 2: Audit Progress */}
            {currentStep === 2 && auditProgress && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="grid lg:grid-cols-2 gap-6">
                  <ProgressDisplay progress={auditProgress} />
                  <AuditLivePreview
                    auditId={auditProgress.audit_id}
                    isRunning={auditProgress.status === 'running' || auditProgress.status === 'pending'}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Complete */}
            {currentStep === 3 && auditResult && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="glass">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Audit Complete!
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      We found {auditResult.findings.length} findings across{' '}
                      {auditResult.pages_crawled.length} pages.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button size="lg" onClick={handleViewReport}>
                        View Full Report
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => {
                          setCurrentStep(0);
                          setTargetUrl('');
                          setSessionId(null);
                          setAuditProgress(null);
                          setAuditResult(null);
                        }}
                      >
                        Run Another Audit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}
