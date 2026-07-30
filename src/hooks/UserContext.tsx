import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import database from '@react-native-firebase/database';
import authData, { UpdateProfileData } from '../firebase/authData';

interface UserContextType {
  user: any;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (data: any) => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
}

const UserContext = createContext<UserContextType>({} as UserContextType);

export const UserProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const currentUser = useMemo(() => authData.getCurrentUser(), []);

  const refreshUser = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const data = await authData.getUser(currentUser.uid);

    setUser(data);

    setLoading(false);
  };

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const ref = database().ref(`users/${currentUser.uid}`);

    const listener = ref.on('value', snapshot => {
      setUser(snapshot.val());
      setLoading(false);
    });

    return () => {
      ref.off('value', listener);
    };
  }, []);

  const updateUser = async (data: any) => {
    if (!currentUser) return;

    await authData.updateUser(currentUser.uid, data);
  };

  const updateProfile = async (profile: UpdateProfileData) => {
    const res = await authData.updateProfile(profile);
    console.log('updateProfile -> res', res);
  };

  const updateStatus = async (status: string) => {
    if (!currentUser) return;

    await authData.updateUser(currentUser.uid, {
      status,
      lastSeen: Date.now(),
    });
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      updateUser,
      updateProfile,
      updateStatus,
    }),
    [user, loading],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;

export const useUser = () => useContext(UserContext);
