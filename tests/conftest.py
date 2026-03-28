from __future__ import annotations

from urllib.parse import urlparse

import pytest

from app.core import settings


SAFE_DB_NAME_MARKERS = (
    "test",
    "tests",
    "pytest",
    "e2e",
    "tmp",
    "temporary",
)


def _extract_database_name(url: str) -> str:
    parsed = urlparse(url)
    return parsed.path.rsplit("/", 1)[-1].lower()


def _is_safe_test_database(url: str) -> bool:
    normalized = url.lower()
    if normalized.startswith("sqlite://"):
        return True

    database_name = _extract_database_name(url)
    return any(marker in database_name for marker in SAFE_DB_NAME_MARKERS)


def pytest_sessionstart(session) -> None:  # type: ignore[no-untyped-def]
    unsafe_urls: list[tuple[str, str]] = []
    for label, url in (
        ("DATABASE_URL", settings.database_url),
        ("LOG_DATABASE_URL", settings.log_database_url),
    ):
        if not _is_safe_test_database(url):
            unsafe_urls.append((label, url))

    if not unsafe_urls:
        return

    details = "\n".join(f"- {label}={url}" for label, url in unsafe_urls)
    raise pytest.UsageError(
        "Refusing to start pytest against a non-test database.\n"
        "Point tests at dedicated *_test or *_e2e databases before running.\n"
        f"{details}"
    )
