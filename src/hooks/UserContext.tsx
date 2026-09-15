import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
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

  const [currentUser, setCurrentUser] = useState(() => auth().currentUser);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(nextUser => {
      setCurrentUser(nextUser);

      if (nextUser) {
        setLoading(true);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const refreshUser = useCallback(async () => {
    const userToRefresh = currentUser ?? auth().currentUser;

    if (!userToRefresh) {
      setUser(null);
      setLoading(false);
      return;
    }

    const data = await authData.getUser(userToRefresh.uid);

    setUser(data);

    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setUser(null);
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
  }, [currentUser]);

  const updateUser = useCallback(
    async (data: any) => {
      if (!currentUser) return;

      await authData.updateUser(currentUser.uid, data);
    },
    [currentUser],
  );

  const updateProfile = useCallback(async (profile: UpdateProfileData) => {
    await authData.updateProfile(profile);
  }, []);

  const updateStatus = useCallback(
    async (status: string) => {
      if (!currentUser) return;

      await authData.updateUser(currentUser.uid, {
        status,
        lastSeen: Date.now(),
      });
    },
    [currentUser],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      updateUser,
      updateProfile,
      updateStatus,
    }),
    [user, loading, refreshUser, updateUser, updateProfile, updateStatus],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;

export const useUser = () => useContext(UserContext);
