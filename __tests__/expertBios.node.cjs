const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync('src/utils/expertBios.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(compiled, sandbox);
const { buildExpertBioMap } = sandbox.exports;

test('default expert bios are unique and stable for a consistent expert list', () => {
  const experts = Array.from({ length: 8 }, (_, index) => ({
    uid: `expert-${index}`,
    profile: { name: `Expert ${index}` },
  }));
  const first = buildExpertBioMap(experts);
  const refreshed = buildExpertBioMap(experts);

  assert.equal(new Set(first.values()).size, experts.length);
  assert.deepEqual(Array.from(refreshed), Array.from(first));
});

test('custom expert bios are preserved', () => {
  const experts = [
    { uid: 'custom-expert', profile: { bio: 'My custom profile copy.' } },
  ];

  assert.equal(buildExpertBioMap(experts).get('custom-expert'), 'My custom profile copy.');
});
