import { notificationAudience, tokensForAdmins } from './pushTokenOwnership';
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
      const tokens = await tokensForAdmins(usersSnapshot.val());
      if (role === 'learner' && user.isExpert !== true) {
        const registrations = await admin
          .database()
          .ref(`${DATA_ROOT}/pushTokenOwners`)
          .once('value');
        const hostTokens = notificationAudience(
          usersSnapshot.val(),
          registrations.val(),
          'host',
        );
        const hostClaim = await admin
          .database()
          .ref(`${DATA_ROOT}/newCustomerHostNotifications/${uid}`)
          .transaction(current => {
            if (current) return;
            return { claimedAt: Date.now() };
          });
        if (hostClaim.committed) {
          const recipients = [...hostTokens];
          for (let offset = 0; offset < recipients.length; offset += 500) {
            await admin.messaging().sendEachForMulticast({
              tokens: recipients.slice(offset, offset + 500),
              notification: {
                title: 'A new user joined Speakly! 🎉',
                body: 'A new user is ready to connect. Go online to get started!',
              },
              data: { type: 'new_customer', uid },
              android: {
                priority: 'high',
                notification: {
                  channelId: GENERAL_NOTIFICATION_CHANNEL_ID,
                  sound: 'default',
                },
              },
              apns: { payload: { aps: { sound: 'default' } } },
            });
          }
        }
      }
      let delivered = 0;

      for (let offset = 0; offset < tokens.length; offset += 500) {
        const result = await admin.messaging().sendEachForMulticast({
          tokens: tokens.slice(offset, offset + 500),
          notification: {
            title: 'New user joined',
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
