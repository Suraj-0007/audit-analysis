"""Pydantic schemas for API request/response models."""

from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


# Enums
class SessionStatus(str, Enum):
    STARTED = "started"
    AUTHENTICATED = "authenticated"
    EXPIRED = "expired"


class AuditStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


class Severity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


# Request Schemas
class SessionStartRequest(BaseModel):
    url: str = Field(..., description="Target URL to audit")
    
    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class AuditOptions(BaseModel):
    max_pages: int = Field(default=20, ge=1, le=100)
    max_depth: int = Field(default=2, ge=1, le=5)
    enable_form_submit: bool = Field(default=False)
    include_accessibility: bool = Field(default=True)
    screenshot_on_error: bool = Field(default=True)


class AuditRunRequest(BaseModel):
    session_id: str
    url: str
    options: AuditOptions = Field(default_factory=AuditOptions)


# Response Schemas
class SessionStartResponse(BaseModel):
    session_id: str
    status: SessionStatus
    ttl_minutes: int
    message: str


class OpenLoginResponse(BaseModel):
    ok: bool
    message: str


class MarkLoggedInResponse(BaseModel):
    ok: bool
    message: str


class AuditRunResponse(BaseModel):
    audit_id: str
    status: AuditStatus
    message: str


class AuditProgress(BaseModel):
    stage: str
    percent: int = Field(ge=0, le=100)
    current_url: Optional[str] = None
    pages_visited: int = 0
    errors_found: int = 0
    message: Optional[str] = None


class AuditStatusResponse(BaseModel):
    audit_id: str
    status: AuditStatus
    progress: AuditProgress
    partial_findings: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


# Finding Schemas
class ConsoleError(BaseModel):
    message: str
    location: Optional[str] = None
    page_url: str
    severity: Severity
    stack: Optional[str] = None
    timestamp: Optional[str] = None


class NetworkFailure(BaseModel):
    url: str
    method: str
    status: Optional[int] = None
    error: Optional[str] = None
    duration_ms: Optional[float] = None
    page_url: str
    resource_type: Optional[str] = None


class UIFlowResult(BaseModel):
    page_url: str
    status: Literal["ok", "error", "warning"]
    notes: Optional[str] = None
    screenshot_path: Optional[str] = None
    load_time_ms: Optional[float] = None


class PageTiming(BaseModel):
    url: str
    ttfb_ms: Optional[float] = None
    dom_content_loaded_ms: Optional[float] = None
    load_ms: Optional[float] = None


class LargeAsset(BaseModel):
    url: str
    size_bytes: int
    type: str
    page_url: str


class SlowEndpoint(BaseModel):
    url: str
    method: str
    duration_ms: float
    status: Optional[int] = None


class PerformanceMetrics(BaseModel):
    page_timings: List[PageTiming] = []
    largest_assets: List[LargeAsset] = []
    slow_endpoints: List[SlowEndpoint] = []


class CookieFlagIssue(BaseModel):
    name: str
    domain: str
    issues: List[str]


class SecurityHygiene(BaseModel):
    https_ok: bool
    headers_present: List[str] = []
    headers_missing: List[str] = []
    cookie_flags_issues: List[CookieFlagIssue] = []


class AccessibilityViolation(BaseModel):
    id: str
    impact: str
    description: str
    help_url: Optional[str] = None
    nodes_count: int
    page_url: str


class RecommendedFix(BaseModel):
    category: str
    severity: Severity
    issue: str
    recommendation: str
    affected_urls: List[str] = []


class CategoryScore(BaseModel):
    category: str
    score: int
    max_score: int
    issues_count: int


# Full Report Schema
class AuditReport(BaseModel):
    audit_id: str
    session_id: str
    url: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    
    # Overall score
    score: int = Field(ge=0, le=100)
    grade: str  # A, B, C, D, F
    summary: str
    
    # Category scores
    category_scores: List[CategoryScore] = []
    
    # Detailed findings
    console_errors: List[ConsoleError] = []
    network_failures: List[NetworkFailure] = []
    ui_flows: List[UIFlowResult] = []
    performance: PerformanceMetrics = Field(default_factory=PerformanceMetrics)
    security_hygiene: SecurityHygiene = Field(default_factory=lambda: SecurityHygiene(https_ok=True))
    accessibility_violations: List[AccessibilityViolation] = []
    
    # Recommendations
    recommended_fixes: List[RecommendedFix] = []
    
    # Metadata
    pages_audited: int = 0
    total_requests: int = 0
    
    # Optional AI summary placeholder
    ai_summary: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
