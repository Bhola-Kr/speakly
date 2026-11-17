import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { creditExpertEarningsForCall } from './expertCompensation';
import { runDataTransaction } from './databaseTransaction';

export const LEASE_MS = 15000;
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
  const result = await runDataTransaction(root, data => {
    const host = data?.users?.[hostUid],
      caller = data?.users?.[uid],
      room = data?.rooms?.[hostUid];
    if (
      !caller ||
      caller.isExpert === true ||
      uid === hostUid ||
      host?.isExpert !== true ||
      host.profile?.status !== 'online' ||
      !room ||
      !['waiting', 'ended', 'rejected', 'men_rejected'].includes(room.status)
    )
      return;
    if (
      Object.values(data.rooms).some(
        (other: any) =>
          other.male?.uid === uid &&
          ['calling', 'ringing', 'accepted', 'active'].includes(other.status),
      )
    )
      return;
    const blocked = (a: string, b: string) =>
      data.blocks?.[a]?.[b] && data.blocks[a][b].isActive !== false;
    if (blocked(uid, hostUid) || blocked(hostUid, uid)) return;
    const rate =
      Number(host.profile.price) > 0 ? Number(host.profile.price) : 5;
    if (rate > maximumRate) return;
    if (Number(caller.wallet?.balance || 0) < rate) return;
    data.rooms[hostUid] = {
      ...room,
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
      updatedAt: now,
      callRatePerMinute: rate,
      male: {
        uid,
        name: caller.profile?.name || 'User',
        gender: caller.profile?.gender || '',
        avatarId: caller.profile?.avatarId || 1,
      },
      female: {
        ...room.female,
        uid: hostUid,
        price: rate,
        name: String(host.profile?.name || room.female?.name || 'Host'),
        tamilName: String(host.profile?.tamilName || ''),
        avatarId: host.profile?.avatarId || room.female?.avatarId || 1,
        gender: String(host.profile?.gender || room.female?.gender || ''),
      },
      agora: {
        channelName: `call_${callId}`,
        male: { uid: 1, token: '' },
        female: { uid: 2, token: '' },
      },
    };
    return data;
  });
  if (!result.committed)
    throw new Error(
      'Expert available nahi hai, call chal rahi hai, ya balance kam hai.',
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
  } catch {
    return res
      .status(409)
      .json({
        success: false,
        message:
          'Expert available nahi hai, call chal rahi hai, ya balance kam hai.',
      });
  }
}
// Pure transition, used inside one atomic RTDB transaction with the wallet.
export function advanceBilling(
  room: any,
  uid: string,
  event: string,
  now: number,
) {
  const caller = room.male?.uid;
  const host = room.female?.uid;
  if (
    ![caller, host].includes(uid) ||
    !['accepted', 'active'].includes(room.status)
  )
    return false;
  const reports = room.billingReports || {};
  const previous = reports[uid];
  if (
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
  const confirmedUntil = both
    ? Math.min(a.seenAt, b.seenAt)
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
      ![room.male?.uid, room.female?.uid].includes(uid)
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
    const target = room.callStartedAt
      ? Math.max(1, Math.ceil(Number(room.billableMs || 0) / 60000)) * rate
      : 0;
    const due = Math.max(0, target - Number(room.chargedAmount || 0));
    if (due && (!wallet || Number(wallet.balance || 0) < due))
      insufficient = true;
    else if (due) {
      wallet.balance = Number(wallet.balance || 0) - due;
      room.chargedAmount = Number(room.chargedAmount || 0) + due;
    }
    if (event === 'end' || insufficient) {
      if (insufficient)
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
    if (history) await creditExpertEarningsForCall(callId, history);
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
      !hostUid ||
      !callId ||
      !['connected', 'heartbeat', 'disconnected', 'end'].includes(event)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Call ka event sahi nahi hai.' });
    }
    return res.json(await applyCallEvent(hostUid, callId, user.uid, event));
  } catch {
    return res.status(403).json({
      success: false,
      message: 'Call verify nahi hui. Dobara try karo.',
    });
  }
}
