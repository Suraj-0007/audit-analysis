"""Main audit runner that orchestrates all checks."""

import asyncio
import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Set, Any
from urllib.parse import urlparse
from dataclasses import dataclass, field
from threading import Lock
import uuid
import re

from playwright.async_api import BrowserContext, Page, Response, Request, ConsoleMessage

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas import (
    AuditStatus, AuditProgress, AuditReport, AuditOptions,
    ConsoleError, NetworkFailure, UIFlowResult, PageTiming,
    LargeAsset, SlowEndpoint, SecurityHygiene,
    AccessibilityViolation, CookieFlagIssue, Severity
)
from app.services.browser import browser_manager
from app.utils.security_headers import check_security_headers
from app.services.report_builder import ReportBuilder

logger = get_logger(__name__)

# Patterns for unsafe click targets (conservative)
UNSAFE_PATTERNS = [
    r"\bdelete\b", r"\bremove\b", r"\blogout\b", r"\bsign\s*out\b",
    r"\bpay\b", r"\bsubmit\b", r"\bconfirm\b", r"\bpurchase\b",
    r"\bcancel\b", r"\bdestroy\b", r"\bclear\b", r"\breset\b",
]
UNSAFE_REGEX = re.compile("|".join(UNSAFE_PATTERNS), re.IGNORECASE)

# Error detection patterns
ERROR_PATTERNS = [
    r"something went wrong",
    r"error occurred",
    r"page not found",
    r"404",
    r"500 internal server error",
    r"access denied",
    r"forbidden",
    r"oops",
    r"unexpected error",
]
ERROR_REGEX = re.compile("|".join(ERROR_PATTERNS), re.IGNORECASE)


@dataclass
class AuditState:
    """Holds the state of a running audit."""
    audit_id: str
    session_id: str
    url: str
    options: AuditOptions
    status: AuditStatus = AuditStatus.QUEUED
    progress: AuditProgress = field(default_factory=lambda: AuditProgress(stage="initializing", percent=0))
    started_at: datetime = field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None

    # Collected data
    console_errors: List[ConsoleError] = field(default_factory=list)
    network_failures: List[NetworkFailure] = field(default_factory=list)
    ui_flows: List[UIFlowResult] = field(default_factory=list)
    page_timings: List[PageTiming] = field(default_factory=list)
    large_assets: List[LargeAsset] = field(default_factory=list)
    slow_endpoints: List[SlowEndpoint] = field(default_factory=list)
    security_hygiene: Optional[SecurityHygiene] = None
    accessibility_violations: List[AccessibilityViolation] = field(default_factory=list)

    # Tracking
    visited_urls: Set[str] = field(default_factory=set)
    discovered_urls: Set[str] = field(default_factory=set)
    total_requests: int = 0
    error_message: Optional[str] = None

    # Artifacts
    artifacts_dir: str = ""
    screenshots: List[str] = field(default_factory=list)

    # ✅ Live preview (additive fields)
    preview_image_path: Optional[str] = None
    preview_updated_at: Optional[float] = None


class AuditManager:
    """Manages running audits."""

    def __init__(self):
        self._audits: Dict[str, AuditState] = {}
        self._lock = Lock()

    def create_audit(self, session_id: str, url: str, options: AuditOptions) -> AuditState:
        """Create a new audit."""
        audit_id = str(uuid.uuid4())

        # Create artifacts directory
        artifacts_dir = os.path.join(settings.ARTIFACTS_DIR, "audits", audit_id)
        os.makedirs(artifacts_dir, exist_ok=True)

        audit = AuditState(
            audit_id=audit_id,
            session_id=session_id,
            url=url,
            options=options,
            artifacts_dir=artifacts_dir,
        )

        with self._lock:
            self._audits[audit_id] = audit

        return audit

    def get_audit(self, audit_id: str) -> Optional[AuditState]:
        """Get audit by ID."""
        with self._lock:
            return self._audits.get(audit_id)

    def update_progress(
        self,
        audit_id: str,
        stage: str,
        percent: int,
        current_url: Optional[str] = None,
        message: Optional[str] = None,
    ):
        """Update audit progress."""
        with self._lock:
            audit = self._audits.get(audit_id)
            if audit:
                audit.progress = AuditProgress(
                    stage=stage,
                    percent=percent,
                    current_url=current_url,
                    pages_visited=len(audit.visited_urls),
                    errors_found=len(audit.console_errors) + len(audit.network_failures),
                    message=message,
                )


# Global audit manager
audit_manager = AuditManager()


class AuditRunner:
    """Runs the actual audit checks."""

    def __init__(self, audit: AuditState):
        self.audit = audit
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.base_domain: str = urlparse(audit.url).netloc

        # ✅ Live preview throttling / path
        self._last_preview_capture_s: float = 0.0
        self._preview_path: str = os.path.join(self.audit.artifacts_dir, "preview_latest.jpg")

    async def _capture_live_preview(self, reason: str = "") -> None:
        """Capture a small live preview screenshot of the current page.

        Best-effort only: must never fail the audit.
        """
        try:
            if not self.page or self.page.is_closed():
                return

            now = time.time()
            # throttle to ~1 frame/second
            if now - self._last_preview_capture_s < 1.0:
                return
            self._last_preview_capture_s = now

            os.makedirs(self.audit.artifacts_dir, exist_ok=True)

            await self.page.screenshot(
                path=self._preview_path,
                type="jpeg",
                quality=60,
                full_page=False,
            )
            self.audit.preview_image_path = self._preview_path
            self.audit.preview_updated_at = now
        except Exception:
            return

    async def run(self):
        """Execute the full audit."""
        try:
            self.audit.status = AuditStatus.RUNNING
            audit_manager.update_progress(self.audit.audit_id, "starting", 5)

            # Create authenticated browser context
            self.context = await browser_manager.create_authenticated_context(self.audit.session_id)

            # Set up page with event listeners
            self.page = await self.context.new_page()
            await self._setup_event_listeners()

            # Run audit phases
            await self._check_initial_availability()
            await self._crawl_and_audit()
            await self._check_security_hygiene()
            await self._run_accessibility_checks()

            # Finalize
            self.audit.status = AuditStatus.DONE
            self.audit.finished_at = datetime.utcnow()
            audit_manager.update_progress(
                self.audit.audit_id,
                "complete",
                100,
                message=f"Audit complete. Visited {len(self.audit.visited_urls)} pages.",
            )

            logger.info(f"Audit {self.audit.audit_id} completed successfully")

        except Exception as e:
            logger.error(f"Audit {self.audit.audit_id} failed: {e}")
            self.audit.status = AuditStatus.ERROR
            self.audit.error_message = str(e)
            audit_manager.update_progress(
                self.audit.audit_id,
                "error",
                0,
                message=f"Audit failed: {str(e)}",
            )
        finally:
            # Cleanup
            if self.page and not self.page.is_closed():
                await self.page.close()
            if self.context:
                await self.context.close()

    async def _setup_event_listeners(self):
        """Set up Playwright event listeners for data collection."""

        # Console messages
        def on_console(msg: ConsoleMessage):
            if msg.type in ("error", "warning"):
                self.audit.console_errors.append(
                    ConsoleError(
                        message=msg.text,
                        location=msg.location.get("url") if msg.location else None,
                        page_url=self.page.url if self.page else "",
                        severity=Severity.ERROR if msg.type == "error" else Severity.WARNING,
                        timestamp=datetime.utcnow().isoformat(),
                    )
                )

        self.page.on("console", on_console)

        # Page errors (uncaught exceptions)
        def on_pageerror(error):
            self.audit.console_errors.append(
                ConsoleError(
                    message=str(error),
                    page_url=self.page.url if self.page else "",
                    severity=Severity.ERROR,
                    stack=str(error),
                    timestamp=datetime.utcnow().isoformat(),
                )
            )

        self.page.on("pageerror", on_pageerror)

        # Network request tracking
        request_timings: Dict[str, float] = {}

        def on_request(request: Request):
            self.audit.total_requests += 1
            request_timings[request.url] = time.time() * 1000

        async def on_response(response: Response):
            url = response.url
            duration = time.time() * 1000 - request_timings.get(url, time.time() * 1000)

            # Track failed requests
            if response.status >= 400:
                self.audit.network_failures.append(
                    NetworkFailure(
                        url=url,
                        method=response.request.method,
                        status=response.status,
                        duration_ms=duration,
                        page_url=self.page.url if self.page else "",
                        resource_type=response.request.resource_type,
                    )
                )

            # Track slow endpoints (>1s)
            if duration > 1000:
                self.audit.slow_endpoints.append(
                    SlowEndpoint(
                        url=url,
                        method=response.request.method,
                        duration_ms=duration,
                        status=response.status,
                    )
                )

            # Track large assets (>500KB)
            try:
                headers = response.headers
                content_length = headers.get("content-length")
                if content_length and int(content_length) > 500000:
                    self.audit.large_assets.append(
                        LargeAsset(
                            url=url,
                            size_bytes=int(content_length),
                            type=headers.get("content-type", "unknown"),
                            page_url=self.page.url if self.page else "",
                        )
                    )
            except Exception:
                pass

        def on_request_failed(request: Request):
            self.audit.network_failures.append(
                NetworkFailure(
                    url=request.url,
                    method=request.method,
                    error=request.failure,
                    page_url=self.page.url if self.page else "",
                    resource_type=request.resource_type,
                )
            )

        self.page.on("request", on_request)
        self.page.on("response", lambda r: asyncio.create_task(on_response(r)))
        self.page.on("requestfailed", on_request_failed)

        # ✅ Live preview hooks (best-effort)
        # Reflect URL changes and page loads while crawl runs.
        def on_framenavigated(frame):
            try:
                if self.page and frame == self.page.main_frame:
                    asyncio.create_task(self._capture_live_preview("nav"))
            except Exception:
                return

        self.page.on("framenavigated", on_framenavigated)
        self.page.on("load", lambda: asyncio.create_task(self._capture_live_preview("load")))

    async def _check_initial_availability(self):
        """Check initial URL availability and routing."""
        audit_manager.update_progress(
            self.audit.audit_id,
            "checking_availability",
            10,
            current_url=self.audit.url,
        )

        try:
            start_time = time.time() * 1000
            response = await self.page.goto(
                self.audit.url,
                timeout=settings.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS,
                wait_until="domcontentloaded",
            )
            load_time = time.time() * 1000 - start_time

            # ✅ initial preview frame immediately
            await self._capture_live_preview("initial")

            # Record timing
            self.audit.page_timings.append(
                PageTiming(
                    url=self.audit.url,
                    dom_content_loaded_ms=load_time,
                )
            )

            # Check response status
            status = "ok"
            notes = None
            if response:
                if response.status >= 400:
                    status = "error"
                    notes = f"HTTP {response.status}"
                elif response.status >= 300:
                    status = "warning"
                    notes = f"Redirect: HTTP {response.status}"

            self.audit.ui_flows.append(
                UIFlowResult(
                    page_url=self.audit.url,
                    status=status,
                    notes=notes,
                    load_time_ms=load_time,
                )
            )

            self.audit.visited_urls.add(self.audit.url)

        except Exception as e:
            logger.error(f"Initial availability check failed: {e}")
            self.audit.ui_flows.append(
                UIFlowResult(
                    page_url=self.audit.url,
                    status="error",
                    notes=f"Failed to load: {str(e)}",
                )
            )

    async def _crawl_and_audit(self):
        """Crawl the site and run checks on each page."""
        audit_manager.update_progress(
            self.audit.audit_id,
            "crawling",
            20,
            message="Discovering pages...",
        )

        # Discover internal links
        await self._discover_links()

        # Visit pages up to max_pages
        pages_to_visit = list(self.audit.discovered_urls - self.audit.visited_urls)
        pages_to_visit = pages_to_visit[: self.audit.options.max_pages - 1]  # -1 for initial page

        total_pages = len(pages_to_visit)
        for i, url in enumerate(pages_to_visit):
            progress = 20 + int((i / max(total_pages, 1)) * 60)
            audit_manager.update_progress(
                self.audit.audit_id,
                "auditing_pages",
                progress,
                current_url=url,
                message=f"Checking page {i + 1}/{total_pages}",
            )

            await self._audit_page(url)
            self.audit.visited_urls.add(url)

            # Small delay between pages
            await asyncio.sleep(0.5)

    async def _discover_links(self):
        """Discover internal links on the current page."""
        try:
            links = await self.page.evaluate(
                """
                () => {
                    const links = [];
                    document.querySelectorAll('a[href]').forEach(a => {
                        const href = a.href;
                        if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                            links.push(href);
                        }
                    });
                    return links;
                }
                """
            )

            for link in links:
                parsed = urlparse(link)
                # Only include same-domain links
                if parsed.netloc == self.base_domain or not parsed.netloc:
                    # Normalize URL (keep scheme/netloc/path only)
                    clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
                    if clean_url and clean_url not in self.audit.visited_urls:
                        self.audit.discovered_urls.add(clean_url)

            logger.info(f"Discovered {len(self.audit.discovered_urls)} links")

        except Exception as e:
            logger.warning(f"Link discovery failed: {e}")

    async def _audit_page(self, url: str):
        """Audit a single page."""
        try:
            start_time = time.time() * 1000
            response = await self.page.goto(
                url,
                timeout=settings.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS,
                wait_until="domcontentloaded",
            )
            load_time = time.time() * 1000 - start_time

            # Wait for page to stabilize
            await asyncio.sleep(settings.PAGE_LOAD_WAIT_MS / 1000)

            # ✅ optional conservative UI probing (does NOT change existing flow)
            interaction_notes: Optional[str] = None
            if getattr(self.audit.options, "check_ui_flows", False):
                interaction_notes = await self._probe_safe_interactions(max_actions=3)

            # Record timing
            self.audit.page_timings.append(
                PageTiming(
                    url=url,
                    dom_content_loaded_ms=load_time,
                )
            )

            # Check for error patterns
            content = await self.page.content()
            has_error = ERROR_REGEX.search(content) is not None

            # Check for blank page
            is_blank = len(content.strip()) < 100

            status = "ok"
            notes = None
            screenshot_path = None

            if is_blank:
                status = "error"
                notes = "Blank or nearly empty page"
            elif has_error:
                status = "warning"
                notes = "Page contains error patterns"
            elif response and response.status >= 400:
                status = "error"
                notes = f"HTTP {response.status}"

            # Take screenshot on error
            if status != "ok" and self.audit.options.screenshot_on_error:
                screenshot_path = await self._take_screenshot(url)

            # Append interaction notes if any
            if interaction_notes:
                notes = f"{notes + ' | ' if notes else ''}{interaction_notes}"

            self.audit.ui_flows.append(
                UIFlowResult(
                    page_url=url,
                    status=status,
                    notes=notes,
                    screenshot_path=screenshot_path,
                    load_time_ms=load_time,
                )
            )

            # Discover more links from this page
            await self._discover_links()

            # ✅ keep preview fresh after page audit
            await self._capture_live_preview("audit_page")

        except Exception as e:
            logger.warning(f"Failed to audit page {url}: {e}")
            self.audit.ui_flows.append(
                UIFlowResult(
                    page_url=url,
                    status="error",
                    notes=f"Failed: {str(e)}",
                )
            )

    async def _probe_safe_interactions(self, max_actions: int = 3) -> Optional[str]:
        """Try a small number of safe, non-destructive clicks to validate basic UI interactions.

        Conservative:
        - avoids destructive keywords
        - avoids anything inside a form
        - avoids submit/reset buttons
        - avoids cross-domain navigation
        - limits number of actions
        """
        if not self.page or self.page.is_closed():
            return None

        try:
            candidates: List[Dict[str, Any]] = await self.page.evaluate(
                """
                () => {
                  const out = [];
                  const isVisible = (el) => {
                    const r = el.getBoundingClientRect();
                    const s = window.getComputedStyle(el);
                    return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
                  };

                  const pushEl = (el, kind) => {
                    if (!el || !isVisible(el)) return;
                    const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 80);
                    const href = kind === 'link' ? (el.href || '') : '';
                    const type = kind === 'button' ? (el.getAttribute('type') || '').toLowerCase() : '';
                    const inForm = !!el.closest('form');
                    out.push({ kind, text, href, type, inForm });
                  };

                  document.querySelectorAll('a[href]').forEach(a => pushEl(a, 'link'));
                  document.querySelectorAll('button, [role="button"]').forEach(b => pushEl(b, 'button'));

                  // De-dupe (by text+href+kind)
                  const seen = new Set();
                  return out.filter(x => {
                    const k = `${x.kind}|${x.text}|${x.href}`;
                    if (seen.has(k)) return false;
                    seen.add(k);
                    return true;
                  }).slice(0, 60);
                }
                """
            )

            actions: List[Dict[str, Any]] = []
            for c in candidates:
                if len(actions) >= max_actions:
                    break

                text = (c.get("text") or "").strip()
                href = (c.get("href") or "").strip()
                kind = c.get("kind")
                in_form = bool(c.get("inForm"))
                btn_type = (c.get("type") or "").strip().lower()

                if not text and not href:
                    continue
                if UNSAFE_REGEX.search(text or ""):
                    continue
                if in_form:
                    continue
                if kind == "button" and btn_type in ("submit", "reset"):
                    continue
                if kind == "link":
                    if href.startswith(("mailto:", "tel:", "javascript:")):
                        continue
                    # Same-domain only
                    try:
                        p = urlparse(href)
                        if p.netloc and p.netloc != self.base_domain:
                            continue
                    except Exception:
                        continue

                actions.append(c)

            if not actions:
                return None

            started_url = self.page.url
            clicks = 0
            navs = 0
            slow_or_loader = 0

            for a in actions:
                if not self.page or self.page.is_closed():
                    break

                before_url = self.page.url
                t0 = time.time()

                # Click strategy
                if a.get("kind") == "link" and a.get("href"):
                    await self.page.click(f"a[href='{a['href']}']", timeout=2000)
                else:
                    txt = (a.get("text") or "").replace("\n", " ").strip()
                    if not txt:
                        continue
                    await self.page.get_by_text(txt, exact=False).first.click(timeout=2000)

                # Basic timing/loader hint
                try:
                    await self.page.wait_for_load_state("domcontentloaded", timeout=2500)
                except Exception:
                    pass

                try:
                    await self.page.wait_for_load_state("networkidle", timeout=3000)
                except Exception:
                    slow_or_loader += 1

                after_url = self.page.url
                clicks += 1
                if after_url != before_url:
                    navs += 1

                # keep preview updated after interactions
                await self._capture_live_preview("interaction")

                # Navigate back if we moved
                if after_url != before_url:
                    try:
                        await self.page.go_back(timeout=3000)
                        await self.page.wait_for_load_state("domcontentloaded", timeout=2500)
                    except Exception:
                        pass

                # Small delay
                await asyncio.sleep(0.3)

                # (t0 used for response time, but not stored to avoid schema changes)
                _ = int((time.time() - t0) * 1000)

            # Try to return to the original page if needed
            if self.page and not self.page.is_closed() and self.page.url != started_url:
                try:
                    await self.page.goto(started_url, timeout=4000, wait_until="domcontentloaded")
                except Exception:
                    pass

            parts = [f"UI probe: {clicks} clicks"]
            if navs:
                parts.append(f"{navs} nav")
            if slow_or_loader:
                parts.append(f"{slow_or_loader} slow/loader")
            return " | ".join(parts)

        except Exception:
            return None

    async def _take_screenshot(self, url: str) -> Optional[str]:
        """Take a screenshot of the current page."""
        try:
            filename = f"screenshot_{len(self.audit.screenshots)}.png"
            path = os.path.join(self.audit.artifacts_dir, filename)
            await self.page.screenshot(path=path, full_page=False)
            self.audit.screenshots.append(path)
            return path
        except Exception as e:
            logger.warning(f"Failed to take screenshot: {e}")
            return None

    async def _check_security_hygiene(self):
        """Check security headers and cookie flags."""
        audit_manager.update_progress(
            self.audit.audit_id,
            "security_check",
            85,
            message="Checking security hygiene...",
        )

        # Check HTTPS
        https_ok = self.audit.url.startswith("https://")

        # Check security headers via httpx
        headers_result = await check_security_headers(self.audit.url)

        # Check cookie flags
        cookie_issues = []
        try:
            cookies = await self.context.cookies()
            for cookie in cookies:
                issues = []
                if not cookie.get("secure"):
                    issues.append("Missing Secure flag")
                if not cookie.get("httpOnly"):
                    issues.append("Missing HttpOnly flag")
                if not cookie.get("sameSite") or cookie.get("sameSite") == "None":
                    issues.append("SameSite not set or None")

                if issues:
                    cookie_issues.append(
                        CookieFlagIssue(
                            name=cookie.get("name", "unknown"),
                            domain=cookie.get("domain", ""),
                            issues=issues,
                        )
                    )
        except Exception as e:
            logger.warning(f"Cookie check failed: {e}")

        self.audit.security_hygiene = SecurityHygiene(
            https_ok=https_ok,
            headers_present=headers_result.get("present", []),
            headers_missing=headers_result.get("missing", []),
            cookie_flags_issues=cookie_issues,
        )

    async def _run_accessibility_checks(self):
        """Run axe-core accessibility checks."""
        # Keep original option name (do NOT refactor contracts)
        if not self.audit.options.include_accessibility:
            return

        audit_manager.update_progress(
            self.audit.audit_id,
            "accessibility_check",
            90,
            message="Running accessibility checks...",
        )

        try:
            # Navigate to initial URL for accessibility check
            await self.page.goto(self.audit.url, wait_until="domcontentloaded")

            # Inject and run axe-core
            await self.page.add_script_tag(
                url="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.3/axe.min.js"
            )

            results = await self.page.evaluate(
                """
                async () => {
                    if (typeof axe === 'undefined') return { violations: [] };
                    const results = await axe.run();
                    return {
                        violations: results.violations.slice(0, 20).map(v => ({
                            id: v.id,
                            impact: v.impact,
                            description: v.description,
                            helpUrl: v.helpUrl,
                            nodes: v.nodes.length
                        }))
                    };
                }
                """
            )

            for violation in results.get("violations", []):
                self.audit.accessibility_violations.append(
                    AccessibilityViolation(
                        id=violation["id"],
                        impact=violation["impact"] or "moderate",
                        description=violation["description"],
                        help_url=violation.get("helpUrl"),
                        nodes_count=violation["nodes"],
                        page_url=self.audit.url,
                    )
                )

        except Exception as e:
            logger.warning(f"Accessibility check failed: {e}")

    def build_report(self) -> AuditReport:
        """Build the final audit report."""
        return ReportBuilder(self.audit).build()


async def run_audit_async(audit_id: str):
    """Run audit in background."""
    audit = audit_manager.get_audit(audit_id)
    if not audit:
        logger.error(f"Audit {audit_id} not found")
        return

    runner = AuditRunner(audit)
    await runner.run()
