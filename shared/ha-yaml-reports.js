// Reviewed YAML Checker report policy. No raw objects, arbitrary strings or recursive redaction.
function csvCell(value) {
  let text = typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  if (/^[\s\uFEFF]*[=+@-]/u.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function createYamlReports({now = () => Date.now(), monotonic = () => performance.now()} = {}) {
  const definitions = {
    config: {method:'POST config/core/check_config',source:'ha_native_validator',metrics:['checks','errors','warnings','skipped','notChecked'],
      en:'Native HA validator response only; no YAML, configuration, messages, paths or component names.',
      pl:'Tylko odpowiedź natywnego walidatora HA; bez YAML, konfiguracji, komunikatów, ścieżek i nazw komponentów.'},
    entities: {method:'explicit automation/config and states snapshot',source:'ha_automation_and_state_snapshot',metrics:['checks','entities','automations','scripts','checkedReferences','errors','duplicateIds','problemStates','unnamedEntities','undescribedAutomations','skipped','notChecked'],
      en:'Automation references and state snapshot only; script configuration unsupported; unnamed entities capped at 50. No IDs, aliases, names or configuration.',
      pl:'Tylko odwołania automatyzacji i migawka stanów; konfiguracja skryptów nieobsługiwana; encje bez nazw ograniczone do 50. Bez ID, aliasów, nazw i konfiguracji.'},
    files: {method:'explicit registry/log counts and ha_yaml_checker/scan_files',source:'ha_registry_and_top_level_syntax',metrics:['files','checks','errors','skipped','notChecked','entities','devices','areas','logErrors','logWarnings','components'],
      en:'Top-level syntax only; includes and secrets are not validated; registry/log counts may be unavailable. fileSlot follows the 1-based top-level list shown by the checker; locations cover observed diagnostics only, capped at 500. No file paths, log content, HA address or configuration.',
      pl:'Tylko składnia plików głównych; dołączenia i sekrety nie są walidowane; liczniki rejestrów/logów mogą być niedostępne. fileSlot to pozycja od 1 na liście plików głównych karty; lokalizacje obejmują tylko zaobserwowane diagnozy, limit 500. Bez ścieżek, treści logów, adresu HA i konfiguracji.'},
    paste: {method:'explicit local heuristics and ha_yaml_checker/check_syntax',source:'local_heuristics_and_optional_ha_syntax',metrics:['checks','lines','errors','warnings','syntaxErrors','skipped','notChecked'],
      en:'Local heuristic counts (errors/warnings) plus optional HA syntax parser (syntaxErrors is the first parser diagnostic); no schema/integration validation or included files. Available line/column numbers cover observed diagnostics only, capped at 500. No pasted YAML or diagnostic messages.',
      pl:'Liczniki lokalnych heurystyk (errors/warnings) i opcjonalny parser składni HA (syntaxErrors to pierwsza diagnoza parsera); bez walidacji schematu/integracji i dołączonych plików. Dostępne numery wiersza/kolumny obejmują tylko zaobserwowane diagnozy, limit 500. Bez wklejonego YAML i komunikatów diagnostycznych.'},
    template: {method:'POST template',source:'ha_template_invocation',metrics:['checks','errors','skipped','notChecked'],
      en:'Template API invocation status only; does not validate configuration or template semantics. No template input, output or error message.',
      pl:'Tylko status wywołania API szablonów; nie waliduje konfiguracji ani znaczenia szablonu. Bez treści, wyniku i komunikatu błędu szablonu.'},
  };
  const count = v => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
  const length = v => Array.isArray(v) ? v.length : null;
  const messages = v => v === null ? 0 : v === undefined ? null : typeof v === 'string' ? v.split('\n').filter(x=>x.trim()).length : Array.isArray(v) ? v.length : null;
  let epoch=0, ordinal=0;
  const observations = new Map();
  const nullMetrics = scope => Object.fromEntries(definitions[scope].metrics.map(key=>[key,null]));
  function begin(scope) {
    if (!Object.hasOwn(definitions,scope)) throw new TypeError('Unknown reviewed scope');
    const token=Object.freeze({scope,epoch,ordinal:++ordinal,started:monotonic()});
    observations.set(scope,{token,phase:'pending',status:'not_checked',observedAt:null,metrics:nullMetrics(scope),timing:null});
    return token;
  }
  // Numeric locations only; coverage concerns observed diagnostics, never full validity.
  // fileSlot is a 1-based position in the card's top-level file list, never a path/name.
  function projectLocations(scope, result) {
    const positive = value => Number.isSafeInteger(value) && value > 0 ? value : null;
    if (!['files','paste'].includes(scope)) return {locations:null,locationCoverage:'unavailable'};
    let locations=[], expected=0, complete=true;
    const add = (kind, row, fileSlot=null) => {
      expected++;
      const line=positive(row?.line),column=positive(row?.column);
      if(line!==null && locations.length<500) locations.push({kind,fileSlot,line,column});
    };
    if(scope==='files') {
      if(result.error || !Array.isArray(result.files) || !result.files.some(row=>['pass','fail'].includes(row?.status))) return {locations:null,locationCoverage:'unavailable'};
      result.files.forEach((row,index)=>{if(row?.status==='fail')add('syntax',row,index+1);});
    } else {
      const syntax=result.syntax?.status;
      if(syntax==='invalid')add('syntax',result.syntax);
      else if(syntax!=='valid')complete=false;
      for(const [key,kind] of [['errors','heuristic_error'],['warnings','heuristic_warning']]) {
        const rows=result.heuristic?.[key];
        if(Array.isArray(rows))rows.forEach(row=>add(kind,row));else complete=false;
      }
    }
    if(expected!==locations.length)complete=false;
    return {locations,locationCoverage:complete?'complete':'partial'};
  }
  function finish(token,result) {
    if (!token || token.epoch!==epoch || observations.get(token.scope)?.token!==token) return false;
    const r=result && typeof result==='object' ? result : {},scope=token.scope,m=nullMetrics(scope);
    let status='unconfirmed';
    if (scope==='config') {
      if (r.ok===true || r.ok===false) {
        status=r.ok ? 'success':'error';m.checks=1;m.errors=messages(r.raw?.errors);m.warnings=messages(r.raw?.warnings);m.skipped=0;m.notChecked=0;
      }
    } else if (scope==='entities' && !r.error && count(r.totalEntities)!==null) {
      m.entities=count(r.totalEntities);m.automations=count(r.totalAutomations);m.scripts=count(r.totalScripts);m.checkedReferences=count(r.checkedCount);
      m.errors=length(r.broken);m.duplicateIds=length(r.dupIds);m.problemStates=length(r.problemStates);m.unnamedEntities=length(r.noFriendlyName);m.undescribedAutomations=length(r.autoNoDesc);
      m.skipped=count(r.unreadableAutomations);m.notChecked=count(r.totalScripts);
      m.checks=m.automations!==null && m.skipped!==null && m.skipped<=m.automations ? m.automations-m.skipped : null;
      status=m.checks===null || m.errors===null || m.duplicateIds===null || m.skipped===null || m.notChecked===null || m.problemStates===null || m.unnamedEntities===null || m.undescribedAutomations===null ? 'unconfirmed'
        : m.errors>0 || m.duplicateIds>0 ? 'error' : m.skipped>0 || m.notChecked>0 || m.problemStates>0 || m.unnamedEntities>0 || m.undescribedAutomations>0 ? 'partial' : 'success';
    } else if (scope==='files' && !r.error && Array.isArray(r.files)) {
      m.files=r.files.length;m.checks=r.files.filter(f=>f?.status==='pass'||f?.status==='fail').length;
      m.errors=r.files.filter(f=>f?.status==='fail').length;m.skipped=r.files.filter(f=>f?.status==='skipped').length;
      m.notChecked=m.files-m.checks-m.skipped;
      if(m.checks===0)m.errors=null;
      if(m.checks===0 && m.notChecked===m.files)m.skipped=null;
      for (const [key,input] of [['entities','entityCount'],['devices','deviceCount'],['areas','areaCount'],['logErrors','logErrors'],['logWarnings','logWarnings'],['components','components']]) m[key]=count(r[input]);
      status=m.errors>0?'error':m.checks===0?'unconfirmed':m.skipped>0||m.notChecked>0||['entities','devices','areas','logErrors','logWarnings','components'].some(k=>m[k]===null)?'partial':'success';
    } else if (scope==='paste') {
      const syntax=r.syntax?.status;
      m.syntaxErrors=syntax==='invalid'?1:syntax==='valid'?0:null;
      m.lines=count(r.heuristic?.lineCount);m.errors=length(r.heuristic?.errors);m.warnings=length(r.heuristic?.warnings);
      m.checks=['valid','invalid'].includes(syntax)?1:0;m.skipped=syntax==='unsupported'?1:0;m.notChecked=m.checks===0?1:0;
      status=syntax==='invalid'?'error':syntax==='valid'?(m.lines===null||m.errors===null||m.warnings===null?'unconfirmed':m.errors>0||m.warnings>0?'partial':'success'):syntax==='unsupported'?'partial':'unconfirmed';
    } else if (scope==='template' && typeof r.ok==='boolean') {
      // Success means only observed API completion, never template semantic validity.
      status=r.ok?'success':'error';m.checks=1;m.errors=r.ok?0:1;m.skipped=0;m.notChecked=0;
    }
    observations.set(scope,{token,phase:'observed',status,observedAt:new Date(now()).toISOString(),metrics:m,...projectLocations(scope,r),
      timing:{durationMs:Math.max(0,Math.round(monotonic()-token.started)),checkOrdinal:token.ordinal}});
    return true;
  }
  function invalidate(scope) {
    // Deleting one scope removes its token permanently; unrelated completed checks remain useful.
    if(scope) observations.delete(scope);else {epoch++;observations.clear();}
  }
  function cancelPending() {
    epoch++;
    for(const [scope,row] of observations)if(row.phase==='pending')observations.delete(scope);
  }
  const hasObserved = () => Array.from(observations.values()).some(row=>row.phase==='observed');
  function build({format,includePrivate=false,language='en'}={}) {
    if (!['json','csv','txt'].includes(format)) throw new TypeError('Unsupported reviewed format');
    const pl=String(language).startsWith('pl'),lang=pl?'pl':'en';
    const sourceLimit=pl?'Tylko wyniki zaobserwowanych, jawnie uruchomionych kontroli. To częściowy raport, nie potwierdzenie poprawności całej konfiguracji. null oznacza brak pomiaru; brak i oczekiwanie nie są sukcesem.':'Only observed, explicitly started checks. This is a partial report, not confirmation that the full configuration is valid. null means no measurement; missing and pending are not success.';
    const checks=Object.entries(definitions).map(([scope,d])=>{
      const row=observations.get(scope),data={scope,method:d.method,source:d.source,timeSource:'frontend_observed_utc',phase:row?.phase||'missing',observedAt:row?.observedAt||null,status:row?.status||'not_checked',metrics:row?{...row.metrics}:nullMetrics(scope),limitations:d[lang],locations:row?.locations??null,locationCoverage:row?.locationCoverage||'unavailable'};
      if(includePrivate && row?.timing)data.timing={durationMs:row.timing.durationMs,checkOrdinal:row.timing.checkOrdinal};
      return data;
    });
    const report={schema:'ha-yaml-report-v1',status:'partial',sourceLimit,checks};
    let serialized;
    if(format==='json')serialized=JSON.stringify(report,null,2)+'\n';
    else {
      // Fixed schema: no caller-supplied keys, names or object coercion.
      const rows=[['schema','status','sourceLimit','scope','method','source','timeSource','phase','observedAt','resultState','metric','value','limitations','durationMs','checkOrdinal','locationKind','fileSlot','line','column','locationCoverage']];
      for(const row of checks) {
        const prefix=[report.schema,report.status,sourceLimit,row.scope,row.method,row.source,row.timeSource,row.phase,row.observedAt,row.status];
        for(const [metric,value]of Object.entries(row.metrics))rows.push([...prefix,metric,value===null?'null':value,row.limitations,row.timing?.durationMs??'',row.timing?.checkOrdinal??'','','','','',row.locationCoverage]);
        for(const location of row.locations||[])rows.push([...prefix,'location','observed',row.limitations,row.timing?.durationMs??'',row.timing?.checkOrdinal??'',location.kind,location.fileSlot??'',location.line,location.column??'null',row.locationCoverage]);
      }
      serialized=format==='csv'?rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'
        :rows.map(row=>row.map(v=>v===null?'null':String(v)).join('\t')).join('\n')+'\n';
    }
    const included=[pl?'Metoda, źródło, czas UTC obserwacji, zakres, status W4, sprawdzone liczniki i dostępne numery lokalizacji diagnostycznych (maksymalnie 500 na zakres).':'Method, source, observed UTC time, scope, W4 status, reviewed counts and available numeric diagnostic locations (maximum 500 per scope).'];
    included.push(includePrivate?(pl?'Opcjonalnie: zmierzony czas trwania i lokalny numer jawnej kontroli.':'Optional: measured duration and local explicit-check ordinal.'):(pl?'Dodatkowe metadane czasu i kolejności wyłączone.':'Additional timing and sequence metadata off.'));
    const excluded=[pl?'YAML, treść/wynik szablonu, surowe błędy, konfiguracja, tokeny, użytkownicy, adresy, identyfikatory, nazwy i ścieżki.':'YAML, template input/output, raw errors, configuration, tokens, users, addresses, identifiers, names and paths.'];
    return {serialized,confirmed:hasObserved(),sourceConfirmed:hasObserved(),status:'partial',included,excluded,sourceLimit};
  }
  return Object.freeze({begin,finish,invalidate,cancelPending,hasObserved,build});
}
// Node tests use the canonical factory; this line is excluded from runtime copies.
if (typeof module !== 'undefined' && module.exports) module.exports = { createYamlReports, csvCell };
