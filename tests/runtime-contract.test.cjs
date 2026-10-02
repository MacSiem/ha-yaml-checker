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
    user: { is_admin: true },
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

test('entity references exclude service names but retain targets, templates and custom script calls', async () => {
  const { instance, dom } = card();
  instance._hass = {
    user: { is_admin: true },
    states: {
      'automation.test': { state: 'on', attributes: {} },
      'light.existing': { state: 'off', attributes: {} },
    },
    callWS: async () => ({ config: {
      alias: 'light.description_only',
      action: [
        { service: 'light.turn_on', target: { entity_id: ['light.existing', 'light.missing'] } },
        { action: 'input_boolean.turn_off', target: { entity_id: 'input_boolean.missing' } },
        { action: 'script.turn_on', target: { entity_id: 'script.missing_target' } },
        { action: 'script.missing_direct' },
        { service: 'script.missing_legacy' },
        { action: 'scene.turn_on', target: { entity_id: 'scene.missing' } },
        { condition: 'template', value_template: "{{ is_state('sensor.missing', 'on') }}" },
      ],
    } }),
  };
  await instance._runEntityValidation();
  assert.deepEqual(Array.from(instance._entityResult.broken, row => row.entity).sort(), [
    'input_boolean.missing', 'light.missing', 'scene.missing', 'script.missing_direct',
    'script.missing_legacy', 'script.missing_target', 'sensor.missing',
  ].sort());
  assert.deepEqual(Array.from(instance._entityResult.inputRefs, row => row.helper), ['input_boolean.missing']);
  assert.deepEqual(Array.from(instance._entityResult.scriptRefs, row => row.script).sort(), [
    'script.missing_direct', 'script.missing_legacy', 'script.missing_target',
  ]);
  assert.deepEqual(Array.from(instance._entityResult.sceneRefs, row => row.scene), ['scene.missing']);
  dom.window.close();
});

test('scene entity-map keys remain references without treating scene service names as entities', async () => {
  const { instance, dom } = card();
  instance._hass = {
    user: { is_admin: true },
    states: {
      'automation.test': { state: 'on', attributes: {} },
      'light.existing': { state: 'off', attributes: {} },
    },
    callWS: async () => ({ config: {
      alias: 'scene.description_only',
      action: [
        { action: 'scene.apply', data: { entities: {
          'light.existing': { state: 'on' },
          'light.missing': { state: 'off' },
          'media_player.missing': 'off',
        } } },
        { service: 'scene.create', data: {
          scene_id: 'temporary',
          entities: { 'input_boolean.missing': 'on' },
          snapshot_entities: ['sensor.missing'],
        } },
      ],
    } }),
  };
  await instance._runEntityValidation();
  assert.deepEqual(Array.from(instance._entityResult.broken, row => row.entity).sort(), [
    'input_boolean.missing', 'light.missing', 'media_player.missing', 'sensor.missing',
  ]);
  assert.deepEqual(Array.from(instance._entityResult.sceneRefs), []);
  assert.deepEqual(Array.from(instance._entityResult.inputRefs, row => row.helper), ['input_boolean.missing']);
  assert.equal(instance._entityResult.checkedCount, 1);
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

test('file heading describes available syntax results and keeps unknown fallback', async () => {
  for (const language of ['en', 'pl']) {
    const { instance, dom } = card();
    instance._lang = language;
    instance._hass = {
      user: { is_admin: true }, config: { components: ['ha_yaml_checker'] },
      callWS: async message => message.type === 'ha_yaml_checker/scan_files'
        ? { schema: 'ha-yaml-file-scan-v1', scope: 'top_level_syntax_only', files: [
          { file: 'configuration.yaml', status: 'pass' },
          { file: 'secrets.yaml', status: 'skipped', reason: 'secret_file' },
        ] } : [],
      callApi: async (_method, route) => route === 'config' ? { version: '2026.9.4' } : '',
    };
    await instance._runFileScan();
    instance.shadowRoot.innerHTML = instance._renderFileScan();
    const heading = instance.shadowRoot.querySelector('.file-list-header').textContent;
    assert.match(heading, language === 'pl' ? /składnia YAML najwyższego poziomu/ : /top-level YAML syntax/);
    assert.doesNotMatch(heading, /status unknown/);
    assert.match(instance.shadowRoot.textContent, /!include/);
    instance._hass.config.components = [];
    await instance._runFileScan();
    instance.shadowRoot.innerHTML = instance._renderFileScan();
    assert.match(instance.shadowRoot.querySelector('.file-list-header').textContent, /status unknown/);
    dom.window.close();
  }
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


test('household and unknown roles cannot run native configuration validation', async () => {
  for (const user of [{ is_admin: false }, undefined]) {
    for (const language of ['en', 'pl']) {
      const { instance, dom } = card();
      let requests = 0;
      instance._lang = language;
      instance._hass = { user, callApi: async () => { requests++; return { result: 'valid' }; } };
      instance.shadowRoot.innerHTML = instance._renderConfigCheck();
      assert.equal(instance.shadowRoot.querySelector('#btn-check').disabled, true);
      assert.match(instance.shadowRoot.textContent, language === 'pl' ? /administrator/i : /administrator/i);
      await instance._runConfigCheck();
      assert.equal(requests, 0, 'a direct or stale handler must also refuse the request');
      assert.equal(instance._checkLoading, false);
      dom.window.close();
    }
  }
});

test('an administrator retains native validation and its actual result', async () => {
  const { instance, dom } = card();
  let requests = 0;
  instance._hass = { user: { is_admin: true }, callApi: async () => { requests++; return { result: 'valid' }; } };
  instance.shadowRoot.innerHTML = instance._renderConfigCheck();
  assert.equal(instance.shadowRoot.querySelector('#btn-check').disabled, false);
  await instance._runConfigCheck();
  assert.equal(requests, 1);
  assert.equal(instance._checkResult.ok, true);
  // Authority may change after the button was rendered.
  instance._hass.user.is_admin = false;
  await instance._runConfigCheck();
  assert.equal(requests, 1);
  dom.window.close();
});


test('tab navigation updates the selected state exposed to assistive technology', () => {
  const { instance, dom } = card();
  instance.setConfig({});
  instance.shadowRoot.innerHTML = instance._html();
  // Use the production navigation handler rather than the test stub.
  const navigate = Object.getPrototypeOf(instance)._updateTab.bind(instance);
  for (const tab of ['file-scanner', 'paste-validate', 'template-tester', 'config-check']) {
    navigate(tab);
    const selected = instance.shadowRoot.querySelectorAll('[role="tab"][aria-selected="true"]');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].dataset.tab, tab);
    assert.ok(instance.shadowRoot.querySelector(`.tab-pane[data-tab="${tab}"]`));
  }
  dom.window.close();
});

// Append to existing tests/runtime-contract.test.cjs; reuses its card() helper.
test('templated action and legacy service retain literal entity dependencies without service-name false positives', async () => {
  const { instance, dom } = card();
  instance._hass = {
    user: { is_admin: true },
    states: {
      'automation.test': { state: 'on', attributes: {} },
      'switch.ac': { state: 'off', attributes: {} },
    },
    callWS: async () => ({ config: {
      alias: 'template service dependency fixture',
      actions: [
        { action: "{% if states('sensor.missing') | float(15) > 15 %} switch.turn_on {% else %} switch.turn_off {% endif %}", target: { entity_id: 'switch.ac' } },
        { service: "{% if is_state('input_boolean.missing', 'on') %} light.turn_on {% else %} light.turn_off {% endif %}" },
        { action: "{{ 'script.missing' }}" },
        { service: "{{ 'script.legacy_missing' }}" },
        { action: "{{ 'light.turn_on' }}" },
        { action: "{{ 'script.turn_on' }}", target: { entity_id: 'script.target_missing' } },
      ],
    } }),
  };
  await instance._runEntityValidation();
  assert.deepEqual(Array.from(instance._entityResult.broken, row => row.entity).sort(), [
    'input_boolean.missing', 'script.legacy_missing', 'script.missing',
    'script.target_missing', 'sensor.missing',
  ]);
  assert.equal(instance._entityResult.checkedCount, 1);
  assert.deepEqual(Array.from(instance._entityResult.scriptRefs, row => row.script).sort(), [
    'script.legacy_missing', 'script.missing', 'script.target_missing',
  ]);
  assert.deepEqual(Array.from(instance._entityResult.inputRefs, row => row.helper), ['input_boolean.missing']);
  dom.window.close();
});


test('Polish scan views and English entity statistics use their selected language', async () => {
  const { instance, dom } = card();
  instance._lang = 'pl';
  instance._hass = { language: 'pl', user: { is_admin: true }, states: {},
    callWS: async () => [], callApi: async () => ({}) };
  instance.shadowRoot.innerHTML = instance._html();
  const plTabs = Array.from(instance.shadowRoot.querySelectorAll('[role="tab"]'), b => b.getAttribute('aria-label'));
  assert.deepEqual(plTabs, ['Sprawdzanie konfiguracji', 'Walidator encji', 'Skaner plików', 'Sprawdź wklejony YAML', 'Tester szablonów', 'Poradnik']);
  assert.match(instance.shadowRoot.textContent, /Opcjonalne wsparcie HA Tools/);
  assert.match(instance._renderEntityValidator(), /Skanuje dostępne automatyzacje/);
  instance._lang = 'en';
  await instance._runEntityValidation();
  const wrap = dom.window.document.createElement('div');
  wrap.innerHTML = instance._renderEntityResult(instance._entityResult);
  assert.deepEqual(Array.from(wrap.querySelectorAll('.stat-label'), e => e.textContent), ['Entities in HA', 'Automations', 'Scripts', 'Broken refs']);
  assert.doesNotMatch(wrap.textContent, /Encji w HA|Automatyzacji|Skryptów/);
  dom.window.close();
});
