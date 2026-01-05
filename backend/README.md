# ProdReady Audit - Backend

Production-quality Python FastAPI backend for technical readiness auditing using Playwright.

## Features

- **Session-based manual login**: Secure temporary browser sessions for authentication
- **Playwright browser automation**: Real console/network error detection
- **Non-destructive auditing**: Safe crawling with smart click policies
- **Comprehensive checks**: Console errors, network failures, security headers, accessibility
- **PDF report generation**: Professional reports with ReportLab
- **Evidence collection**: Screenshots and artifact bundling

## Quick Start

### 1. Setup Python Environment

```bash
cd backend
py -3.12 -m venv venv                    
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install Playwright Browsers

```bash
playwright install chromium
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env as needed
```

### 4. Start the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Sessions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions/start` | POST | Create new audit session |
| `/api/sessions/{id}/open-login` | GET | Open browser for manual login |
| `/api/sessions/{id}/mark-logged-in` | POST | Save session after login |

### Audits

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/audits/run` | POST | Start automated audit |
| `/api/audits/{id}/status` | GET | Get audit progress |
| `/api/audits/{id}/result` | GET | Get full JSON report |
| `/api/audits/{id}/pdf` | GET | Download PDF report |
| `/api/audits/{id}/evidence.zip` | GET | Download evidence bundle |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |

## Usage Flow

1. **Start Session**
   ```bash
   curl -X POST http://localhost:8000/api/sessions/start \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-app.com"}'
   ```

2. **Open Login Window**
   ```bash
   curl http://localhost:8000/api/sessions/{session_id}/open-login
   ```
   Complete login in the browser window that opens.

3. **Mark Logged In**
   ```bash
   curl -X POST http://localhost:8000/api/sessions/{session_id}/mark-logged-in
   ```

4. **Run Audit**
   ```bash
   curl -X POST http://localhost:8000/api/audits/run \
     -H "Content-Type: application/json" \
     -d '{
       "session_id": "{session_id}",
       "url": "https://your-app.com",
       "options": {
         "max_pages": 20,
         "include_accessibility": true
       }
     }'
   ```

5. **Check Status**
   ```bash
   curl http://localhost:8000/api/audits/{audit_id}/status
   ```

6. **Get Results**
   ```bash
   curl http://localhost:8000/api/audits/{audit_id}/result
   curl -o report.pdf http://localhost:8000/api/audits/{audit_id}/pdf
   ```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | localhost:5173,3000 | Allowed CORS origins |
| `SESSION_TTL_MINUTES` | 30 | Session timeout |
| `MAX_PAGES_PER_AUDIT` | 20 | Max pages to crawl |
| `ALLOW_PRIVATE_IPS` | false | Allow localhost/private IPs |
| `RATE_LIMIT_PER_MINUTE` | 30 | Rate limit per IP |
| `LOG_LEVEL` | INFO | Logging level |

## Audit Checks

### Console & Runtime Errors
- Captures `console.error` and `console.warn`
- Captures uncaught exceptions (`pageerror` events)
- Includes stack traces when available

### Network/API Failures
- Tracks all failed requests (4xx, 5xx, timeouts)
- Records request timing and duration
- Identifies CORS-related failures

### UI Flow Smoke Tests
- Auto-discovers internal links
- Visits pages up to configured depth
- Detects blank pages and error patterns
- Takes screenshots on errors

### Performance Signals
- Page load timing (DOMContentLoaded, Load)
- Large asset detection (>500KB)
- Slow endpoint identification (>1s)

### Security Hygiene
- HTTPS verification
- Security header checks (HSTS, CSP, X-Content-Type-Options, etc.)
- Cookie flag analysis (Secure, HttpOnly, SameSite)

### Accessibility
- Runs axe-core checks
- Reports top violations by impact
- Includes help URLs for fixes

## Scoring

Base score: 100 points

Deductions:
- Console errors: -2 pts each (max -20)
- Network failures: -3 pts each (max -20)
- UI errors: -4 pts each (max -20)
- Security issues: -3 pts each (max -20)
- Accessibility violations: -1 pt each (max -10)
- Slow endpoints: -1 pt each (max -10)

## Security Notes

- **No credential storage**: Passwords never touch the backend
- **Temporary sessions**: Auto-cleanup after TTL expiry
- **Non-destructive**: Safe click policies, no form submissions by default
- **Rate limiting**: Protects against abuse
- **URL validation**: Blocks private IPs by default

## Development

### Running Tests
```bash
pytest tests/ -v
```

### API Documentation
Visit `http://localhost:8000/docs` for Swagger UI.

## Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt && playwright install chromium --with-deps

COPY app/ app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t prodready-audit-backend .
docker run -p 8000:8000 -e CORS_ORIGINS=http://localhost:5173 prodready-audit-backend
```
