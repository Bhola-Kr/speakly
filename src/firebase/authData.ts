import database from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import auth from '@react-native-firebase/auth';
import { fetchFirebaseToken } from '../api/calls';
import { Alert } from 'react-native';

export type UpdateProfileData = {
  id?: string;
  name?: string;
  image?: string;
  gender?: string;
  birthYear?: number | string;
  avatarId?: number | string;
  status?: string;
};

class AuthData {
  confirmation: any = null;

  // Send OTP using MSG91
  //-----------------------------
  sendOTP = async (phone: string) => {
    try {
      const response = await OTPWidget.sendOTP({
        identifier: phone,
      });

      return response;
    } catch (error) {
      console.error('MSG91 OTP Error:', error);
      throw error;
    }
  };

  verifyOTPAndLogin = async (phone: string, code: string, reqId: string) => {
    try {
      console.log('verifyOTPAndLogin -> phone:', phone, reqId, code);
      if (!phone?.trim()) {
        Alert.alert('Error', 'Phone number is required.');
        return null;
      }

      if (!code?.trim()) {
        Alert.alert('Error', 'Please enter the OTP.');
        return null;
      }

      const res = await OTPWidget.verifyOTP({
        otp: code.trim(),
        reqId: reqId,
      });
      console.log('AuthData -> verifyOTPAndLogin -> res', res);

      if (res?.type === 'error') {
        throw new Error(res?.message || 'OTP verification failed.');
      }

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
  createUser = async (user: any, gender: string) => {
    console.log('createUser started');

    console.log('uid:', user.uid);

    console.log('Checking existing user...');
    const snapshot = await database().ref(`users/${user.uid}`).once('value');

    console.log('Snapshot received:', snapshot.exists());

    if (snapshot.exists()) {
      console.log('Updating existing user...');

      await database().ref(`users/${user.uid}`).update({
        lastSeen: Date.now(),
        'profile/gender': gender,
      });

      console.log('User updated');

      return;
    }

    console.log('Creating new user...');

    await database()
      .ref(`users/${user.uid}`)
      .set({
        uid: user.uid,
        phone: user.phoneNumber,
        createdAt: Date.now(),
        lastSeen: Date.now(),

        profile: {
          uid: user?.uid,
          phone: user?.phoneNumber,
          avatarId: 1,
          maritalStatus: 'Single',
          category: 'Relationship',
          price: 16,
          rating: 4.9,
          status: 'offline',
          name: '',
          image: '',
          gender: '',
          birthYear: '',
          age: '',
        },

        verification: {
          phoneVerified: true,
          voiceVerified: false,
        },

        wallet: {
          balance: 0,
        },

        settings: {
          notification: true,
        },
      });

    console.log('User created');
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
    await auth().signOut();

    await AsyncStorage.removeItem('uid');
  };

  //-----------------------------
  // User Details
  //-----------------------------

  getUser = async (uid: string) => {
    const snapshot = await database().ref(`users/${uid}`).once('value');

    return snapshot.val();
  };

  //-----------------------------
  // Update User
  //-----------------------------

  updateUser = async (uid: string, data: any) => {
    await database().ref(`users/${uid}`).update(data);
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

      await database().ref(`users/${user.uid}/profile`).update(profileData);

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
