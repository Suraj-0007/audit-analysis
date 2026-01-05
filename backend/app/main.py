"""FastAPI application entry point."""

import asyncio
import os
import sys
from contextlib import asynccontextmanager
from io import BytesIO

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging, get_logger, generate_request_id, request_id_ctx
from app.core.cors import setup_cors
from app.core.rate_limit import get_rate_limiter, rate_limit_middleware
from app.schemas import (
    SessionStartRequest, SessionStartResponse, OpenLoginResponse,
    MarkLoggedInResponse, AuditRunRequest, AuditRunResponse,
    AuditStatusResponse, AuditStatus
)
from app.services.session_manager import session_manager
from app.services.browser import browser_manager
from app.services.audit_runner import audit_manager, run_audit_async, AuditRunner
from app.utils.sanitizers import validate_url
from app.utils.pdf_report import generate_pdf_report
from app.utils.zipper import create_evidence_zip

# ✅ IMPORTANT: Windows Playwright subprocess needs Proactor loop policy
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Setup logging
setup_logging(settings.LOG_LEVEL)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Initialize browser
    await browser_manager.initialize()

    # Start session cleanup loop
    await session_manager.start_cleanup_loop(interval_seconds=60)

    yield

    # Shutdown
    logger.info("Shutting down...")
    session_manager.stop_cleanup_loop()
    await browser_manager.shutdown()


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Technical Readiness Auditor - Non-destructive production readiness checks",
    lifespan=lifespan,
)

# Setup CORS
setup_cors(app)

# Rate limiter
rate_limiter = get_rate_limiter(settings.RATE_LIMIT_PER_MINUTE)


# Middleware for request ID
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = generate_request_id()
    request_id_ctx.set(request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# Rate limit dependency
async def check_rate_limit(request: Request):
    await rate_limit_middleware(request, rate_limiter)


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "active_sessions": session_manager.get_active_count(),
    }


# -----------------------------
# Session endpoints
# -----------------------------
@app.post("/api/sessions/start", response_model=SessionStartResponse, dependencies=[Depends(check_rate_limit)])
async def start_session(request: SessionStartRequest):
    """Create a new audit session."""
    is_valid, error = validate_url(request.url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    session = session_manager.create_session(request.url)
    logger.info(f"Created session {session.session_id} for {request.url}")

    return SessionStartResponse(
        session_id=session.session_id,
        status=session.status,
        ttl_minutes=settings.SESSION_TTL_MINUTES,
        message="Session created. Use /api/sessions/{id}/open-login to start manual login.",
    )


@app.get("/api/sessions/{session_id}/open-login", response_model=OpenLoginResponse, dependencies=[Depends(check_rate_limit)])
async def open_login(session_id: str):
    """Open Playwright browser for manual login."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    try:
        await browser_manager.open_login_page(session_id)
        return OpenLoginResponse(
            ok=True,
            message="Browser window opened. Complete login and click 'I'm logged in' in the UI.",
        )
    except Exception as e:
        logger.error(f"Failed to open login page: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to open browser: {str(e)}")


@app.post("/api/sessions/{session_id}/mark-logged-in", response_model=MarkLoggedInResponse, dependencies=[Depends(check_rate_limit)])
async def mark_logged_in(session_id: str):
    """Save session state after manual login."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    try:
        success = await browser_manager.save_storage_state(session_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save session state")

        session_manager.mark_authenticated(session_id)

        # Close the login browser context (we'll create a new one for audit)
        await browser_manager.close_context(session_id)

        return MarkLoggedInResponse(
            ok=True,
            message="Session authenticated. Ready to run audit.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark logged in: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")


# -----------------------------
# Audit endpoints
# -----------------------------
@app.post("/api/audits/run", response_model=AuditRunResponse, dependencies=[Depends(check_rate_limit)])
async def run_audit(request: AuditRunRequest):
    """Start an audit for an authenticated session."""
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if not session.is_authenticated:
        raise HTTPException(status_code=400, detail="Session not authenticated. Complete login first.")

    is_valid, error = validate_url(request.url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    audit = audit_manager.create_audit(
        session_id=request.session_id,
        url=request.url,
        options=request.options,
    )

    # ✅ Run audit in background immediately
    asyncio.create_task(run_audit_async(audit.audit_id))

    logger.info(f"Started audit {audit.audit_id} for session {request.session_id}")

    return AuditRunResponse(
        audit_id=audit.audit_id,
        status=AuditStatus.QUEUED,
        message="Audit started. Poll /api/audits/{id}/status for progress.",
    )


@app.get("/api/audits/{audit_id}/status", response_model=AuditStatusResponse, dependencies=[Depends(check_rate_limit)])
async def get_audit_status(audit_id: str):
    """Get audit progress and partial findings."""
    audit = audit_manager.get_audit(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    partial = None
    if audit.console_errors or audit.network_failures:
        partial = {
            "console_errors_count": len(audit.console_errors),
            "network_failures_count": len(audit.network_failures),
            "pages_visited": len(audit.visited_urls),
        }

    return AuditStatusResponse(
        audit_id=audit_id,
        status=audit.status,
        progress=audit.progress,
        partial_findings=partial,
        error_message=audit.error_message,
    )


@app.get("/api/audits/{audit_id}/preview.jpg", dependencies=[Depends(check_rate_limit)])
async def get_audit_live_preview(audit_id: str):
    """Serve the latest live preview frame captured during an audit.

    - This is an additive endpoint (does not change any existing API contracts).
    - Returns 404 if a frame is not available yet.
    """
    audit = audit_manager.get_audit(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    path = getattr(audit, "preview_image_path", None)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Preview not ready")

    def iterfile():
        with open(path, "rb") as f:
            yield from f

    resp = StreamingResponse(iterfile(), media_type="image/jpeg")
    # Prevent caching so the UI can poll with a stable URL + cache buster
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


@app.get("/api/audits/{audit_id}/result", dependencies=[Depends(check_rate_limit)])
async def get_audit_result(audit_id: str):
    """
    Get full audit report.

    IMPORTANT:
    - Backend builds AuditReport shape.
    - Frontend expects AuditResult shape (overall_score, findings[], pages_crawled, etc.)
    - So we adapt here.
    """
    audit = audit_manager.get_audit(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != AuditStatus.DONE:
        if audit.status == AuditStatus.ERROR:
            raise HTTPException(status_code=500, detail=f"Audit failed: {audit.error_message}")
        raise HTTPException(status_code=400, detail=f"Audit not complete. Status: {audit.status.value}")

    runner = AuditRunner(audit)
    report = runner.build_report()

    # ✅ Convert to frontend contract
    from app.utils.frontend_adapter import audit_report_to_frontend_result
    return audit_report_to_frontend_result(report)


@app.get("/api/audits/{audit_id}/pdf", dependencies=[Depends(check_rate_limit)])
async def download_pdf_report(audit_id: str):
    """Download PDF report."""
    audit = audit_manager.get_audit(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != AuditStatus.DONE:
        raise HTTPException(status_code=400, detail="Audit not complete")

    runner = AuditRunner(audit)
    report = runner.build_report()

    pdf_bytes = generate_pdf_report(report)

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=audit-report-{audit_id[:8]}.pdf"},
    )


@app.get("/api/audits/{audit_id}/evidence.zip", dependencies=[Depends(check_rate_limit)])
async def download_evidence_zip(audit_id: str):
    """Download evidence bundle as zip."""
    audit = audit_manager.get_audit(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != AuditStatus.DONE:
        raise HTTPException(status_code=400, detail="Audit not complete")

    zip_bytes = create_evidence_zip(
        artifacts_dir=audit.artifacts_dir,
        screenshots=audit.screenshots,
    )

    return StreamingResponse(
        BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=evidence-{audit_id[:8]}.zip"},
    )


# -----------------------------
# Error handlers
# -----------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "http_error", "message": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "message": "An unexpected error occurred"},
    )
