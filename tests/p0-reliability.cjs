// Development-only browser verification. Supply Playwright through NODE_PATH.
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve, extname } = require('node:path');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '..');
const routes = ['/', '/work/ocean-kids-club/', '/work/chillum-casa/'];
const evidence = process.env.P0_EVIDENCE_DIR;
if (evidence) mkdirSync(evidence, { recursive:true });
const results = [];
const server = createServer((req,res) => {
  try {
    let path = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const baseline = path.startsWith('/baseline/');
    if (baseline) path = path.slice(9);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
    const bytes = baseline ? execFileSync('git',['show','3c285bd:'+path.slice(1)],{cwd:root}) : readFileSync(file);
    res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'})[extname(file)] || 'application/octet-stream');
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
(async () => {
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const origin = 'http://127.0.0.1:'+server.address().port;
  let browser;
  try {
    browser = await chromium.launch({headless:true});
    for (const route of routes) {
      const file = route === '/' ? 'index.html' : route.slice(1)+'index.html';
      const source = readFileSync(resolve(root,file),'utf8');
      const baseline = execFileSync('git',['show','3c285bd:'+file],{cwd:root,encoding:'utf8'});
      const links = s => [...s.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
      assert.deepEqual(links(source).filter(x=>!x.startsWith('#')),links(baseline).filter(x=>!x.startsWith('#')));
      for (const m of source.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
      assert(source.includes('<!--email_off-->'));
      for (const width of [390,1363]) {
        const context = await browser.newContext({javaScriptEnabled:false,viewport:{width,height:936}});
        const page = await context.newPage();
        assert.equal((await page.goto(origin+route)).status(),200);
        const state = await page.locator('body').evaluate(body=>({
          hidden:[...body.querySelectorAll('.reveal,.stagger>*')].filter(el=>getComputedStyle(el).opacity==='0').length,
          overflow:document.documentElement.scrollWidth>innerWidth,
          email:body.querySelector('a[href="mailto:hello@omlayer.com"]')?.innerText
        }));
        assert.equal(state.hidden,0); assert.equal(state.overflow,false); assert(state.email.includes('hello@omlayer.com'));
        results.push({route,width,mode:'no-js',...state});
        await context.close();
      }
      const context = await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});
      const page = await context.newPage(); const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(origin+route);
      assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Skip to content');
      assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
      await page.keyboard.press('Enter');
      if (route==='/') {
        await page.getByRole('button',{name:'M ap',exact:true}).press('Enter');
        assert.equal(await page.locator('[data-process-rest]').innerText(),'ap');
        const position=await page.locator('.process-letter').first().getAttribute('style');
        await page.waitForTimeout(150);
        assert.equal(await page.locator('.process-letter').first().getAttribute('style'),position);
      }
      assert.deepEqual(errors,[]);results.push({route,mode:'reduced-motion + keyboard',errors});
      await context.close();
      // Observer construction failure must not remove baseline content.
      const failure=await browser.newContext();const broken=await failure.newPage();
      await broken.addInitScript(()=>{window.IntersectionObserver=class{constructor(){throw Error('simulated observer failure')}}});
      await broken.goto(origin+route);
      assert.equal(await broken.locator('.reveal').evaluateAll(es=>es.filter(e=>getComputedStyle(e).opacity==='0').length),0);
      results.push({route,mode:'observer-failure',visible:true});await failure.close();
    }
    if(evidence) {
      const page=await browser.newPage({viewport:{width:1363,height:936}});
      for (const [name,url] of [['before','/baseline/'],['after','/'],['chillum','/work/chillum-casa/']]) {
        await page.goto(origin+url);await page.waitForTimeout(1000);
        await page.screenshot({path:resolve(evidence,name+'.png')});
      }
      await page.setViewportSize({width:390,height:844});await page.goto(origin+'/');await page.waitForTimeout(1000);
      await page.screenshot({path:resolve(evidence,'mobile.png')});
    }
    console.log(JSON.stringify({passed:true,results},null,2));
    if(evidence) writeFileSync(resolve(evidence,'results.json'),JSON.stringify(results,null,2));
  } finally { if(browser) await browser.close();await new Promise(done=>server.close(done)); }
})().catch(error=>{console.error(error);process.exitCode=1});
