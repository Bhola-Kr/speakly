const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sandbox = { exports: {}, require: () => ({}) };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync('firebase-backend/functions/src/callBilling.ts', 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
  sandbox,
);
const { advanceBilling } = sandbox.exports;
const room = () => ({
  status: 'accepted',
  male: { uid: 'user' },
  female: { uid: 'host' },
});
const connect = (r, now) => {
  advanceBilling(r, 'user', 'connected', now);
  advanceBilling(r, 'host', 'connected', now);
};
const tick = (r, now) => {
  advanceBilling(r, 'user', 'heartbeat', now);
  advanceBilling(r, 'host', 'heartbeat', now);
};

test('ringing/rejected/missed/ended calls never open billing', () => {
  for (const status of [
    'ringing',
    'rejected',
    'men_rejected',
    'ended',
    'waiting',
  ]) {
    const r = { ...room(), status };
    assert.equal(advanceBilling(r, 'user', 'connected', 1000), false);
    assert.equal(r.callStartedAt, undefined);
  }
});
test('both intended participants required; unrelated user rejected', () => {
  const r = room();
  assert.equal(advanceBilling(r, 'intruder', 'connected', 1000), false);
  advanceBilling(r, 'user', 'connected', 1000);
  assert.equal(r.callStartedAt, undefined);
  advanceBilling(r, 'host', 'connected', 1000);
  assert.equal(r.callStartedAt, 1000);
});
test('60 seconds of confirmed conversation and duplicate events', () => {
  const r = room();
  connect(r, 1000);
  for (let time = 6000; time <= 61000; time += 5000) tick(r, time);
  assert.equal(r.billableMs, 60000);
  tick(r, 61000);
  assert.equal(r.billableMs, 60000);
});
test('partial minute retains actual connected duration', () => {
  const r = room();
  connect(r, 1000);
  tick(r, 6000);
  advanceBilling(r, 'host', 'disconnected', 6000);
  assert.equal(r.billableMs, 5000);
});
test('disconnect/reconnect excludes paused interval', () => {
  const r = room();
  connect(r, 1000);
  tick(r, 6000);
  advanceBilling(r, 'user', 'disconnected', 6000);
  tick(r, 10000);
  assert.equal(r.billableMs, 5000);
  connect(r, 20000);
  tick(r, 25000);
  assert.equal(r.billableMs, 10000);
});
test('abandoned session cannot accrue the crash interval', () => {
  const r = room();
  connect(r, 1000);
  tick(r, 6000);
  tick(r, 100000);
  assert.equal(r.billableMs, 5000);
});
test('independent sessions never share duration or terminal state', () => {
  const a = room();
  const b = room();
  connect(a, 1000);
  connect(b, 1000);
  tick(a, 6000);
  assert.equal(b.billableMs, undefined);
  a.status = 'ended';
  tick(b, 11000);
  assert.equal(b.billableMs, 10000);
  assert.equal(advanceBilling(a, 'host', 'heartbeat', 11000), false);
});

test('wallet/history transaction reconciles partial minutes and repeated settlement', async () => {
  let now = 1000;
  let data = {
    rooms: {
      host: {
        ...room(),
        currentCallId: 'one',
        callRatePerMinute: 2,
        chargedAmount: 0,
      },
    },
    users: { user: { wallet: { balance: 10 } } },
  };
  const credits = new Map();
  const mock = {
    exports: {},
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    require: name =>
      name.includes('databaseTransaction')
        ? { runDataTransaction: (ref, fn) => ref.transaction(fn) }
        : name.includes('firebase-admin')
        ? {
            database: () => ({
              ref: () => ({
                transaction: async callback => {
                  const next = callback(structuredClone(data));
                  if (next) data = next;
                  return {
                    committed: !!next,
                    snapshot: { val: () => structuredClone(data) },
                  };
                },
              }),
            }),
          }
        : name.includes('expertCompensation')
        ? {
            creditExpertEarningsForCall: async (id, history) =>
              credits.set(id, history.amount),
          }
        : {},
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync('firebase-backend/functions/src/callBilling.ts', 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      },
    ).outputText,
    mock,
  );
  const event = (uid, event) =>
    mock.exports.applyCallEvent('host', 'one', uid, event);
  await assert.rejects(() => event('intruder', 'connected'));
  await event('user', 'connected');
  assert.equal(data.users.user.wallet.balance, 10);
  await event('host', 'connected');
  assert.equal(data.users.user.wallet.balance, 8);
  await event('host', 'connected');
  assert.equal(data.users.user.wallet.balance, 8);
  now = 6000;
  await event('user', 'heartbeat');
  await event('host', 'heartbeat');
  await event('user', 'end');
  await event('host', 'end');
  assert.equal(data.users.user.wallet.balance, 8);
  assert.equal(data.callHistory.host.one.duration, 5000);
  assert.equal(data.callHistory.user.one.amount, 2);
  assert.equal(credits.size, 1);
  assert.equal(data.rooms.host.status, 'ended');
  now = 100000;
  await event('user', 'connected');
  assert.equal(data.rooms.host.status, 'ended');
  assert.equal(data.users.user.wallet.balance, 8);
});
