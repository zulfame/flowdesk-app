from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from html import escape

from db import db

router = APIRouter(prefix="/og", tags=["og"])


async def _general() -> dict:
    s = await db.settings.find_one({"key": "app"}, {"_id": 0, "general": 1})
    return (s or {}).get("general", {}) or {}


def _build_html(g: dict) -> str:
    app_name = g.get("app_name") or "FlowDesk"
    title = g.get("og_title") or app_name
    desc = g.get("og_description") or g.get("meta_description") or ""
    image = g.get("og_image") or g.get("thumbnail") or ""
    url = g.get("canonical_url") or g.get("app_url") or ""
    keywords = g.get("meta_keywords") or ""
    robots = "index, follow" if g.get("search_visible") else "noindex, nofollow"
    e = escape
    return f"""<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}" />
<meta name="keywords" content="{e(keywords)}" />
<meta name="robots" content="{robots}" />
<link rel="canonical" href="{e(url)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="{e(app_name)}" />
<meta property="og:title" content="{e(title)}" />
<meta property="og:description" content="{e(desc)}" />
<meta property="og:url" content="{e(url)}" />
<meta property="og:image" content="{e(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{e(title)}" />
<meta name="twitter:description" content="{e(desc)}" />
<meta name="twitter:image" content="{e(image)}" />
</head>
<body>
<h1>{e(title)}</h1>
<p>{e(desc)}</p>
{f'<p><a href="{e(url)}">{e(url)}</a></p>' if url else ''}
</body>
</html>
"""


@router.get("/render", response_class=HTMLResponse)
async def render_og():
    """Halaman meta Open Graph untuk crawler (WhatsApp/Telegram/Facebook/X). Tanpa auth."""
    return HTMLResponse(_build_html(await _general()))


@router.get("/preview")
async def preview_og():
    """Data pratinjau tautan untuk UI Kelola Aplikasi + HTML mentah."""
    g = await _general()
    return {
        "title": g.get("og_title") or g.get("app_name") or "FlowDesk",
        "description": g.get("og_description") or g.get("meta_description") or "",
        "image": g.get("og_image") or g.get("thumbnail") or "",
        "url": g.get("canonical_url") or g.get("app_url") or "",
        "robots": "index, follow" if g.get("search_visible") else "noindex, nofollow",
        "html": _build_html(g),
    }
