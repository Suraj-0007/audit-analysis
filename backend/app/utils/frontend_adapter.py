from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from app.schemas import AuditReport, Severity


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _map_severity(sev: Any) -> str:
    """
    Backend severity (Severity enum or str) -> Frontend severity
    critical | high | medium | low | info
    """
    s = str(sev).lower()
    if "error" in s:
        return "high"
    if "warning" in s:
        return "medium"
    if "info" in s:
        return "info"
    return "low"


def _impact_to_severity(impact: Optional[str]) -> str:
    if not impact:
        return "medium"
    impact = impact.lower()
    if impact in ("critical", "serious"):
        return "high"
    if impact in ("moderate",):
        return "medium"
    return "low"


def _mk_finding(
    category: str,
    severity: str,
    title: str,
    description: str,
    affected_url: str,
    recommended_fix: str,
    evidence: Optional[str] = None,
    screenshot_url: Optional[str] = None,
    timestamp: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "category": category,
        "severity": severity,
        "title": title,
        "description": description,
        "affected_url": affected_url,
        "evidence": evidence,
        "screenshot_url": screenshot_url,
        "recommended_fix": recommended_fix,
        "timestamp": timestamp or _now_iso(),
    }


def audit_report_to_frontend_result(report: AuditReport) -> Dict[str, Any]:
    """
    Convert backend AuditReport -> frontend AuditResult (what your React expects in types).
    """

    findings: List[Dict[str, Any]] = []

    # Console errors -> findings
    for e in (report.console_errors or []):
        findings.append(
            _mk_finding(
                category="console",
                severity=_map_severity(e.severity),
                title="Console issue",
                description=e.message or "Console error/warning captured.",
                affected_url=e.page_url or report.url,
                evidence=(e.stack or e.location),
                recommended_fix="Fix the error at the source. Check stack trace and ensure proper exception handling.",
                timestamp=getattr(e, "timestamp", None),
            )
        )

    # Network failures -> findings
    for n in (report.network_failures or []):
        sev = "high" if (n.status and int(n.status) >= 500) else "medium"
        desc = f"{n.method} {n.url}"
        if n.status:
            desc += f" -> HTTP {n.status}"
        if getattr(n, "error", None):
            desc += f" | error={n.error}"
        if getattr(n, "duration_ms", None):
            desc += f" | {n.duration_ms:.0f}ms"

        findings.append(
            _mk_finding(
                category="network",
                severity=sev,
                title="Network/API failure",
                description=desc,
                affected_url=n.url,
                evidence=f"resource_type={getattr(n, 'resource_type', None)}",
                recommended_fix="Fix API errors (4xx/5xx), CORS, timeouts. Add retries and proper error handling.",
            )
        )

    # UI flow results -> findings for warnings/errors
    for u in (report.ui_flows or []):
        if (u.status or "").lower() == "ok":
            continue
        sev = "high" if (u.status or "").lower() == "error" else "medium"
        findings.append(
            _mk_finding(
                category="ui_flow",
                severity=sev,
                title="UI flow issue",
                description=u.notes or "UI flow warning/error detected.",
                affected_url=u.page_url or report.url,
                screenshot_url=u.screenshot_path,
                recommended_fix="Fix routing/render errors, ensure required API calls succeed, and handle empty/error states gracefully.",
            )
        )

    # Security hygiene -> findings
    sh = report.security_hygiene
    if sh:
        if not sh.https_ok:
            findings.append(
                _mk_finding(
                    category="security",
                    severity="high",
                    title="HTTPS not enabled",
                    description="Target URL is not using HTTPS.",
                    affected_url=report.url,
                    recommended_fix="Enable HTTPS (TLS) and redirect HTTP to HTTPS.",
                )
            )
        missing = sh.headers_missing or []
        if missing:
            findings.append(
                _mk_finding(
                    category="security",
                    severity="medium",
                    title="Missing security headers",
                    description=f"Missing: {', '.join(missing)}",
                    affected_url=report.url,
                    recommended_fix="Add recommended security headers in your server/reverse-proxy configuration (CSP, X-Frame-Options, etc.).",
                )
            )

        for c in (sh.cookie_flags_issues or []):
            findings.append(
                _mk_finding(
                    category="security",
                    severity="medium",
                    title="Cookie flags issue",
                    description=f"Cookie '{c.name}' ({c.domain}) issues: {', '.join(c.issues)}",
                    affected_url=report.url,
                    recommended_fix="Set Secure, HttpOnly, and SameSite appropriately for auth/session cookies.",
                )
            )

    # Performance -> findings
    perf = report.performance
    if perf:
        for a in (perf.largest_assets or []):
            sev = "medium" if (a.size_bytes or 0) > 2_000_000 else "low"
            findings.append(
                _mk_finding(
                    category="performance",
                    severity=sev,
                    title="Large asset",
                    description=f"{a.url} size={a.size_bytes} bytes type={a.type}",
                    affected_url=a.url,
                    recommended_fix="Compress/optimize images, enable caching, consider lazy loading, and use modern formats (webp/avif).",
                )
            )

        for s in (perf.slow_endpoints or []):
            sev = "medium" if (s.duration_ms or 0) > 3000 else "low"
            findings.append(
                _mk_finding(
                    category="performance",
                    severity=sev,
                    title="Slow endpoint",
                    description=f"{s.method} {s.url} took {s.duration_ms:.0f}ms (status {s.status})",
                    affected_url=s.url,
                    recommended_fix="Optimize slow resources/endpoints, add caching/CDN, reduce payload size, and improve server response time.",
                )
            )

    # Accessibility -> findings
    for v in (report.accessibility_violations or []):
        findings.append(
            _mk_finding(
                category="accessibility",
                severity=_impact_to_severity(v.impact),
                title=f"A11y violation: {v.id}",
                description=f"{v.description} (nodes: {v.nodes_count})",
                affected_url=v.page_url or report.url,
                evidence=v.help_url,
                recommended_fix="Fix contrast/labels/landmarks. Use semantic HTML, aria-labels, and check with axe/Lighthouse.",
            )
        )

    # Build frontend category breakdown
    # Your frontend wants: category, score, weight, findings_count, critical_count, high_count, medium_count, low_count
    # We'll approximate weight from max_score; counts from findings we built.
    def count_by_sev(cat_key: str):
        crit = sum(1 for f in findings if f["category"] == cat_key and f["severity"] == "critical")
        high = sum(1 for f in findings if f["category"] == cat_key and f["severity"] == "high")
        med = sum(1 for f in findings if f["category"] == cat_key and f["severity"] == "medium")
        low = sum(1 for f in findings if f["category"] == cat_key and f["severity"] == "low")
        info = sum(1 for f in findings if f["category"] == cat_key and f["severity"] == "info")
        return crit, high, med, low, info

    # map backend categories -> frontend categories
    cat_map = {
        "Console Errors": "console",
        "Network/API": "network",
        "UI Flows": "ui_flow",
        "Security": "security",
        "Performance": "performance",
        "Accessibility": "accessibility",
    }

    category_scores: List[Dict[str, Any]] = []
    for c in (report.category_scores or []):
        fe_cat = cat_map.get(c.category, c.category.lower().replace(" ", "_"))
        crit, high, med, low, info = count_by_sev(fe_cat)
        category_scores.append(
            {
                "category": fe_cat,
                "score": int(c.score),
                "weight": int(getattr(c, "max_score", 10) or 10),
                "findings_count": int(c.issues_count),
                "critical_count": crit,
                "high_count": high,
                "medium_count": med,
                "low_count": low + info,
            }
        )

    pages_crawled = [u.page_url for u in (report.ui_flows or []) if u.page_url] or [report.url]

    # Final object matching your frontend AuditResult interface
    return {
        "audit_id": report.audit_id,
        "session_id": report.session_id,
        "target_url": report.url,
        "overall_score": int(report.score),
        "grade": report.grade,
        "category_scores": category_scores,
        "findings": findings,
        "pages_crawled": pages_crawled,
        "started_at": report.started_at.isoformat() if hasattr(report.started_at, "isoformat") else str(report.started_at),
        "completed_at": report.finished_at.isoformat() if report.finished_at else _now_iso(),
        "duration_seconds": float(report.duration_seconds or 0),
    }
