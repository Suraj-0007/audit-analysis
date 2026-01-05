// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Types
export interface AuditSession {
  session_id: string;
  status: 'created' | 'login_pending' | 'logged_in' | 'running' | 'completed' | 'failed';
  viewer_mode: 'iframe' | 'external';
  login_url: string;
  target_url: string;
  created_at: string;
  expires_at: string;
}

export interface AuditOptions {
  check_console: boolean;
  check_network: boolean;
  check_ui_flows: boolean;
  check_performance: boolean;
  check_security: boolean;
  check_accessibility: boolean;
  max_pages: number;
}

export interface AuditProgress {
  audit_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  pages_crawled: number;
  findings_count: number;
  started_at: string;
  elapsed_seconds: number;
}

export interface Finding {
  id: string;
  category: 'console' | 'network' | 'ui_flow' | 'performance' | 'security' | 'accessibility';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  affected_url: string;
  evidence?: string;
  screenshot_url?: string;
  recommended_fix: string;
  timestamp: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  weight: number;
  findings_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

export interface AuditResult {
  audit_id: string;
  session_id: string;
  target_url: string;
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  category_scores: CategoryScore[];
  findings: Finding[];
  pages_crawled: string[];
  started_at: string;
  completed_at: string;
  duration_seconds: number;
}

// API Functions
export async function startSession(url: string): Promise<AuditSession> {
  const response = await fetch(`${API_BASE_URL}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start session');
  }
  
  return response.json();
}

export async function openLoginWindow(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/open-login`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to open login window');
  }
}

export async function markLoggedIn(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/mark-logged-in`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to mark session as logged in');
  }
}

export async function startAudit(
  sessionId: string, 
  url: string, 
  options?: Partial<AuditOptions>
): Promise<{ audit_id: string }> {
  const response = await fetch(`${API_BASE_URL}/audits/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      session_id: sessionId, 
      url,
      options: {
        check_console: true,
        check_network: true,
        check_ui_flows: true,
        check_performance: true,
        check_security: true,
        check_accessibility: true,
        max_pages: 20,
        ...options
      }
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start audit');
  }
  
  return response.json();
}

export async function getAuditStatus(auditId: string): Promise<AuditProgress> {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}/status`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get audit status');
  }
  
  return response.json();
}

export async function getAuditResult(auditId: string): Promise<AuditResult> {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}/result`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get audit result');
  }
  
  return response.json();
}

export async function downloadPdfReport(auditId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}/pdf`);
  
  if (!response.ok) {
    throw new Error('Failed to download PDF report');
  }
  
  return response.blob();
}

export async function downloadEvidenceBundle(auditId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}/evidence.zip`);
  
  if (!response.ok) {
    throw new Error('Failed to download evidence bundle');
  }
  
  return response.blob();
}

// URL Validation
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
