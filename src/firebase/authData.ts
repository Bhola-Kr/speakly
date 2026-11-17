import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { fetchFirebaseToken } from '../api/calls';
import { Alert } from 'react-native';
import { normalizeCallRate } from '../constants/constants';
import { unregisterPushNotifications } from '../notifications/pushNotifications';
import RoomService from './RoomService';
import { databaseRef } from './firebase';

export type UpdateProfileData = {
  id?: string;
  name?: string;
  tamilName?: string;
  image?: string;
  gender?: string;
  role?: 'learner' | 'expert';
  practiceLanguage?: string;
  nativeLanguage?: string;
  supportedLanguages?: string[];
  topics?: string[];
  category?: string;
  birthYear?: number | string;
  avatarId?: number | string;
  avatarSelected?: boolean;
  status?: string;
};

export type VerificationData = {
  phoneVerified?: boolean;
  voiceVerified?: boolean;
};

const ACCOUNT_DELETION_DELAY_MS = 15 * 24 * 60 * 60 * 1000;
const GOOGLE_DEFAULT_PAYMENT_PHONE = '8826520717';

class AuthData {
  confirmation: any = null;

  loginWithGoogle = async () => {
    GoogleSignin.configure({
      webClientId:
        '336180604339-851dn2fb8qb8pgut3puigmr1na346h58.apps.googleusercontent.com',
    });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;

    const tokens = await GoogleSignin.getTokens();
    const credential = auth.GoogleAuthProvider.credential(
      response.data.idToken || tokens.idToken,
      tokens.accessToken,
    );
    const result = await auth().signInWithCredential(credential);
    await AsyncStorage.setItem('uid', result.user.uid);

    const isGoogleAccount = result.user.providerData.some(
      provider => provider.providerId === 'google.com',
    );
    if (isGoogleAccount && !result.user.phoneNumber) {
      await databaseRef(`users/${result.user.uid}`)
        .transaction(current => {
          if (!current) return;
          return {
            ...current,
            phone: current.phone || GOOGLE_DEFAULT_PAYMENT_PHONE,
            email: current.email || result.user.email || '',
            profile: {
              ...(current.profile || {}),
              phone: current.profile?.phone || GOOGLE_DEFAULT_PAYMENT_PHONE,
              email: current.profile?.email || result.user.email || '',
            },
            verification: {
              ...(current.verification || {}),
              phoneVerified: current.verification?.phoneVerified === true,
            },
          };
        })
        .catch(error =>
          console.warn('Unable to save Google account payment contact:', error),
        );
    }
    return result.user;
  };

  firebaseLogin = async (phone: string) => {
    try {
      const token = await fetchFirebaseToken(phone);

      if (!token) {
        throw new Error('Session verify nahi hui.');
      }

      const user = await this.loginWithCustomToken(token);

      if (!user?.uid) {
        throw new Error('Sign in verify nahi hua.');
      }

      await AsyncStorage.setItem('uid', user.uid);

      return user;
    } catch (error: any) {
      console.error('verifyOTPAndLogin:', error);

      let message = 'Kuch dikkat aa gayi. Dobara try karo.';

      if (
        !error?.code &&
        typeof error?.message === 'string' &&
        error.message.trim()
      ) {
        message = error.message;
      }

      Alert.alert('Verification Nahi Hui', message);

      throw new Error(message);
    }
  };

  loginWithCustomToken = async (token: string) => {
    const credential = await auth().signInWithCustomToken(token);

    await AsyncStorage.setItem('uid', credential.user.uid);

    return credential.user;
  };
  //-----------------------------
  // Create User
  //-----------------------------
  createUser = async (
    user: any,
    gender: string,
    role: 'learner' | 'expert' = 'learner',
    language = 'English',
  ) => {
    if (!user?.uid) {
      throw new Error('Account banane ke liye sign in zaroori hai.');
    }

    const uid = user.uid;
    const isGoogleAccount = user.providerData?.some(
      (provider: any) => provider.providerId === 'google.com',
    );
    const verifiedPhone = user.phoneNumber || '';
    const phone =
      verifiedPhone || (isGoogleAccount ? GOOGLE_DEFAULT_PAYMENT_PHONE : '');
    const email = user.email || '';
    const now = Date.now();

    await databaseRef(`users/${uid}`).transaction(currentUser => {
      // Creation must never rewrite an existing account's protected ledger.
      if (currentUser) return;
      const isNewAccount = !currentUser;
      const existing = currentUser || {};
      const profile = existing.profile || {};

      return {
        ...existing,
        uid,
        phone: existing.phone || phone,
        email: existing.email || email,
        createdAt: existing.createdAt || now,
        lastSeen: now,
        isExpert: existing.isExpert === true,
        profile: {
          avatarId: 1,
          avatarSelected: false,
          category: 'General',
          rating: 4.9,
          status: 'offline',
          name: '',
          tamilName: '',
          image: '',
          birthYear: '',
          age: '',
          ...profile,
          price: normalizeCallRate(profile.price),
          uid,
          phone: profile.phone || phone,
          email: profile.email || email,
          gender,
          role: existing.profile?.role || role,
          practiceLanguage: existing.profile?.practiceLanguage || language,
          nativeLanguage: existing.profile?.nativeLanguage || language,
          supportedLanguages: existing.profile?.supportedLanguages || [
            language,
          ],
        },
        verification: {
          phoneVerified: Boolean(verifiedPhone),
          voiceVerified: false,
          ...(existing.verification || {}),
        },
        wallet: {
          balance: 0,
          ...(existing.wallet || {}),
        },
        settings: {
          notification: true,
          ...(isNewAccount ? { voiceCallsEnabled: false } : {}),
          ...(existing.settings || {}),
        },
      };
    });
  };

  //-----------------------------
  // Current User
  //-----------------------------

  getCurrentUser = () => {
    return auth().currentUser;
  };

  //-----------------------------
  // Logout
  //-----------------------------

  logout = async () => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      const user = await this.getUser(currentUser.uid);
      if (user?.isExpert === true) {
        await RoomService.goOffline();
      }
    }
    await unregisterPushNotifications();
    await auth().signOut();
    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut().catch(() => null);
    }

    await AsyncStorage.removeItem('uid');
  };

  //-----------------------------
  // User Details
  //-----------------------------

  getUser = async (uid: string) => {
    const snapshot = await databaseRef(`users/${uid}`).once('value');

    return snapshot.val();
  };

  //-----------------------------
  // Update User
  //-----------------------------

  updateUser = async (uid: string, data: any) => {
    await databaseRef(`users/${uid}`).update(data);
  };

  requestAccountDeletion = async () => {
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('Pehle sign in karo.');
    }

    const requestedAt = Date.now();
    const scheduledDeletionAt = requestedAt + ACCOUNT_DELETION_DELAY_MS;

    await databaseRef(`users/${user.uid}/accountDeletion`).transaction(
      currentRequest => ({
        ...(currentRequest || {}),
        status: true,
        requestedAt: currentRequest?.requestedAt || requestedAt,
        scheduledDeletionAt:
          currentRequest?.scheduledDeletionAt || scheduledDeletionAt,
        updatedAt: requestedAt,
      }),
    );

    return { requestedAt, scheduledDeletionAt };
  };

  updateVerification = async (verificationData: VerificationData) => {
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('Pehle sign in karo.');
    }

    await databaseRef(`users/${user.uid}/verification`).update(
      verificationData,
    );
  };

  updateProfile = async (profileData: UpdateProfileData) => {
    try {
      const user = this.getCurrentUser();

      if (!user) {
        throw new Error('Pehle sign in karo.');
      }

      if (!profileData || Object.keys(profileData).length === 0) {
        throw new Error('Profile ki details nahi mili.');
      }

      await databaseRef(`users/${user.uid}/profile`).update(profileData);

      if (
        profileData.avatarId !== undefined ||
        profileData.name !== undefined ||
        profileData.tamilName !== undefined
      ) {
        const room = databaseRef(`rooms/${user.uid}`);
        const owner = await room.child('female/uid').once('value');
        if (owner.val() === user.uid) {
          await room.child('female').update({
            ...(profileData.avatarId !== undefined
              ? { avatarId: profileData.avatarId }
              : {}),
            ...(profileData.name !== undefined
              ? { name: profileData.name }
              : {}),
            ...(profileData.tamilName !== undefined
              ? { tamilName: profileData.tamilName }
              : {}),
          });
        }
      }

      // Keep Firebase Auth profile in sync
      if (profileData.name) {
        await user.updateProfile({
          displayName: profileData.name,
        });
      }

      return {
        success: true,
        message: 'Profile update ho gayi.',
      };
    } catch (error: any) {
      console.error('updateProfile:', error);

      let message = 'Profile update karte waqt dikkat aa gayi.';

      switch (error?.code) {
        case 'database/permission-denied':
          message = 'Is profile ko badalne ka access nahi hai.';
          break;

        case 'database/network-error':
          message = 'Network mein dikkat hai. Internet check karo.';
          break;

        default:
          if (!error?.code && error?.message) {
            message = error.message;
          }
      }

      throw new Error(message);
    }
  };
}

export default new AuthData();
