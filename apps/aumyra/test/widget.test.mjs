import test from "node:test";
import assert from "node:assert/strict";
import {deflateSync} from "node:zlib";
import {AUMYRA_WIDGET_HTML,WIDGET_VIEWS,utf8Preview} from "../src/widget.mjs";

test("native Telegram 10.4 dashboard is a small self-contained safe HTML widget",()=>{
  const bytes=Buffer.byteLength(AUMYRA_WIDGET_HTML,"utf8");
  const compressed=deflateSync(Buffer.from(AUMYRA_WIDGET_HTML),{level:9}).length;
  assert.ok(bytes>100 && bytes<=32768,"uncompressed HTML bytes="+bytes);
  assert.ok(compressed<=4096,"zlib compressed widget bytes="+compressed);
  assert.match(AUMYRA_WIDGET_HTML,/TelegramWidget\.request\(key\)/);
  assert.match(AUMYRA_WIDGET_HTML,/TelegramWidget\.ready\(\)/);
  assert.match(AUMYRA_WIDGET_HTML,/--tg-theme-text-color/);
  assert.doesNotMatch(AUMYRA_WIDGET_HTML,/<input\b|<textarea\b|<iframe\b|<form\b|<script\s+src|@import|XMLHttpRequest|WebSocket|fetch\s*\(/i);
  assert.doesNotMatch(AUMYRA_WIDGET_HTML, /wallet\.|sendTransaction\(|payment|Stars|invoice/i);
  assert.deepEqual(WIDGET_VIEWS,["summary","history","notes","goals","expense","income","chat","help"]);
  for(const action of WIDGET_VIEWS)assert.ok(AUMYRA_WIDGET_HTML.includes('data-view="'+action+'"'));
});
test("widget query result truncates by UTF-8 bytes without splitting codepoints",()=>{
  const text="δ🧠".repeat(400);
  const result=utf8Preview(text);
  assert.ok(Buffer.byteLength(result,"utf8")<=1024);
  assert.ok(result.endsWith("…"));
  assert.ok(!result.includes("\uFFFD"));
  assert.equal(utf8Preview("hello"),"hello");
});

test("widget auto-loads private owner summary without polling and preserves Unicode",()=>{
  assert.match(AUMYRA_WIDGET_HTML,/app\.chatType==='private'/);
  assert.match(AUMYRA_WIDGET_HTML,/ask\('summary'\)/);
  assert.doesNotMatch(AUMYRA_WIDGET_HTML,/setInterval|wallet|sendTransaction|fetch\s*\(/i);
  for(const size of [7,11,41,980]){
    const text="🐘สวัสดี 😀".repeat(200);
    const out=utf8Preview(text,size);
    assert.ok(Buffer.byteLength(out,"utf8")<=size);
    assert.ok(!out.includes("\uFFFD"));
    assert.ok(out.endsWith("…"));
  }
});
