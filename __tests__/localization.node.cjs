const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const Renderer = require('react-test-renderer');

global.IS_REACT_ACT_ENVIRONMENT = true;

const compile = file =>
  ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;

function makeLanguageModule(values = new Map(), getItemOverride) {
  const storage = {
    getItem: getItemOverride || (async key => values.get(key) ?? null),
    setItem: async (key, value) => values.set(key, value),
  };
  const module = { exports: {} };
  const source = compile(
    path.join(__dirname, '../src/localization/language.ts'),
  );
  const sandbox = {
    module,
    exports: module.exports,
    require(name) {
      if (name === '@react-native-async-storage/async-storage')
        return { __esModule: true, default: storage };
      if (name === './catalog.json')
        return require('../src/localization/catalog.json');
      if (name === './templates.json')
        return require('../src/localization/templates.json');
      throw new Error(`Unexpected localization dependency: ${name}`);
    },
  };
  vm.runInNewContext(source, sandbox, { filename: 'language.ts' });
  return { api: module.exports, values, storage };
}

test('English is the default and both language directions translate complete text', async () => {
  const { api } = makeLanguageModule();
  assert.equal(api.getAppLanguage(), 'en');
  assert.equal(
    api.translate('Apna naam likho aur avatar chuno.'),
    'Enter your name and choose an avatar.',
  );
  assert.equal(
    api.translate('Enter your name and choose an avatar.', 'hinglish'),
    'Apna naam likho aur avatar chuno.',
  );
  assert.equal(
    api.translate(
      'Lo ₹10 free call balance mein pehli 2 minutes ki baat. Subscription nahi chahiye.',
      'en',
    ),
    'Get ₹10 free call balance for your first 2 minutes. No subscription required.',
  );
});

test('language changes publish immediately and persist independently per account', async () => {
  const values = new Map();
  const firstRun = makeLanguageModule(values);
  await firstRun.api.initializeLanguage('customer-a');
  let notifications = 0;
  const unsubscribe = firstRun.api.subscribeLanguage(() => notifications++);
  const saving = firstRun.api.setAppLanguage('hinglish');
  assert.equal(firstRun.api.getAppLanguage(), 'hinglish');
  await saving;
  unsubscribe();
  assert.equal(notifications, 1);

  const restarted = makeLanguageModule(values);
  await restarted.api.initializeLanguage('customer-a');
  assert.equal(restarted.api.getAppLanguage(), 'hinglish');
  await restarted.api.initializeLanguage('customer-b');
  assert.equal(restarted.api.getAppLanguage(), 'en');
});

test('late storage reads cannot overwrite a newer language selection', async () => {
  let finishRead;
  const delayedRead = new Promise(resolve => (finishRead = resolve));
  const { api } = makeLanguageModule(new Map(), () => delayedRead);
  const initializing = api.initializeLanguage('customer-a');
  await api.setAppLanguage('hinglish');
  finishRead('en');
  await initializing;
  assert.equal(api.getAppLanguage(), 'hinglish');
});

test('visible text and input placeholders update without losing typed values', async () => {
  const language = makeLanguageModule();
  const module = { exports: {} };
  const source = compile(
    path.join(__dirname, '../src/localization/components.tsx'),
  );
  const native = {
    Text: 'NativeText',
    TextInput: 'NativeTextInput',
    TouchableOpacity: 'NativeTouchableOpacity',
  };
  vm.runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      require(name) {
        if (name === 'react') return React;
        if (name === 'react-native') return native;
        if (name === './language') return language.api;
        throw new Error(`Unexpected component dependency: ${name}`);
      },
    },
    { filename: 'components.tsx' },
  );

  let screen;
  await Renderer.act(async () => {
    screen = Renderer.create(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(module.exports.Text, null, 'Apna naam likho.'),
        React.createElement(module.exports.TextInput, {
          placeholder: 'Apna naam likho',
          value: 'Aarav',
        }),
      ),
    );
  });

  assert.equal(
    screen.root.findByType('NativeText').props.children,
    'Please enter your name.',
  );
  assert.equal(
    screen.root.findByType('NativeTextInput').props.placeholder,
    'Enter your name',
  );
  await Renderer.act(async () => {
    await language.api.setAppLanguage('hinglish');
  });
  assert.equal(
    screen.root.findByType('NativeText').props.children,
    'Apna naam likho.',
  );
  const input = screen.root.findByType('NativeTextInput');
  assert.equal(input.props.placeholder, 'Apna naam likho');
  assert.equal(input.props.value, 'Aarav');
  await Renderer.act(async () => screen.unmount());
});

test('push copy remains Hinglish regardless of the selected app language', async () => {
  const language = makeLanguageModule();
  let displayed;
  const notifee = {
    AndroidImportance: { HIGH: 4 },
    createChannel: async () => 'general',
    displayNotification: async value => (displayed = value),
  };
  const module = { exports: {} };
  const source = compile(
    path.join(__dirname, '../src/notifications/pushNotifications.ts'),
  );
  vm.runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      console,
      require(name) {
        if (name === '../localization/language') return language.api;
        if (name === 'react-native')
          return {
            AppState: { currentState: 'background' },
            DeviceEventEmitter: {},
            NativeModules: {},
            Platform: { OS: 'android' },
          };
        if (name === '@react-native-async-storage/async-storage')
          return { __esModule: true, default: { getItem: async () => null } };
        if (name === '@react-native-firebase/auth')
          return { __esModule: true, default: () => ({}) };
        if (name === '@react-native-firebase/messaging')
          return { __esModule: true, default: () => ({}) };
        if (name === '@notifee/react-native')
          return { __esModule: true, default: notifee, ...notifee };
        if (name === '../utils/profileValidation')
          return { hasCompletedSignup: () => true };
        if (name === '../firebase/firebase')
          return { scopedDatabase: () => ({}) };
        if (name === '../api/api') return { __esModule: true, default: {} };
        throw new Error(`Unexpected notification dependency: ${name}`);
      },
    },
    { filename: 'pushNotifications.ts' },
  );

  await language.api.setAppLanguage('en');
  await module.exports.displayPushNotification({
    messageId: 'busy-test',
    data: {},
    notification: {
      title: 'Expert Is Currently Busy',
      body: 'The expert is currently unavailable. Please try again later.',
    },
  });
  assert.equal(displayed.title, 'Expert Abhi Busy Hai');
  assert.equal(
    displayed.body,
    'Expert abhi available nahi hai. Thodi der baad try karo.',
  );

  await language.api.setAppLanguage('hinglish');
  await module.exports.displayPushNotification({
    messageId: 'busy-test-2',
    data: {},
    notification: {
      title: 'Expert Is Currently Busy',
      body: 'The expert is currently unavailable. Please try again later.',
    },
  });
  assert.equal(displayed.title, 'Expert Abhi Busy Hai');
  assert.equal(
    displayed.body,
    'Expert abhi available nahi hai. Thodi der baad try karo.',
  );
});

test('hosted-page translation switches languages and leaves form values untouched', () => {
  const dictionary = require('../src/localization/webCatalog.json');
  const pageText = {
    nodeValue: 'How It Works',
    parentElement: { closest: () => null },
  };
  const excludedInputText = {
    nodeValue: 'typed value',
    parentElement: { closest: () => ({}) },
  };
  const input = {
    value: 'typed value',
    attributes: { placeholder: 'Email address' },
    hasAttribute(name) {
      return Object.hasOwn(this.attributes, name);
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  const nodes = [pageText, excludedInputText];
  const document = {
    body: {},
    documentElement: { lang: 'en' },
    createTreeWalker() {
      let index = 0;
      return { nextNode: () => nodes[index++] || null };
    },
    querySelectorAll: () => [input],
  };
  class Observer {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    disconnect() {}
  }
  const context = {
    document,
    location: { hostname: 'joinspeakly.com' },
    NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver: Observer,
    window: {},
  };
  const scriptPath = path.join(__dirname, '../src/localization/web.ts');
  const source = compile(scriptPath);
  const module = { exports: {} };
  vm.runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      require(name) {
        if (name === './webCatalog.json') return dictionary;
        if (name === './catalog.json')
          return require('../src/localization/catalog.json');
        throw new Error(`Unexpected web localization dependency: ${name}`);
      },
    },
    { filename: 'web.ts' },
  );
  const script = language => module.exports.webLocalizationScript(language);
  vm.runInNewContext(script('hinglish'), context);
  assert.equal(pageText.nodeValue, dictionary['How It Works']);
  assert.equal(excludedInputText.nodeValue, 'typed value');
  assert.equal(input.value, 'typed value');
  assert.equal(document.documentElement.lang, 'hi-Latn');
  vm.runInNewContext(script('en'), context);
  assert.equal(pageText.nodeValue, 'How It Works');
  assert.equal(document.documentElement.lang, 'en');
});

test('all catalog text avoids the prohibited Practice terminology', () => {
  const catalog = require('../src/localization/catalog.json');
  const templates = require('../src/localization/templates.json');
  const source = fs.readFileSync(
    path.join(__dirname, '../src/localization/language.ts'),
    'utf8',
  );
  assert.match(source, /cleanTerminology/);
  for (const [hinglish, english] of [
    ...Object.entries(catalog),
    ...Object.entries(templates),
  ]) {
    assert.doesNotMatch(hinglish, /\bpractice\b/i);
    assert.doesNotMatch(english, /\bpractice\b/i);
  }
});

test('home screen omits the profile reminder, category filter, and free-minute promo', () => {
  const home = fs.readFileSync(
    path.join(__dirname, '../src/screens/home/HomeScreen.tsx'),
    'utf8',
  );
  const banner = fs.readFileSync(
    path.join(__dirname, '../src/screens/home/Banner.tsx'),
    'utf8',
  );
  assert.doesNotMatch(home, /CategoryList|profileReminder|showProfileReminder/);
  assert.doesNotMatch(banner, /offerFreeMinutes|offerAmount|Lo ₹/);
});
