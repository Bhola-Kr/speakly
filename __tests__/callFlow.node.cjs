const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
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
const asDefault = value => ({ __esModule: true, default: value });

async function outgoing({ balance = true, nextPending = false } = {}) {
  let now = 0,
    nextId = 0,
    listener,
    beforeRemove,
    resolveNext;
  const timers = new Map(),
    navigations = [],
    claims = [],
    selections = [],
    cancelled = [];
  const addTimer = (fn, ms, interval) => {
    const id = ++nextId;
    timers.set(id, { fn, at: now + ms, interval });
    return id;
  };
  const next = {
    female: { uid: 'hostB', name: 'Expert B', avatarId: 1, price: 5 },
    callRatePerMinute: 5,
  };
  const pending = nextPending
    ? new Promise(resolve => {
        resolveNext = resolve;
      })
    : Promise.resolve(next);
  const service = {
    listenCallStatus(_uid, callback) {
      listener = callback;
      return () => {
        listener = null;
      };
    },
    async menRejectCall(uid, id) {
      cancelled.push([uid, id]);
      if (uid === 'hostA')
        listener?.({ status: 'men_rejected', currentCallId: 'call-a' });
    },
    getRandomFemaleRoom(excluded, maximum) {
      selections.push([excluded, maximum]);
      return pending;
    },
    async callFemale(uid, maximum) {
      claims.push([uid, maximum]);
      return { currentCallId: 'call-b', callRatePerMinute: 5 };
    },
  };
  class Value {
    interpolate() {
      return 0;
    }
  }
  const native = {
    Alert: { alert() {} },
    Animated: {
      Value,
      View: 'Animated.View',
      loop: () => ({ start() {}, stop() {} }),
      timing() {},
      sequence() {},
    },
    Easing: { linear() {} },
    Image: 'Image',
    StatusBar: 'StatusBar',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    View: 'View',
    useWindowDimensions: () => ({ height: 800 }),
  };
  const sandbox = {
    exports: {},
    console,
    setTimeout: (fn, ms) => addTimer(fn, ms, 0),
    clearTimeout: id => timers.delete(id),
    setInterval: (fn, ms) => addTimer(fn, ms, ms),
    clearInterval: id => timers.delete(id),
    require: name => {
      if (name === 'react') return React;
      if (name === 'react-native') return native;
      if (name.includes('safe-area')) return { SafeAreaView: 'SafeAreaView' };
      if (name.includes('RoomService')) return asDefault(service);
      if (name.includes('useCallBalanceGuard'))
        return { useCallBalanceGuard: () => () => balance };
      if (name.includes('firebase/firebase'))
        return {
          scopedDatabase: () => ({
            ref: () => ({
              once: async () => ({
                val: () => ({ status: 'calling', currentCallId: 'call-a' }),
              }),
            }),
          }),
        };
      if (name.includes('constants/strings'))
        return {
          __esModule: true,
          default: { appName: 'Speakly' },
          copy: {
            call: {
              outgoing: 'Call Ja Rahi Hai',
              failedAction: 'Dusra Expert Chuno',
              timeout: 'Jawab Nahi Aaya',
              rejected: 'Reject Hui',
              rejectedMessage: 'Reject Hui',
            },
            host: { roleName: 'Expert' },
          },
        };
      if (name.includes('constants/constants'))
        return { getFemaleAvatar: () => 1, getMaleAvatar: () => 1 };
      if (name.includes('outgoingRingback'))
        return { startOutgoingRingback() {}, stopOutgoingRingback() {} };
      if (name.includes('analytics')) return { trackCallLifecycle() {} };
      if (name.includes('vector-icons')) return asDefault('Icon');
      return asDefault({});
    },
  };
  vm.runInNewContext(
    compile('src/screens/agora/outgoingCall/OutgoingCallScreen.tsx'),
    sandbox,
  );
  let renderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(
      React.createElement(sandbox.exports.OutgoingCallScreen, {
        navigation: {
          addListener: (event, callback) => {
            if (event === 'beforeRemove') beforeRemove = callback;
            return () => {
              beforeRemove = undefined;
            };
          },
          reset: args => navigations.push(['reset', args]),
          replace: (name, args) => navigations.push([name, args]),
        },
        route: {
          params: {
            user: { uid: 'hostA', name: 'Expert A', avatarId: 1, price: 5 },
            room: { currentCallId: 'call-a', callRatePerMinute: 5 },
          },
        },
      }),
    );
  });
  const advance = async ms => {
    const target = now + ms;
    for (;;) {
      const candidates = [...timers]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at);
      if (!candidates.length) break;
      const [id, timer] = candidates[0];
      now = timer.at;
      if (timer.interval) timer.at += timer.interval;
      else timers.delete(id);
      await Renderer.act(async () => {
        await timer.fn();
      });
    }
    now = target;
  };
  return {
    renderer,
    advance,
    claims,
    selections,
    navigations,
    cancelled,
    timers,
    back: async () =>
      Renderer.act(async () => {
        beforeRemove?.();
      }),
    event: async room =>
      Renderer.act(async () => {
        listener?.(room);
      }),
    cancel: async () =>
      Renderer.act(async () => {
        renderer.root
          .findByProps({ accessibilityLabel: 'Automatic call cancel karo' })
          .props.onPress();
      }),
    resolve: async () =>
      Renderer.act(async () => {
        resolveNext?.(next);
      }),
    close: async () => Renderer.act(async () => renderer.unmount()),
  };
}

test('unanswered call waits for timeout and progress, excludes previous host and preserves price cap', async () => {
  const screen = await outgoing();
  await screen.advance(29999);
  assert.equal(screen.selections.length, 0);
  await screen.advance(1);
  assert.equal(screen.claims.length, 0);
  await screen.advance(3000);
  assert.equal(screen.claims.length, 1);
  assert.deepEqual(screen.claims[0], ['hostB', 5]);
  assert.equal(screen.selections[0][0].includes('hostA'), true);
  const next = screen.navigations.find(item => item[0] === 'OutgoingCall');
  assert.ok(next);
  assert.deepEqual(Array.from(next[1].attemptedHosts), ['hostA', 'hostB']);
  await screen.close();
  assert.equal(screen.timers.size, 0);
});
test('cancel during progress clears timers and never calls another host', async () => {
  const screen = await outgoing();
  await screen.advance(30000);
  await screen.advance(450);
  await screen.cancel();
  await screen.advance(30000);
  assert.equal(screen.claims.length, 0);
  assert.equal(screen.selections.length, 0);
  await screen.close();
  assert.equal(screen.timers.size, 0);
});
test('leaving the outgoing screen cancels ringing and prevents delayed fallback', async () => {
  const screen = await outgoing();
  await screen.back();
  await screen.advance(60000);
  assert.deepEqual(screen.cancelled, [['hostA', 'call-a']]);
  assert.equal(screen.claims.length, 0);
  await screen.close();
  assert.equal(screen.timers.size, 0);
});
test('cancel while host lookup is pending prevents delayed call initiation', async () => {
  const screen = await outgoing({ nextPending: true });
  await screen.advance(33000);
  await screen.close();
  await screen.resolve();
  assert.equal(screen.claims.length, 0);
});
test('wallet guard prevents fallback and returns to existing main screen', async () => {
  const screen = await outgoing({ balance: false });
  await screen.advance(33000);
  assert.equal(screen.claims.length, 0);
  assert.ok(screen.navigations.some(item => item[0] === 'reset'));
  await screen.close();
});
test('explicit rejection never starts automatic fallback', async () => {
  const screen = await outgoing();
  await screen.event({ status: 'rejected', currentCallId: 'call-a' });
  await screen.advance(60000);
  assert.equal(screen.claims.length, 0);
  assert.equal(screen.selections.length, 0);
  await screen.close();
});

test('online notification persists exact host until auth is ready and deduplicates concurrent taps', async () => {
  const storage = new Map(),
    events = [];
  const asyncStorage = {
    getItem: async key => storage.get(key) || null,
    multiSet: async entries => {
      for (const [k, v] of entries) storage.set(k, v);
    },
    setItem: async (k, v) => storage.set(k, v),
    removeItem: async key => storage.delete(key),
  };
  const sandbox = {
    exports: {},
    console,
    setTimeout,
    clearTimeout,
    require: name => {
      if (name === 'react-native')
        return {
          DeviceEventEmitter: { emit: event => events.push(event) },
          Platform: { OS: 'android' },
          NativeModules: {},
          AppState: { currentState: 'background' },
        };
      if (name.includes('async-storage')) return asDefault(asyncStorage);
      if (name.includes('notifee'))
        return {
          __esModule: true,
          default: {},
          EventType: { PRESS: 1, ACTION_PRESS: 2 },
        };
      if (name.includes('firebase/auth'))
        return asDefault(() => ({ currentUser: null }));
      if (name.includes('profileValidation'))
        return { hasCompletedSignup: () => false };
      return asDefault({});
    },
  };
  vm.runInNewContext(
    compile('src/notifications/pushNotifications.ts'),
    sandbox,
  );
  const event = (id, hostUid, time = Date.now()) => ({
    type: 1,
    detail: {
      notification: {
        id,
        data: {
          type: 'expert_online',
          eventId: id,
          hostUid,
          sentAt: String(time),
        },
      },
    },
  });
  await Promise.all([
    sandbox.exports.handleNotificationEvent(event('one', 'hostA')),
    sandbox.exports.handleNotificationEvent(event('one', 'hostA')),
  ]);
  assert.equal(events.length, 1);
  assert.equal(JSON.parse(storage.get('pendingOnlineHost')).hostUid, 'hostA');
  await sandbox.exports.handleNotificationEvent(event('two', 'hostB'));
  await sandbox.exports.handleNotificationEvent(event('one', 'hostA'));
  assert.equal(events.length, 2);
  assert.equal(JSON.parse(storage.get('pendingOnlineHost')).hostUid, 'hostB');
  await sandbox.exports.handleNotificationEvent(
    event('stale', 'hostC', Date.now() - 400000),
  );
  assert.equal(events.length, 2);
  await sandbox.exports.handleNotificationEvent(event('invalid', 'hostC', NaN));
  assert.equal(events.length, 2);
});

test('pending RTC initialization and old SDK callbacks cannot join or end a replacement session', async () => {
  for (const rejectOld of [false, true]) {
    const engines = [],
      joins = [],
      events = [];
    let resolveOld,
      rejectOldToken,
      finished = 0;
    const pending = new Promise((resolve, reject) => {
      resolveOld = resolve;
      rejectOldToken = reject;
    });
    const credentials = {
      male: { uid: 1, token: 'own-token' },
      female: { uid: 2, token: '' },
    };
    const copySandbox = {
      exports: {},
      require: () => ({ CALL_RATE_PER_MINUTE: 5 }),
    };
    vm.runInNewContext(compile('src/constants/strings.ts'), copySandbox);
    const user = { uid: 'customer', isExpert: false, wallet: { balance: 100 } };
    const service = {
      listenCallStatus: () => () => {},
      startCallPresence: async () => {},
      stopCallPresence: async () => {},
      endCall: async () => {},
      chargeCallMinute: async () => {
        if (rejectOld) throw new Error('temporary network failure');
        return true;
      },
      callConnected: async (host, id) => {
        events.push(['connected', id]);
        return Date.now();
      },
      callSessionEvent: async (host, id, event) => {
        events.push([event, id]);
        return { active: true, ended: false, duration: 5000 };
      },
    };
    const native = {
      Platform: { OS: 'ios' },
      Alert: { alert() {} },
      BackHandler: { addEventListener: () => ({ remove() {} }) },
      DeviceEventEmitter: { emit() {} },
      Vibration: { vibrate() {}, cancel() {} },
      useWindowDimensions: () => ({ height: 800, width: 360 }),
      View: 'View',
      Text: 'Text',
      Image: 'Image',
      Modal: 'Modal',
      TouchableOpacity: 'TouchableOpacity',
      StatusBar: 'StatusBar',
    };
    const sdk = {
      createAgoraRtcEngine() {
        const engine = {
          initialize() {},
          enableAudio() {},
          setChannelProfile() {},
          setClientRole() {},
          setEnableSpeakerphone() {},
          registerEventHandler(value) {
            this.events = value;
          },
          joinChannel(token, channel, uid) {
            joins.push([channel, uid]);
          },
          leaveChannel() {
            this.left = true;
          },
          release() {
            this.released = true;
          },
        };
        engines.push(engine);
        return engine;
      },
      ChannelProfileType: { ChannelProfileCommunication: 0 },
      ClientRoleType: { ClientRoleBroadcaster: 1 },
      UserOfflineReasonType: { UserOfflineQuit: 0 },
      ConnectionStateType: {
        ConnectionStateConnected: 3,
        ConnectionStateDisconnected: 1,
      },
      LocalAudioStreamReason: {},
      LocalAudioStreamState: {},
    };
    const sandbox = {
      exports: {},
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      require: name => {
        if (name === 'react') return React;
        if (name === 'react-native') return native;
        if (name === 'react-native-agora') return sdk;
        if (name.includes('safe-area')) return { SafeAreaView: 'SafeAreaView' };
        if (name.includes('linear-gradient') || name.includes('vector-icons'))
          return asDefault('Visual');
        if (name.includes('incall-manager'))
          return asDefault({
            start() {},
            stop() {},
            setForceSpeakerphoneOn() {},
          });
        if (name.includes('constants/strings'))
          return { __esModule: true, ...copySandbox.exports };
        if (name.includes('constants/constants'))
          return {
            normalizeCallRate: n => Number(n) || 5,
            getFemaleAvatar: () => 1,
            getMaleAvatar: () => 1,
            getUserAvatar: () => 1,
          };
        if (name.includes('RoomService')) return asDefault(service);
        if (name.includes('api/calls'))
          return {
            fetchAgoraToken: channel =>
              channel === 'call_a' ? pending : Promise.resolve(credentials),
          };
        if (name.includes('useUser') || name.includes('UserContext'))
          return { useUser: () => ({ user }) };
        if (name.includes('firebase/auth'))
          return asDefault(() => ({ currentUser: { uid: 'customer' } }));
        if (name.includes('firebase/firebase'))
          return {
            scopedDatabase: () => ({
              ref: () => ({
                on() {},
                off() {},
                once: async () => ({ val: () => ({}) }),
              }),
            }),
          };
        if (name.includes('analytics'))
          return {
            trackCallConnected() {},
            trackCallEnded() {},
            trackCallLifecycle() {},
            trackCallStarted() {},
          };
        if (name.includes('callRuntime'))
          return {
            startCallRuntime: async () => {},
            stopCallRuntime() {},
            setCallInterval: () => () => {},
          };
        return asDefault({});
      },
    };
    vm.runInNewContext(compile('src/screens/agora/CallScreen.tsx'), sandbox);
    const onFinished = () => {
        finished++;
      },
      onMinimize = () => {};
    const element = id =>
      React.createElement(sandbox.exports.default, {
        route: {
          params: {
            callId: id,
            channelName: `call_${id}`,
            femaleUid: `host-${id}`,
            gender: 'male',
            agora: credentials,
          },
        },
        visible: false,
        onFinished,
        onMinimize,
      });
    let renderer;
    try {
      await Renderer.act(async () => {
        renderer = Renderer.create(element('a'));
      });
      assert.equal(engines.length, 1);
      await Renderer.act(async () => {
        renderer.update(element('b'));
      });
      assert.equal(engines.length, 2);
      await Renderer.act(async () => {
        if (rejectOld) rejectOldToken(new Error('late failure'));
        else resolveOld(credentials);
      });
      assert.deepEqual(joins, [['call_b', 1]]);
      assert.equal(engines[0].released, true);
      assert.equal(finished, 0);
      await Renderer.act(async () => {
        await engines[0].events.onUserJoined({}, 2);
        engines[0].events.onConnectionStateChanged({}, 1);
        await engines[1].events.onUserJoined({}, 999);
      });
      assert.equal(events.length, 0);
      await Renderer.act(async () => {
        await engines[1].events.onUserJoined({}, 2);
      });
      assert.ok(
        events.some(([kind, id]) => kind === 'connected' && id === 'b'),
      );
      assert.ok(events.every(([, id]) => id === 'b'));
      assert.equal(finished, 0);
    } finally {
      if (renderer) await Renderer.act(async () => renderer.unmount());
    }
  }
});
