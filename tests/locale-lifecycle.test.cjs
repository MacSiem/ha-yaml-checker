const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

function fixture(language = 'en') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true,
  });
  dom.window.eval(readFileSync(path.join(__dirname, '..', 'ha-yaml-checker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-yaml-checker');
  card.setConfig({ type: 'custom:ha-yaml-checker', show_support: false });
  dom.window.document.body.append(card);
  const hass = { language, user: { is_admin: true }, states: {},
    config: { components: [] }, themes: { darkMode: false } };
  card.hass = hass;
  return { card, dom, hass };
}

function tab(card, name) {
  card.shadowRoot.querySelector(`[data-tab="${name}"].tab-btn`).click();
}

test('ordinary hass language updates refresh the active guide and navigation for each card', () => {
  const a = fixture('en'), b = fixture('pl');
  try {
    tab(a.card, 'common-issues'); tab(b.card, 'common-issues');
    const plText = b.card.shadowRoot.getElementById('tab-content').textContent;
    a.card.hass = { ...a.hass, language: 'pl' };
    assert.match(a.card.shadowRoot.querySelector('[data-tab="paste-validate"].tab-btn').textContent, /Wklej/);
    assert.equal(a.card.shadowRoot.getElementById('tab-content').textContent, plText);
    b.card.hass = { ...b.hass, language: 'en' };
    assert.match(b.card.shadowRoot.getElementById('tab-content').textContent, /Mixing spaces and tabs/);
    assert.equal(a.card.shadowRoot.getElementById('tab-content').textContent, plText);
  } finally { a.dom.window.close(); b.dom.window.close(); }
});

for (const [name, id, draft] of [
  ['paste-validate', 'yaml-input', 'name: QA\nvalue: unsaved'],
  ['template-tester', 'template-input', '{{ states("sun.sun") }} unsaved'],
]) {
  test(`ordinary locale updates retain ${name} draft, focus and selection while translating labels`, () => {
    const { card, dom, hass } = fixture('en');
    try {
      tab(card, name);
      const input = card.shadowRoot.getElementById(id);
      input.value = draft;
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      input.focus(); input.setSelectionRange(2, 9, 'backward'); input.scrollTop = 5;
      card.hass = { ...hass, language: 'pl' };
      const current = card.shadowRoot.getElementById(id);
      assert.match(card.shadowRoot.querySelector(`[data-tab="${name}"].tab-btn`).textContent,
        name === 'paste-validate' ? /Wklej/ : /Szablon/);
      assert.equal(current.value, draft);
      assert.equal(card.shadowRoot.activeElement, current);
      assert.equal(current.selectionStart, 2); assert.equal(current.selectionEnd, 9);
      assert.equal(current.selectionDirection, 'backward');
      assert.equal(current.scrollTop, 5);
      card.hass = hass;
      assert.equal(card.shadowRoot.getElementById(id).value, draft);
      assert.equal(card._activeTab, name);
    } finally { dom.window.close(); }
  });
}

test('ordinary state updates in the same locale leave an open editor untouched', () => {
  const { card, dom, hass } = fixture('en');
  try {
    tab(card, 'paste-validate');
    const input = card.shadowRoot.getElementById('yaml-input');
    input.value = 'name: live draft'; input.focus(); input.setSelectionRange(3, 8);
    card.hass = { ...hass, states: { 'sensor.qa': { state: '2', attributes: {} } } };
    assert.equal(card.shadowRoot.getElementById('yaml-input'), input);
    assert.equal(card.shadowRoot.activeElement, input);
    assert.equal(input.selectionStart, 3); assert.equal(input.selectionEnd, 8);
  } finally { dom.window.close(); }
});
