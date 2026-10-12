// Source-first contract: a raw result dump, fabricated zero or stale completion must fail these tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
const { createYamlReports, csvCell } = require('../shared/ha-yaml-reports.js');
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve=r; }); return {promise,resolve}; };
const scopes = ['config','entities','files','paste','template'];
const poison = '=CANARY_secret@example.com /private/path {{ secrets.token }}';
function reports() {
  let time=Date.UTC(2026,9,12,12);
  return createYamlReports({ now: () => time++, monotonic: () => time++ });
}
function fixture(language='en') {
  const dom = new JSDOM('<!doctype html><body></body>', {runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true});
  dom.window.eval(fs.readFileSync(path.join(__dirname,'../ha-yaml-checker.js'),'utf8'));
  const card=dom.window.document.createElement('ha-yaml-checker');
  card.setConfig({type:'custom:ha-yaml-checker',show_support:false}); dom.window.document.body.append(card);
  let calls=0;
  const hass={language,user:{id:'qa',is_admin:true},connection:{connected:true},states:{},config:{components:['ha_yaml_checker']},
    callApi:async()=>{calls++;return {result:'valid',errors:null,warnings:null};},callWS:async()=>{calls++;return [];}};
  card.hass=hass;
  return {dom,card,hass,calls:()=>calls};
}
function dialog(card) {return card.shadowRoot.querySelector('[data-ha-tools-export]')?.shadowRoot;}
function node(card,key) {return dialog(card)?.querySelector(`[data-export="${key}"]`);}
async function open(card) {card.shadowRoot.querySelector('#btn-export-report').click();await flush();}
function change(card,key,value) {const el=node(card,key); if(key==='private')el.checked=value;else el.value=value;el.dispatchEvent(new el.ownerDocument.defaultView.Event(key==='filename'?'input':'change'));}
function finish(r,scope,result) {const token=r.begin(scope); r.finish(token,result);}

test('report covers all methods and separates missing, failed and pending measurements',()=>{
 const r=reports();assert.equal(r.hasObserved(),false);
 finish(r,'config',{ok:null,apiError:true,raw:{errors:poison}});
 r.begin('template');
 const data=JSON.parse(r.build({format:'json',includePrivate:false,language:'en'}).serialized);
 assert.deepEqual(data.checks.map(row=>row.scope),scopes);
 assert.equal(data.checks[0].status,'unconfirmed');assert.equal(data.checks[0].metrics.errors,null);
 assert.equal(data.checks[1].status,'not_checked');assert.equal(data.checks[1].observedAt,null);
 assert.equal(data.checks[4].phase,'pending');assert.equal(data.checks[4].status,'not_checked');
 assert.equal(data.status,'partial');assert.match(data.sourceLimit,/observed|Observed/);
 assert.ok(data.checks.every(row=>row.method && row.source && row.timeSource && row.limitations));
});

test('only reviewed metrics leave the report under either private mode and every format',()=>{
 const r=reports();
 finish(r,'config',{ok:false,errors:[{message:poison}],warnings:[],raw:{errors:poison,warnings:null},ts:poison});
 finish(r,'entities',{totalEntities:7,totalAutomations:3,totalScripts:2,unreadableAutomations:1,checkedCount:2,broken:[{entity:poison}],dupIds:[{alias:poison}],problemStates:[{name:poison}],noFriendlyName:[poison],autoNoDesc:[{id:poison}],domainCounts:{[poison]:42},rawconfig:poison});
 finish(r,'files',{files:[{path:poison,status:'pass'},{path:poison,status:'fail'},{path:poison,status:'skipped'},{path:poison,status:'unknown'}],entityCount:0,deviceCount:null,areaCount:'0',logErrors:poison,logWarnings:0,components:2,haVersion:poison,configDir:poison});
 finish(r,'paste',{syntax:{status:'invalid',error:poison},heuristic:{errors:[{msg:poison}],warnings:[],lineCount:9},value:poison});
 finish(r,'template',{ok:true,value:poison,error:poison});
 for(const includePrivate of [false,true])for(const format of ['json','csv','txt']) {
  const result=r.build({format,includePrivate,language:'en'});
  assert.equal(result.confirmed,true);assert.equal(result.sourceConfirmed,true);
  assert.doesNotMatch(result.serialized,/CANARY|private\/path|secrets.token|secret@example/);
  assert.match(result.serialized,/top_level|Top-level/);assert.ok(result.excluded.length>0);
 }
 const data=JSON.parse(r.build({format:'json',includePrivate:false,language:'en'}).serialized);
 const f=data.checks.find(row=>row.scope==='files');
 assert.equal(f.metrics.entities,0);assert.equal(f.metrics.devices,null);assert.equal(f.metrics.areas,null);
 assert.equal(f.metrics.errors,1);assert.equal(f.metrics.skipped,1);assert.equal(f.metrics.notChecked,1);
 assert.equal(data.checks[1].status,'error');assert.equal(data.checks[3].status,'error');
 assert.equal(Object.hasOwn(data.checks[0],'timing'),false);
 const privateData=JSON.parse(r.build({format:'json',includePrivate:true,language:'en'}).serialized);
 assert.ok(privateData.checks[0].timing.durationMs>=0);assert.ok(privateData.checks[0].timing.checkOrdinal>0);
 assert.deepEqual(Object.keys(privateData.checks[0].timing),['durationMs','checkOrdinal']);
});

for(const raw of [0,false,{},[{}],null])test(`unknown configuration result and nonstring messages stay unknown (${JSON.stringify(raw)})`,()=>{
 const r=reports();finish(r,'config',{ok:null,raw:{errors:raw,warnings:raw}});
 const row=JSON.parse(r.build({format:'json',language:'en'}).serialized).checks[0];
 assert.equal(row.status,'unconfirmed');assert.equal(row.metrics.errors,null);assert.equal(row.metrics.warnings,null);
});

test('zero is observed only in a confirmed method response; null is never manufactured zero',()=>{
 const r=reports();finish(r,'config',{ok:true,raw:{errors:null,warnings:null}});
 let data=JSON.parse(r.build({format:'json',language:'en'}).serialized);
 assert.equal(data.checks[0].metrics.errors,0);assert.equal(data.checks[1].metrics.errors,null);
 finish(r,'config',{ok:false,raw:{errors:{secret:poison},warnings:42}});
 data=JSON.parse(r.build({format:'json',language:'en'}).serialized);
 assert.equal(data.checks[0].metrics.errors,null);assert.equal(data.checks[0].status,'error');
});

for(const text of ['=1+1','+cmd','-1','@SUM(A1)','\t=1','\r+cmd',' \n=1'])test(`CSV formula canary ${JSON.stringify(text)}`,()=>{
 assert.ok(csvCell(text).startsWith('"\''));
});
test('CSV escaping handles nonstrings, quotes and safe numeric zero',()=>{
 assert.equal(csvCell(0),'"0"');assert.equal(csvCell(null),'""');assert.equal(csvCell({token:poison}),'""');assert.equal(csvCell('a"b'),'"a""b"');
});

test('monotonic report epochs discard late completions including a restored source',()=>{
 const r=reports(),a=r.begin('config');r.invalidate('config');const b=r.begin('config');
 assert.equal(r.finish(a,{ok:true,raw:{errors:null,warnings:null}}),false);
 assert.equal(r.finish(b,{ok:false,raw:{errors:poison}}),true);
 const c=r.begin('template');r.invalidate();assert.equal(r.finish(c,{ok:true,value:poison}),false);assert.equal(r.hasObserved(),false);
});

test('opening missing result is inert and cannot export or trigger API/check/settings writes',async()=>{
 const f=fixture();try{
  const {card,dom}=f;dom.window.localStorage.setItem('unrelated-settings','keep');const before=dom.window.localStorage.length;
  await open(card);assert.equal(f.calls(),0);assert.equal(node(card,'save').disabled,true);
  assert.equal(node(card,'private').checked,false);assert.equal(dom.window.localStorage.length,before);
  assert.equal(dom.window.localStorage.getItem('unrelated-settings'),'keep');
  node(card,'cancel').click();assert.equal(dialog(card),undefined);
  assert.equal(card.shadowRoot.activeElement.id,'btn-export-report');
 }finally{f.dom.window.close();}
});

test('native observed config export consumes the exact preview Blob once, reports initiated Unconfirmed',async()=>{
 const f=fixture();try{
  const {card,dom}=f;await card._runConfigCheck();const count=f.calls();
  let blob,downloads=0;dom.window.URL.createObjectURL=b=>{blob=b;return 'blob:qa';};dom.window.URL.revokeObjectURL=()=>{};
  dom.window.HTMLAnchorElement.prototype.click=function(){downloads++;};
  await open(card);const content=node(card,'preview').textContent;assert.ok(content);node(card,'save').click();node(card,'save').click();await flush();
  assert.equal(downloads,1);assert.equal(f.calls(),count);
  const text=await new Promise(resolve=>{const reader=new dom.window.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});
  assert.equal(text,content);assert.equal(node(card,'status').dataset.resultState,'unconfirmed');
  assert.match(node(card,'message').textContent,/filesystem is not confirmed/);assert.equal(node(card,'save').disabled,true);
 }finally{f.dom.window.close();}
});

for(const boundary of ['role','connection','offline','source','locale','disconnect','config'])test(`consumer invalidates bytes/consent and ignores late result at ${boundary}`,async()=>{
 const f=fixture();try{
  const {card,hass,dom}=f;await card._runConfigCheck();await open(card);change(card,'private',true);node(card,'refresh').click();await flush();
  const pending=deferred();card.hass={...hass,callApi:()=>pending.promise};const check=card._runConfigCheck();
  if(boundary==='role')card.hass={...hass,user:{id:'other',is_admin:false}};
  if(boundary==='connection')card.hass={...hass,connection:{connected:true}};
  if(boundary==='offline'){hass.connection.connected=false;card.hass={...hass};}
  if(boundary==='source'){card._updateTab('paste-validate');const ta=card.shadowRoot.querySelector('#yaml-input');ta.value=poison;ta.dispatchEvent(new dom.window.Event('input'));}
  if(boundary==='locale')card.hass={...hass,language:'pl'};
  if(boundary==='disconnect')card.remove();
  if(boundary==='config')card.setConfig({type:'custom:ha-yaml-checker',title:'Changed'});
  const preview=node(card,'preview');if(preview)assert.equal(preview.textContent,'');
  if(node(card,'private'))assert.equal(node(card,'private').checked,false);
  pending.resolve({result:'valid',errors:null,warnings:null});await check;
  if(boundary!=='source')assert.equal(card._yamlReports.hasObserved(),false);
 }finally{f.dom.window.close();}
});

test('pending download blocks reopen, refresh and duplicate Save until adapter settles',async()=>{
 const f=fixture();try{
  const {card}=f;await card._runConfigCheck();let writes=0;const pending=deferred();
  card._downloadYamlReport=()=>{writes++;return pending.promise;};await open(card);node(card,'save').click();
  node(card,'cancel').click();await open(card);assert.equal(node(card,'refresh').disabled,true);node(card,'save').click();assert.equal(writes,1);
  pending.resolve({outcome:'initiated'});await flush();assert.equal(node(card,'save').disabled,true);
 }finally{f.dom.window.close();}
});

for(const language of ['en','pl'])test(`dialog language, safe formats, Escape and focus trap (${language})`,async()=>{
 const f=fixture(language);try{
  const {card,dom}=f;await card._runConfigCheck();await open(card);
  assert.deepEqual(Array.from(node(card,'format').options,x=>x.value),['json','csv','txt']);
  assert.equal(node(card,'private').checked,false);
  assert.equal(node(card,'save').textContent,language==='pl'?'Zapisz':'Save');
  node(card,'cancel').focus();node(card,'cancel').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,composed:true,cancelable:true}));
  assert.equal(dialog(card).activeElement,node(card,'filename'));
  node(card,'filename').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,composed:true,cancelable:true}));
  assert.equal(dialog(card),undefined);assert.equal(card.shadowRoot.activeElement.id,'btn-export-report');
 }finally{f.dom.window.close();}
});

test('paste, template, guide, native checks and old namespace state remain available after export',async()=>{
 const f=fixture();try{
  const {card,dom}=f;dom.window.localStorage.setItem('other-card-settings','stay');await card._runConfigCheck();await open(card);node(card,'cancel').click();
  for(const tab of ['config-check','entity-validator','file-scanner','paste-validate','template-tester','common-issues']){card._updateTab(tab);assert.equal(card._activeTab,tab);assert.ok(card.shadowRoot.querySelector(`[data-tab="${tab}"]`));}
  assert.ok(card.shadowRoot.querySelector('#btn-export-report'));assert.equal(dom.window.localStorage.getItem('other-card-settings'),'stay');
  assert.ok(dom.window.localStorage.getItem('ha-tools-yaml-checker-settings'));assert.equal(dom.window.createExportDialog,undefined);
 }finally{f.dom.window.close();}
});

test('reviewed W4/W6 vendors and integration mirror have exact source/runtime provenance',()=>{
 const root=path.join(__dirname,'..'),meta=JSON.parse(fs.readFileSync(path.join(root,'shared/yaml-report-provenance.json'),'utf8'));
 const card=fs.readFileSync(path.join(root,'ha-yaml-checker.js'),'utf8');
 assert.equal(card,fs.readFileSync(path.join(root,'custom_components/ha_yaml_checker/www/ha-yaml-checker.js'),'utf8'));
 for(const [name,file,transform] of [['HA TOOLS UI V3','ha-tools-ui.js',s=>s.split('// Node tests use the canonical factory;')[0].trimEnd()],['HA TOOLS EXPORT V3','ha-tools-export.js',s=>s.replace('export function createExportDialog','function createExportDialog').trimEnd()],['HA YAML REPORTS V1','ha-yaml-reports.js',s=>s.split('// Node tests use the canonical factory;')[0].trimEnd()]]) {
  const source=fs.readFileSync(path.join(root,'shared',file),'utf8'),digest=crypto.createHash('sha256').update(source).digest('hex');
  assert.equal(digest,meta.files['shared/'+file].sourceSha256);
  assert.ok(card.includes('// BEGIN '+name+' source-sha256='+digest+'\n'+transform(source)+'\n// END '+name));
 }
 assert.equal(meta.files['shared/ha-tools-export.js'].sourceSha256,'1f9e9c5444ec3b6de44eec136f14ae9e7d89dae1002650b33f746ab9633982f1');
});


// Supplemental contracts written before their consumer guards.
test('connection events invalidate an export immediately even before a new hass assignment',async()=>{
 const f=fixture();try{
  const {card,hass}=f,callbacks=new Map();
  const connection={connected:true,addEventListener:(key,fn)=>callbacks.set(key,fn),removeEventListener:(key,fn)=>{if(callbacks.get(key)===fn)callbacks.delete(key);}};
  card.hass={...hass,connection};await card._runConfigCheck();await open(card);
  change(card,'private',true);node(card,'refresh').click();await flush();
  connection.connected=false;callbacks.get('disconnected')();
  assert.equal(node(card,'preview').textContent,'');assert.equal(node(card,'private').checked,false);assert.equal(node(card,'save').disabled,true);
  connection.connected=true;callbacks.get('ready')();assert.equal(card._yamlReports.hasObserved(),false);
  card.remove();assert.equal(callbacks.size,0);
 }finally{f.dom.window.close();}
});

test('changed syntax provider cannot resurrect an older observed source',async()=>{
 const f=fixture();try{
  const {card,hass}=f;await card._runConfigCheck();await open(card);
  card.hass={...hass,config:{components:[]}};
  assert.equal(card._yamlReports.hasObserved(),false);assert.equal(dialog(card),undefined);
 }finally{f.dom.window.close();}
});

test('malformed metric response cannot turn the entity or paste checks green',()=>{
 const r=reports();finish(r,'entities',{totalEntities:0,totalAutomations:0,totalScripts:0,unreadableAutomations:0,checkedCount:0,broken:[],dupIds:[],problemStates:[{name:poison}],noFriendlyName:[],autoNoDesc:[]});
 finish(r,'paste',{syntax:{status:'valid'},heuristic:null});
 const data=JSON.parse(r.build({format:'json',language:'en'}).serialized);
 assert.equal(data.checks[1].status,'partial');assert.equal(data.checks[3].status,'unconfirmed');
 assert.equal(data.checks[1].metrics.checks,0);
});

for(const format of ['json','csv','txt'])for(const includePrivate of [false,true])test(`actual W6 consumer previews/downloads reviewed ${format} (${includePrivate}) without more API`,async()=>{
 const f=fixture();try{
  const {card,dom}=f;await card._runConfigCheck();const before=f.calls();let blob,writes=0;
  dom.window.URL.createObjectURL=b=>{blob=b;return 'blob:safe';};dom.window.URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=()=>{writes++;};
  await open(card);change(card,'format',format);change(card,'filename','observed.'+format);change(card,'private',includePrivate);node(card,'refresh').click();await flush();
  const preview=node(card,'preview').textContent;assert.ok(preview.includes('ha-yaml-report-v1'));assert.doesNotMatch(preview,/CANARY/);
  node(card,'save').click();await flush();assert.equal(writes,1);assert.equal(f.calls(),before);
  const text=await new Promise(resolve=>{const reader=new dom.window.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});assert.equal(text,preview);
 }finally{f.dom.window.close();}
});

test('native entity/files/paste/template adapters capture their actual observed outcomes without payload content',async()=>{
 const f=fixture();try{
  const {card,hass}=f;
  card.hass={...hass,states:{'automation.qa':{state:'on',attributes:{friendly_name:poison}},'sensor.qa':{state:'unknown',attributes:{friendly_name:poison}}},
   callApi:async(method,target)=>target==='template'?poison:target==='error_log'?'ERROR '+poison:target==='config'?{version:poison,config_dir:poison,components:[]}: {},
   callWS:async msg=>msg.type==='automation/config'?{config:{id:poison,alias:poison,actions:[]}}:msg.type==='ha_yaml_checker/scan_files'?{schema:'ha-yaml-file-scan-v1',scope:'top_level_syntax_only',files:[{file:'configuration.yaml',status:'fail',reason:poison}]}:msg.type==='ha_yaml_checker/check_syntax'?{schema:'ha-yaml-syntax-v1',status:'invalid',error:poison}:[]};
  await card._runEntityValidation();await card._runFileScan();await card._runPasteValidation('name: '+poison);card._templateValue=poison;await card._runTemplateTester();
  const data=JSON.parse(card._yamlReports.build({format:'json',includePrivate:true,language:'en'}).serialized);
  assert.deepEqual(data.checks.slice(1).map(x=>x.phase),['observed','observed','observed','observed']);
  assert.equal(data.checks[1].metrics.entities,2);assert.equal(data.checks[2].metrics.errors,1);assert.equal(data.checks[3].status,'error');assert.equal(data.checks[4].status,'success');
  assert.doesNotMatch(JSON.stringify(data),/CANARY|secret@example|private\/path/);
 }finally{f.dom.window.close();}
});


test('unavailable file syntax never manufactures an observed zero error or skipped count',()=>{
 const r=reports();finish(r,'files',{fileSyntaxAvailable:false,files:[{status:'unknown'},{status:'unknown'}],entityCount:'?',deviceCount:null,areaCount:{},logErrors:'?',logWarnings:'?',components:null});
 const row=JSON.parse(r.build({format:'json',language:'en'}).serialized).checks[2];
 assert.equal(row.status,'unconfirmed');assert.equal(row.metrics.errors,null);assert.equal(row.metrics.skipped,null);assert.equal(row.metrics.notChecked,2);
 assert.equal(row.metrics.entities,null);assert.equal(row.metrics.devices,null);assert.equal(row.metrics.areas,null);
});
