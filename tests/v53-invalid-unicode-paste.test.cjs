const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

for (const [assetName, assetPath] of [
  ['root', path.join(__dirname, '..', 'ha-yaml-checker.js')],
  ['served-www', path.join(__dirname, '..', 'custom_components', 'ha_yaml_checker', 'www', 'ha-yaml-checker.js')],
]) {
for (const [language, expected] of [
  ['en', /Invalid Unicode text \(cannot be encoded as UTF-8\)/],
  ['pl', /Nieprawidłowy tekst Unicode \(nie można zakodować jako UTF-8\)/],
]) {
  test('pasted non-UTF-8 Unicode gets a precise, redacted ' + language + ' status in ' + assetName, async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true,
    });
    try {
      dom.window.eval(readFileSync(assetPath, 'utf8'));
      const card = dom.window.document.createElement('ha-yaml-checker');
      card.setConfig({type: 'custom:ha-yaml-checker', show_support: false});
      dom.window.document.body.append(card);
      const messages = [];
      card.hass = {
        language, user: {id: 'synthetic-admin', is_admin: true}, states: {},
        connection: {connected: true}, config: {components: ['ha_yaml_checker']},
        themes: {darkMode: false},
        callWS: async message => {
          messages.push(message);
          return {schema: 'ha-yaml-syntax-v1', status: 'invalid', reason: 'invalid_encoding'};
        },
      };
      card.shadowRoot.querySelector('[data-tab="paste-validate"].tab-btn').click();
      const input = card.shadowRoot.getElementById('yaml-input');
      input.value = 'secret: PRIVATE-CANARY\nvalue: \uD800';
      input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
      card.shadowRoot.getElementById('btn-validate').click();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(messages.length, 1);
      assert.equal(messages[0].type, 'ha_yaml_checker/check_syntax');
      assert.equal(card._pasteSyntax.status, 'invalid');
      const renderedStatus = card.shadowRoot.querySelector('#paste-result .note-box').textContent;
      assert.match(renderedStatus, expected);
      assert.doesNotMatch(renderedStatus, /PRIVATE-CANARY/);
      assert.doesNotMatch(renderedStatus, /Syntax not verified|Składnia YAML niezweryfikowana/);
    } finally { dom.window.close(); }
  });
}
}
