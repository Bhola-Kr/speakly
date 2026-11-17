const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, requireMock = () => ({ CALL_RATE_PER_MINUTE: 5 })) {
  const sandbox = { exports: {}, require: requireMock };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    sandbox,
  );
  return sandbox.exports;
}
test('admin date/time filters match local ISO dates, partial times and displayed Indian dates', () => {
  const { matchesCallDate } = load('src/utils/callMonitoring.ts');
  const date = new Date(2026, 10, 16, 17, 30),
    time = date.getTime();
  assert.equal(matchesCallDate(time, ''), true);
  assert.equal(matchesCallDate(time, '2026-11-16'), true);
  assert.equal(matchesCallDate(time, '17:30'), true);
  assert.equal(matchesCallDate(time, date.toLocaleDateString('en-IN')), true);
  assert.equal(matchesCallDate(time, '2026-11-17'), false);
  assert.equal(matchesCallDate(NaN, '2026'), false);
});
test('UI status/topic labels are Hinglish without changing stored identifiers', () => {
  const { callStatusText, topicLabel } = load('src/constants/strings.ts');
  assert.equal(callStatusText('Completed'), 'Call Ho Gayi');
  assert.equal(callStatusText('Missed'), 'Call Miss Hui');
  assert.equal(topicLabel('All'), 'Sab');
  assert.equal(topicLabel('Open Conversation'), 'Dil Khol Ke Baat');
  const data = load('src/constants/dummyData.ts');
  assert.ok(data.expertTopics.includes('Open Conversation'));
  assert.equal(data.categories[0], 'All');
});
test('app-owned string/JSX copy contains no prohibited terminology', () => {
  const files = [];
  const walk = folder => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.tsx?$/.test(file)) files.push(file);
    }
  };
  walk('src');
  walk('firebase-backend/functions/src');
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = node => {
      if (
        ts.isStringLiteral(node) ||
        ts.isJsxText(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      )
        assert.ok(
          !/\b(?:language\s+)?practice\b/i.test(node.text),
          `${file}: ${node.text}`,
        );
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
});
test('native stack/tab screen identifiers are preserved', () => {
  const cp = require('node:child_process');
  for (const file of [
    'src/App.tsx',
    'src/screens/BottomTabs.tsx',
    'src/screens/FemaleBottomTabs.tsx',
  ]) {
    const names = text => {
      const source = ts.createSourceFile(
          file,
          text,
          ts.ScriptTarget.Latest,
          true,
        ),
        result = [];
      const visit = node => {
        if (
          ts.isJsxSelfClosingElement(node) &&
          /\.Screen$/.test(node.tagName.getText(source))
        ) {
          for (const attr of node.attributes.properties)
            if (
              ts.isJsxAttribute(attr) &&
              attr.name.getText(source) === 'name' &&
              attr.initializer &&
              ts.isStringLiteral(attr.initializer)
            )
              result.push(attr.initializer.text);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      return result;
    };
    assert.deepEqual(
      names(fs.readFileSync(file, 'utf8')),
      names(
        cp.execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' }),
      ),
      file,
    );
  }
});
