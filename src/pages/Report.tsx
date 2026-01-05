import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Download,
  ExternalLink,
  Share2,
  Clock,
  Globe,
  FileSearch,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScoreCard } from '@/components/ScoreCard';
import { FindingsTable } from '@/components/FindingsTable';
import { CategoryBreakdownChart, SeverityDistributionChart, FindingsByCategory } from '@/components/Charts';
import { ComingSoonHistory } from '@/components/ComingSoonHistory';
import { EthicalUsePanel } from '@/components/EthicalUsePanel';
import { AppLayout } from '@/components/layout/AppLayout';

import { downloadPdfReport, downloadEvidenceBundle } from '@/lib/api';
import type { AuditResult } from '@/lib/api';

export default function Report() {
  const [result, setResult] = useState<AuditResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lastAuditResult');
    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch {
        setResult(null);
      }
    } else {
      setResult(null);
    }
  }, []);

  if (!result) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <p className="text-muted-foreground">No audit report found. Run an audit first.</p>
            <Link to="/audit">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Audit
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadPdfReport(result.audit_id);
      downloadBlob(blob, `Audivue-audit-${result.audit_id}.pdf`);
    } catch (e: any) {
      alert(e?.message || 'Failed to download PDF report');
    }
  };

  const handleDownloadEvidence = async () => {
    try {
      const blob = await downloadEvidenceBundle(result.audit_id);
      downloadBlob(blob, `Audivue-evidence-${result.audit_id}.zip`);
    } catch (e: any) {
      alert(e?.message || 'Failed to download evidence bundle');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <AppLayout>
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link to="/audit">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Audit
                  </Button>
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Audit Report</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {result.target_url}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDownloadEvidence}>
                <FileSearch className="w-4 h-4 mr-2" />
                Evidence Bundle
              </Button>
              <Button onClick={handleDownloadPdf}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Score Card */}
            <Card className="glass lg:row-span-2">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                <ScoreCard
                  score={result.overall_score}
                  grade={result.grade}
                  label="Production Readiness Score"
                  size="lg"
                />
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSearch className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{result.findings.length}</p>
                    <p className="text-sm text-muted-foreground">Total Findings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{result.pages_crawled.length}</p>
                    <p className="text-sm text-muted-foreground">Pages Audited</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {formatDuration(result.duration_seconds)}
                    </p>
                    <p className="text-sm text-muted-foreground">Audit Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Scores Quick View */}
            <div className="lg:col-span-3">
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Category Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {result.category_scores.map((category) => (
                      <div key={category.category} className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-2xl font-bold text-foreground">{category.score}</p>
                        <p className="text-xs text-muted-foreground truncate">{category.category}</p>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {category.findings_count} issues
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="findings" className="space-y-6">
            <TabsList className="glass">
              <TabsTrigger value="findings">Findings</TabsTrigger>
              <TabsTrigger value="charts">Analytics</TabsTrigger>
              <TabsTrigger value="pages">Pages Audited</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="findings" className="space-y-6">
              <FindingsTable findings={result.findings} />
            </TabsContent>

            <TabsContent value="charts" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <CategoryBreakdownChart categoryScores={result.category_scores} />
                <SeverityDistributionChart findings={result.findings} />
              </div>
              <FindingsByCategory categoryScores={result.category_scores} />
            </TabsContent>

            <TabsContent value="pages">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Pages Audited</CardTitle>
                  <CardDescription>
                    All pages that were crawled and analyzed during the audit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.pages_crawled.map((url, index) => (
                      <motion.div
                        key={url}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <code className="text-sm text-foreground truncate flex-1">{url}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <ComingSoonHistory />
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Ethical Notice */}
          <EthicalUsePanel variant="compact" />
        </div>
      </div>
    </AppLayout>
  );
}
