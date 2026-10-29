"""Dependency-free route, asset, contact, canonical and script syntax checks."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import subprocess
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html', 'work/ocean-kids-club/index.html', 'work/chillum-casa/index.html']

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.targets, self.hrefs = set(), [], []
        self.canonical = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if 'id' in data:
            self.ids.add(data['id'])
        if tag == 'a' and 'href' in data:
            self.hrefs.append(data['href'])
            self.targets.append(data['href'])
        if tag == 'img':
            self.targets.append(data['src'])
        if tag == 'link' and data.get('rel') == 'canonical':
            self.canonical = data['href']

for name in PAGES:
    file = ROOT / name
    source = file.read_text()
    page = Page(source)
    old = Page(subprocess.check_output(['git', 'show', '3c285bd:' + name], cwd=ROOT, text=True))
    assert page.canonical == old.canonical
    assert [x for x in page.hrefs if not x.startswith('#')] == [x for x in old.hrefs if not x.startswith('#')]
    assert 'mailto:hello@omlayer.com' in page.hrefs
    assert '#main' in page.hrefs and 'main' in page.ids
    for target in page.targets:
        url = urlsplit(target)
        if url.scheme or url.netloc:
            continue
        path = ROOT / url.path.lstrip('/') if url.path.startswith('/') else file.parent / url.path
        if not url.path:
            path = file
        if path.is_dir():
            path /= 'index.html'
        assert path.is_file(), (name, target)
        if url.fragment:
            assert url.fragment in Page(path.read_text()).ids, (name, target)
    for script in re.findall(r'<script>([\s\S]*?)</script>', source):
        subprocess.run(['node', '-e', 'new (require("node:vm").Script)(require("node:fs").readFileSync(0,"utf8"))'], input=script, text=True, check=True)
    print('PASS:', name, '- canonical, preserved destinations, local routes/assets/anchors, inline JavaScript syntax')
