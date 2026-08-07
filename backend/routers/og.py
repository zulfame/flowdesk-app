import base64
import binascii

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from html import escape

from db import db

router = APIRouter(prefix="/og", tags=["og"])


async def _general() -> dict:
    s = await db.settings.find_one({"key": "app"}, {"_id": 0, "general": 1})
    return (s or {}).get("general", {}) or {}


def _base_url(g: dict, request: Request | None) -> str:
    """Base URL absolut untuk membentuk URL gambar OG (crawler butuh URL http, bukan data URI)."""
    for key in ("canonical_url", "app_url"):
        val = (g.get(key) or "").strip().rstrip("/")
        if val.startswith("http"):
            return val
    if request is not None:
        proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
        host = request.headers.get("x-forwarded-host", "").split(",")[0].strip()
        if host:
            return f"{proto or 'https'}://{host}"
        return str(request.base_url).rstrip("/")
    return ""


def _image_url(g: dict, request: Request | None) -> str:
    raw = g.get("og_image") or g.get("thumbnail") or g.get("logo") or ""
    if not raw:
        return ""
    if raw.startswith("http"):
        return raw
    base = _base_url(g, request)
    return f"{base}/api/og/image" if base else ""


def _build_html(g: dict, request: Request | None = None) -> str:
    app_name = g.get("app_name") or "FlowDesk"
    title = g.get("og_title") or app_name
    desc = g.get("og_description") or g.get("meta_description") or ""
    image = _image_url(g, request)
    url = g.get("canonical_url") or g.get("app_url") or _base_url(g, request)
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
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
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
async def render_og(request: Request):
    """Halaman meta Open Graph untuk crawler (WhatsApp/Telegram/Facebook/X). Tanpa auth."""
    return HTMLResponse(_build_html(await _general(), request))


@router.get("/image")
async def og_image():
    """Sajikan gambar Open Graph terbaru sebagai berkas gambar nyata (crawler tidak bisa memakai data URI)."""
    g = await _general()
    raw = g.get("og_image") or g.get("thumbnail") or g.get("logo") or ""
    if not raw:
        raise HTTPException(status_code=404, detail="Gambar Open Graph belum diunggah")
    if raw.startswith("http"):
        return RedirectResponse(raw)
    if raw.startswith("data:"):
        try:
            header, payload = raw.split(",", 1)
            media_type = header[5:].split(";")[0] or "image/png"
            content = base64.b64decode(payload)
        except (ValueError, binascii.Error):
            raise HTTPException(status_code=404, detail="Gambar Open Graph tidak valid")
        return Response(
            content=content,
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=300"},
        )
    raise HTTPException(status_code=404, detail="Gambar Open Graph tidak valid")


@router.get("/preview")
async def preview_og(request: Request):
    """Data pratinjau tautan untuk UI Kelola Aplikasi + HTML mentah."""
    g = await _general()
    return {
        "title": g.get("og_title") or g.get("app_name") or "FlowDesk",
        "description": g.get("og_description") or g.get("meta_description") or "",
        "image": g.get("og_image") or g.get("thumbnail") or "",
        "url": g.get("canonical_url") or g.get("app_url") or "",
        "robots": "index, follow" if g.get("search_visible") else "noindex, nofollow",
        "html": _build_html(g, request),
    }
