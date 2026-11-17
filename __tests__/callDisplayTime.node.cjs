const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sandbox = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('src/utils/callDisplayTime.ts', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  sandbox,
);
const { callDisplayMilliseconds: display } = sandbox.exports;
const base = 100000;
const sample = (duration = 0) => ({
  status: 'active',
  billableMs: duration,
  billingSince: base,
  billingConfirmedAt: base + duration,
  male: { uid: 'caller' },
  female: { uid: 'host' },
  billingReports: {
    caller: { connected: true, seenAt: base + duration },
    host: { connected: true, seenAt: base + duration },
  },
});

test('timer ticks each second across five-second checkpoints without jumps or resets', () => {
  let room = sample();
  const values = [];
  for (let second = 0; second <= 14; second++) {
    const now = base + second * 1000;
    if (second % 5 === 0) {
      const previous = display(room, now);
      room = sample(second * 1000);
      assert.equal(display(room, now), previous);
    }
    values.push(Math.floor(display(room, now) / 1000));
  }
  assert.deepEqual(
    values,
    Array.from({ length: 15 }, (_, i) => i),
  );
});
test('different heartbeat arrival times and corrected device clocks show the same duration', () => {
  const now = base + 9700;
  const callerClock = now + 12000,
    hostClock = now - 8000;
  assert.equal(
    display(sample(5000), callerClock - 12000),
    display(sample(0), hostClock + 8000),
  );
  assert.equal(Math.floor(display(sample(5000), now) / 1000), 9);
});
test('ringing and acceptance never run the visible connected timer', () => {
  for (const status of ['calling', 'ringing', 'accepted'])
    assert.equal(display({ ...sample(), status }, base + 5000), 0);
  assert.equal(
    display(
      {
        ...sample(),
        billingReports: { caller: { connected: true, seenAt: base } },
      },
      base + 5000,
    ),
    0,
  );
});
test('pause/reconnect keeps confirmed time and excludes the disconnected gap', () => {
  const paused = { ...sample(5000), billingSince: null };
  assert.equal(display(paused, base + 30000), 5000);
  const resumed = sample(5000);
  resumed.billingSince = base + 30000;
  resumed.billingConfirmedAt = base + 30000;
  resumed.billingReports.caller.seenAt = base + 30000;
  resumed.billingReports.host.seenAt = base + 30000;
  assert.equal(display(resumed, base + 31000), 6000);
  assert.equal(display(resumed, base + 50000, false), 5000);
});
test('a lost signaling connection cannot keep the display running beyond the connection lease', () => {
  assert.equal(display(sample(5000), base + 100000), 20000);
  assert.equal(
    display({ ...sample(5000), status: 'ended' }, base + 100000),
    5000,
  );
});
