import type { AuditResult, AuditProgress, CategoryScore, Finding } from './api';

export const mockCategoryScores: CategoryScore[] = [
  {
    category: 'Console Errors',
    score: 72,
    weight: 0.15,
    findings_count: 8,
    critical_count: 0,
    high_count: 2,
    medium_count: 4,
    low_count: 2,
  },
  {
    category: 'Network/API',
    score: 85,
    weight: 0.2,
    findings_count: 5,
    critical_count: 0,
    high_count: 1,
    medium_count: 2,
    low_count: 2,
  },
  {
    category: 'UI Flows',
    score: 90,
    weight: 0.2,
    findings_count: 3,
    critical_count: 0,
    high_count: 0,
    medium_count: 2,
    low_count: 1,
  },
  {
    category: 'Performance',
    score: 68,
    weight: 0.2,
    findings_count: 6,
    critical_count: 1,
    high_count: 2,
    medium_count: 2,
    low_count: 1,
  },
  {
    category: 'Security',
    score: 78,
    weight: 0.15,
    findings_count: 4,
    critical_count: 0,
    high_count: 1,
    medium_count: 2,
    low_count: 1,
  },
  {
    category: 'Accessibility',
    score: 82,
    weight: 0.1,
    findings_count: 7,
    critical_count: 0,
    high_count: 1,
    medium_count: 3,
    low_count: 3,
  },
];

export const mockFindings: Finding[] = [
  {
    id: 'f1',
    category: 'console',
    severity: 'high',
    title: 'Uncaught TypeError in Dashboard Component',
    description: 'Cannot read properties of undefined (reading \'map\')',
    affected_url: 'https://example.app/dashboard',
    evidence: 'TypeError: Cannot read properties of undefined (reading \'map\')\n    at Dashboard.tsx:45:23\n    at renderWithHooks (react-dom.development.js:14985:18)',
    recommended_fix: 'Add null check before calling .map() on the data array. Consider using optional chaining (data?.map) or providing a default empty array.',
    timestamp: '2024-01-15T10:23:45Z',
  },
  {
    id: 'f2',
    category: 'network',
    severity: 'high',
    title: 'API Endpoint Returns 500 Error',
    description: '/api/users/profile endpoint consistently returns HTTP 500',
    affected_url: 'https://example.app/api/users/profile',
    evidence: 'GET /api/users/profile 500 (Internal Server Error)\nResponse time: 2345ms',
    recommended_fix: 'Investigate server-side error handling. Check backend logs for the root cause of the 500 error.',
    timestamp: '2024-01-15T10:24:12Z',
  },
  {
    id: 'f3',
    category: 'performance',
    severity: 'critical',
    title: 'Extremely Large JavaScript Bundle',
    description: 'Main bundle size is 4.2MB (uncompressed), causing slow initial load',
    affected_url: 'https://example.app/static/js/main.chunk.js',
    evidence: 'Bundle size: 4.2MB (uncompressed), 1.8MB (gzipped)\nLoad time on 3G: 12.4 seconds',
    recommended_fix: 'Implement code splitting with React.lazy() and dynamic imports. Consider tree shaking and removing unused dependencies.',
    timestamp: '2024-01-15T10:24:30Z',
  },
  {
    id: 'f4',
    category: 'security',
    severity: 'high',
    title: 'Missing Content-Security-Policy Header',
    description: 'No CSP header detected, increasing XSS vulnerability risk',
    affected_url: 'https://example.app/',
    evidence: 'Response headers missing: Content-Security-Policy',
    recommended_fix: 'Implement a Content-Security-Policy header to prevent XSS attacks. Start with a restrictive policy and relax as needed.',
    timestamp: '2024-01-15T10:24:45Z',
  },
  {
    id: 'f5',
    category: 'accessibility',
    severity: 'medium',
    title: 'Images Missing Alt Text',
    description: '12 images found without alt attributes',
    affected_url: 'https://example.app/products',
    evidence: '<img src="/product-1.jpg">\n<img src="/product-2.jpg">\n<img src="/hero-banner.png">',
    recommended_fix: 'Add descriptive alt attributes to all images. Use empty alt="" for decorative images.',
    timestamp: '2024-01-15T10:25:00Z',
  },
  {
    id: 'f6',
    category: 'ui_flow',
    severity: 'medium',
    title: 'Form Submission Error Not Handled',
    description: 'Contact form shows no feedback on submission failure',
    affected_url: 'https://example.app/contact',
    evidence: 'Form submitted with network error - no user feedback displayed',
    recommended_fix: 'Implement error handling UI for form submissions. Show clear error messages when submission fails.',
    timestamp: '2024-01-15T10:25:15Z',
  },
  {
    id: 'f7',
    category: 'console',
    severity: 'medium',
    title: 'Deprecation Warning in React',
    description: 'componentWillMount is deprecated and will be removed',
    affected_url: 'https://example.app/settings',
    evidence: 'Warning: componentWillMount has been renamed, and is not recommended for use.',
    recommended_fix: 'Replace componentWillMount with componentDidMount or useEffect hook in functional components.',
    timestamp: '2024-01-15T10:25:30Z',
  },
  {
    id: 'f8',
    category: 'performance',
    severity: 'medium',
    title: 'Slow API Response Time',
    description: '/api/analytics endpoint takes over 3 seconds to respond',
    affected_url: 'https://example.app/api/analytics',
    evidence: 'Average response time: 3.4s (p95: 5.2s)\nSamples: 5',
    recommended_fix: 'Optimize database queries, implement caching, or consider pagination for large datasets.',
    timestamp: '2024-01-15T10:25:45Z',
  },
];

export const mockAuditResult: AuditResult = {
  audit_id: 'audit-demo-001',
  session_id: 'session-demo-001',
  target_url: 'https://example.app',
  overall_score: 78,
  grade: 'C',
  category_scores: mockCategoryScores,
  findings: mockFindings,
  pages_crawled: [
    'https://example.app/',
    'https://example.app/dashboard',
    'https://example.app/products',
    'https://example.app/contact',
    'https://example.app/settings',
    'https://example.app/profile',
  ],
  started_at: '2024-01-15T10:20:00Z',
  completed_at: '2024-01-15T10:26:30Z',
  duration_seconds: 390,
};

export const mockAuditProgress: AuditProgress = {
  audit_id: 'audit-demo-001',
  status: 'running',
  progress: 65,
  current_step: 'Analyzing network requests...',
  pages_crawled: 4,
  findings_count: 12,
  started_at: '2024-01-15T10:20:00Z',
  elapsed_seconds: 180,
};

export const simulateAuditProgress = (
  onProgress: (progress: AuditProgress) => void,
  onComplete: (result: AuditResult) => void
) => {
  const steps = [
    { progress: 10, step: 'Initializing audit session...', pages: 0, findings: 0 },
    { progress: 20, step: 'Crawling pages...', pages: 1, findings: 2 },
    { progress: 35, step: 'Checking console errors...', pages: 3, findings: 5 },
    { progress: 50, step: 'Analyzing network requests...', pages: 4, findings: 12 },
    { progress: 65, step: 'Testing UI flows...', pages: 5, findings: 18 },
    { progress: 75, step: 'Measuring performance...', pages: 6, findings: 24 },
    { progress: 85, step: 'Checking security headers...', pages: 6, findings: 28 },
    { progress: 95, step: 'Running accessibility checks...', pages: 6, findings: 33 },
    { progress: 100, step: 'Generating report...', pages: 6, findings: 33 },
  ];

  let index = 0;
  let elapsed = 0;

  const interval = setInterval(() => {
    if (index < steps.length) {
      const step = steps[index];
      elapsed += 3;
      
      onProgress({
        audit_id: 'audit-demo-001',
        status: step.progress < 100 ? 'running' : 'completed',
        progress: step.progress,
        current_step: step.step,
        pages_crawled: step.pages,
        findings_count: step.findings,
        started_at: new Date().toISOString(),
        elapsed_seconds: elapsed,
      });

      index++;
    } else {
      clearInterval(interval);
      onComplete(mockAuditResult);
    }
  }, 1500);

  return () => clearInterval(interval);
};
