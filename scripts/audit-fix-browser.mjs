import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_SCHEMA_VERSION, STORAGE_KEY } from '../src/config.js';

const engines = await import(process.env.PLAYWRIGHT_MODULE);
const engine = process.env.AUDIT_BROWSER || 'chromium';
const out = process.env.AUDIT_OUT;
if (!engines[engine] || !out) throw new Error('Browser engine and AUDIT_OUT are required.');
await mkdir(out, { recursive: true });
const cases = [];
const add = (viewport, check, status, evidence) => cases.push({ engine, viewport, check, status, evidence });
const CATALOG_KEY='farming420-item-catalog-v5';
const testCatalog=[{id:'FERMENTO_HELMET',name:'Fermento Helmet',category:'HELMET',tier:'LEGENDARY',material:'LEATHER_HELMET',skin:null}];
const seed = {
  schemaVersion: DATA_SCHEMA_VERSION, page: 'dashboard', selectedCrop: 'melon', search: '', drawer: null,
  profile: { name: 'Disposable cross-browser audit', globalFortune: 0, cropFortune: {},
    levels: {}, owned: {}, costs: {}, manualGain: {}, toolProgress: {}, cropProgress: {} },
};
const browser = await engines[engine].launch();
const navigate = async (page,id) => {
  const toggle=page.locator('[data-nav-toggle]');
  if(await toggle.getAttribute('aria-expanded')!=='true') await toggle.tap();
  await page.locator(`.sidebar [data-page="${id}"]`).tap();
  await page.waitForTimeout(250);
};
const instrument = async (page,value,catalogItems=testCatalog) => page.addInitScript(([key,raw,catalogKey,items])=>{
  localStorage.setItem(key,raw);
  localStorage.setItem(catalogKey,JSON.stringify({fetchedAt:new Date().toISOString(),items}));
  window.auditMainWrites=[];
  const put=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
  Storage.prototype.setItem=function(k,v){if(k===key)window.auditMainWrites.push({kind:'set',value:String(v)});return put.call(this,k,v);};
  Storage.prototype.removeItem=function(k){if(k===key)window.auditMainWrites.push({kind:'remove'});return remove.call(this,k);};
},[STORAGE_KEY,value,CATALOG_KEY,catalogItems]);
const geometry = page => page.evaluate(() => {
  const details = document.querySelector('details[data-pet-item-dropdown]');
  const menu = details?.querySelector('.sb-pet-dropdown-menu');
  const main = document.querySelector('main');
  if (!details?.open || !menu) return { open: false, mainTop: main?.scrollTop };
  const m = menu.getBoundingClientRect();
  const options = [...menu.querySelectorAll('[data-pet-item-option]')].map(e => {
    const r = e.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { id: e.dataset.petItemOption, label: e.textContent.trim(), x, y, top: r.top, bottom: r.bottom,
      canHit: r.top >= 0 && r.bottom <= innerHeight + 1 && !!hit && (hit === e || e.contains(hit)) };
  });
  return { open: true, viewport: { width: innerWidth, height: innerHeight }, mainTop: main.scrollTop,
    mainMax: main.scrollHeight - main.clientHeight, menuTop: m.top, menuBottom: m.bottom, options };
});
const wheelToLast = async page => {
  const main = await page.locator('main').boundingBox();
  await page.mouse.move(main.x + main.width / 2, main.y + main.height - 20);
  for (let i = 0; i < 6; i++) {
    const g = await geometry(page);
    if (g.options?.at(-1)?.canHit) return g;
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(180);
  }
  return geometry(page);
};
try {
  for (const [name, width, height] of [['320-portrait',320,568],['360-portrait',360,640],['375-portrait',375,667],['390-portrait',390,844],['412-portrait',412,915],['568-landscape',568,320],['667-landscape',667,375],['800-landscape',800,360]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [], httpErrors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('response', r => { if (r.status() >= 400) httpErrors.push({ status: r.status(), path: new URL(r.url()).pathname }); });
    await instrument(page,JSON.stringify(seed));
    try {
      await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
      await page.locator('[data-activity-mode="farm"]').waitFor({ timeout: 15000 });
      // Allow startup hydration before testing a normally opened navigation.
      // Retain retries as evidence; never force hidden controls or mutate route state.
      await page.waitForTimeout(2200);
      const navigationAttempts = [];
      for (let attempt = 0; attempt < 4; attempt++) {
        const toggle = page.locator('[data-nav-toggle]');
        if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.tap();
        await page.waitForTimeout(250);
        const expanded = await toggle.getAttribute('aria-expanded');
        try {
          await page.locator('.sidebar [data-page="setups"]').tap({ timeout: 1800 });
          navigationAttempts.push({ attempt, expanded, selected: true });
          break;
        } catch (e) {
          navigationAttempts.push({ attempt, expanded, selected: false, message: String(e).split('\\n')[0],
            afterExpanded: await toggle.getAttribute('aria-expanded') });
          await page.waitForTimeout(400);
        }
      }
      add(name, 'settled-navigation-retries', navigationAttempts.some(a => !a.selected) ? 'NOTE' : 'PASS', navigationAttempts);
      await page.waitForTimeout(250);
      const landed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).page, STORAGE_KEY);
      add(name, 'normal-tap-navigation', landed === 'setups' ? 'PASS' : 'FAIL', { landed });
      for (const value of ['', 'Cancelled set']) {
        await page.locator('[data-add-physical-set]').tap();
        if (value) await page.locator('[data-new-set-name]').fill(value);
        await page.locator('[data-add-set-cancel]').tap();
        const cancel = await page.evaluate(() => ({
          dialog: !!document.querySelector('[data-add-set-dialog]'),
          hasThird: !!document.querySelector('[data-remove-physical-set]'),
          focusReturned: !!document.activeElement?.matches('[data-add-physical-set]'),
        }));
        add(name, `cancel-set-${value ? 'filled' : 'blank'}`, !cancel.dialog && !cancel.hasThird && cancel.focusReturned ? 'PASS' : 'FAIL', cancel);
      }
      await page.locator('[data-add-physical-set]').tap();
      await page.keyboard.press('Escape');
      add(name, 'add-set-escape', await page.locator('[data-add-set-dialog]').count() === 0 ? 'PASS' : 'FAIL', {});
      await page.locator('[data-add-physical-set]').tap();
      await page.locator('[data-new-set-name]').fill('A'.repeat(48));
      await page.locator('[data-add-set-form] button[value="add"]').tap();
      await page.waitForTimeout(300);
      const header = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.physical-set-switch button')].map(e => {
          const r = e.getBoundingClientRect(), hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
          return { label:e.textContent.trim(),width:r.width,height:r.height,clipped:e.scrollWidth>e.clientWidth+1,hit:hit===e||e.contains(hit),left:r.left,right:r.right };
        });
        return { rows, noOverflow:document.documentElement.scrollWidth<=innerWidth+1 };
      });
      add(name,'three-set-long-name-header',header.noOverflow&&header.rows.every(r=>r.width>=30&&!r.clipped&&r.hit&&r.left>=0&&r.right<=width+1)?'PASS':'FAIL',header);
      await page.locator('[data-remove-physical-set]').tap();
      await page.locator('[data-physical-setup="normal"]').tap();
      await page.locator('.slot-card[data-slot="petItem"][data-setup-target="normal"]').tap();
      const summary = page.locator('details[data-pet-item-dropdown] > summary');
      await summary.waitFor({ state: 'visible' });
      await summary.tap();
      await page.waitForTimeout(150);
      const immediate = await wheelToLast(page);
      add(name, 'last-option-point-in-time-hit', immediate.options?.at(-1)?.canHit ? 'PASS' : 'FAIL', immediate);
      await page.screenshot({ path: join(out, name + '-immediate.png') });
      const postCapture = await geometry(page);
      await page.waitForTimeout(2100);
      const settled = await geometry(page);
      add(name, 'last-option-stable-after-capture-and-anchor-expiry', settled.options?.at(-1)?.canHit ? 'PASS' : 'FAIL',
        { immediate, postCapture, settled, note: 'No injected DOM mutation in this scenario.' });
      await page.screenshot({ path: join(out, name + '-settled.png') });
      // Keyboard behavior is independent of selection's editor lifecycle.
      if (!await page.locator('details[data-pet-item-dropdown]').evaluate(e => e.open)) await summary.tap();
      await summary.focus();
      await page.keyboard.press('Escape');
      const escaped = await geometry(page);
      add(name, 'pet-item-escape-close', escaped.open ? 'FAIL' : 'PASS', { remainsOpen: escaped.open });
      {
        await page.keyboard.press('ArrowDown');
        const focus = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          optionId: document.activeElement?.dataset?.petItemOption ?? null,
          inOptions: !!document.activeElement?.matches('[data-pet-item-option]'),
        }));
        add(name, 'declared-listbox-arrow-focus', focus.inOptions ? 'PASS' : 'FAIL', focus);
      }
      if (!await page.locator('details[data-pet-item-dropdown]').evaluate(e => e.open)) await summary.tap();
      await page.waitForTimeout(2100);
      const ready = await wheelToLast(page);
      const last = ready.options?.at(-1);
      if (last?.canHit) {
        await page.touchscreen.tap(last.x, last.y);
        await page.waitForTimeout(350);
        const selected = await page.evaluate(key => {
          const raw = JSON.parse(localStorage.getItem(key));
          return raw.profile?.setups?.list?.find(s => s.id === 'normal')?.slots?.petItem?.skyblockId ?? null;
        }, STORAGE_KEY);
        add(name, 'last-option-actual-touch-selection-after-recovery', selected === last.id ? 'PASS' : 'FAIL',
          { intended: last.id, persisted: selected, locatorAutoscroll: false });
      } else {
        add(name, 'last-option-actual-touch-selection-after-recovery', 'BLOCKED', { reason: 'No visible hit target after wheel recovery.', ready });
      }
      for(const [slot,selector] of [['petItem','details[data-pet-item-dropdown]'],['pet','details[data-farming-pet-dropdown]'],['helmet','details[data-closed-item-dropdown="helmet"]']]) {
        if(!await page.locator(`[data-item-editor="${slot}"]`).count()) await page.locator(`.slot-card[data-slot="${slot}"][data-setup-target="normal"]`).tap();
        const picker=page.locator(selector),trigger=picker.locator('summary');
        await trigger.waitFor({state:'visible'});
        await trigger.focus();
        await page.keyboard.press('End');
        const end=await picker.evaluate(e=>document.activeElement===e.querySelector('[role="option"]:last-child'));
        await page.keyboard.press('Home');
        const home=await picker.evaluate(e=>document.activeElement===e.querySelector('[role="option"]'));
        await page.keyboard.press('Escape');
        const escape=await picker.evaluate(e=>!e.open&&document.activeElement===e.querySelector('summary'));
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Tab');
        const tab=await picker.evaluate(e=>!e.open&&!e.contains(document.activeElement));
        await trigger.tap();
        await page.locator('#search').tap();
        const outside=await picker.evaluate(e=>!e.open);
        add(name,`picker-${slot}-home-end-tab-outside-focus`,end&&home&&escape&&tab&&outside?'PASS':'FAIL',{end,home,escape,tab,outside});
      }
      await navigate(page,'buffs');
      const detailsButton=page.locator('button[data-open="temporary-buff-pesthunter-phillip-buff"]');
      await detailsButton.tap();
      await page.keyboard.press('Tab');
      const tabInDrawer=await page.evaluate(()=>!!document.activeElement?.closest('.drawer'));
      await page.keyboard.press('Escape');
      const drawer=await page.evaluate(()=>({closed:!document.querySelector('.drawer'),focus:document.activeElement?.dataset?.open}));
      add(name,'effects-drawer-escape-focus-tab',tabInDrawer&&drawer.closed&&drawer.focus==='temporary-buff-pesthunter-phillip-buff'?'PASS':'FAIL',{tabInDrawer,...drawer});
      await navigate(page,'shards');
      const cropshot=page.locator('article[data-open="garden-chip-cropshot-chip"]');
      if(await cropshot.count()) {
        const nested=await cropshot.locator('button button').count();
        await page.evaluate(()=>{window.auditMainWrites=[];});
        await cropshot.locator('[data-direct-value="1"]').tap();
        await page.waitForTimeout(350);
        const action=await page.evaluate(key=>({writes:window.auditMainWrites.length,level:JSON.parse(localStorage.getItem(key)).profile.levels['garden-chip-cropshot-chip']}),STORAGE_KEY);
        add(name,'cropshot-valid-tree-one-write',nested===0&&action.writes===1&&action.level===1?'PASS':'FAIL',{nested,...action});
      } else add(name,'cropshot-valid-tree-one-write','BLOCKED',{reason:'Cropshot card absent from canonical workspace'});
      await navigate(page,'tools');
      const anchor=page.locator('[data-sb-tool-crop="cactus"]');
      await anchor.scrollIntoViewIfNeeded();
      await anchor.tap();
      await page.waitForTimeout(150);
      const box=await page.locator('main').boundingBox();
      const prior=await page.locator('main').evaluate(e=>e.scrollTop);
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
      await page.mouse.wheel(0,160);
      await page.waitForTimeout(100);
      const manual=await page.locator('main').evaluate(e=>e.scrollTop);
      await page.evaluate(()=>document.getElementById('app').setAttribute('data-audit-harmless-mutation',String(Date.now())));
      await page.waitForTimeout(2200);
      const late=await page.locator('main').evaluate(e=>e.scrollTop);
      add(name,'manual-wheel-controlled-late-mutation',Math.abs(manual-prior)<10?'BLOCKED':Math.abs(late-manual)<=3?'PASS':'FAIL',{prior,manual,late,controlledMutation:true});
      await anchor.tap();
      await page.waitForTimeout(150);
      await page.locator('main').evaluate(e=>{e.tabIndex=-1;e.focus({preventScroll:true});});
      const keyBefore=await page.locator('main').evaluate(e=>e.scrollTop);
      await page.keyboard.press('PageUp');
      await page.waitForTimeout(300);
      const keyManual=await page.locator('main').evaluate(e=>e.scrollTop);
      await page.evaluate(()=>document.getElementById('app').setAttribute('data-audit-key-mutation',String(Date.now())));
      await page.waitForTimeout(2200);
      const keyLate=await page.locator('main').evaluate(e=>e.scrollTop);
      add(name,'manual-key-controlled-late-mutation',Math.abs(keyBefore-keyManual)<10?'BLOCKED':Math.abs(keyLate-keyManual)<=3?'PASS':'FAIL',{keyBefore,keyManual,keyLate,key:'PageUp',controlledPaneFocus:true});
      await anchor.tap();
      await page.waitForTimeout(150);
      const touch=await page.locator('main').evaluate(e=>{
        const before=e.scrollTop;
        e.dispatchEvent(new Event('touchstart',{bubbles:true}));
        e.dispatchEvent(new Event('touchmove',{bubbles:true}));
        e.scrollTop=before>=120?before-120:before+120;
        return {before,manual:e.scrollTop};
      });
      await page.evaluate(()=>document.getElementById('app').setAttribute('data-audit-touch-mutation',String(Date.now())));
      await page.waitForTimeout(2200);
      const touchLate=await page.locator('main').evaluate(e=>e.scrollTop);
      add(name,'touch-intent-controlled-late-mutation',Math.abs(touch.before-touch.manual)<10?'BLOCKED':Math.abs(touchLate-touch.manual)<=3?'PASS':'FAIL',{...touch,late:touchLate,syntheticIntentAndControlledScroll:true,physicalDevice:false});
      add(name, 'runtime-page-errors', errors.length ? 'FAIL' : 'PASS', errors);
      add(name, 'external-http-errors', httpErrors.length ? 'NOTE' : 'PASS', [...new Map(httpErrors.map(r => [r.status + r.path, r])).values()]);
    } catch (e) {
      const state = await page.evaluate(key => ({
        page: JSON.parse(localStorage.getItem(key) || '{}').page,
        navigationExpanded: document.querySelector('[data-nav-toggle]')?.getAttribute('aria-expanded'),
        editorCount: document.querySelectorAll('[data-item-editor]').length,
        dropdownCount: document.querySelectorAll('[data-pet-item-dropdown]').length,
      }), STORAGE_KEY).catch(() => null);
      add(name, 'probe-execution', 'BLOCKED', { message: String(e), errors, state });
      await page.screenshot({ path: join(out, name + '-blocked.png') }).catch(() => {});
    } finally {
      await context.close();
    }
    await writeFile(join(out, 'browser-followup.json'), JSON.stringify({ auditedSource: process.env.AUDITED_SHA, engine, cases }, null, 2));
  }
  {
    const name='physical-art-offline';
    const identities={helmet:'TATER_HELMET',equipment1:'PESTHUNTERS_NECKLACE',equipment2:'PESTHUNTERS_CLOAK',equipment3:'PESTHUNTERS_BELT',equipment4:'PESTHUNTERS_GLOVES',petItem:'POIGNANT_LUCKY_CLOVER'};
    const slots=Object.fromEntries(Object.entries(identities).map(([slot,id])=>[slot,{skyblockId:id,displayName:id,rarity:'LEGENDARY',source:'manual',reforge:null,enchantments:{},gems:[],recombobulated:false}]));
    const fixture={...seed,profile:{...seed.profile,setups:{modelVersion:1,activeId:'normal',list:[{id:'normal',name:'FF (Farming Fortune) Set',slots}]}}};
    const context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    let imageAttempts=0;
    await page.route('**/*',route=>{
      const request=route.request();
      if(request.resourceType()==='image'&&new URL(request.url()).origin!=='http://127.0.0.1:4173'){imageAttempts++;return route.abort();}
      return route.continue();
    });
    await instrument(page,JSON.stringify(fixture),[...testCatalog,...Object.values(identities).map(id=>({id,name:id,category:id.endsWith('HELMET')?'HELMET':id.endsWith('CLOVER')?'PET_ITEM':'EQUIPMENT',tier:'LEGENDARY',material:'SKULL_ITEM',skin:null}))]);
    try {
      await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(2200);
      await navigate(page,'setups');
      await page.waitForTimeout(1800);
      const attemptsBefore=imageAttempts;
      const art=await page.evaluate(async identities=>{
        const {renderSetupItemArt}=await import('./src/item-art-ui.js');
        const portraits=Object.entries(identities).map(([slot,id])=>{
          const card=document.querySelector(`.slot-card[data-slot="${slot}"][data-setup-target="normal"]`);
          const portrait=card?.querySelector('.slot-portrait');
          return {slot,id,portrait};
        });
        let mutations=0;
        const observer=new MutationObserver(rows=>mutations+=rows.length);
        for(const {portrait} of portraits)if(portrait)observer.observe(portrait,{subtree:true,attributes:true,characterData:true,childList:true});
        const rendered=[];
        for(let i=0;i<3;i++){rendered.push(renderSetupItemArt());await new Promise(r=>setTimeout(r,120));}
        observer.disconnect();
        return {mutations,rendered,portraits:portraits.map(({slot,id,portrait})=>({slot,id,actual:portrait?.dataset.skyblockItemId,identity:portrait?.dataset.renderedItemArt,filled:!!portrait?.querySelector('.official-item-art,.skull-art,.item-art-fallback'),broken:[...portrait?.querySelectorAll('img')||[]].some(img=>img.complete&&img.naturalWidth===0)}))};
      },identities);
      add(name,'tater-pesthunter-clover-truthful-stable-fallback',art.mutations===0&&art.portraits.every(p=>p.actual===p.id&&p.filled&&!p.broken)&&imageAttempts===attemptsBefore?'PASS':'FAIL',{...art,attemptsBefore,attemptsAfter:imageAttempts,externalImages:'deliberately aborted; no real asset availability claim'});
      add(name,'runtime-page-errors',errors.length?'FAIL':'PASS',errors);
    }catch(error){add(name,'probe-execution','BLOCKED',{message:String(error),errors});}
    finally{await context.close();}
  }
  for(const future of [false,true]) {
    const name=future?'future-schema':'backup';
    const fixture={...seed,schemaVersion:future?DATA_SCHEMA_VERSION+1:DATA_SCHEMA_VERSION,auditSentinel:{opaque:['preserve',420],format:'disposable'}};
    const original=JSON.stringify(fixture,null,2)+'\n';
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
    const page=await context.newPage();
    page.setDefaultTimeout(8000);
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await instrument(page,original);
    try {
      await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded'});
      await page.locator('[data-nav-toggle]').waitFor();
      await page.waitForTimeout(2200);
      await navigate(page,'setups');
      await page.locator('.slot-card[data-slot="petItem"][data-setup-target="normal"]').tap();
      const toggle=page.locator('[data-nav-toggle]');
      if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.tap();
      await page.locator('[data-open-settings]').tap();
      if(future) {
        await page.locator('[data-sync-now]').tap();
        await page.locator('[data-reset-app]').tap();
        const state=await page.evaluate(key=>({raw:localStorage.getItem(key),writes:window.auditMainWrites.length}),STORAGE_KEY);
        add(name,'future-raw-bytes-zero-writes-startup-navigation-editors-settings-sync',state.raw===original&&state.writes===0?'PASS':'FAIL',{sameBytes:state.raw===original,writes:state.writes,errors});
      } else {
        await page.locator('[data-backup-download]').scrollIntoViewIfNeeded();
        const downloading=page.waitForEvent('download');
        await page.locator('[data-backup-download]').tap();
        const download=await downloading;
        const payload=JSON.parse(await readFile(await download.path(),'utf8'));
        const current=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
        add(name,'export-preserves-actual-state',JSON.stringify(payload.state)===JSON.stringify(current)?'PASS':'FAIL',{sentinel:payload.state.auditSentinel,filename:download.suggestedFilename()});
        for(const [check,value] of [['invalid-json','{broken'],['future-inner',JSON.stringify({...payload,state:{...payload.state,schemaVersion:DATA_SCHEMA_VERSION+1}})],['future-envelope',JSON.stringify({...payload,schemaVersion:DATA_SCHEMA_VERSION+1})]]) {
          const before=await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY);
          await page.locator('[data-backup-restore]').setInputFiles({name:check+'.json',mimeType:'application/json',buffer:Buffer.from(value)});
          await page.waitForTimeout(250);
          const after=await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY);
          const status=await page.locator('[data-settings-status]').textContent();
          add(name,check+'-ui-rejection',before===after&&!/Backup restored/i.test(status)?'PASS':'FAIL',{sameBytes:before===after,status});
        }
        const restoring={...payload,state:{...payload.state,profile:{...payload.state.profile,name:'Disposable restored backup'}}};
        await page.locator('[data-backup-restore]').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(restoring))});
        await page.waitForTimeout(300);
        const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
        const status=await page.locator('[data-settings-status]').textContent();
        add(name,'valid-current-ui-restore',restored.profile.name==='Disposable restored backup'&&/Backup restored/i.test(status)?'PASS':'FAIL',{name:restored.profile.name,status});
      }
      add(name,'runtime-page-errors',errors.length?'FAIL':'PASS',errors);
    }catch(error){add(name,'probe-execution','BLOCKED',{message:String(error),errors});}
    finally{await context.close();}
  }
} finally { await browser.close(); }
const counts = Object.fromEntries(['PASS', 'FAIL', 'NOTE', 'BLOCKED'].map(s => [s, cases.filter(c => c.status === s).length]));
console.log(JSON.stringify({ engine, counts, cases }, null, 2));
process.exitCode = counts.FAIL || counts.BLOCKED ? 1 : 0;
