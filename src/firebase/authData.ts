import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
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

class AuthData {
  confirmation: any = null;

  firebaseLogin = async (phone: string) => {
    try {
      const token = await fetchFirebaseToken(phone);

      if (!token) {
        throw new Error('Unable to generate Firebase token.');
      }

      const user = await this.loginWithCustomToken(token);

      if (!user?.uid) {
        throw new Error('Authentication failed.');
      }

      await AsyncStorage.setItem('uid', user.uid);

      return user;
    } catch (error: any) {
      console.error('verifyOTPAndLogin:', error);

      let message = 'Something went wrong. Please try again.';

      if (typeof error?.message === 'string' && error.message.trim()) {
        message = error.message;
      }

      Alert.alert('Verification Failed', message);

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
      throw new Error('A valid user is required to create an account.');
    }

    const uid = user.uid;
    const phone = user.phoneNumber || uid;
    const now = Date.now();

    await databaseRef(`users/${uid}`).transaction(currentUser => {
      const isNewAccount = !currentUser;
      const existing = currentUser || {};
      const profile = existing.profile || {};

      return {
        ...existing,
        uid,
        phone: existing.phone || phone,
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
          gender,
          role: existing.profile?.role || role,
          practiceLanguage: existing.profile?.practiceLanguage || language,
          nativeLanguage: existing.profile?.nativeLanguage || language,
          supportedLanguages:
            existing.profile?.supportedLanguages || [language],
        },
        verification: {
          phoneVerified: true,
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
      throw new Error('No authenticated user found.');
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
      throw new Error('No authenticated user found.');
    }

    await databaseRef(`users/${user.uid}/verification`).update(
      verificationData,
    );
  };

  updateProfile = async (profileData: UpdateProfileData) => {
    try {
      const user = this.getCurrentUser();

      if (!user) {
        throw new Error('No authenticated user found.');
      }

      if (!profileData || Object.keys(profileData).length === 0) {
        throw new Error('No profile data provided.');
      }

      await databaseRef(`users/${user.uid}/profile`).update(profileData);

      if (
        profileData.avatarId !== undefined ||
        profileData.name !== undefined ||
        profileData.tamilName !== undefined
      ) {
        await databaseRef(`rooms/${user.uid}`).transaction(room => {
          if (!room?.female || room.female.uid !== user.uid) {
            return;
          }

          const female = {
            ...room.female,
            ...(profileData.avatarId !== undefined
              ? { avatarId: profileData.avatarId }
              : {}),
            ...(profileData.name !== undefined
              ? { name: profileData.name }
              : {}),
            ...(profileData.tamilName !== undefined
              ? { tamilName: profileData.tamilName }
              : {}),
          };

          return {
            ...room,
            female,
            updatedAt: Date.now(),
          };
        });
      }

      // Keep Firebase Auth profile in sync
      if (profileData.name) {
        await user.updateProfile({
          displayName: profileData.name,
        });
      }

      return {
        success: true,
        message: 'Profile updated successfully.',
      };
    } catch (error: any) {
      console.error('updateProfile:', error);

      let message = 'Something went wrong while updating the profile.';

      switch (error?.code) {
        case 'database/permission-denied':
          message = 'You do not have permission to update this profile.';
          break;

        case 'database/network-error':
          message = 'Network error. Please check your internet connection.';
          break;

        default:
          if (error?.message) {
            message = error.message;
          }
      }

      throw new Error(message);
    }
  };
}

export default new AuthData();
