import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AppState } from 'react-native';
import { scopedDatabase as database } from '../firebase/firebase';
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

    if (auth().currentUser?.uid !== userToRefresh.uid) return;
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

    const onValue = (snapshot: any) => {
      if (auth().currentUser?.uid !== currentUser.uid) return;
      setUser(snapshot.val());
      setLoading(false);
    };
    ref.on('value', onValue);
    // Reattach after Android resumes the bridge so availability and settled
    // earnings also catch up after answering a background notification.
    const state = AppState.addEventListener('change', next => {
      if (next !== 'active') return;
      ref.off('value', onValue);
      ref.on('value', onValue);
    });
    return () => {
      state.remove();
      ref.off('value', onValue);
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
