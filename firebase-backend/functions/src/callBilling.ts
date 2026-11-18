import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { creditExpertEarningsForCall } from './expertCompensation';
import { runDataTransaction } from './databaseTransaction';

export const LEASE_MS = 15000;
export class CallError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
const reserved = ['calling', 'ringing', 'accepted', 'active'];
const MINUTE_MS = 60_000;
const roundToPaise = (rupees: number) => Math.round(rupees * 100);

export async function claimCallForUser(
  hostUid: string,
  uid: string,
  maximumRate = Infinity,
) {
  if (!hostUid || /[.#$\[\]\/]/.test(hostUid))
    throw new Error('Expert ID sahi nahi hai.');
  const root = admin.database().ref('speakly');
  const callId = root.child('callHistory').push().key!;
  const now = Date.now();
  let failure: CallError | undefined;
  const result = await runDataTransaction(root, data => {
    failure = undefined;
    const host = data?.users?.[hostUid],
      caller = data?.users?.[uid],
      room = data?.rooms?.[hostUid];
    if (
      !caller ||
      caller.isExpert === true ||
      uid === hostUid ||
      host?.isExpert !== true
    ) {
      failure = new CallError('CALL_FORBIDDEN', 'Call access nahi mila.');
      return;
    }
    const blocked = (a: string, b: string) =>
      data.blocks?.[a]?.[b] && data.blocks[a][b].isActive !== false;
    if (blocked(uid, hostUid) || blocked(hostUid, uid)) {
      failure = new CallError(
        'CALL_FORBIDDEN',
        'Is expert ko call nahi kar sakte.',
      );
      return;
    }
    const busy = reserved.includes(room?.status);
    const offline =
      host.settings?.voiceCallsEnabled === false ||
      !['online', 'busy'].includes(host.profile?.status);
    if (busy || offline) {
      failure = new CallError(
        busy ? 'HOST_BUSY' : 'HOST_OFFLINE',
        busy
          ? 'Ye expert abhi kisi aur se baat kar rahe hain. Available hote hi hum aapko notify karenge.'
          : 'Ye expert abhi online nahi hain. Online aate hi hum aapko notify karenge.',
      );
      data.hostAvailabilityWatchers ||= {};
      data.hostAvailabilityWatchers[hostUid] ||= {};
      data.hostAvailabilityWatchers[hostUid][uid] = { createdAt: now };
      return data;
    }
    if (
      Object.values(data.rooms || {}).some(
        (other: any) =>
          other.male?.uid === uid &&
          ['calling', 'ringing', 'accepted', 'active'].includes(other.status),
      )
    ) {
      failure = new CallError(
        'CALLER_BUSY',
        'Pehle apni chal rahi call khatam karo.',
      );
      return;
    }
    const rate =
      Number.isFinite(Number(host.profile.price)) &&
      Number(host.profile.price) > 0
        ? Number(host.profile.price)
        : 5;
    if (rate > maximumRate) {
      failure = new CallError(
        'RATE_CHANGED',
        'Expert ka rate badal gaya. Dobara chuno.',
      );
      return;
    }
    if (
      !Number.isFinite(Number(caller.wallet?.balance || 0)) ||
      Number(caller.wallet?.balance || 0) < rate
    ) {
      failure = new CallError(
        'INSUFFICIENT_BALANCE',
        'Call ke liye wallet recharge karo.',
      );
      return;
    }
    data.rooms ||= {};
    host.profile.status = 'busy';
    data.rooms[hostUid] = {
      ...(room || {}),
      roomId: hostUid,
      createdAt: room?.createdAt || now,
      status: 'calling',
      currentCallId: callId,
      callRequestedAt: now,
      callStartedAt: null,
      chargedAmount: 0,
      callSettled: null,
      billingReports: null,
      billingSince: null,
      billingConfirmedAt: 0,
      billableMs: 0,
      billingMode: 'started-minute',
      updatedAt: now,
      callRatePerMinute: rate,
      male: {
        uid,
        name: caller.profile?.name || 'User',
        gender: caller.profile?.gender || '',
        avatarId: caller.profile?.avatarId || 1,
      },
      female: {
        ...room?.female,
        uid: hostUid,
        price: rate,
        name: String(host.profile?.name || room?.female?.name || 'Host'),
        tamilName: String(host.profile?.tamilName || ''),
        avatarId: host.profile?.avatarId || room?.female?.avatarId || 1,
        gender: String(host.profile?.gender || room?.female?.gender || ''),
      },
      agora: {
        channelName: `call_${callId}`,
        male: { uid: 1, token: '' },
        female: { uid: 2, token: '' },
      },
    };
    return data;
  });
  if (failure) throw failure;
  if (!result.committed)
    throw new CallError(
      'CALL_CONFLICT',
      'Call shuru nahi hui. Dobara try karo.',
    );
  return result.snapshot.child(`rooms/${hostUid}`).val();
}

export async function claimCall(req: Request, res: Response) {
  try {
    const user = await admin
      .auth()
      .verifyIdToken(
        String(req.headers.authorization || '').replace(/^Bearer /, ''),
      );
    return res.json({
      success: true,
      room: await claimCallForUser(
        String(req.body?.hostUid || ''),
        user.uid,
        Number(req.body?.maximumRate) || Infinity,
      ),
    });
  } catch (error) {
    return res.status(error instanceof CallError ? 409 : 401).json({
      success: false,
      code: error instanceof CallError ? error.code : 'UNAUTHENTICATED',
      message:
        error instanceof CallError ? error.message : 'Sign in verify nahi hui.',
    });
  }
}
// Pure transition shared by room updates and final wallet settlement.
export function advanceBilling(
  room: any,
  uid: string,
  event: string,
  now: number,
) {
  const caller = room.male?.uid;
  const host = room?.female?.uid;
  if (
    ![caller, host].includes(uid) ||
    !['accepted', 'active'].includes(room.status)
  )
    return false;
  const reports = room.billingReports || {};
  const previous = reports[uid];
  if (event !== 'end' && previous?.seenAt > now) return true;
  if (
    event !== 'end' &&
    Object.values(reports).some((report: any) => now - report.seenAt > LEASE_MS)
  )
    room.billingSince = null;
  // A heartbeat cannot reopen a paused session; only a fresh RTC connection can.
  if (event === 'connected' || (event === 'heartbeat' && previous?.connected)) {
    reports[uid] = { connected: true, seenAt: now };
  }
  const a = reports[caller];
  const b = reports[host];
  const both =
    a?.connected &&
    b?.connected &&
    now - a.seenAt <= LEASE_MS &&
    now - b.seenAt <= LEASE_MS;
  // Close the tail between the last heartbeat and an explicit hangup or
  // disconnect while both leases are still live.
  const closesConnectedInterval =
    (room.billingMode === 'started-minute' &&
      (event === 'end' || event === 'disconnected')) ||
    (room.billingMode === 'prorated' && event === 'end');
  const confirmedUntil = both
    ? closesConnectedInterval
      ? now
      : Math.min(a.seenAt, b.seenAt)
    : Number(room.billingConfirmedAt || 0);
  if (room.billingSince && confirmedUntil > room.billingConfirmedAt) {
    room.billableMs =
      Number(room.billableMs || 0) +
      Math.max(
        0,
        confirmedUntil - Math.max(room.billingSince, room.billingConfirmedAt),
      );
    room.billingConfirmedAt = confirmedUntil;
  }
  if (event === 'disconnected' || event === 'end')
    reports[uid] = { connected: false, seenAt: now };
  if (!both || event === 'disconnected' || event === 'end')
    room.billingSince = null;
  else if (!room.billingSince) {
    room.billingSince = now;
    room.billingConfirmedAt = now;
    room.callStartedAt = room.callStartedAt || now;
    room.status = 'active';
  }
  room.billingReports = reports;
  room.updatedAt = now;
  return true;
}

export async function applyCallEvent(
  hostUid: string,
  callId: string,
  uid: string,
  event: string,
) {
  const root = admin.database().ref('speakly');
  const now = Date.now();
  let insufficient = false;
  const transaction = await runDataTransaction(root, data => {
    insufficient = false;
    const room = data?.rooms?.[hostUid];
    if (
      !room ||
      room.currentCallId !== callId ||
      ![room.male?.uid, room?.female?.uid].includes(uid)
    )
      return;
    if (room.status === 'ended') return data; // Idempotent end/heartbeat.
    const unanswered = [
      'calling',
      'ringing',
      'rejected',
      'men_rejected',
    ].includes(room.status);
    if (event === 'end' && unanswered) {
      room.callStartedAt = null;
      room.chargedAmount = 0;
      room.billableMs = 0;
    } else if (!advanceBilling(room, uid, event, now)) return;
    const rate = Number(room.callRatePerMinute);
    if (!Number.isFinite(rate) || rate <= 0) return;
    const wallet = data.users?.[room.male.uid]?.wallet;
    if (room.status === 'active' && data.users?.[hostUid]?.profile)
      data.users[hostUid].profile.status = 'busy';
    const prorated = room.billingMode === 'prorated';
    const startedMinute = room.billingMode === 'started-minute';
    const elapsedMinutes = Number(room.billableMs || 0) / MINUTE_MS;
    let billedMinutes = 0;
    if (startedMinute && event === 'end') {
      const ratePaise = roundToPaise(rate);
      if (ratePaise <= 0) return;
      const minutesStarted = room.callStartedAt
        ? Math.max(1, Math.ceil(elapsedMinutes))
        : 0;
      const balance = Math.max(0, roundToPaise(Number(wallet?.balance) || 0));
      billedMinutes = Math.min(minutesStarted, Math.floor(balance / ratePaise));
      const payment = billedMinutes * ratePaise;
      insufficient = billedMinutes < minutesStarted;
      if (payment && wallet) wallet.balance = (balance - payment) / 100;
      room.chargedAmount = payment / 100;
    } else if (prorated) {
      const billableSeconds = Math.ceil(Number(room.billableMs || 0) / 1000);
      const targetPaise = Math.round((billableSeconds * rate * 100) / 60);
      const alreadyPaid = Math.round(Number(room.chargedAmount || 0) * 100);
      const due = Math.max(0, targetPaise - alreadyPaid);
      const available = Number(wallet?.balance || 0);
      const balance = Number.isFinite(available)
        ? Math.max(0, Math.round(available * 100))
        : 0;
      const payment = Math.min(balance, due);
      insufficient = payment < due;
      if (payment && wallet) {
        wallet.balance = (balance - payment) / 100;
        room.chargedAmount = (alreadyPaid + payment) / 100;
      }
    } else if (!startedMinute) {
      const target = room.callStartedAt
        ? Math.max(1, Math.ceil(elapsedMinutes)) * rate
        : 0;
      const due = Math.max(0, target - Number(room.chargedAmount || 0));
      if (due && (!wallet || Number(wallet.balance || 0) < due))
        insufficient = true;
      else if (due) {
        wallet.balance = Number(wallet.balance || 0) - due;
        room.chargedAmount = Number(room.chargedAmount || 0) + due;
      }
    }
    if (event === 'end' || insufficient) {
      if (insufficient && !prorated && !startedMinute)
        room.billableMs = Math.min(
          Number(room.billableMs || 0),
          (Number(room.chargedAmount || 0) / rate) * 60000,
        );
      room.status = 'ended';
      room.callSettled = true;
      room.billingSince = null;
      const host = data.users?.[hostUid];
      if (host?.profile)
        host.profile.status =
          host.settings?.voiceCallsEnabled === false ? 'offline' : 'online';
      const history = {
        callId,
        startedAt: room.callStartedAt || room.callRequestedAt || now,
        endedAt: now,
        duration: Number(room.billableMs || 0),
        ...(prorated
          ? {
              billingMode: 'prorated',
              billableSeconds: Math.ceil(Number(room.billableMs || 0) / 1000),
            }
          : startedMinute
          ? { billingMode: 'started-minute', billedMinutes }
          : {}),
        amount: Number(room.chargedAmount || 0),
        callRatePerMinute: rate,
        status: room.callStartedAt
          ? 'Completed'
          : unanswered
          ? 'Missed'
          : 'Failed',
        maleInfo: room.male,
        femaleInfo: room.female,
      };
      data.callHistory ||= {};
      for (const participant of [room.male.uid, hostUid]) {
        data.callHistory[participant] ||= {};
        data.callHistory[participant][callId] = history;
      }
    }
    return data;
  });
  if (!transaction.committed) throw new Error('Call ab active nahi hai.');
  const data = transaction.snapshot.val();
  const room = data.rooms[hostUid];
  if (room.status === 'ended') {
    const history = data.callHistory?.[hostUid]?.[callId];
    if (history) {
      const expertAmount = await creditExpertEarningsForCall(callId, history);
      if (expertAmount > 0) {
        await Promise.all([
          root.child(`callHistory/${hostUid}/${callId}`).update({
            expertAmount,
          }),
          root.child(`callHistory/${room.male.uid}/${callId}`).update({
            expertAmount,
          }),
        ]);
      }
    }
  }
  return {
    success: true,
    active: room.status === 'active',
    ended: room.status === 'ended',
    insufficient,
    startedAt: room.callStartedAt || now,
    duration: Number(room.billableMs || 0),
  };
}

export async function callSessionEvent(req: Request, res: Response) {
  try {
    const token = String(req.headers.authorization || '').replace(
      /^Bearer /,
      '',
    );
    const user = await admin.auth().verifyIdToken(token);
    const { hostUid, callId, event } = req.body || {};
    if (
      typeof hostUid !== 'string' ||
      !hostUid ||
      /[.#$\[\]\/]/.test(hostUid) ||
      !callId ||
      !['connected', 'heartbeat', 'disconnected', 'end'].includes(event)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Call ka event sahi nahi hai.' });
    }
    return res.json(await reportCallEvent(hostUid, callId, user.uid, event));
  } catch {
    return res.status(403).json({
      success: false,
      message: 'Call verify nahi hui. Dobara try karo.',
    });
  }
}

export async function reportCallEvent(
  hostUid: string,
  callId: string,
  uid: string,
  event: string,
) {
  if (event === 'end') return applyCallEvent(hostUid, callId, uid, event);

  const database = admin.database();
  const now = Date.now();
  let legacy = false;
  const result = await runDataTransaction(
    database.ref(`speakly/rooms/${hostUid}`),
    room => {
      legacy = false;
      if (
        !room ||
        room.currentCallId !== callId ||
        ![room.male?.uid, room.female?.uid].includes(uid)
      )
        return;
      legacy =
        room.billingMode !== 'prorated' && room.billingMode !== 'started-minute';
      if (legacy) return;
      if (room.status === 'ended' || advanceBilling(room, uid, event, now))
        return room;
    },
  );
  if (legacy) return applyCallEvent(hostUid, callId, uid, event);
  if (!result.committed) throw new Error('Call ab active nahi hai.');

  const room = result.snapshot.val();
  if (
    room.status === 'active' &&
    event === 'heartbeat' &&
    room.male.uid === uid
  ) {
    const balance = Number(
      (
        await database.ref(`speakly/users/${uid}/wallet/balance`).once('value')
      ).val() || 0,
    );
    const ratePaise = roundToPaise(Number(room.callRatePerMinute));
    const balancePaise = roundToPaise(balance);
    const durationMs = Number(room.billableMs || 0);
    const billedSeconds = Math.ceil(durationMs / 1000);
    const due =
      Math.round((billedSeconds * room.callRatePerMinute * 100) / 60) -
      roundToPaise(Number(room.chargedAmount || 0));
    const outOfCredit =
      room.billingMode === 'started-minute'
        ? ratePaise > 0 &&
          (balancePaise < ratePaise ||
            durationMs >= Math.floor(balancePaise / ratePaise) * MINUTE_MS)
        : due > 0 && due >= balancePaise;
    if (outOfCredit) {
      const settled = await applyCallEvent(hostUid, callId, uid, 'end');
      return { ...settled, insufficient: true };
    }
  }

  return {
    success: true,
    active: room.status === 'active',
    ended: room.status === 'ended',
    insufficient: false,
    startedAt: room.callStartedAt || now,
    duration: Number(room.billableMs || 0),
  };
}

// Host answer/reject and caller cancellation use a warm server transaction.
// Retried answers are idempotent; stale notifications cannot accept a new call.
export async function transitionCall(req: Request, res: Response) {
  try {
    const actor = await admin
      .auth()
      .verifyIdToken(
        String(req.headers.authorization || '').replace(/^Bearer /, ''),
      );
    const { hostUid, callId, action } = req.body || {};
    if (
      !hostUid ||
      /[.#$\[\]\/]/.test(hostUid) ||
      !callId ||
      !['accept', 'reject', 'cancel', 'ring'].includes(action)
    )
      return res
        .status(400)
        .json({ success: false, message: 'Call action sahi nahi hai.' });
    if (action === 'accept' || action === 'ring') {
      const database = admin.database();
      if (
        actor.uid !== hostUid ||
        (
          await database.ref(`speakly/users/${hostUid}/isExpert`).once('value')
        ).val() !== true
      ) {
        return res
          .status(403)
          .json({ success: false, message: 'Call access verify nahi hua.' });
      }
      const result = await runDataTransaction(
        database.ref(`speakly/rooms/${hostUid}`),
        room => {
          if (room?.currentCallId !== callId || room.female?.uid !== hostUid)
            return;
          const nextStatus = action === 'accept' ? 'accepted' : 'ringing';
          if (
            room.status === nextStatus ||
            (action === 'accept' && room.status === 'active')
          )
            return room;
          if (
            !['calling', 'ringing'].includes(room.status) ||
            Date.now() - Number(room.callRequestedAt || 0) > 30000
          )
            return;
          return { ...room, status: nextStatus, updatedAt: Date.now() };
        },
      );
      return result.committed
        ? res.json({ success: true })
        : res.status(409).json({
            success: false,
            message: 'Call ab available nahi hai.',
          });
    }
    const result = await runDataTransaction(
      admin.database().ref('speakly'),
      data => {
        const room = data?.rooms?.[hostUid];
        if (!room || room.currentCallId !== callId) return;
        const host = data.users?.[hostUid];
        if (
          action === 'cancel'
            ? room.male?.uid !== actor.uid
            : actor.uid !== hostUid || host?.isExpert !== true
        )
          return;
        if (!['calling', 'ringing'].includes(room.status)) return;
        room.status = action === 'reject' ? 'rejected' : 'men_rejected';
        room.updatedAt = Date.now();
        if (host?.profile)
          host.profile.status =
            host.settings?.voiceCallsEnabled === false ? 'offline' : 'online';
        return data;
      },
    );
    if (!result.committed)
      return res
        .status(409)
        .json({ success: false, message: 'Call ab available nahi hai.' });
    return res.json({ success: true });
  } catch {
    return res
      .status(401)
      .json({ success: false, message: 'Call access verify nahi hua.' });
  }
}

export async function setHostAvailability(req: Request, res: Response) {
  try {
    const actor = await admin
      .auth()
      .verifyIdToken(
        String(req.headers.authorization || '').replace(/^Bearer /, ''),
      );
    const online = req.body?.online;
    if (typeof online !== 'boolean')
      return res
        .status(400)
        .json({ success: false, message: 'Status sahi nahi hai.' });
    const result = await runDataTransaction(
      admin.database().ref('speakly'),
      data => {
        const host = data?.users?.[actor.uid];
        if (host?.isExpert !== true) return;
        host.settings ||= {};
        host.settings.voiceCallsEnabled = online;
        const current = data.rooms?.[actor.uid];
        if (reserved.includes(current?.status)) {
          host.profile.status = online ? 'busy' : 'offline';
          return data;
        }
        host.profile.status = online ? 'online' : 'offline';
        data.rooms ||= {};
        data.rooms[actor.uid] = {
          roomId: actor.uid,
          currentCallId: '',
          status: online ? 'waiting' : 'offline',
          female: {
            uid: actor.uid,
            name: host.profile.name || 'Expert',
            gender: host.profile.gender || '',
            avatarId: host.profile.avatarId || 1,
            price: Number(host.profile.price) || 5,
          },
          callRatePerMinute: Number(host.profile.price) || 5,
          createdAt: current?.createdAt || Date.now(),
          updatedAt: Date.now(),
          agora: { male: { uid: 1, token: '' }, female: { uid: 2, token: '' } },
        };
        return data;
      },
    );
    if (!result.committed)
      return res
        .status(403)
        .json({ success: false, message: 'Expert access zaroori hai.' });
    return res.json({ success: true });
  } catch {
    return res
      .status(401)
      .json({ success: false, message: 'Sign in verify nahi hui.' });
  }
}
