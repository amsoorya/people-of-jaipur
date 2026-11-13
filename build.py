"""Builds index.html from the source files in src/.

Run:  python3 build.py
Then commit and push. Netlify publishes the new index.html automatically.
"""
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
PARTS = ["p1.js", "p2.js", "p3.js", "p4.js", "p5.js", "p6.js", "p7.js"]

head = (SRC / "head.html").read_text(encoding="utf-8")
script = "".join((SRC / p).read_text(encoding="utf-8") for p in PARTS)

# Supabase (sign-in, saving, chat, live visitors) loads before the city code.
platform = (
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>\n'
    '<script src="config.js"></script>\n'
    '<script src="platform.js"></script>\n'
)
html = head + platform + "<script>\n" + script + "</script></body></html>\n"

# Wording for the public site, where people sign in with an email code or LinkedIn.
replacements = {
    "You need edit access to this page to chat. Ask the person who shared it.": "Sign in (in the Menu) to chat.",
    "You can read along. Signed-in people with edit access can chat.": "You can read along. Sign in, in the Menu, to chat.",
    "You need edit access to this page to add yourself. Ask the person who shared it.": "Sign in (in the Menu) to add yourself.",
    "You need edit access to this page to register a shop. Ask the person who shared it.": "Sign in (in the Menu) to register a shop.",
    "You need edit access to this page to register a company. Ask the person who shared it.": "Sign in (in the Menu) to register a company.",
    "Registering needs you to be signed in with edit access to this page. You can still explore.": "Registering needs sign-in, which isn’t set up on this site yet. You can still explore.",
    "You need to be signed in with edit access to do that.": "Sign in (in the Menu) to do that.",
    "Waving needs edit access to this page.": "Sign in to wave at people.",
    "<title>People of Jaipur — walk the Pink City, meet its designers and builders</title>":
        "<title>People of Jaipur — walk the Pink City, meet its designers and builders</title>\n"
        '<link rel="canonical" href="https://peopleofjaipur.com/">\n'
        '<meta property="og:title" content="People of Jaipur">\n'
        '<meta property="og:description" content="Walk a 3D Pink City. Visit its shops, cafés and offices, and meet the people who build Jaipur.">\n'
        '<meta property="og:url" content="https://peopleofjaipur.com/">',
}
for old, new in replacements.items():
    html = html.replace(old, new)
html = html.replace("window.__jp = {", "window.__jpDebug = {")

(ROOT / "index.html").write_text(html, encoding="utf-8")
print(f"Built index.html ({len(html) // 1024} KB)")
