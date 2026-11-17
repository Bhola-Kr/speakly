const { test } = require('node:test');
const assert = require('node:assert/strict');
// This test cannot select a production project or host.
process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'demo-speakly-local';
const admin = require('../firebase-backend/functions/node_modules/firebase-admin');
admin.initializeApp({
  projectId: 'demo-speakly-local',
  databaseURL: 'https://demo-speakly-local-default-rtdb.firebaseio.com',
});
const {
  claimCallForUser,
  applyCallEvent,
} = require('../firebase-backend/functions/lib/callBilling');
const {
  registerPushToken,
} = require('../firebase-backend/functions/lib/pushTokenOwnership');
const {
  createAgoraTokenHandler,
} = require('../firebase-backend/functions/lib/rtcAuthorization');
const root = admin.database().ref('speakly');
async function account(label) {
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${label}-${Date.now()}-${Math.random()}@example.test`,
        password: 'local-test-password',
        returnSecureToken: true,
      }),
    },
  );
  const result = await response.json();
  assert.ok(result.idToken, JSON.stringify(result));
  return { uid: result.localId, token: result.idToken };
}
async function request(path, method, value, actor) {
  const response = await fetch(
    `http://127.0.0.1:9000/speakly/${path}.json?ns=demo-speakly-local-default-rtdb&auth=${actor.token}`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: value === undefined ? undefined : JSON.stringify(value),
    },
  );
  return { status: response.status, body: await response.json() };
}
async function invoke(handler, actor, body) {
  let status = 200,
    payload;
  const res = {
    status(value) {
      status = value;
      return this;
    },
    json(value) {
      payload = value;
      return this;
    },
  };
  await handler(
    { headers: { authorization: `Bearer ${actor.token}` }, body },
    res,
  );
  return { status, body: payload };
}
const profile = (a, expert = false) => ({
  uid: a.uid,
  isExpert: expert,
  isAdmin: false,
  profile: {
    uid: a.uid,
    name: expert ? 'Expert' : 'Customer',
    role: expert ? 'expert' : 'learner',
    status: expert ? 'online' : 'offline',
    price: 5,
    gender: expert ? 'female' : 'male',
    avatarId: 1,
    avatarSelected: true,
  },
  wallet: { balance: 50 },
  verification: { voiceVerified: expert },
});
const room = a => ({
  roomId: a.uid,
  currentCallId: '',
  status: 'waiting',
  female: { uid: a.uid, name: 'Expert', avatarId: 1, price: 5 },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  callRatePerMinute: 5,
  agora: { male: { uid: 1, token: '' }, female: { uid: 2, token: '' } },
});

test('Firebase Auth/RTDB integration (local demo only)', async t => {
  const [customer, customer2, host, host2, administrator, outsider] =
    await Promise.all(
      ['customer', 'customer2', 'host', 'host2', 'admin', 'outsider'].map(
        account,
      ),
    );
  const fixture = () => ({
    users: {
      [customer.uid]: profile(customer),
      [customer2.uid]: profile(customer2),
      [host.uid]: profile(host, true),
      [host2.uid]: profile(host2, true),
      [administrator.uid]: { ...profile(administrator), isAdmin: true },
      [outsider.uid]: profile(outsider),
    },
    rooms: { [host.uid]: room(host), [host2.uid]: room(host2) },
    configs: {
      signupOffer: { active: true, amount: 10, freeMinutes: 2 },
      minimumWithdrawalAmount: 99,
    },
  });
  await t.test(
    'rules deny forged wallet, earnings, roles, token ownership, call IDs and financial history',
    async () => {
      await root.set(fixture());
      for (const [path, value] of [
        [`users/${customer.uid}/wallet/balance`, 5000],
        [`users/${customer.uid}/wallet`, null],
        [`users/${customer.uid}/isAdmin`, true],
        [`users/${customer.uid}/isExpert`, true],
        [
          `users/${customer.uid}/expertEarnings`,
          { total: 999, available: 999 },
        ],
        [`users/${customer.uid}/fcmTokens`, { token: 'forged' }],
        [`pushTokenOwners/forged`, { uid: host.uid, token: 'forged' }],
        [
          `rooms/${host.uid}`,
          {
            ...room(host),
            status: 'calling',
            currentCallId: 'chosen-id',
            male: { uid: customer.uid },
          },
        ],
        [
          `callHistory/${customer.uid}/forged`,
          { amount: 500, status: 'Completed' },
        ],
      ])
        assert.equal(
          (await request(path, 'PUT', value, customer)).status,
          401,
          path,
        );
      assert.equal(
        (
          await request(
            `users/${customer.uid}/profile/name`,
            'PUT',
            'Naya Naam',
            customer,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            `users/${customer.uid}/wallet/balance`,
            'PUT',
            100,
            administrator,
          )
        ).status,
        200,
      );
    },
  );
  let a, b;
  await t.test(
    'real concurrent claims create isolated channels; caller cannot ring two hosts',
    async () => {
      await root.set(fixture());
      [a, b] = await Promise.all([
        claimCallForUser(host.uid, customer.uid),
        claimCallForUser(host2.uid, customer2.uid),
      ]);
      assert.notEqual(a.currentCallId, b.currentCallId);
      assert.notEqual(a.agora.channelName, b.agora.channelName);
      assert.equal(a.agora.male.token, '');
      await assert.rejects(() => claimCallForUser(host2.uid, customer.uid));
      const changed = { ...a, currentCallId: b.currentCallId };
      assert.equal(
        (await request(`rooms/${host.uid}`, 'PUT', changed, customer)).status,
        401,
      );
    },
  );
  await t.test(
    'RTC authorization returns only own credentials and rejects cross-session access',
    async () => {
      const handler = createAgoraTokenHandler(
        '0123456789abcdef0123456789abcdef',
        'abcdef0123456789abcdef0123456789',
      );
      const own = await invoke(handler, customer, {
        channelName: a.agora.channelName,
      });
      assert.equal(own.status, 200);
      assert.ok(own.body.male.token);
      assert.equal(own.body.female.token, '');
      const peer = await invoke(handler, host, {
        channelName: a.agora.channelName,
      });
      assert.ok(peer.body.female.token);
      assert.equal(peer.body.male.token, '');
      assert.equal(
        (await invoke(handler, outsider, { channelName: a.agora.channelName }))
          .status,
        403,
      );
      assert.equal(
        (
          await invoke(handler, administrator, {
            channelName: a.agora.channelName,
          })
        ).status,
        403,
      );
      assert.equal(
        (await invoke(handler, customer, { channelName: b.agora.channelName }))
          .status,
        403,
      );
      const refresh = await invoke(handler, customer, {
        channelName: a.agora.channelName,
      });
      assert.equal(refresh.body.male.uid, own.body.male.uid);
    },
  );
  await t.test(
    'rules permit acceptance but deny direct connected-time and charge edits',
    async () => {
      assert.equal(
        (await request(`rooms/${host.uid}/status`, 'PUT', 'accepted', host))
          .status,
        200,
      );
      for (const [field, value] of [
        ['status', 'active'],
        ['chargedAmount', 5],
        ['callStartedAt', Date.now()],
        ['billableMs', 60000],
        [
          'billingReports',
          { [customer.uid]: { connected: true, seenAt: Date.now() } },
        ],
      ])
        assert.equal(
          (await request(`rooms/${host.uid}/${field}`, 'PUT', value, customer))
            .status,
          401,
          field,
        );
    },
  );
  await t.test(
    'real transactions debit once, exclude disconnect, preserve other call and reconcile admin history',
    async () => {
      await applyCallEvent(
        host.uid,
        a.currentCallId,
        customer.uid,
        'connected',
      );
      await applyCallEvent(host.uid, a.currentCallId, host.uid, 'connected');
      await Promise.all(
        Array.from({ length: 6 }, () =>
          applyCallEvent(host.uid, a.currentCallId, customer.uid, 'heartbeat'),
        ),
      );
      assert.equal(
        (await root.child(`users/${customer.uid}/wallet/balance`).get()).val(),
        45,
      );
      await applyCallEvent(
        host.uid,
        a.currentCallId,
        customer.uid,
        'disconnected',
      );
      const duration =
        (await root.child(`rooms/${host.uid}/billableMs`).get()).val() || 0;
      await applyCallEvent(host.uid, a.currentCallId, host.uid, 'heartbeat');
      assert.equal(
        (await root.child(`rooms/${host.uid}/billableMs`).get()).val() || 0,
        duration,
      );
      await Promise.all([
        applyCallEvent(host.uid, a.currentCallId, customer.uid, 'end'),
        applyCallEvent(host.uid, a.currentCallId, host.uid, 'end'),
      ]);
      assert.equal(
        (await root.child(`users/${customer.uid}/wallet/balance`).get()).val(),
        45,
      );
      const history = await request(
        `callHistory/${host.uid}/${a.currentCallId}`,
        'GET',
        undefined,
        administrator,
      );
      assert.equal(history.status, 200);
      assert.equal(history.body.amount, 5);
      assert.equal(history.body.status, 'Completed');
      assert.equal(
        (
          await request(
            `callHistory/${host.uid}/${a.currentCallId}`,
            'GET',
            undefined,
            outsider,
          )
        ).status,
        401,
      );
      assert.equal(
        (await root.child(`rooms/${host2.uid}/currentCallId`).get()).val(),
        b.currentCallId,
      );
      assert.equal(
        (
          await request(
            `callHistory/${customer.uid}/${a.currentCallId}/archivedAt`,
            'PUT',
            Date.now(),
            customer,
          )
        ).status,
        200,
      );
      const before = (
        await root.child(`users/${host.uid}/expertEarnings`).get()
      ).val();
      await applyCallEvent(host.uid, a.currentCallId, customer.uid, 'end');
      assert.deepEqual(
        (await root.child(`users/${host.uid}/expertEarnings`).get()).val(),
        before,
      );
    },
  );
  await t.test(
    'real token ownership transfers; stale logout cannot remove new owner',
    async () => {
      assert.equal(
        (
          await invoke(registerPushToken, customer, {
            token: 'same-device',
            platform: 'android',
          })
        ).status,
        200,
      );
      await invoke(registerPushToken, host, {
        token: 'same-device',
        platform: 'android',
      });
      assert.equal(
        (await root.child(`users/${customer.uid}/fcmTokens`).get()).exists(),
        false,
      );
      await invoke(registerPushToken, customer, {
        token: 'same-device',
        remove: true,
      });
      const owners = Object.values(
        (await root.child('pushTokenOwners').get()).val(),
      );
      assert.equal(owners.length, 1);
      assert.equal(owners[0].uid, host.uid);
      assert.equal(
        (await root.child(`users/${host.uid}/fcmTokens`).get()).exists(),
        false,
      );
      assert.equal(
        (await request('pushTokenOwners', 'GET', undefined, customer)).status,
        401,
      );
      await invoke(registerPushToken, host, {
        token: 'same-device',
        remove: true,
      });
      assert.equal(
        (await root.child(`users/${host.uid}/fcmTokens`).get()).exists(),
        false,
      );
      assert.equal((await root.child('pushTokenOwners').get()).exists(), false);
    },
  );
  await t.test(
    'real transaction rounding and reconnect exclude disconnected intervals and settle once',
    async () => {
      await root.set(fixture());
      const call = await claimCallForUser(host.uid, customer.uid);
      await root.child(`rooms/${host.uid}/status`).set('accepted');
      const clock = Date.now,
        base = clock();
      let now = base;
      Date.now = () => now;
      try {
        const event = (who, kind) =>
          applyCallEvent(host.uid, call.currentCallId, who.uid, kind);
        await event(customer, 'connected');
        await event(host, 'connected');
        for (let offset = 5000; offset <= 60000; offset += 5000) {
          now = base + offset;
          await event(customer, 'heartbeat');
          await event(host, 'heartbeat');
        }
        assert.equal(
          (await root.child(`rooms/${host.uid}/billableMs`).get()).val(),
          60000,
        );
        assert.equal(
          (
            await root.child(`users/${customer.uid}/wallet/balance`).get()
          ).val(),
          45,
        );
        await event(customer, 'disconnected');
        now = base + 80000;
        await event(host, 'heartbeat');
        assert.equal(
          (await root.child(`rooms/${host.uid}/billableMs`).get()).val(),
          60000,
        );
        now = base + 90000;
        await event(customer, 'connected');
        await event(host, 'connected');
        now = base + 95000;
        await event(customer, 'heartbeat');
        await event(host, 'heartbeat');
        assert.equal(
          (await root.child(`rooms/${host.uid}/billableMs`).get()).val(),
          65000,
        );
        now = base + 200000;
        await event(customer, 'end');
        const history = (
          await root
            .child(`callHistory/${host.uid}/${call.currentCallId}`)
            .get()
        ).val();
        assert.equal(history.duration, 65000);
        assert.equal(history.amount, 10);
        assert.equal(
          (
            await root.child(`users/${customer.uid}/wallet/balance`).get()
          ).val(),
          40,
        );
        await event(host, 'end');
        assert.equal(
          (
            await root.child(`users/${customer.uid}/wallet/balance`).get()
          ).val(),
          40,
        );
      } finally {
        Date.now = clock;
      }
    },
  );
  await t.test(
    'existing signup offer is allowed once; replay/deletion bypass and forged archive are denied',
    async () => {
      await root.set(fixture());
      const original = (await root.child(`users/${customer.uid}`).get()).val();
      const missingClaim = {
        ...original,
        wallet: { balance: 60 },
        offers: { signupOffer: { amount: 10 } },
      };
      assert.equal(
        (await request(`users/${customer.uid}`, 'PUT', missingClaim, customer))
          .status,
        401,
      );
      const claimed = {
        ...missingClaim,
        offers: { signupOffer: { amount: 10, claimedAt: Date.now() } },
      };
      assert.equal(
        (await request(`users/${customer.uid}`, 'PUT', claimed, customer))
          .status,
        401,
      );
      const {
        claimSignupOfferForUser,
      } = require('../firebase-backend/functions/lib/payments');
      assert.equal(await claimSignupOfferForUser(customer.uid), 10);
      await assert.rejects(() => claimSignupOfferForUser(customer.uid));
      assert.equal(
        (await root.child(`users/${customer.uid}/wallet/balance`).get()).val(),
        60,
      );
      assert.equal(
        (
          await request(
            `users/${customer.uid}`,
            'PUT',
            { ...claimed, wallet: { balance: 70 } },
            customer,
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await request(
            `users/${customer.uid}/offers`,
            'DELETE',
            undefined,
            customer,
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await request(
            `callHistory/${customer.uid}/fake/archivedAt`,
            'PUT',
            Date.now(),
            customer,
          )
        ).status,
        401,
      );
    },
  );
  await t.test(
    'server reservation and existing admin rejection/payout preserve withdrawal behavior',
    async () => {
      await root.set(fixture());
      const earnings = {
        total: 150,
        available: 120,
        withdrawn: 30,
        creditedCalls: { old: { amount: 150 } },
      };
      await root.child(`users/${host.uid}/expertEarnings`).set(earnings);
      const reserved = {
        ...earnings,
        available: 0,
        pendingWithdrawal: {
          id: 'local-withdrawal',
          amount: 120,
          requestedAt: Date.now(),
        },
      };
      assert.equal(
        (
          await request(
            `users/${host.uid}/expertEarnings`,
            'PUT',
            reserved,
            host,
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await request(
            `users/${host.uid}/expertEarnings`,
            'PUT',
            { ...reserved, total: 200 },
            host,
          )
        ).status,
        401,
      );
      const {
        reserveExpertWithdrawal,
      } = require('../firebase-backend/functions/lib/expertCompensation');
      const pending = await reserveExpertWithdrawal(host.uid);
      assert.equal(pending.amount, 120);
      assert.equal(pending.status, 'pending');
      await assert.rejects(() => reserveExpertWithdrawal(host.uid));
      const self = (await root.child(`users/${host.uid}`).get()).val();
      assert.equal(
        (
          await request(
            `users/${host.uid}`,
            'PUT',
            { ...self, lastSeen: Date.now() },
            host,
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await request(
            `users/${host.uid}`,
            'PATCH',
            { lastSeen: Date.now() },
            host,
          )
        ).status,
        200,
      );
      const fs = require('node:fs'),
        ts = require('typescript'),
        vm = require('node:vm');
      const ref = path => ({
        async once() {
          const response = await request(path, 'GET', undefined, administrator);
          assert.equal(response.status, 200);
          return { val: () => response.body };
        },
        async set(value) {
          const response = await request(path, 'PUT', value, administrator);
          assert.equal(response.status, 200);
        },
        async transaction(update) {
          for (let attempt = 0; attempt < 10; attempt++) {
            const url = `http://127.0.0.1:9000/speakly/${path}.json?ns=demo-speakly-local-default-rtdb&auth=${administrator.token}`;
            const read = await fetch(url, {
              headers: { 'X-Firebase-ETag': 'true' },
            });
            assert.equal(read.status, 200);
            const value = await read.json(),
              next = update(value);
            if (next === undefined)
              return { committed: false, snapshot: { val: () => value } };
            const write = await fetch(url, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'If-Match': read.headers.get('etag'),
              },
              body: JSON.stringify(next),
            });
            if (write.status === 412) continue;
            assert.equal(write.status, 200);
            return { committed: true, snapshot: { val: () => next } };
          }
          throw new Error('Local REST transaction retry limit');
        },
      });
      const sandbox = {
        exports: {},
        console,
        require: name =>
          name.includes('firebase/auth')
            ? {
                __esModule: true,
                default: () => ({ currentUser: { uid: administrator.uid } }),
              }
            : name === './firebase'
            ? { scopedDatabase: () => ({ ref }) }
            : { __esModule: true, default: {} },
      };
      vm.runInNewContext(
        ts.transpileModule(
          fs.readFileSync(
            require('node:path').join(
              __dirname,
              '../src/firebase/expertEarnings.ts',
            ),
            'utf8',
          ),
          {
            compilerOptions: {
              module: ts.ModuleKind.CommonJS,
              target: ts.ScriptTarget.ES2020,
              esModuleInterop: true,
            },
          },
        ).outputText,
        sandbox,
      );
      await sandbox.exports.processWithdrawalRequest(pending, 'rejected');
      assert.equal(
        (
          await root.child(`users/${host.uid}/expertEarnings/available`).get()
        ).val(),
        120,
      );
      const again = await reserveExpertWithdrawal(host.uid);
      await sandbox.exports.processWithdrawalRequest(again, 'paid');
      assert.equal(
        (
          await root.child(`users/${host.uid}/expertEarnings/withdrawn`).get()
        ).val(),
        150,
      );
      assert.equal(
        (
          await root.child(`users/${host.uid}/expertEarnings/available`).get()
        ).val(),
        0,
      );
      await assert.rejects(() =>
        sandbox.exports.processWithdrawalRequest(again, 'paid'),
      );
    },
  );
  await t.test(
    'HTTP API enforces current protocol and authenticates claim requests',
    async () => {
      const { api } = require('../firebase-backend/functions/lib/index');
      const http = require('node:http');
      const server = http.createServer(api);
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      try {
        const endpoint = `http://127.0.0.1:${server.address().port}/claimCall`;
        const old = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostUid: host.uid }),
        });
        assert.equal(old.status, 426);
        const unsigned = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Speakly-Call-Protocol': '2',
          },
          body: JSON.stringify({ hostUid: host.uid }),
        });
        assert.equal(unsigned.status, 409);
        await root.set(fixture());
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Speakly-Call-Protocol': '2',
            Authorization: `Bearer ${customer.token}`,
          },
          body: JSON.stringify({ hostUid: host.uid }),
        });
        assert.equal(response.status, 200);
        assert.ok((await response.json()).room.currentCallId);
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    },
  );
  await t.test(
    'abandoned ringing/accepted sessions finalize with zero charges and the correct history status',
    async () => {
      await root.set(fixture());
      const missed = await claimCallForUser(host.uid, customer.uid),
        failed = await claimCallForUser(host2.uid, customer2.uid);
      await root.child(`rooms/${host2.uid}/status`).set('accepted');
      const clock = Date.now,
        now = clock();
      Date.now = () => now + 90000;
      try {
        const {
          cleanupStaleCalls,
        } = require('../firebase-backend/functions/lib/staleCalls');
        await cleanupStaleCalls.run({});
      } finally {
        Date.now = clock;
      }
      const history = (
        await root
          .child(`callHistory/${customer.uid}/${missed.currentCallId}`)
          .get()
      ).val();
      assert.equal(history.status, 'Missed');
      assert.equal(history.duration, 0);
      assert.equal(history.amount, 0);
      const accepted = (
        await root
          .child(`callHistory/${customer2.uid}/${failed.currentCallId}`)
          .get()
      ).val();
      assert.equal(accepted.status, 'Failed');
      assert.equal(accepted.amount, 0);
      assert.equal(
        (await root.child(`rooms/${host.uid}/status`).get()).val(),
        'waiting',
      );
      assert.equal(
        (await root.child(`rooms/${host2.uid}/status`).get()).val(),
        'waiting',
      );
    },
  );
  await t.test(
    'same-host contention and caller exclusivity are enforced atomically, including rate caps',
    async () => {
      await root.set(fixture());
      const results = await Promise.allSettled([
        claimCallForUser(host.uid, customer.uid),
        claimCallForUser(host.uid, customer2.uid),
      ]);
      assert.equal(
        results.filter(result => result.status === 'fulfilled').length,
        1,
      );
      const winner = results.find(result => result.status === 'fulfilled').value
        .male.uid;
      await assert.rejects(() => claimCallForUser(host2.uid, winner));
      const loser = winner === customer.uid ? customer2 : customer;
      await root.child(`users/${host2.uid}/profile/price`).set(10);
      await assert.rejects(() => claimCallForUser(host2.uid, loser.uid, 5));
      assert.equal(
        (await root.child(`rooms/${host2.uid}/status`).get()).val(),
        'waiting',
      );
      await root.child(`users/${host2.uid}/profile/price`).set(5);
      assert.equal(
        (await claimCallForUser(host2.uid, loser.uid, 5)).callRatePerMinute,
        5,
      );
    },
  );
  await t.test(
    'new-account creation, install tracking and safe in-call profile edits remain usable',
    async () => {
      await root.set(fixture());
      const fresh = await account('new-account');
      const data = {
        ...profile(fresh),
        wallet: { balance: 0 },
        verification: { voiceVerified: false },
      };
      assert.equal(
        (await request(`users/${fresh.uid}`, 'PUT', data, fresh)).status,
        200,
      );
      const device = `local-device-${Date.now()}`;
      assert.equal(
        (
          await request(
            `userFirstInstall/${device}`,
            'PUT',
            { deviceId: device, date: Date.now() },
            customer,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            `userFirstInstall/${device}`,
            'PUT',
            { deviceId: device, date: Date.now() },
            customer,
          )
        ).status,
        401,
      );
      const call = await claimCallForUser(host.uid, customer.uid);
      assert.equal(
        (await request(`rooms/${host.uid}/status`, 'PUT', 'accepted', host))
          .status,
        200,
      );
      await applyCallEvent(
        host.uid,
        call.currentCallId,
        customer.uid,
        'connected',
      );
      await applyCallEvent(host.uid, call.currentCallId, host.uid, 'connected');
      assert.equal(
        (await root.child(`users/${host.uid}/profile/status`).get()).val(),
        'busy',
      );
      assert.equal(
        (
          await request(
            `rooms/${host.uid}/female`,
            'PATCH',
            { name: 'Naya Naam', avatarId: 2 },
            host,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            `rooms/${host.uid}/female`,
            'PATCH',
            { uid: outsider.uid },
            host,
          )
        ).status,
        401,
      );
      await applyCallEvent(host.uid, call.currentCallId, customer.uid, 'end');
      assert.equal(
        (await root.child(`users/${host.uid}/profile/status`).get()).val(),
        'online',
      );
    },
  );
  await t.test(
    'notification triggers use real private ownership and current account roles without real FCM delivery',
    async () => {
      await root.set(fixture());
      await invoke(registerPushToken, customer, { token: 'customer-device' });
      await invoke(registerPushToken, host, { token: 'host-device' });
      await invoke(registerPushToken, host2, { token: 'host-two-device' });
      const messaging = admin.messaging(),
        original = messaging.sendEachForMulticast,
        outbox = [];
      messaging.sendEachForMulticast = async payload => {
        outbox.push(payload);
        return {
          successCount: payload.tokens.length,
          failureCount: 0,
          responses: payload.tokens.map(() => ({
            success: true,
            messageId: 'local-only',
          })),
        };
      };
      try {
        const {
          notifyAllUsersWhenExpertOnline,
        } = require('../firebase-backend/functions/lib/hostOnlineNotifications');
        const event = {
          id: 'online-once',
          params: { hostUid: host.uid },
          data: {
            before: { val: () => 'offline' },
            after: { val: () => 'online' },
          },
        };
        await notifyAllUsersWhenExpertOnline.run(event);
        await notifyAllUsersWhenExpertOnline.run(event);
        assert.equal(outbox.length, 1);
        assert.deepEqual(outbox[0].tokens, ['customer-device']);
        assert.equal(outbox[0].data.hostUid, host.uid);
        await invoke(registerPushToken, host2, { token: 'customer-device' });
        await notifyAllUsersWhenExpertOnline.run({
          ...event,
          id: 'after-role-switch',
        });
        assert.equal(outbox.length, 1);
        const newlyJoined = await account('new-customer');
        const before = await root.child(`users/${newlyJoined.uid}`).get();
        await root.child(`users/${newlyJoined.uid}`).set(profile(newlyJoined));
        const after = await root.child(`users/${newlyJoined.uid}`).get();
        const {
          notifyAdminsOnUserOnboarded,
        } = require('../firebase-backend/functions/lib/onboardingNotifications');
        const joined = {
          params: { uid: newlyJoined.uid },
          data: { before, after },
        };
        await notifyAdminsOnUserOnboarded.run(joined);
        await notifyAdminsOnUserOnboarded.run(joined);
        const hostAlerts = outbox.filter(
          payload => payload.data.type === 'new_customer',
        );
        assert.equal(hostAlerts.length, 1);
        assert.deepEqual(
          new Set(hostAlerts[0].tokens),
          new Set(['host-device', 'host-two-device', 'customer-device']),
        );
        const loginBefore = await root.child(`users/${newlyJoined.uid}`).get();
        await root.child(`users/${newlyJoined.uid}/lastSeen`).set(Date.now());
        await notifyAdminsOnUserOnboarded.run({
          params: { uid: newlyJoined.uid },
          data: {
            before: loginBefore,
            after: await root.child(`users/${newlyJoined.uid}`).get(),
          },
        });
        assert.equal(
          outbox.filter(payload => payload.data.type === 'new_customer').length,
          1,
        );
      } finally {
        messaging.sendEachForMulticast = original;
      }
    },
  );
  await t.test(
    'authorized admin realtime stream observes current call transitions and final history',
    async () => {
      await root.set(fixture());
      const controller = new AbortController(),
        deadline = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(
        `http://127.0.0.1:9000/speakly/rooms.json?ns=demo-speakly-local-default-rtdb&auth=${administrator.token}`,
        { headers: { Accept: 'text/event-stream' }, signal: controller.signal },
      );
      assert.equal(response.status, 200);
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = '';
      const until = async marker => {
        while (!buffer.includes(marker)) {
          const chunk = await reader.read();
          assert.equal(chunk.done, false, 'stream ended early');
          buffer += decoder.decode(chunk.value, { stream: true });
        }
      };
      try {
        await until('waiting');
        const call = await claimCallForUser(host.uid, customer.uid);
        await until(call.currentCallId);
        assert.equal(
          (await request(`rooms/${host.uid}/status`, 'PUT', 'accepted', host))
            .status,
          200,
        );
        await applyCallEvent(
          host.uid,
          call.currentCallId,
          customer.uid,
          'connected',
        );
        await applyCallEvent(
          host.uid,
          call.currentCallId,
          host.uid,
          'connected',
        );
        await until('active');
        await applyCallEvent(host.uid, call.currentCallId, customer.uid, 'end');
        await until('ended');
        const history = await request(
          `callHistory/${host.uid}`,
          'GET',
          undefined,
          administrator,
        );
        assert.equal(history.status, 200);
        assert.equal(Object.keys(history.body).length, 1);
        const entry = history.body[call.currentCallId];
        assert.equal(entry.maleInfo.uid, customer.uid);
        assert.equal(entry.femaleInfo.uid, host.uid);
        assert.equal(entry.amount, 5);
        assert.ok(entry.endedAt >= entry.startedAt);
        assert.ok(
          (
            await root
              .child(
                `users/${host.uid}/expertEarnings/creditedCalls/${call.currentCallId}/amount`,
              )
              .get()
          ).val() > 0,
        );
      } finally {
        clearTimeout(deadline);
        await reader.cancel().catch(() => {});
        controller.abort();
      }
    },
  );
  await admin.app().delete();
});
