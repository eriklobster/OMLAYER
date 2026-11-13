// Browser-only QA. Run with: npm install --no-save playwright && node tests/site-theme-check.cjs
const { chromium } = require("playwright");
const { createServer } = require("node:http");
const { readFileSync, existsSync, mkdirSync } = require("node:fs");
const { resolve, extname } = require("node:path");
const assert = require("node:assert/strict");
const root = resolve(__dirname, "..");
const routes = ["/", "/work/ocean-kids-club/", "/work/chillum-casa/", "/work/roamdots/"];
const sizes = [320, 390, 768, 1366];
const out = process.env.OMLAYER_SCREENSHOTS || "/tmp/omlayer-theme-qa";
mkdirSync(out, { recursive: true });
const types = { ".html": "text/html; charset=utf-8", ".css":"text/css", ".js":"application/javascript", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg" };
const server = createServer((req,res) => {
  try {
    const u = new URL(req.url, "http://localhost");
    const path = u.pathname.endsWith("/") ? u.pathname+"index.html" : u.pathname;
    const file = resolve(root,"."+decodeURIComponent(path));
    if (!file.startsWith(root+"/") || !existsSync(file)) {res.writeHead(404);res.end();return;}
    res.setHeader("Content-Type",types[extname(file)]||"application/octet-stream");
    res.end(readFileSync(file));
  } catch (e) {res.writeHead(500);res.end(String(e));}
});
(async()=>{
  await new Promise(done=>server.listen(0,"127.0.0.1",done));
  const origin="http://127.0.0.1:"+server.address().port;
  const browser=await chromium.launch({headless:true});
  const failures=[];const findings=[];
  try {
    for (const width of sizes) {
      const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1});
      let page=await context.newPage();
      page.on("pageerror",err=>failures.push({width,error:err.message}));
      for (const [i,route] of routes.entries()) {
        try {
          const response=await page.goto(origin+route,{waitUntil:"domcontentloaded"});
          assert.equal(response.status(),200);
          const toggle=page.locator("[data-theme-toggle]");
          assert.equal(await toggle.count(),1);
          assert.equal(await toggle.isVisible(),true);
          assert.equal(await page.locator("link[href='/site-theme.css']").count(),1);
          if (i===0) { // Change once; verify persistence on every subsequent page.
            await toggle.click();
          }
          assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"light");
          assert.equal(await toggle.getAttribute("aria-label"),"Use dark theme");
          const bkg=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
          assert.equal(bkg,"rgb(246, 248, 247)");
          const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
          if(overflow>2)failures.push({route,width,error:"Horizontal overflow "+overflow+"px"});
          const label=route==="/"?"home":route.split("/")[2];
          // For complete-page review, first reveal all off-screen content.
          // Browser assertions above still test the real untouched application.
          await page.evaluate(() => document.querySelectorAll(".reveal,.stagger").forEach(e => e.classList.add("is-visible","on")));
          await page.waitForTimeout(950);
          await page.screenshot({path:resolve(out,label+"-"+width+"-light.png"),fullPage:true});
          findings.push({route,width,mode:"light",overflow});
        } catch(e) { failures.push({route,width,error:e.message}); }
      }
      await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
      await page.locator("[data-theme-toggle]").click();
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"dark");
      const darkBackground=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
      assert.equal(darkBackground,"rgb(8, 10, 13)");
      await page.screenshot({path:resolve(out,"home-"+width+"-dark.png"),fullPage:true});
      findings.push({route:"/",width,mode:"dark",overflow:await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth))});
      await context.close();
    }
  } finally {await browser.close();await new Promise(done=>server.close(done));}
  console.log(JSON.stringify({findings,failures},null,2));
  if (failures.length) process.exitCode=1;
})().catch(err=>{console.error(err);process.exitCode=1;});
