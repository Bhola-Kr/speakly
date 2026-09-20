import React, { useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import DeviceInfo from 'react-native-device-info';
import AppUpdateNotice from './AppUpdateNotice';
import { getUpdateKind, parseAppVersion } from '../../utils/appVersion';

type UpdateConfig = {
  currentAppVersion?: string;
  updateAppVersion?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
};

const DISMISSED_KEY = 'app-update-dismissed-version';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.cozyds.voicetamil';

export default function AppUpdateGate({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  const [installedVersion] = useState(() => DeviceInfo.getVersion());
  const [config, setConfig] = useState<UpdateConfig>({});
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [dismissalLoaded, setDismissalLoaded] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DISMISSED_KEY)
      .then(value => {
        if (mounted) {
          setDismissedVersion(value);
        }
      })
      .catch(storageError =>
        console.warn('Unable to read update preference:', storageError),
      )
      .finally(() => {
        if (mounted) {
          setDismissalLoaded(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const configRef = database().ref('configs');
    const onValue = (snapshot: { val: () => unknown }) => {
      const value = snapshot.val();
      if (mounted) {
        setConfig(
          value && typeof value === 'object' ? (value as UpdateConfig) : {},
        );
      }
    };
    const onError = (readError: Error) => {
      console.warn('Unable to check app updates:', readError);
    };
    // Reattach after login as well, in case config reads require authentication.
    const unsubscribeAuth = auth().onAuthStateChanged(() => {
      configRef.off('value', onValue);
      configRef.on('value', onValue, onError);
    });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        configRef.once('value').then(onValue).catch(onError);
      }
    });
    return () => {
      mounted = false;
      unsubscribeAuth();
      subscription.remove();
      configRef.off('value', onValue);
    };
  }, []);

  // updateAppVersion is the release target; currentAppVersion is a fallback
  // target when an update has not been configured. Never replace the phone's version.
  const target = config.updateAppVersion ?? config.currentAppVersion;
  const latestVersion = parseAppVersion(target) ? target!.trim() : '';
  const kind = getUpdateKind(installedVersion, latestVersion);
  const dismissalId = `${installedVersion}:${latestVersion}`;
  const visible =
    enabled &&
    kind &&
    (kind === 'major' || (dismissalLoaded && dismissedVersion !== dismissalId));

  useEffect(() => {
    setError(null);
  }, [latestVersion]);

  const dismiss = () => {
    if (kind === 'major') {
      return;
    }
    setDismissedVersion(dismissalId);
    AsyncStorage.setItem(DISMISSED_KEY, dismissalId).catch(storageError =>
      console.warn('Unable to save update preference:', storageError),
    );
  };

  const openStore = async () => {
    if (opening) {
      return;
    }
    setOpening(true);
    setError(null);
    try {
      const url =
        Platform.OS === 'ios'
          ? config.appStoreUrl
          : config.playStoreUrl || PLAY_STORE_URL;
      const validUrl =
        typeof url === 'string' &&
        (Platform.OS === 'ios'
          ? /^https:\/\/apps\.apple\.com\//.test(url)
          : /^https:\/\/play\.google\.com\/store\/apps\/details\?/.test(url));
      if (!validUrl) {
        setError(
          'The update link is not available yet. Please try again shortly.',
        );
        return;
      }
      await Linking.openURL(url!);
    } catch {
      setError(
        'Unable to open the store. Please check your connection and try again.',
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.container}>
      {visible && kind && (
        <AppUpdateNotice
          kind={kind}
          latestVersion={latestVersion}
          opening={opening}
          error={error}
          onUpdate={openStore}
          onDismiss={dismiss}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
