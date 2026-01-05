"""Scoring logic for audit results."""


def calculate_score(
    console_errors: int = 0,
    network_failures: int = 0,
    ui_errors: int = 0,
    security_issues: int = 0,
    accessibility_violations: int = 0,
    slow_endpoints: int = 0,
) -> int:
    """
    Calculate the production readiness score.
    
    Scoring breakdown:
    - Console Errors: -2 points each (max -20)
    - Network Failures: -3 points each (max -20)
    - UI Errors: -4 points each (max -20)
    - Security Issues: -3 points each (max -20)
    - Accessibility Violations: -1 point each (max -10)
    - Slow Endpoints: -1 point each (max -10)
    
    Base score: 100
    Minimum score: 0
    """
    score = 100
    
    # Console errors (max 10 deductions)
    console_penalty = min(console_errors * 2, 20)
    score -= console_penalty
    
    # Network failures (max ~7 deductions)
    network_penalty = min(network_failures * 3, 20)
    score -= network_penalty
    
    # UI errors (max 5 deductions)
    ui_penalty = min(ui_errors * 4, 20)
    score -= ui_penalty
    
    # Security issues (max ~7 deductions)
    security_penalty = min(security_issues * 3, 20)
    score -= security_penalty
    
    # Accessibility violations (max 10 deductions)
    a11y_penalty = min(accessibility_violations, 10)
    score -= a11y_penalty
    
    # Slow endpoints (max 10 deductions)
    perf_penalty = min(slow_endpoints, 10)
    score -= perf_penalty
    
    return max(0, score)


def get_grade(score: int) -> str:
    """Convert numeric score to letter grade."""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"
