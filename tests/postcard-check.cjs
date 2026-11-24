const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../postcard/index.html'));
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,acceptDownloads:true,geolocation:{latitude:19.36,longitude:98.44},permissions:['geolocation']});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/postcard/');
 const canvas=page.locator('#card'), snapshot=()=>canvas.evaluate(c=>c.toDataURL());
 assert.deepEqual(await canvas.evaluate(c=>[c.width,c.height]),[1748,1240]);
 const original=await snapshot();await page.locator('#place').fill('Pai, Thailand');assert.notEqual(await snapshot(),original);
 await page.locator('[data-mode=mix]').click();await page.locator('#prompt').fill('Neon mountains at midnight');const mixed=await snapshot();
 await page.locator('#shuffle').click();assert.notEqual(await snapshot(),mixed);
 await page.locator('#message').fill('Hello from the mountains');await page.locator('#address').fill('A friend');await page.locator('#backBtn').click();assert.notEqual(await snapshot(),mixed);
 await page.locator('#bleed').check();assert.deepEqual(await canvas.evaluate(c=>[c.width,c.height]),[1819,1311]);
 const download=page.waitForEvent('download');await page.locator('#pdf').click();const pdf=await download;assert.equal(pdf.suggestedFilename(),'postcard-print.pdf');
 const p=fs.readFileSync(await pdf.path());const raw=p.toString('latin1');assert.ok(raw.startsWith('%PDF-1.4'));assert.match(raw,/\/Count 2/);assert.match(raw,/\/MediaBox \[0 0 436\.5354 314\.6457\]/);assert.match(raw,/\/TrimBox \[8\.5039 8\.5039 428\.0315 306\.1417\]/);
 const xref=Number(raw.match(/startxref\n(\d+)/)[1]);assert.equal(raw.slice(xref,xref+4),'xref');
 const rows=raw.slice(xref).split('\n').slice(3,11);rows.forEach((row,i)=>{const off=Number(row.slice(0,10));assert.equal(raw.slice(off,off+7),(i+1)+' 0 obj')});
 await page.locator('#size').selectOption('4x6');await page.locator('#bleed').uncheck();assert.deepEqual(await canvas.evaluate(c=>[c.width,c.height]),[1800,1200]);
 await page.locator('[data-mode=photo]').click();const before=await snapshot();await page.locator('#photo').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=32;c.height=24;const ctx=c.getContext('2d');ctx.fillStyle='#dd33cc';ctx.fillRect(0,0,32,24);return c.toDataURL('image/png').split(',')[1]}),'base64')});
 await page.waitForFunction(()=>document.getElementById('status').textContent==='Photo loaded locally.');assert.notEqual(await snapshot(),before);
 const pngPromise=page.waitForEvent('download');await page.locator('#download').click();const png=await pngPromise;assert.equal(png.suggestedFilename(),'postcard-front.png');const pngBytes=fs.readFileSync(await png.path());assert.equal(pngBytes.readUInt32BE(16),1800);
 await page.locator('#findGps').click();await page.waitForFunction(()=>document.getElementById('printArea').value==='19.3600, 98.4400');
 await page.evaluate(()=>{window.open=(u)=>{window.testMap=u;return null}});await page.locator('#find').click();assert.ok((await page.evaluate(()=>window.testMap)).includes(encodeURIComponent('print shop near 19.3600, 98.4400')));
 await page.locator('[data-mode=prompt]').click();assert.equal(await page.locator('#placeField').isVisible(),false);assert.equal(await page.locator('#promptField').isVisible(),true);
 const output=process.env.OMLAYER_SCREENSHOTS;if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'postcard-mobile.png'),fullPage:true})}
 for(const width of [320,390,768,1366]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width)}
 if(output)await page.screenshot({path:path.join(output,'postcard-desktop.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: postcard browser flows, PNG, two-page PDF structure, GPS, map, responsive widths');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
