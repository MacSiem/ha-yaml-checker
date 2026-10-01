const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

function card() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously', url: 'http://localhost/'
  });
  dom.window.eval(readFileSync(path.join(__dirname, '..', 'ha-yaml-checker.js'), 'utf8'));
  const Card = dom.window.customElements.get('ha-yaml-checker');
  const instance = new Card();
  instance._updateTab = () => {};
  return { instance, dom };
}

test('failed native config check never becomes PASS through a service acknowledgement', async () => {
  const { instance, dom } = card();
  let serviceCalls = 0;
  instance._hass = {
    callApi: async () => { throw new Error('unavailable'); },
    callService: async () => { serviceCalls++; },
  };
  await instance._runConfigCheck();
  assert.equal(instance._checkResult.ok, null);
  assert.equal(instance._checkResult.apiError, true);
  assert.equal(serviceCalls, 0);
  dom.window.close();
});

test('valid HA top-level automation and script keys are not called deprecated', () => {
  const { instance, dom } = card();
  const advice = instance._validateYAML('automation: !include automations.yaml\nscript: !include scripts.yaml\n');
  assert.equal([...advice.errors, ...advice.warnings].some(row => /Deprecated: (automation|script):/.test(row.msg)), false);
  dom.window.close();
});

test('unreadable automation configs cannot be reported as clean references', async () => {
  const { instance, dom } = card();
  instance._hass = {
    user: { is_admin: true },
    states: { 'automation.test': { entity_id: 'automation.test', state: 'on', attributes: {} } },
    callWS: async () => { throw new Error('not_found'); },
  };
  await instance._runEntityValidation();
  assert.equal(instance._entityResult.unreadableAutomations, 1);
  assert.equal(instance._entityResult.totalAutomations, 1);
  assert.equal(instance._entityResult.scriptConfigStatus, 'unsupported');
  dom.window.close();
});

test('syntax response is separate from heuristic lint and uses the integration endpoint', async () => {
  const { instance, dom } = card();
  const calls = [];
  instance._hass = {
    config: { components: ['ha_yaml_checker'] }, user: { is_admin: true },
    callWS: async message => {
      calls.push(message);
      return { schema: 'ha-yaml-syntax-v1', status: 'invalid', line: 2, column: 4 };
    },
  };
  await instance._runPasteValidation('a: [invalid\n');
  assert.equal(calls[0].type, 'ha_yaml_checker/check_syntax');
  assert.equal(instance._pasteSyntax.status, 'invalid');
  assert.equal(instance._pasteSyntax.line, 2);
  dom.window.close();
});

test('system inventory reads native WebSocket registries, not nonexistent REST routes', async () => {
  const { instance, dom } = card();
  const calls = [];
  instance._hass = {
    callWS: async message => { calls.push(message.type); return [{}, {}]; },
    callApi: async (_method, route) => route === 'config' ? { version: '2026.9.3' } : '',
  };
  await instance._runFileScan();
  assert.deepEqual(calls.sort(), ['config/area_registry/list', 'config/device_registry/list', 'config/entity_registry/list']);
  assert.equal(instance._scanResult.entityCount, 2);
  dom.window.close();
});

test('server file statuses are kept separate from HA config validity', async () => {
  const { instance, dom } = card();
  instance._hass = {
    user: { is_admin: true }, config: { components: ['ha_yaml_checker'] },
    callWS: async message => message.type === 'ha_yaml_checker/scan_files'
      ? { schema: 'ha-yaml-file-scan-v1', scope: 'top_level_syntax_only', files: [
        { file: 'configuration.yaml', status: 'pass' },
        { file: 'automations.yaml', status: 'fail', line: 2, column: 4 },
        { file: 'secrets.yaml', status: 'skipped', reason: 'secret_file' },
      ] } : [],
    callApi: async (_method, route) => route === 'config' ? { version: '2026.9.3' } : '',
  };
  await instance._runFileScan();
  const rows = Object.fromEntries(instance._scanResult.files.map(row => [row.path, row]));
  assert.equal(rows['configuration.yaml'].status, 'pass');
  assert.equal(rows['automations.yaml'].status, 'fail');
  assert.equal(rows['secrets.yaml'].status, 'skipped');
  assert.equal(instance._checkResult, null);
  dom.window.close();
});


test('nested YAML values and indentless sequences are not empty-key warnings', () => {
  const { instance, dom } = card();
  for (const yaml of [
    'homeassistant:\n  name: "HA Tools QA YAML"\n',
    'homeassistant:\n  # comment\n\n  customize:\n    sensor.example:\n      friendly_name: Example\n',
    'automation:\n- alias: Example\n  trigger: []\n  action: []\n',
  ]) {
    const advice = instance._validateYAML(yaml);
    assert.equal(advice.warnings.some(row => /Empty value|Pusta warto/.test(row.msg)), false, yaml);
  }
  for (const yaml of ['foo:\nbar: value\n', 'foo:\n# only comment\n', 'parent:\n  foo:\n  bar: value\n']) {
    const advice = instance._validateYAML(yaml);
    assert.equal(advice.warnings.some(row => /Empty value|Pusta warto/.test(row.msg)), true, yaml);
  }
  dom.window.close();
});


test('configured title is rendered as escaped text and defaults to YAML Checker', () => {
  const { instance, dom } = card();
  const title = 'HA Tools QA '+('long label '.repeat(12))+'<img src=x onerror=alert(1)>';
  instance.setConfig({ title });
  instance.shadowRoot.innerHTML = instance._html();
  assert.equal(instance.shadowRoot.querySelector('h2').textContent, title);
  assert.equal(instance.shadowRoot.querySelector('h2 img'), null);
  instance.setConfig({});
  instance.shadowRoot.innerHTML = instance._html();
  assert.equal(instance.shadowRoot.querySelector('h2').textContent, 'YAML Checker');
  dom.window.close();
});
