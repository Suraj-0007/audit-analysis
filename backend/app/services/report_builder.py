"""Builds structured reports from audit data."""

from datetime import datetime
from typing import List

from app.schemas import (
    AuditReport, CategoryScore, PerformanceMetrics,
    RecommendedFix, Severity
)
from app.utils.scoring import calculate_score, get_grade


class ReportBuilder:
    """Builds the final audit report."""
    
    def __init__(self, audit):
        self.audit = audit
    
    def build(self) -> AuditReport:
        """Build the complete report."""
        # Calculate category scores
        category_scores = self._calculate_category_scores()
        
        # Calculate overall score
        total_score = calculate_score(
            console_errors=len(self.audit.console_errors),
            network_failures=len(self.audit.network_failures),
            ui_errors=sum(1 for f in self.audit.ui_flows if f.status == "error"),
            security_issues=self._count_security_issues(),
            accessibility_violations=len(self.audit.accessibility_violations),
            slow_endpoints=len(self.audit.slow_endpoints),
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations()
        
        # Build summary
        summary = self._generate_summary(total_score)
        
        # Calculate duration
        duration = None
        if self.audit.finished_at:
            duration = (self.audit.finished_at - self.audit.started_at).total_seconds()
        
        return AuditReport(
            audit_id=self.audit.audit_id,
            session_id=self.audit.session_id,
            url=self.audit.url,
            started_at=self.audit.started_at,
            finished_at=self.audit.finished_at,
            duration_seconds=duration,
            score=total_score,
            grade=get_grade(total_score),
            summary=summary,
            category_scores=category_scores,
            console_errors=self.audit.console_errors,
            network_failures=self.audit.network_failures,
            ui_flows=self.audit.ui_flows,
            performance=PerformanceMetrics(
                page_timings=self.audit.page_timings,
                largest_assets=self.audit.large_assets[:10],
                slow_endpoints=self.audit.slow_endpoints[:10],
            ),
            security_hygiene=self.audit.security_hygiene,
            accessibility_violations=self.audit.accessibility_violations,
            recommended_fixes=recommendations,
            pages_audited=len(self.audit.visited_urls),
            total_requests=self.audit.total_requests,
        )
    
    def _calculate_category_scores(self) -> List[CategoryScore]:
        """Calculate scores for each category."""
        categories = []
        
        # Console Errors (max 20 points)
        console_score = max(0, 20 - len(self.audit.console_errors) * 2)
        categories.append(CategoryScore(
            category="Console Errors",
            score=console_score,
            max_score=20,
            issues_count=len(self.audit.console_errors),
        ))
        
        # Network Failures (max 20 points)
        network_score = max(0, 20 - len(self.audit.network_failures) * 3)
        categories.append(CategoryScore(
            category="Network/API",
            score=network_score,
            max_score=20,
            issues_count=len(self.audit.network_failures),
        ))
        
        # UI Flows (max 20 points)
        ui_errors = sum(1 for f in self.audit.ui_flows if f.status == "error")
        ui_score = max(0, 20 - ui_errors * 4)
        categories.append(CategoryScore(
            category="UI Flows",
            score=ui_score,
            max_score=20,
            issues_count=ui_errors,
        ))
        
        # Security (max 20 points)
        security_issues = self._count_security_issues()
        security_score = max(0, 20 - security_issues * 3)
        categories.append(CategoryScore(
            category="Security",
            score=security_score,
            max_score=20,
            issues_count=security_issues,
        ))
        
        # Performance (max 10 points)
        perf_issues = len(self.audit.slow_endpoints) + len(self.audit.large_assets)
        perf_score = max(0, 10 - perf_issues)
        categories.append(CategoryScore(
            category="Performance",
            score=perf_score,
            max_score=10,
            issues_count=perf_issues,
        ))
        
        # Accessibility (max 10 points)
        a11y_score = max(0, 10 - len(self.audit.accessibility_violations))
        categories.append(CategoryScore(
            category="Accessibility",
            score=a11y_score,
            max_score=10,
            issues_count=len(self.audit.accessibility_violations),
        ))
        
        return categories
    
    def _count_security_issues(self) -> int:
        """Count total security issues."""
        if not self.audit.security_hygiene:
            return 0
        
        count = 0
        if not self.audit.security_hygiene.https_ok:
            count += 2
        count += len(self.audit.security_hygiene.headers_missing)
        count += len(self.audit.security_hygiene.cookie_flags_issues)
        return count
    
    def _generate_recommendations(self) -> List[RecommendedFix]:
        """Generate fix recommendations based on findings."""
        fixes = []
        
        # Console errors
        if self.audit.console_errors:
            error_urls = list(set(e.page_url for e in self.audit.console_errors[:5]))
            fixes.append(RecommendedFix(
                category="Console Errors",
                severity=Severity.ERROR,
                issue=f"Found {len(self.audit.console_errors)} console errors",
                recommendation="Review and fix JavaScript errors. Check for null references, API failures, and missing dependencies.",
                affected_urls=error_urls,
            ))
        
        # Network failures
        if self.audit.network_failures:
            failure_urls = list(set(f.url for f in self.audit.network_failures[:5]))
            fixes.append(RecommendedFix(
                category="Network/API",
                severity=Severity.ERROR,
                issue=f"Found {len(self.audit.network_failures)} failing network requests",
                recommendation="Check API endpoints, verify authentication, and ensure proper error handling for failed requests.",
                affected_urls=failure_urls,
            ))
        
        # UI errors
        ui_errors = [f for f in self.audit.ui_flows if f.status == "error"]
        if ui_errors:
            fixes.append(RecommendedFix(
                category="UI Flows",
                severity=Severity.ERROR,
                issue=f"Found {len(ui_errors)} broken pages",
                recommendation="Review pages for rendering issues, missing content, or error states.",
                affected_urls=[e.page_url for e in ui_errors[:5]],
            ))
        
        # Security
        if self.audit.security_hygiene:
            if not self.audit.security_hygiene.https_ok:
                fixes.append(RecommendedFix(
                    category="Security",
                    severity=Severity.ERROR,
                    issue="Site not using HTTPS",
                    recommendation="Enable HTTPS with a valid SSL certificate.",
                    affected_urls=[self.audit.url],
                ))
            
            if self.audit.security_hygiene.headers_missing:
                fixes.append(RecommendedFix(
                    category="Security",
                    severity=Severity.WARNING,
                    issue=f"Missing security headers: {', '.join(self.audit.security_hygiene.headers_missing)}",
                    recommendation="Add recommended security headers to your server configuration.",
                    affected_urls=[self.audit.url],
                ))
        
        # Performance
        if self.audit.large_assets:
            fixes.append(RecommendedFix(
                category="Performance",
                severity=Severity.WARNING,
                issue=f"Found {len(self.audit.large_assets)} large assets (>500KB)",
                recommendation="Optimize images, minify JavaScript/CSS, and consider lazy loading for large resources.",
                affected_urls=[a.url for a in self.audit.large_assets[:3]],
            ))
        
        if self.audit.slow_endpoints:
            fixes.append(RecommendedFix(
                category="Performance",
                severity=Severity.WARNING,
                issue=f"Found {len(self.audit.slow_endpoints)} slow endpoints (>1s)",
                recommendation="Optimize slow API endpoints, add caching, or review database queries.",
                affected_urls=[e.url for e in self.audit.slow_endpoints[:3]],
            ))
        
        # Accessibility
        if self.audit.accessibility_violations:
            critical = [v for v in self.audit.accessibility_violations if v.impact in ("critical", "serious")]
            if critical:
                fixes.append(RecommendedFix(
                    category="Accessibility",
                    severity=Severity.WARNING,
                    issue=f"Found {len(critical)} critical/serious accessibility violations",
                    recommendation="Address accessibility issues for better usability and compliance. Focus on color contrast, alt text, and keyboard navigation.",
                    affected_urls=[v.page_url for v in critical[:3]],
                ))
        
        return fixes
    
    def _generate_summary(self, score: int) -> str:
        """Generate a human-readable summary."""
        grade = get_grade(score)
        pages = len(self.audit.visited_urls)
        errors = len(self.audit.console_errors)
        failures = len(self.audit.network_failures)
        
        if score >= 90:
            quality = "excellent"
        elif score >= 75:
            quality = "good"
        elif score >= 50:
            quality = "moderate"
        else:
            quality = "poor"
        
        return (
            f"Production readiness audit completed with {quality} results. "
            f"Score: {score}/100 (Grade {grade}). "
            f"Audited {pages} pages, found {errors} console errors and {failures} network failures."
        )
