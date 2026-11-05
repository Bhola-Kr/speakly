import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onValueWritten } from 'firebase-functions/v2/database';

const DATA_ROOT = 'speakly';
const GENERAL_NOTIFICATION_CHANNEL_ID = 'voicetamil_general';
const USER_PATH = '/speakly/users/{uid}';

type OnboardingRole = 'learner' | 'expert';

const completedOnboarding = (user: any) => {
  const profile = user?.profile;
  const role = profile?.role;
  const gender = profile?.gender;
  const name = typeof profile?.name === 'string' ? profile.name.trim() : '';

  return (
    name.length >= 3 &&
    profile?.avatarSelected === true &&
    (gender === 'male' || gender === 'female') &&
    (role === 'learner' || role === 'expert')
  );
};

const adminTokens = (usersSnapshot: admin.database.DataSnapshot) => {
  const tokens: string[] = [];
  usersSnapshot.forEach(child => {
    const user = child.val();
    if (user?.isAdmin !== true) return;

    const tokenValue = user.fcmTokens;
    const token =
      typeof tokenValue === 'string' ? tokenValue : tokenValue?.token;
    if (typeof token === 'string' && token.trim()) tokens.push(token.trim());
  });
  return [...new Set(tokens)];
};

export const notifyAdminsOnUserOnboarded = onValueWritten(
  USER_PATH,
  async event => {
    const uid = String(event.params.uid || '');
    const previousUser = event.data.before.val();
    const user = event.data.after.val();

    if (
      !uid ||
      !user ||
      completedOnboarding(previousUser) ||
      !completedOnboarding(user)
    ) {
      return;
    }

    const notificationRef = admin
      .database()
      .ref(`${DATA_ROOT}/onboardingAdminNotifications/${uid}`);
    const claim = await notificationRef.transaction(current => {
      if (current) return;
      return { claimedAt: Date.now() };
    });
    if (!claim.committed) return;

    const name = String(user.profile.name).trim();
    const role = user.profile.role as OnboardingRole;

    try {
      const usersSnapshot = await admin
        .database()
        .ref(`${DATA_ROOT}/users`)
        .once('value');
      const tokens = adminTokens(usersSnapshot);
      let delivered = 0;

      for (let offset = 0; offset < tokens.length; offset += 500) {
        const result = await admin.messaging().sendEachForMulticast({
          tokens: tokens.slice(offset, offset + 500),
          notification: {
            title: 'New user onboarded',
            body: `${name} joined Speakly as a ${role}.`,
          },
          data: {
            type: 'user_onboarded',
            uid,
            role,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: GENERAL_NOTIFICATION_CHANNEL_ID,
              sound: 'default',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
              'apns-push-type': 'alert',
            },
            payload: { aps: { sound: 'default' } },
          },
        });
        delivered += result.successCount;
      }

      await notificationRef.update({
        delivered,
        sentAt: Date.now(),
      });
      logger.info('User onboarding admin notifications processed', {
        uid,
        role,
        delivered,
      });
    } catch (error) {
      await notificationRef.remove();
      logger.error('Notify admins of user onboarding failed', { uid, error });
      throw error;
    }
  },
);
