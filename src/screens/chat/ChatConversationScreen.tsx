import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Colors from '../../constants/colors';
import { getUserAvatar } from '../../constants/constants';
import ChatService, { CHAT_TEXT_PRICE, CHAT_VOICE_PRICE, ChatMessage, ChatPresenceState } from '../../firebase/ChatService';
import { useUser } from '../../hooks/UserContext';
import ChatTheme from './chatTheme';

const formatMessageTime = (timestamp: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ChatConversationScreen = ({ navigation, route }: any) => {
  const { user } = useUser();
  const peer = route.params?.host;
  const peerUid = String(peer?.uid || '');
  const peerName = String(peer?.profile?.tamilName || peer?.profile?.name || 'Chat');
  const isMale = String(user?.profile?.gender).toLowerCase() === 'male';
  const freeMessagesRemaining = Math.max(
    0,
    Number(user?.offers?.chatSignupFreeMessages?.remaining || 0),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [peerState, setPeerState] = useState<ChatPresenceState>('offline');
  const [peerLastSeen, setPeerLastSeen] = useState(0);
  const [androidKeyboardFrame, setAndroidKeyboardFrame] = useState<{
    height: number;
    screenY: number;
  } | null>(null);
  const { height: windowHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const androidKeyboardOverlap =
    Platform.OS === 'android' && androidKeyboardFrame
      ? Math.max(
          0,
          Math.min(
            androidKeyboardFrame.height,
            windowHeight - androidKeyboardFrame.screenY,
          ),
        )
      : 0;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSubscription = Keyboard.addListener('keyboardDidShow', event => {
      setAndroidKeyboardFrame({
        height: event.endCoordinates.height,
        screenY: event.endCoordinates.screenY,
      });
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardFrame(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!peerUid) return;
    try {
      return ChatService.listenToMessages(peerUid, setMessages);
    } catch (error: any) {
      Alert.alert('Unable to Open Chat', error?.message || 'Please try again.');
    }
  }, [peerUid]);

  useEffect(() => {
    if (!peerUid) return;
    let active = true;
    ChatService.enterConversation(peerUid)
      .then(() => {
        if (!active) return ChatService.leaveConversation(peerUid);
      })
      .catch(error => console.warn('Unable to set chat presence:', error));
    const stopListening = ChatService.listenToPeerState(
      peerUid,
      (state, lastSeen) => {
        setPeerState(state);
        setPeerLastSeen(lastSeen || 0);
      },
    );
    return () => {
      active = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      stopListening();
      ChatService.leaveConversation(peerUid).catch(error =>
        console.warn('Unable to clear chat presence:', error),
      );
    };
  }, [peerUid]);

  const updateMessageText = (value: string) => {
    setText(value);
    if (!peerUid) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    ChatService.setTyping(peerUid, Boolean(value.trim())).catch(() => undefined);
    if (value.trim()) {
      typingTimerRef.current = setTimeout(() => {
        ChatService.setTyping(peerUid, false).catch(() => undefined);
      }, 1500);
    }
  };

  const presenceLabel = peerState === 'typing'
    ? 'Typing…'
    : peerState === 'online'
      ? 'Online'
      : peerLastSeen
        ? `Offline · last seen ${formatMessageTime(peerLastSeen)}`
        : 'Offline';

  const openWalletAlert = () => {
    Alert.alert(
      'Insufficient Balance',
      `You need at least ${CHAT_TEXT_PRICE} coin to send a text message.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Balance', onPress: () => navigation.navigate('Wallet') },
      ],
    );
  };

  const sendText = async () => {
    const message = text.trim();
    if (!message || sending) return;
    if (
      isMale &&
      freeMessagesRemaining <= 0 &&
      Number(user?.wallet?.balance || 0) < CHAT_TEXT_PRICE
    ) {
      openWalletAlert();
      return;
    }

    const pendingMessageId = `pending-${user?.uid}-${Date.now()}`;
    const pendingMessage: ChatMessage = {
      id: pendingMessageId,
      senderId: String(user?.uid || ''),
      receiverId: peerUid,
      type: 'text',
      text: message,
      createdAt: Date.now(),
    };

    setText('');
    setMessages(currentMessages => [...currentMessages, pendingMessage]);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    ChatService.setTyping(peerUid, false).catch(() => undefined);

    try {
      setSending(true);
      await ChatService.sendText(peerUid, message);
    } catch (error: any) {
      setMessages(currentMessages =>
        currentMessages.filter(item => item.id !== pendingMessageId),
      );
      setText(currentText => currentText || message);
      if (error?.code === 'chat/insufficient-balance') openWalletAlert();
      else Alert.alert('Message Not Sent', error?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const showVoiceFlow = () => {
    Alert.alert(
      'Voice messages are coming soon',
      isMale
        ? `Recording and playback will be available in a future update. Voice messages will cost ${CHAT_VOICE_PRICE} coins.`
        : 'Recording and playback will be available in a future update. Females can send voice messages free.',
      [{ text: 'Got it' }],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar
        backgroundColor={ChatTheme.heroStart}
        barStyle="light-content"
        translucent={false}
      />
      <KeyboardAvoidingView
        style={[
          styles.container,
          androidKeyboardOverlap > 0 && {
            paddingBottom: androidKeyboardOverlap,
          },
        ]}
        // Android's adjustResize already keeps this view above the IME. Applying
        // a fixed behavior as well double-counts the keyboard on some devices.
        // The adaptive padding above only covers an overlap left by devices
        // where adjustResize is ignored (notably some edge-to-edge Androids).
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <LinearGradient colors={[ChatTheme.heroStart, ChatTheme.heroMiddle, ChatTheme.heroEnd]} locations={[0, 0.72, 1]} style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={25} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.avatarWrap}>
            <Image source={getUserAvatar(peer)} style={styles.avatar} />
            <View style={[styles.presenceDot, { backgroundColor: peerState === 'offline' ? Colors.offline : Colors.onlineStatus }]} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.hostName} numberOfLines={1}>{peerName}</Text>
            <Text style={[styles.hostStatus, peerState === 'typing' && styles.typingStatus]}>{presenceLabel}</Text>
          </View>
          {isMale ? (
            <TouchableOpacity style={styles.balanceBadge} onPress={() => navigation.navigate('Wallet')} accessibilityLabel="Open wallet">
              <Image source={require('../../assets/coin.png')} style={styles.balanceCoin} />
              <Text style={styles.balanceText}>{Number(user?.wallet?.balance || 0)}</Text>
              <Ionicons name="add-circle" size={17} color={ChatTheme.goldLight} />
            </TouchableOpacity>
          ) : (
            <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>FEMALE</Text></View>
          )}
        </LinearGradient>

        <View style={styles.infoBar}>
          <View style={styles.infoPill}>
            <Ionicons name="shield-checkmark" size={15} color={Colors.successStrong} />
            <Text style={styles.privateText}>Private</Text>
          </View>
          <View style={styles.pricePill}>
            {isMale && freeMessagesRemaining > 0 ? (
              <Ionicons name="gift" size={15} color={Colors.successStrong} />
            ) : (
              <Image source={require('../../assets/coin.png')} style={styles.priceCoin} />
            )}
            <Text style={[styles.costText, isMale && freeMessagesRemaining > 0 && styles.freeCostText]}>
              {isMale
                ? freeMessagesRemaining > 0
                  ? `${freeMessagesRemaining} free message${freeMessagesRemaining === 1 ? '' : 's'} left`
                  : `${CHAT_TEXT_PRICE} text · ${CHAT_VOICE_PRICE} voice`
                : 'Free messaging'}
            </Text>
          </View>
        </View>

        <View style={styles.chatCanvas}>
          <View style={styles.wallpaperOrbOne} />
          <View style={styles.wallpaperOrbTwo} />
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListHeaderComponent={messages.length ? (
              <View style={styles.dayDivider}>
                <View style={styles.dayLine} />
                <Text style={styles.dayText}>Messages</Text>
                <View style={styles.dayLine} />
              </View>
            ) : null}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.uid;
              const messageContent = item.type === 'voice' ? (
                <View style={styles.voiceMessage}>
                  <Ionicons name="play-circle" size={27} color={mine ? Colors.white : Colors.primary} />
                  <View style={[styles.voiceWave, mine && styles.voiceWaveMine]} />
                  <Text style={[styles.voiceDuration, mine && styles.mineText]}>{item.durationSeconds || 0}s</Text>
                </View>
              ) : (
                <Text style={[styles.messageText, mine && styles.mineText]}>{item.text}</Text>
              );
              return (
                <View style={[styles.messageRow, mine ? styles.mineRow : styles.theirRow]}>
                  {!mine ? <Image source={getUserAvatar(peer)} style={styles.messageAvatar} /> : null}
                  <View style={styles.messageBlock}>
                    {mine ? (
                      <LinearGradient colors={[ChatTheme.heroMiddle, ChatTheme.heroEnd]} style={[styles.bubble, styles.mineBubble]}>
                        {messageContent}
                      </LinearGradient>
                    ) : (
                      <View style={[styles.bubble, styles.theirBubble]}>{messageContent}</View>
                    )}
                    <View style={[styles.messageMeta, mine && styles.mineMeta]}>
                      <Text style={styles.time}>{formatMessageTime(item.createdAt)}</Text>
                      {mine ? (
                        <Ionicons
                          name="checkmark-done"
                          size={14}
                          color={item.readAt ? Colors.blueAction : Colors.gray143}
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <LinearGradient colors={[Colors.coinSurface, ChatTheme.warmCard]} style={styles.emptyIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={38} color={Colors.coinHighlight} />
                </LinearGradient>
                <Text style={styles.emptyTitle}>Start a conversation</Text>
                <Text style={styles.emptyGreeting}>Say hello to {peerName}</Text>
                <Text style={styles.emptyText}>{isMale ? freeMessagesRemaining > 0 ? `You have ${freeMessagesRemaining} free message${freeMessagesRemaining === 1 ? '' : 's'} ready. No coins will be deducted.` : `Each text costs ${CHAT_TEXT_PRICE} coin and each voice message costs ${CHAT_VOICE_PRICE} coins.` : 'As a female, your text and voice replies are free.'}</Text>
                <View style={styles.suggestionRow}>
                  <TouchableOpacity style={styles.suggestion} onPress={() => updateMessageText('hii! எப்டி இருக்கீங்க')}>
                    <Ionicons name="hand-left-outline" size={15} color={Colors.coinHighlight} />
                    <Text style={styles.suggestionText}>hii! எப்டி இருக்கீங்க</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.suggestion} onPress={() => updateMessageText('பேசலாமா?')}>
                    <Ionicons name="chatbubble-ellipses-outline" size={15} color={Colors.coinHighlight} />
                    <Text style={styles.suggestionText}>பேசலாமா?</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
          />
        </View>

        <View style={styles.composerArea}>
          <View style={styles.voiceHint}>
            <Ionicons name="mic-outline" size={13} color={Colors.subText} />
            <Text style={styles.voiceHintText}>Voice coming soon {isMale ? `· ${CHAT_VOICE_PRICE} coins` : '· free for females'}</Text>
          </View>
          <View style={styles.composerShell}>
            <View style={styles.composer}>
            <TouchableOpacity style={styles.voiceButton} onPress={showVoiceFlow} accessibilityLabel="Record voice message">
              <Ionicons name="mic" size={23} color={ChatTheme.goldLight} />
            </TouchableOpacity>
            <TextInput
              value={text}
              onChangeText={updateMessageText}
              placeholder="Type a message…"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
              multiline
              textAlignVertical="center"
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
              onPress={sendText}
              disabled={!text.trim() || sending}
              accessibilityLabel={isMale ? `Send message for ${CHAT_TEXT_PRICE} coin` : 'Send message'}
            >
              <Ionicons name="send" size={20} color={Colors.black} />
            </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ChatTheme.heroStart },
  container: { flex: 1, backgroundColor: ChatTheme.background },
  header: { minHeight: 84, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 13 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: ChatTheme.heroPanel, borderWidth: 1, borderColor: ChatTheme.heroPanelBorder, marginRight: 5 },
  avatarWrap: { position: 'relative', marginRight: 11 }, avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: ChatTheme.goldLight },
  presenceDot: { position: 'absolute', right: -2, bottom: -2, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: ChatTheme.heroStart },
  headerCopy: { flex: 1, minWidth: 0 }, hostName: { color: Colors.white, fontSize: 17, fontWeight: '800' }, hostStatus: { color: Colors.darkTextMuted, fontSize: 11, marginTop: 3 },
  typingStatus: { color: ChatTheme.goldLight, fontWeight: '700' },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: ChatTheme.heroPanel, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 18, marginRight: 8, borderWidth: 1, borderColor: ChatTheme.heroPanelBorder }, balanceCoin: { width: 20, height: 20 }, balanceText: { color: Colors.white, fontSize: 13, fontWeight: '800', marginHorizontal: 5 },
  hostBadge: { marginRight: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, backgroundColor: ChatTheme.heroPanel, borderWidth: 1, borderColor: ChatTheme.heroPanelBorder }, hostBadgeText: { color: ChatTheme.goldLight, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  infoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: ChatTheme.background, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ChatTheme.warmBorder },
  infoPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successStrongSurface, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  privateText: { color: Colors.successStrong, fontSize: 11, fontWeight: '800', marginLeft: 4 },
  pricePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.coinSurface, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  priceCoin: { width: 16, height: 16, marginRight: 5 }, costText: { color: Colors.coinDark, fontSize: 11, fontWeight: '700', marginLeft: 5 }, freeCostText: { color: Colors.successStrong },
  chatCanvas: { flex: 1, overflow: 'hidden', backgroundColor: ChatTheme.background },
  wallpaperOrbOne: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: Colors.overlayGold12, top: 55, right: -120 },
  wallpaperOrbTwo: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: ChatTheme.warmCard, bottom: 30, left: -100 },
  messages: { paddingHorizontal: 13, paddingTop: 10, paddingBottom: 22, flexGrow: 1 },
  dayDivider: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', width: '68%', marginTop: 3, marginBottom: 15 },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border }, dayText: { color: Colors.gray143, fontSize: 10, fontWeight: '700', marginHorizontal: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  messageRow: { marginVertical: 5, flexDirection: 'row', alignItems: 'flex-end' }, mineRow: { justifyContent: 'flex-end' }, theirRow: { justifyContent: 'flex-start' }, messageAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 7, marginBottom: 17, borderWidth: 1.5, borderColor: ChatTheme.avatarBorder }, messageBlock: { maxWidth: '79%' },
  bubble: { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11 }, mineBubble: { borderBottomRightRadius: 5, elevation: 2, shadowColor: ChatTheme.shadow, shadowOpacity: 0.16, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }, theirBubble: { backgroundColor: ChatTheme.warmCard, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: ChatTheme.warmBorder, elevation: 1, shadowColor: ChatTheme.shadow, shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }, messageText: { color: Colors.text, fontSize: 15, lineHeight: 22 }, mineText: { color: Colors.white },
  voiceMessage: { minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 8 }, voiceWave: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Colors.border }, voiceWaveMine: { backgroundColor: Colors.overlayWhite18 }, voiceDuration: { color: Colors.subText, fontSize: 10 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingHorizontal: 4 }, mineMeta: { justifyContent: 'flex-end' }, time: { color: Colors.gray143, fontSize: 9, marginRight: 3 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 55 }, emptyIcon: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ChatTheme.avatarBorder, elevation: 3, shadowColor: ChatTheme.goldDeep, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 19, textAlign: 'center' }, emptyGreeting: { color: Colors.coinHighlight, fontSize: 14, fontWeight: '700', marginTop: 5, textAlign: 'center' }, emptyText: { color: Colors.subText, fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center', maxWidth: 290 }, suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, gap: 8 }, suggestion: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, backgroundColor: ChatTheme.warmCard, borderWidth: 1, borderColor: ChatTheme.avatarBorder, elevation: 1 }, suggestionText: { color: Colors.text, fontSize: 12, fontWeight: '600', marginLeft: 5 },
  composerArea: { backgroundColor: ChatTheme.warmCard, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ChatTheme.warmBorder, paddingTop: 6, paddingBottom: Platform.OS === 'android' ? 6 : 0, elevation: 10, shadowColor: ChatTheme.shadow, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } }, voiceHint: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: 5 }, voiceHintText: { color: Colors.subText, fontSize: 10, marginLeft: 4 },
  composerShell: { marginHorizontal: 10, marginBottom: 8, padding: 3, borderRadius: 28, backgroundColor: ChatTheme.background, borderWidth: 1, borderColor: ChatTheme.warmBorder },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  voiceButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: ChatTheme.heroMiddle }, input: { flex: 1, minHeight: 44, maxHeight: 110, paddingHorizontal: 8, paddingTop: 11, paddingBottom: 9, color: Colors.text, fontSize: 14 }, sendButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: ChatTheme.goldLight, elevation: 2, shadowColor: ChatTheme.goldDeep, shadowOpacity: 0.24, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }, sendDisabled: { opacity: 0.38 },
});

export default ChatConversationScreen;
