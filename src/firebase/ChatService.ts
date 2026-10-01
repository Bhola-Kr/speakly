import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import { sendChatNotification } from '../api/calls';

export const CHAT_TEXT_PRICE = 1;
export const CHAT_VOICE_PRICE = 2;

export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  type: 'text' | 'voice';
  text?: string;
  audioUrl?: string;
  durationSeconds?: number;
  createdAt: number;
  readAt?: number;
};

export type ChatSummary = {
  id: string;
  maleUid: string;
  hostUid: string;
  lastMessage?: string;
  updatedAt?: number;
  unreadCount?: number;
};

export type ChatPresenceState = 'online' | 'offline' | 'typing';

const conversationIdFor = (firstUid: string, secondUid: string) =>
  [firstUid, secondUid].sort().join('_');

class ChatService {
  async enterConversation(peerUid: string) {
    const currentUser = auth().currentUser;
    if (!currentUser || !peerUid) return;
    const presenceRef = database().ref(`chatPresence/${currentUser.uid}`);
    const typingRef = database().ref(
      `chats/${conversationIdFor(currentUser.uid, peerUid)}/typing/${currentUser.uid}`,
    );
    await Promise.all([
      presenceRef.onDisconnect().set({ state: 'offline', lastSeen: database.ServerValue.TIMESTAMP }),
      typingRef.onDisconnect().set(false),
    ]);
    await presenceRef.set({ state: 'online', lastSeen: database.ServerValue.TIMESTAMP });
  }

  async leaveConversation(peerUid: string) {
    const currentUser = auth().currentUser;
    if (!currentUser || !peerUid) return;
    const presenceRef = database().ref(`chatPresence/${currentUser.uid}`);
    const typingRef = database().ref(
      `chats/${conversationIdFor(currentUser.uid, peerUid)}/typing/${currentUser.uid}`,
    );
    await Promise.all([
      presenceRef.onDisconnect().cancel(),
      typingRef.onDisconnect().cancel(),
      presenceRef.set({ state: 'offline', lastSeen: database.ServerValue.TIMESTAMP }),
      typingRef.set(false),
    ]);
  }

  async setTyping(peerUid: string, typing: boolean) {
    const currentUser = auth().currentUser;
    if (!currentUser || !peerUid) return;
    await database()
      .ref(`chats/${conversationIdFor(currentUser.uid, peerUid)}/typing/${currentUser.uid}`)
      .set(typing);
  }

  listenToPeerState(
    peerUid: string,
    listener: (state: ChatPresenceState, lastSeen?: number) => void,
  ) {
    const currentUser = auth().currentUser;
    if (!currentUser) throw new Error('Please sign in to view chat status.');
    const presenceRef = database().ref(`chatPresence/${peerUid}`);
    const typingRef = database().ref(
      `chats/${conversationIdFor(currentUser.uid, peerUid)}/typing/${peerUid}`,
    );
    let online = false;
    let typing = false;
    let lastSeen = 0;
    const emit = () => listener(typing ? 'typing' : online ? 'online' : 'offline', lastSeen);
    const presenceSubscription = presenceRef.on('value', snapshot => {
      const value = snapshot.val();
      online = value?.state === 'online';
      lastSeen = Number(value?.lastSeen || 0);
      emit();
    });
    const typingSubscription = typingRef.on('value', snapshot => {
      typing = snapshot.val() === true;
      emit();
    });
    return () => {
      presenceRef.off('value', presenceSubscription);
      typingRef.off('value', typingSubscription);
    };
  }

  listenToMessages(peerUid: string, listener: (messages: ChatMessage[]) => void) {
    const currentUser = auth().currentUser;
    if (!currentUser) throw new Error('Please sign in to view messages.');
    const conversationId = conversationIdFor(currentUser.uid, peerUid);
    const ref = database().ref(`chats/${conversationId}/messages`).orderByChild('createdAt').limitToLast(100);
    const subscription = ref.on('value', snapshot => {
      const messages: ChatMessage[] = [];
      snapshot.forEach(child => {
        const value = child.val();
        if (value?.type === 'text' || value?.type === 'voice') {
          messages.push({ ...value, id: child.key || value.id });
        }
        return false;
      });
      listener(messages);

      const readUpdates: Record<string, object> = {};
      messages.forEach(message => {
        if (message.receiverId === currentUser.uid && !message.readAt) {
          readUpdates[`${message.id}/readAt`] = database.ServerValue.TIMESTAMP;
        }
      });
      if (Object.keys(readUpdates).length > 0) {
        database()
          .ref(`chats/${conversationId}/messages`)
          .update(readUpdates)
          .catch(error => console.warn('Unable to update message read receipts:', error));
      }
      database()
        .ref(`chats/${conversationId}/unread/${currentUser.uid}`)
        .set(0)
        .catch(error => console.warn('Unable to clear unread messages:', error));
    });
    return () => ref.off('value', subscription);
  }

  listenToHostChats(hostUid: string, listener: (chats: ChatSummary[]) => void) {
    const ref = database().ref('chats').orderByChild('hostUid').equalTo(hostUid);
    const subscription = ref.on('value', snapshot => {
      const chats: ChatSummary[] = [];
      snapshot.forEach(child => {
        const value = child.val();
        if (value?.maleUid && value?.hostUid === hostUid) {
          chats.push({
            ...value,
            id: child.key,
            unreadCount: Math.max(0, Number(value?.unread?.[hostUid] || 0)),
          });
        }
        return false;
      });
      chats.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      listener(chats);
    });
    return () => ref.off('value', subscription);
  }

  listenToUnreadCounts(
    maleUid: string,
    listener: (counts: Record<string, number>) => void,
  ) {
    const ref = database().ref('chats').orderByChild('maleUid').equalTo(maleUid);
    const subscription = ref.on('value', snapshot => {
      const counts: Record<string, number> = {};
      snapshot.forEach(child => {
        const value = child.val();
        if (value?.hostUid) {
          counts[String(value.hostUid)] = Math.max(
            0,
            Number(value?.unread?.[maleUid] || 0),
          );
        }
        return false;
      });
      listener(counts);
    });
    return () => ref.off('value', subscription);
  }

  async sendText(peerUid: string, text: string) {
    const messageText = text.trim();
    if (!messageText) throw new Error('Enter a message first.');
    if (messageText.length > 1000) throw new Error('Messages cannot be longer than 1000 characters.');
    return this.sendMessage(peerUid, { type: 'text', text: messageText });
  }

  async sendVoice(peerUid: string, audioUrl: string, durationSeconds: number) {
    if (!audioUrl.trim()) throw new Error('A voice recording is required.');
    return this.sendMessage(peerUid, {
      type: 'voice',
      audioUrl: audioUrl.trim(),
      durationSeconds: Math.max(1, Math.round(durationSeconds)),
    });
  }

  private async sendMessage(
    peerUid: string,
    content: Pick<ChatMessage, 'type' | 'text' | 'audioUrl' | 'durationSeconds'>,
  ) {
    const currentUser = auth().currentUser;
    if (!currentUser) throw new Error('Please sign in to send a message.');
    if (!peerUid) throw new Error('This chat participant is unavailable.');

    const [senderSnapshot, peerSnapshot] = await Promise.all([
      database().ref(`users/${currentUser.uid}`).once('value'),
      database().ref(`users/${peerUid}`).once('value'),
    ]);
    const sender = senderSnapshot.val();
    const peer = peerSnapshot.val();
    const senderGender = String(sender?.profile?.gender || '').toLowerCase();
    const peerGender = String(peer?.profile?.gender || '').toLowerCase();
    const senderIsMale = senderGender === 'male';
    const senderIsHost = senderGender === 'female' && sender?.isChatHost === true;
    const peerIsHost = peerGender === 'female' && peer?.isChatHost === true;

    if (!sender || !peer || (!senderIsMale && !senderIsHost)) {
      throw new Error('You cannot send messages in this conversation.');
    }
    if ((senderIsMale && !peerIsHost) || (senderIsHost && peerGender !== 'male')) {
      throw new Error('This chat participant is no longer available.');
    }

    const maleUid = senderIsMale ? currentUser.uid : peerUid;
    const hostUid = senderIsHost ? currentUser.uid : peerUid;
    const price = content.type === 'voice' ? CHAT_VOICE_PRICE : CHAT_TEXT_PRICE;
    const maleUserRef = database().ref(`users/${maleUid}`);
    const balanceRef = database().ref(`users/${maleUid}/wallet/balance`);
    let charged = false;
    let usedFreeMessage = false;

    if (senderIsMale) {
      let paymentType: 'free' | 'coins' | null = null;
      const payment = await maleUserRef.transaction(userValue => {
        if (!userValue) return;

        const freeMessages = userValue?.offers?.chatSignupFreeMessages;
        const remaining = Math.max(0, Number(freeMessages?.remaining || 0));
        if (remaining > 0) {
          paymentType = 'free';
          return {
            ...userValue,
            offers: {
              ...(userValue.offers || {}),
              chatSignupFreeMessages: {
                ...freeMessages,
                remaining: remaining - 1,
                lastUsedAt: Date.now(),
              },
            },
          };
        }

        const currentBalance = Number(userValue?.wallet?.balance || 0);
        if (currentBalance < price) return;
        paymentType = 'coins';
        return {
          ...userValue,
          wallet: {
            ...(userValue.wallet || {}),
            balance: currentBalance - price,
          },
        };
      });
      if (!payment.committed) {
        const error: any = new Error(`You need at least ${price} coins to send this message.`);
        error.code = 'chat/insufficient-balance';
        throw error;
      }
      usedFreeMessage = paymentType === 'free';
      charged = paymentType === 'coins';
    }

    const conversationId = conversationIdFor(maleUid, hostUid);
    const messageRef = database().ref(`chats/${conversationId}/messages`).push();
    const now = database.ServerValue.TIMESTAMP;
    const lastMessage = content.type === 'voice' ? '🎙 Voice message' : content.text;

    try {
      await database().ref().update({
        [`chats/${conversationId}/participants/${maleUid}`]: true,
        [`chats/${conversationId}/participants/${hostUid}`]: true,
        [`chats/${conversationId}/maleUid`]: maleUid,
        [`chats/${conversationId}/hostUid`]: hostUid,
        [`chats/${conversationId}/updatedAt`]: now,
        [`chats/${conversationId}/lastMessage`]: lastMessage,
        [`chats/${conversationId}/unread/${peerUid}`]: database.ServerValue.increment(1),
        [`chats/${conversationId}/messages/${messageRef.key}`]: {
          id: messageRef.key,
          senderId: currentUser.uid,
          receiverId: peerUid,
          ...content,
          createdAt: now,
        },
      });

      const recipientPresence = await database()
        .ref(`chatPresence/${peerUid}/state`)
        .once('value');
      if (recipientPresence.val() !== 'online') {
        sendChatNotification({
          type: 'chat_message',
          recipientUid: peerUid,
          senderUid: currentUser.uid,
          senderName: String(sender?.profile?.tamilName || sender?.profile?.name || 'Someone'),
          conversationId,
          messageId: String(messageRef.key || ''),
          messageType: content.type,
          preview:
            content.type === 'voice'
              ? 'Sent you a voice message'
              : String(content.text || '').slice(0, 120),
        }).catch(notificationError =>
          console.warn('Unable to send chat notification:', notificationError),
        );
      }
    } catch (error) {
      if (usedFreeMessage) {
        await maleUserRef.transaction(userValue => {
          if (!userValue) return userValue;
          const offer = userValue?.offers?.chatSignupFreeMessages;
          const total = Math.max(0, Number(offer?.total || 3));
          const remaining = Math.max(0, Number(offer?.remaining || 0));
          return {
            ...userValue,
            offers: {
              ...(userValue.offers || {}),
              chatSignupFreeMessages: {
                ...offer,
                remaining: Math.min(total, remaining + 1),
              },
            },
          };
        });
      } else if (charged) {
        await balanceRef.transaction(balance => Number(balance || 0) + price);
      }
      throw error;
    }
  }
}

export default new ChatService();
