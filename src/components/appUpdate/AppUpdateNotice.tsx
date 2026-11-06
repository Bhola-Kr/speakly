import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/colors';
import UI from '../../constants/ui';
import { UpdateKind } from '../../utils/appVersion';

type Props = {
  kind: Exclude<UpdateKind, null>;
  latestVersion: string;
  opening: boolean;
  error: string | null;
  onUpdate: () => void;
  onDismiss: () => void;
};

export default function AppUpdateNotice({
  kind,
  latestVersion,
  opening,
  error,
  onUpdate,
  onDismiss,
}: Props) {
  const required = kind === 'major';

  if (kind === 'patch') {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.bannerSafeArea}
      >
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <Icon
            name="lightning-bolt-outline"
            size={25}
            color={Colors.coinText}
          />
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>A smoother Speakly is here</Text>
            <Text style={styles.bannerMessage}>
              Version {latestVersion} is available. Install for better
              performance.
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onUpdate}
              disabled={opening}
            >
              <Text style={styles.bannerAction}>
                {opening ? 'Opening store…' : 'Install update →'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            accessibilityLabel="Dismiss update message"
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.close}
          >
            <Icon name="close" size={20} color={Colors.subText} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={required ? () => {} : onDismiss}
    >
      <SafeAreaView style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.modalContent} bounces={false}>
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.hero}>
              <View style={styles.orbit}>
                <LinearGradient
                  colors={Colors.buttonGradient}
                  style={styles.iconCircle}
                >
                  <Icon
                    name="rocket-launch-outline"
                    size={42}
                    color={Colors.white}
                  />
                </LinearGradient>
              </View>
              <View style={styles.badge}>
                <Icon
                  name={required ? 'shield-check-outline' : 'star-four-points'}
                  size={14}
                  color={Colors.secondary}
                />
                <Text style={styles.badgeText}>
                  {required ? 'ESSENTIAL UPDATE' : 'SOMETHING NEW FOR YOU'}
                </Text>
              </View>
              <Text style={styles.heroTitle}>
                {required
                  ? 'Let’s keep you connected'
                  : 'Your next upgrade is here'}
              </Text>
              <Text style={styles.heroSubtitle}>
                Better conversations start with Speakly.
              </Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>
                {required ? 'Update to continue' : 'Meet the latest Speakly'}
              </Text>
              <Text style={styles.description}>
                {required
                  ? 'A new version is ready. Please update Speakly to continue enjoying your conversations.'
                  : 'Enjoy the latest improvements and a better calling experience. Update now, or keep chatting and do it later.'}
              </Text>
              {error && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Update Speakly"
                onPress={onUpdate}
                disabled={opening}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={Colors.goldGradient}
                  style={styles.updateButton}
                >
                  {opening ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Icon
                      name="download-outline"
                      size={22}
                      color={Colors.white}
                    />
                  )}
                  <Text style={styles.updateText}>
                    {opening ? 'Opening store…' : 'Update now'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {required ? (
                <Text style={styles.footnote}>
                  This update is required to use Speakly.
                </Text>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={onDismiss}
                  style={styles.laterButton}
                >
                  <Text style={styles.laterText}>Maybe later</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  modalContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: UI.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: UI.radius.alert,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    ...UI.shadow.modal,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: Colors.darkBackgroundAlt,
    padding: 26,
  },
  orbit: {
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.overlayGold18,
    borderRadius: 64,
    marginBottom: 20,
  },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.overlayGold12,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: Colors.secondary,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  heroTitle: {
    color: Colors.white,
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  heroSubtitle: {
    color: Colors.darkTextMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  body: { padding: UI.spacing.xl },
  title: {
    color: Colors.text,
    fontSize: UI.typography.screenTitle,
    fontWeight: '600',
  },
  description: {
    color: Colors.subText,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 22,
  },
  updateButton: {
    minHeight: UI.size.primaryButtonHeight,
    borderRadius: UI.radius.button,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  updateText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  laterButton: { padding: 16, alignItems: 'center' },
  laterText: { color: Colors.subText, fontSize: 14, fontWeight: '600' },
  footnote: {
    color: Colors.subText,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 16,
  },
  error: {
    color: Colors.danger,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  bannerSafeArea: { backgroundColor: Colors.coinSurface },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.coinBorder,
  },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  bannerMessage: {
    color: Colors.subText,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  bannerAction: {
    color: Colors.coinText,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 8,
  },
  close: { padding: 8 },
});
