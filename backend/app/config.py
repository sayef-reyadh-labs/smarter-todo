from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Query parameters that Supabase and Vercel add but libpq (psycopg) rejects.
_UNSUPPORTED_QUERY_KEYS = {"supa", "pgbouncer"}


def _to_sqlalchemy_url(url: str) -> str:
    """Turn a postgres:// URL into one SQLAlchemy can use with psycopg; other URLs are kept."""
    if not url.startswith(("postgres://", "postgresql://", "postgresql+psycopg://")):
        return url
    url = "postgresql+psycopg://" + url.split("://", 1)[1]
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k not in _UNSUPPORTED_QUERY_KEYS]
    return urlunsplit(parts._replace(query=urlencode(query)))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Leave both unset locally to use the SQLite file; otherwise point it at Supabase.
    DATABASE_URL: str | None = None
    # Set automatically by the Supabase integration on Vercel (transaction pooler URL).
    POSTGRES_URL: str | None = None
    # Set by Vercel itself.
    VERCEL: str | None = None

    @property
    def database_url(self) -> str:
        url = self.DATABASE_URL or self.POSTGRES_URL
        if url:
            return _to_sqlalchemy_url(url)
        # Vercel's filesystem is read-only except /tmp, which is wiped between invocations.
        db_dir = Path("/tmp") if self.VERCEL else BACKEND_DIR
        return f"sqlite:///{(db_dir / 'smarter_todo.db').as_posix()}"


settings = Settings()
