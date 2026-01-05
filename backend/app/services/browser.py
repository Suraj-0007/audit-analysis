"""Playwright browser management."""

import asyncio
import os
import sys
from typing import Dict, Optional
from threading import Lock

from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright

from app.core.config import settings
from app.core.logging import get_logger
from app.services.session_manager import session_manager

logger = get_logger(__name__)


class BrowserManager:
    """Manages Playwright browser instances and contexts."""

    def __init__(self):
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._contexts: Dict[str, BrowserContext] = {}
        self._pages: Dict[str, Page] = {}
        self._lock = Lock()
        self._initialized = False

    def _should_run_headless(self) -> bool:
        """
        Decide headless mode WITHOUT any new env vars.
        - On Railway / Linux servers: headless=True (no X server available)
        - Locally (Windows/Mac): headless=False so manual login works
        """
        # If running on Linux (most servers incl. Railway), default to headless
        if sys.platform.startswith("linux"):
            return True

        # On Windows/Mac local dev, allow headed for manual login
        return False

    async def initialize(self):
        """Initialize Playwright and browser."""
        if self._initialized:
            return

        logger.info("Initializing Playwright browser...")
        self._playwright = await async_playwright().start()

        headless = self._should_run_headless()

        # Launch browser - contexts are created as needed
        # NOTE: Headed mode requires X server which isn't present on Railway.
        self._browser = await self._playwright.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-gpu",
                "--no-zygote",
                "--disable-setuid-sandbox",
            ],
        )

        self._initialized = True
        logger.info(f"Playwright browser initialized (headless={headless})")

    async def shutdown(self):
        """Shutdown browser and cleanup."""
        logger.info("Shutting down browser manager...")

        # Close all contexts
        for session_id in list(self._contexts.keys()):
            await self.close_context(session_id)

        if self._browser:
            try:
                await self._browser.close()
            except Exception as e:
                logger.warning(f"Error closing browser: {e}")
            self._browser = None

        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception as e:
                logger.warning(f"Error stopping Playwright: {e}")
            self._playwright = None

        self._initialized = False
        logger.info("Browser manager shutdown complete")

    async def create_context(self, session_id: str, url: str) -> BrowserContext:
        """Create a new browser context for a session."""
        if not self._initialized:
            await self.initialize()

        session = session_manager.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        context = await self._browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            ignore_https_errors=True,
            java_script_enabled=True,
        )

        with self._lock:
            self._contexts[session_id] = context

        logger.info(f"Created browser context for session {session_id}")
        return context

    async def get_context(self, session_id: str) -> Optional[BrowserContext]:
        """Get existing context for a session."""
        with self._lock:
            return self._contexts.get(session_id)

    async def open_login_page(self, session_id: str) -> Page:
        """
        Open a page for manual login.

        NOTE:
        - On Railway/Linux servers we run headless, so "manual login" isn't practical.
        - This still works locally (Windows/Mac) where headed mode is enabled.
        """
        session = session_manager.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found or expired")

        context = await self.get_context(session_id)
        if not context:
            context = await self.create_context(session_id, session.url)

        page = await context.new_page()

        # Console logging for debugging
        page.on("console", lambda msg: logger.debug(f"Console [{msg.type}]: {msg.text}"))

        try:
            await page.goto(
                session.url,
                timeout=settings.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS,
                wait_until="domcontentloaded",
            )
        except Exception as e:
            logger.warning(f"Navigation warning for {session.url}: {e}")

        with self._lock:
            self._pages[session_id] = page

        logger.info(f"Opened login page for session {session_id}: {session.url}")
        return page

    async def save_storage_state(self, session_id: str) -> bool:
        """Save the storage state (cookies/localStorage) for a session."""
        session = session_manager.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        context = await self.get_context(session_id)
        if not context:
            raise ValueError(f"No browser context for session {session_id}")

        try:
            await context.storage_state(path=session.storage_state_path)
            logger.info(f"Saved storage state for session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to save storage state: {e}")
            return False

    async def create_authenticated_context(self, session_id: str) -> BrowserContext:
        """Create a new context using saved storage state for automated auditing."""
        session = session_manager.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        if not session.is_authenticated:
            raise ValueError(f"Session {session_id} is not authenticated")

        if not os.path.exists(session.storage_state_path):
            raise ValueError(f"Storage state not found for session {session_id}")

        if not self._initialized:
            await self.initialize()

        context = await self._browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            ignore_https_errors=True,
            java_script_enabled=True,
            storage_state=session.storage_state_path,
        )

        logger.info(f"Created authenticated context for session {session_id}")
        return context

    async def close_context(self, session_id: str):
        """Close and clean up a session's browser context."""
        with self._lock:
            page = self._pages.pop(session_id, None)
            context = self._contexts.pop(session_id, None)

        if page and not page.is_closed():
            try:
                await page.close()
            except Exception as e:
                logger.warning(f"Error closing page: {e}")

        if context:
            try:
                await context.close()
            except Exception as e:
                logger.warning(f"Error closing context: {e}")

        logger.info(f"Closed browser context for session {session_id}")

    async def get_cookies(self, session_id: str) -> list:
        """Get cookies from a session's context."""
        context = await self.get_context(session_id)
        if context:
            return await context.cookies()
        return []


# Global browser manager instance
browser_manager = BrowserManager()
