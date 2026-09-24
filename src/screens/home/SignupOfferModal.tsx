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

import Colors from '../../constants/colors';

type Props = {
  visible: boolean;
  amount: number;
  claiming: boolean;
  onClaim: () => void;
  onDismiss: () => void;
};

const SignupOfferModal = ({
  visible,
  amount,
  claiming,
  onClaim,
  onDismiss,
}: Props) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onDismiss}
  >
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name="gift-outline"
            size={42}
            color={Colors.secondary}
          />
        </View>
        <Text style={styles.eyebrow}>WELCOME OFFER</Text>
        <Text style={styles.title}>Get {amount} free coins</Text>
        <Text style={styles.message}>
          Claim your one-time signup reward and start talking.
        </Text>
        <TouchableOpacity
          disabled={claiming}
          style={styles.claimButton}
          onPress={onClaim}
        >
          {claiming ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.claimText}>Claim {amount} Coins</Text>
          )}
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
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.coinSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    marginTop: 18,
    color: Colors.coinText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 8,
    color: Colors.text,
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    color: Colors.subText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  claimButton: {
    width: '100%',
    minHeight: 52,
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 14,
  },
});

export default SignupOfferModal;
