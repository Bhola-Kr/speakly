const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const snapshot = (value, key) => ({
  key,
  val: () => value,
  child: name => snapshot(value?.[name], name),
  forEach: fn => {
    for (const [k, v] of Object.entries(value || {})) fn(snapshot(v, k));
  },
});
function load(file, users) {
  for (const user of Object.values(users))
    user.profile = {
      name: 'Test User',
      gender: 'male',
      avatarSelected: true,
      ...user.profile,
    };
  const sent = [],
    claims = new Map();
  const registrations = {};
  for (const [uid, user] of Object.entries(users)) {
    const token =
      typeof user.fcmTokens === 'string'
        ? user.fcmTokens
        : user.fcmTokens?.token;
    if (!token || users[registrations[token]?.uid]?.isExpert === true) continue;
    registrations[token] = { uid, token };
  }
  const admin = {
    database: () => ({
      ref: path => ({
        once: async () =>
          snapshot(
            path === 'speakly/users'
              ? users
              : path === 'speakly/pushTokenOwners'
              ? registrations
              : path.startsWith('speakly/rooms/')
              ? { status: 'waiting', female: { uid: path.split('/').at(-1) } }
              : users[path.split('/').at(-1)],
          ),
        transaction: async fn => {
          const next = fn(claims.get(path));
          if (next) claims.set(path, next);
          return { committed: !!next };
        },
        update: async () => {},
        remove: async () => {},
      }),
    }),
    messaging: () => ({
      sendEachForMulticast: async payload => {
        sent.push(payload);
        return { successCount: payload.tokens.length, failureCount: 0 };
      },
    }),
  };
  const sandbox = {
    exports: {},
    require: name =>
      name.includes('pushTokenOwnership')
        ? {
            notificationAudience:
              require('../firebase-backend/functions/lib/pushTokenOwnership')
                .notificationAudience,
            tokensForAdmins: async () =>
              Object.values(registrations)
                .filter(entry => users[entry.uid]?.isAdmin === true)
                .map(entry => entry.token),
          }
        : name === 'firebase-admin'
        ? admin
        : name.includes('/database')
        ? { onValueWritten: (_path, handler) => handler }
        : { logger: { info() {}, error() {} } },
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    sandbox,
  );
  return { handlers: sandbox.exports, sent };
}
test('online audience excludes hosts, admins, opted-out customers and shared host tokens', async () => {
  const { handlers, sent } = load(
    'firebase-backend/functions/src/hostOnlineNotifications.ts',
    {
      host: {
        isExpert: true,
        profile: { role: 'expert', name: 'Tina' },
        fcmTokens: { token: 'host-token' },
      },
      customer: {
        profile: { role: 'learner' },
        fcmTokens: { token: 'customer-token' },
      },
      staleCustomer: { profile: { role: 'learner' }, fcmTokens: 'host-token' },
      admin: {
        isAdmin: true,
        profile: { role: 'learner' },
        fcmTokens: 'admin-token',
      },
      optedOut: {
        profile: { role: 'learner' },
        settings: { notificationsEnabled: false },
        fcmTokens: 'opted-out',
      },
    },
  );
  const event = {
    id: 'event-one',
    params: { hostUid: 'host' },
    data: { before: snapshot('offline'), after: snapshot('online') },
  };
  await handlers.notifyAllUsersWhenExpertOnline(event);
  assert.deepEqual(Array.from(sent[0].tokens), ['customer-token']);
  assert.equal(sent[0].data.hostUid, 'host');
  assert.equal(sent[0].data.eventId, 'event-one');
  await handlers.notifyAllUsersWhenExpertOnline(event);
  assert.equal(sent.length, 1);
  await handlers.notifyAllUsersWhenExpertOnline({
    ...event,
    id: 'event-two',
    data: { before: snapshot('online'), after: snapshot('online') },
  });
  assert.equal(sent.length, 1);
});
test('ordinary customer login does not repeat onboarding alerts', async () => {
  const { handlers, sent } = load(
    'firebase-backend/functions/src/onboardingNotifications.ts',
    {},
  );
  const user = {
    profile: {
      name: 'Customer',
      role: 'learner',
      gender: 'male',
      avatarSelected: true,
    },
  };
  await handlers.notifyAdminsOnUserOnboarded({
    params: { uid: 'customer' },
    data: {
      before: snapshot(user),
      after: snapshot({ ...user, lastLoginAt: 100 }),
    },
  });
  assert.equal(sent.length, 0);
});

test('unapproved expert role cannot send availability alerts', async () => {
  const { handlers, sent } = load(
    'firebase-backend/functions/src/hostOnlineNotifications.ts',
    {
      host: { isExpert: false, profile: { role: 'expert', name: 'Applicant' } },
      customer: { profile: { role: 'learner' }, fcmTokens: 'customer' },
    },
  );
  await handlers.notifyAllUsersWhenExpertOnline({
    id: 'unapproved',
    params: { hostUid: 'host' },
    data: { before: snapshot('offline'), after: snapshot('online') },
  });
  assert.equal(sent.length, 0);
});

test('genuinely new customer notifies approved hosts once, never applicants or customers', async () => {
  const users = {
    host: {
      isExpert: true,
      profile: { role: 'expert' },
      fcmTokens: 'approved-host',
    },
    applicant: {
      isExpert: false,
      profile: { role: 'expert' },
      fcmTokens: 'applicant',
    },
    customer: { profile: { role: 'learner' }, fcmTokens: 'customer' },
  };
  const { handlers, sent } = load(
    'firebase-backend/functions/src/onboardingNotifications.ts',
    users,
  );
  const user = {
    profile: {
      name: 'New Customer',
      role: 'learner',
      gender: 'male',
      avatarSelected: true,
    },
  };
  const event = {
    params: { uid: 'new-customer' },
    data: { before: snapshot(null), after: snapshot(user) },
  };
  await handlers.notifyAdminsOnUserOnboarded(event);
  await handlers.notifyAdminsOnUserOnboarded(event);
  const alerts = sent.filter(value => value.data.type === 'new_customer');
  assert.equal(alerts.length, 1);
  assert.deepEqual(Array.from(alerts[0].tokens), ['approved-host']);
  assert.ok(!alerts[0].notification.body.includes('waiting'));
});
