import asyncio
from typing import Optional

try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class BrowserManager:
    """
    Reusable browser lifecycle manager for Playwright.
    Provides controlled concurrency and prevents spawning excessive processes.
    """

    _instance: Optional["BrowserManager"] = None
    _playwright = None
    _browser: Optional[Any] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BrowserManager, cls).__new__(cls)
        return cls._instance

    @classmethod
    async def get_browser(cls) -> Optional[Any]:
        if not PLAYWRIGHT_AVAILABLE:
            return None

        if cls._browser is None or not cls._browser.is_connected():
            cls._playwright = await async_playwright().start()
            # Launch Chromium in headless mode with standard polite options
            cls._browser = await cls._playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"]
            )
        return cls._browser

    @classmethod
    async def create_page(cls) -> Optional[Any]:
        browser = await cls.get_browser()
        if browser is None:
            return None
        context = await browser.new_context(
            user_agent="AIRFAIR-Price-Index-Bot/1.0 (Public Research; Smart India Hackathon 2026; PS 26056)"
        )
        return await context.new_page()

    @classmethod
    async def close(cls):
        if cls._browser is not None:
            await cls._browser.close()
            cls._browser = None
        if cls._playwright is not None:
            await cls._playwright.stop()
            cls._playwright = None
