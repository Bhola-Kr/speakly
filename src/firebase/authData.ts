import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  //-----------------------------
  // Send OTP
  //-----------------------------
  sendOTP = async (phone: string) => {
    return await auth().signInWithPhoneNumber(phone);
  };

  //-----------------------------
  // Verify OTP
  //-----------------------------

  verifyOTP = async (confirmation: any, code: string) => {
    const credential = await confirmation.confirm(code);

    const user = credential.user;

    await AsyncStorage.setItem('uid', user.uid);

    return user;
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
