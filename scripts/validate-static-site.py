#!/usr/bin/env python3
"""Dependency-free local-link smoke test for OMLAYER's static website."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = (
    "index.html",
    "work/ocean-kids-club/index.html",
    "work/chillum-casa/index.html",
    "work/roamdots/index.html",
)

class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.ids = set()
        self.canonical = False

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(values["id"])
        if tag == "link" and values.get("rel") == "canonical":
            self.canonical = True
        for field in ("href", "src"):
            if values.get(field):
                self.links.append(values[field])

def parse(page):
    document = Links()
    document.feed(page.read_text(encoding="utf-8"))
    return document

def main():
    failures = []
    parsed = {}
    for relative in REQUIRED:
        file = ROOT / relative
        if not file.is_file():
            failures.append(f"Required route missing: {relative}")
    for page in ROOT.rglob("*.html"):
        if ".git" in page.parts or "dist" in page.parts:
            continue
        parsed[page.resolve()] = parse(page)
    for page, document in parsed.items():
        label = page.relative_to(ROOT)
        if page.name == "index.html" and not document.canonical:
            failures.append(f"{label}: missing canonical link")
        for value in document.links:
            target = urlsplit(value)
            if target.scheme or target.netloc or value.startswith("//"):
                continue
            path = unquote(target.path)
            if not path and not target.fragment:
                continue
            dest = (ROOT / path.lstrip("/")) if path.startswith("/") else (page.parent / path)
            dest = dest.resolve()
            if dest.is_dir():
                dest = dest / "index.html"
            if not dest.is_relative_to(ROOT):
                failures.append(f"{label}: local link escapes repository: {value}")
            elif not dest.is_file():
                failures.append(f"{label}: missing local target: {value}")
            elif target.fragment and dest.suffix == ".html":
                other = parsed.get(dest)
                if other is None:
                    other = parse(dest)
                    parsed[dest] = other
                if unquote(target.fragment) not in other.ids:
                    failures.append(f"{label}: missing anchor: {value}")
    if failures:
        for failure in failures:
            print("FAIL", failure)
        raise SystemExit(1)
    print(f"PASS: {len(parsed)} HTML documents, required routes and local links")

if __name__ == "__main__":
    main()
