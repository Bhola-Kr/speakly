import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { runDataTransaction } from './databaseTransaction';

const hasNotificationProfile = (user: any) => {
  const name = String(user?.profile?.name || '').trim();
  return (
    user?.accountDeletion?.status !== true &&
    name.length >= 3 &&
    /^[\p{L}\p{M} .'-]+$/u.test(name) &&
    ['male', 'female'].includes(user?.profile?.gender) &&
    user?.profile?.avatarSelected === true
  );
};

export function notificationAudience(
  users: any,
  registrations: any,
  role: 'customer' | 'host',
) {
  const tokens = new Set<string>();
  for (const entry of Object.values(registrations || {}) as any[]) {
    const user = users?.[entry.uid];
    if (
      !user ||
      !hasNotificationProfile(user) ||
      user.isAdmin === true ||
      user.settings?.notificationsEnabled === false ||
      user.settings?.notification === false
    )
      continue;
    const expert = user.isExpert === true;
    if (role === 'host' ? !expert : expert || user.profile?.role !== 'learner')
      continue;
    if (typeof entry.token === 'string' && entry.token.trim())
      tokens.add(entry.token.trim());
  }
  return [...tokens];
}

export async function registerPushToken(req: Request, res: Response) {
  try {
    const user = await admin
      .auth()
      .verifyIdToken(
        String(req.headers.authorization || '').replace(/^Bearer /, ''),
      );
    const token = String(req.body?.token || '').trim();
    if (!token || token.length > 4096)
      return res
        .status(400)
        .json({ success: false, message: 'Notification token sahi nahi hai.' });
    const key = createHash('sha256').update(token).digest('hex');
    const root = admin.database().ref('speakly');
    const result = await runDataTransaction(root, data => {
      if (
        !data ||
        (req.body.remove !== true &&
          !hasNotificationProfile(data.users?.[user.uid]))
      )
        return;
      data.pushTokenOwners ||= {};
      if (req.body.remove === true) {
        if (data.pushTokenOwners[key]?.uid !== user.uid) return data;
        if (data.pushTokenOwners[key]?.uid === user.uid)
          delete data.pushTokenOwners[key];
      } else
        data.pushTokenOwners[key] = {
          uid: user.uid,
          token,
          updatedAt: Date.now(),
          platform: String(req.body.platform || ''),
        };
      // Remove legacy aliases for this device, including previous accounts.
      for (const account of Object.values(data.users || {}) as any[]) {
        delete account.fcmTokens;
      }
      return data;
    });
    if (!result.committed)
      return res
        .status(409)
        .json({ success: false, message: 'Account abhi ready nahi hai.' });
    return res.json({ success: true });
  } catch {
    return res
      .status(403)
      .json({ success: false, message: 'Sign in verify nahi hui.' });
  }
}

export async function tokensForUser(uid: string) {
  const snapshot = await admin
    .database()
    .ref('speakly/pushTokenOwners')
    .orderByChild('uid')
    .equalTo(uid)
    .once('value');
  return [
    ...new Set(
      (Object.values(snapshot.val() || {}) as any[])
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
        .map(entry => String(entry.token || ''))
        .filter(Boolean),
    ),
  ];
}

export async function tokensForAdmins(users: any) {
  const snapshot = await admin
    .database()
    .ref('speakly/pushTokenOwners')
    .once('value');
  return [
    ...new Set(
      (Object.values(snapshot.val() || {}) as any[])
        .filter(entry => users?.[entry.uid]?.isAdmin === true)
        .map(entry => String(entry.token || ''))
        .filter(Boolean),
    ),
  ];
}
