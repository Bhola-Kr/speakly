import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import Colors from '../../constants/colors';
import UI from '../../constants/ui';

type Props = {
  visible: boolean;
  claiming: boolean;
  requiresLogin: boolean;
  onClaim: () => void;
  onDismiss: () => void;
};

const SignupOfferModal = ({ visible, claiming, requiresLogin, onClaim, onDismiss }: Props) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onDismiss}
  >
    <View style={styles.overlay}>
      <View style={styles.card}>
        <TouchableOpacity
          accessibilityLabel="Close welcome offer"
          onPress={onDismiss}
          style={styles.closeButton}
          hitSlop={10}
        >
          <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <LinearGradient
          colors={[Colors.primaryLight, Colors.surfaceSecondary, Colors.white]}
          style={styles.hero}
        >
          <View style={[styles.sparkle, styles.sparkleLeft]}>
            <MaterialCommunityIcons name="sparkle" size={17} color={Colors.secondary} />
          </View>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="phone-in-talk" size={39} color={Colors.primary} />
            <View style={styles.giftBadge}>
              <MaterialCommunityIcons name="gift" size={16} color={Colors.white} />
            </View>
          </View>
          <View style={[styles.sparkle, styles.sparkleRight]}>
            <MaterialCommunityIcons name="star-four-points" size={15} color={Colors.goldDark} />
          </View>
        </LinearGradient>
        <Text style={styles.eyebrow}>A LITTLE GIFT FOR YOU</Text>
        <Text style={styles.title}>Your first call free</Text>
        <Text style={styles.message}>
          Meet a friendly voice, share a story, and enjoy your first conversation with Speakly.
        </Text>
        <TouchableOpacity
          disabled={claiming}
          style={styles.claimButton}
          onPress={onClaim}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryPressed]}
            style={styles.claimGradient}
          >
            {claiming ? <ActivityIndicator color={Colors.white} /> : (
              <>
                <Text style={styles.claimText}>{requiresLogin ? 'Sign in to get started' : 'Start my free call'}</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.white} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity disabled={claiming} onPress={onDismiss}>
          <Text style={styles.laterText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayBlack45,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: 30,
    padding: 24,
    paddingTop: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...UI.shadow.modal,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginBottom: -22,
  },
  hero: {
    width: '100%',
    height: 164,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.white,
    ...UI.shadow.modal,
  },
  giftBadge: {
    position: 'absolute',
    right: -3,
    bottom: 0,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: { position: 'absolute' },
  sparkleLeft: { left: '23%', top: 39 },
  sparkleRight: { right: '22%', bottom: 36 },
  claimGradient: {
    width: '100%',
    minHeight: UI.size.primaryButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  eyebrow: {
    marginTop: 20,
    color: Colors.tealDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 7,
    color: Colors.text,
    fontSize: UI.typography.screenTitle,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 9,
    color: Colors.subText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  claimButton: {
    width: '100%',
    minHeight: UI.size.primaryButtonHeight,
    marginTop: 20,
    borderRadius: UI.radius.button,
    overflow: 'hidden',
  },
  claimText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  laterText: {
    color: Colors.subText,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
});

export default SignupOfferModal;
