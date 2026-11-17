const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const TestRenderer = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const bannerSource = fs.readFileSync(
  'src/screens/home/useHomeBannerMessage.ts',
  'utf8'
);
let screenFocused = true;
const navigationMock = { useIsFocused: () => screenFocused };
const bannerModule = { exports: {} };
const compiledBanner = ts.transpileModule(bannerSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(compiledBanner, {
  exports: bannerModule.exports,
  require(moduleName) {
    if (moduleName === 'react') return React;
    if (moduleName === '@react-navigation/native') return navigationMock;
    throw new Error(`Unexpected banner module dependency: ${moduleName}`);
  },
});
const {
  HOME_BANNER_MESSAGES,
  selectHomeBannerIndex,
  useHomeBannerMessage,
} = bannerModule.exports;

const asyncStorageMock = {
  getItem: async () => null,
  setItem: async () => undefined,
};
const localizationModule = { exports: {} };
const compiledLocalization = ts.transpileModule(
  fs.readFileSync('src/localization/language.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
vm.runInNewContext(compiledLocalization, {
  exports: localizationModule.exports,
  require(moduleName) {
    if (moduleName === '@react-native-async-storage/async-storage') {
      return { __esModule: true, default: asyncStorageMock };
    }
    if (moduleName === './catalog.json') {
      return {
        default: JSON.parse(
          fs.readFileSync('src/localization/catalog.json', 'utf8'),
        ),
      };
    }
    if (moduleName === './templates.json') {
      return {
        default: JSON.parse(
          fs.readFileSync('src/localization/templates.json', 'utf8'),
        ),
      };
    }
    throw new Error(`Unexpected localization dependency: ${moduleName}`);
  },
});
const { translate } = localizationModule.exports;

test('defines eight complete title and subtitle pairs', () => {
  assert.equal(HOME_BANNER_MESSAGES.length, 8);
  for (const message of HOME_BANNER_MESSAGES) {
    assert.ok(message.title);
    assert.ok(message.subtitle);
    assert.doesNotMatch(`${message.title} ${message.subtitle}`, /practice/i);
    assert.doesNotMatch(`${message.title} ${message.subtitle}`, /\p{Extended_Pictographic}/u);
  }
});

test('random selection avoids the immediately previous banner', () => {
  for (let previousIndex = 0; previousIndex < HOME_BANNER_MESSAGES.length; previousIndex += 1) {
    for (const randomValue of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const selectedIndex = selectHomeBannerIndex(
        previousIndex,
        () => randomValue,
      );
      assert.notEqual(selectedIndex, previousIndex);
      assert.ok(HOME_BANNER_MESSAGES[selectedIndex]);
    }
  }
});

test('keeps a pair stable on rerenders and selects a new pair after returning home', () => {
  let message;
  const Probe = ({ renderCount }) => {
    message = useHomeBannerMessage();
    return React.createElement('probe', null, String(renderCount));
  };

  let renderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(React.createElement(Probe, { renderCount: 0 }));
  });
  const firstVisit = message;

  TestRenderer.act(() => {
    renderer.update(React.createElement(Probe, { renderCount: 1 }));
  });
  assert.equal(message, firstVisit);

  screenFocused = false;
  TestRenderer.act(() => {
    renderer.update(React.createElement(Probe, { renderCount: 2 }));
  });
  assert.equal(message, firstVisit);

  screenFocused = true;
  TestRenderer.act(() => {
    renderer.update(React.createElement(Probe, { renderCount: 3 }));
  });
  assert.notEqual(message, firstVisit);
  assert.ok(HOME_BANNER_MESSAGES.includes(message));
  TestRenderer.act(() => renderer.unmount());
});

test('keeps title and subtitle Hinglish in both language modes', () => {
  const source = fs.readFileSync('src/screens/home/Banner.tsx', 'utf8');
  assert.match(source, /<NativeText[\s\S]*?style=\{styles\.title\}[\s\S]*?\{title\}/);
  assert.match(source, /<NativeText[\s\S]*?style=\{styles\.description\}[\s\S]*?\{subtitle\}/);

  for (const message of HOME_BANNER_MESSAGES) {
    assert.equal(translate(message.title, 'hinglish'), message.title);
    assert.equal(translate(message.subtitle, 'hinglish'), message.subtitle);
    assert.equal(translate(message.title, 'en'), message.title);
    assert.equal(translate(message.subtitle, 'en'), message.subtitle);
  }
});

test('banner text has bounded wrapping and scales down on narrow layouts', () => {
  const source = fs.readFileSync('src/screens/home/Banner.tsx', 'utf8');
  const titleBlock = source.match(/<NativeText\s+numberOfLines=\{3\}[\s\S]*?style=\{styles\.title\}/);
  const subtitleBlock = source.match(/<NativeText\s+numberOfLines=\{2\}[\s\S]*?style=\{styles\.description\}/);

  assert.ok(titleBlock, 'title is limited to three lines');
  assert.ok(subtitleBlock, 'subtitle is limited to two lines');
  assert.match(titleBlock[0], /adjustsFontSizeToFit/);
  assert.match(subtitleBlock[0], /adjustsFontSizeToFit/);
  assert.match(titleBlock[0], /minimumFontScale/);
  assert.match(subtitleBlock[0], /minimumFontScale/);
});
