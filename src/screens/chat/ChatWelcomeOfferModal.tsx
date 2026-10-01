import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Colors from '../../constants/colors';
import ChatTheme from './chatTheme';

type Props = {
  visible: boolean;
  onStart: () => void;
};

const ChatWelcomeOfferModal = ({ visible, onStart }: Props) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onStart}
  >
    <View style={styles.overlay}>
      <View style={styles.card}>
        <LinearGradient
          colors={[ChatTheme.heroStart, ChatTheme.heroMiddle, ChatTheme.heroEnd]}
          locations={[0, 0.7, 1]}
          style={styles.hero}
        >
          <View style={styles.sparkleLeft}>
            <Ionicons name="sparkles" size={18} color={ChatTheme.goldLight} />
          </View>
          <View style={styles.giftCircle}>
            <Ionicons name="chatbubbles" size={38} color={ChatTheme.heroStart} />
          </View>
          <Text style={styles.eyebrow}>NEW MEMBER OFFER</Text>
          <Text style={styles.title}>Your first 3 messages are free!</Text>
          <Text style={styles.message}>
            Start a conversation without spending any coins. Your free messages are applied automatically.
          </Text>
        </LinearGradient>

        <View style={styles.benefitRow}>
          {[1, 2, 3].map(number => (
            <View key={number} style={styles.benefitItem}>
              <View style={styles.numberCircle}>
                <Text style={styles.number}>{number}</Text>
              </View>
              <Text style={styles.freeLabel}>FREE</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.88} onPress={onStart} style={styles.buttonWrap}>
          <LinearGradient colors={[ChatTheme.goldLight, ChatTheme.goldDeep]} style={styles.button}>
            <Text style={styles.buttonText}>Start Chatting</Text>
            <Ionicons name="arrow-forward" size={19} color={ChatTheme.heroStart} />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.note}>One-time signup benefit</Text>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(8, 9, 12, 0.76)' },
  card: { width: '100%', maxWidth: 380, overflow: 'hidden', borderRadius: 30, backgroundColor: ChatTheme.warmCard, borderWidth: 1, borderColor: ChatTheme.heroPanelBorder, elevation: 15, shadowColor: Colors.black, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  hero: { alignItems: 'center', paddingHorizontal: 25, paddingTop: 28, paddingBottom: 25 },
  sparkleLeft: { position: 'absolute', left: 28, top: 28 },
  giftCircle: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: ChatTheme.goldLight, borderWidth: 5, borderColor: ChatTheme.heroPanelBorder },
  eyebrow: { color: ChatTheme.goldLight, fontSize: 10, fontWeight: '900', letterSpacing: 1.7, marginTop: 17 },
  title: { color: Colors.white, fontSize: 24, lineHeight: 31, fontWeight: '900', textAlign: 'center', marginTop: 7 },
  message: { color: Colors.darkTextMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10 },
  benefitRow: { flexDirection: 'row', justifyContent: 'center', paddingTop: 21, gap: 18 },
  benefitItem: { alignItems: 'center' },
  numberCircle: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.coinSurface, borderWidth: 1, borderColor: ChatTheme.avatarBorder },
  number: { color: ChatTheme.goldDeep, fontSize: 16, fontWeight: '900' },
  freeLabel: { color: Colors.successStrong, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 5 },
  buttonWrap: { marginHorizontal: 22, marginTop: 20, borderRadius: 18, overflow: 'hidden' },
  button: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { color: ChatTheme.heroStart, fontSize: 15, fontWeight: '900' },
  note: { color: Colors.subText, fontSize: 10, textAlign: 'center', marginTop: 10, marginBottom: 17 },
});

export default ChatWelcomeOfferModal;
