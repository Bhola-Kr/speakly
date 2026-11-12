import auth from '@react-native-firebase/auth';
import { scopedDatabase as database } from './firebase';
import { normalizeCallRate } from '../constants/constants';
import {
  fetchAgoraToken,
  sendIncomingCallPush,
  settleExpertCallEarnings,
} from '../api/calls';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FEMALE_AVAILABILITY_KEY = 'femaleAvailabilityEnabled';

export type RoomStatus =
  | 'offline'
  | 'waiting'
  | 'calling'
  | 'ringing'
  | 'accepted'
  | 'active'
  | 'rejected'
  | 'ended'
  | 'men_rejected';

export type CallStatus = 'Missed' | 'Completed';

export interface CallHistory {
  callId: string;
  startedAt: number;
  endedAt: number;
  duration: number; // milliseconds
  amount: number; // amount charged
  callRatePerMinute?: number;
  status: CallStatus;
  maleInfo: UserInfo;
  femaleInfo: UserInfo;
  archivedAt?: number;
}
export interface UserInfo {
  uid: string;
  name: string;
  tamilName?: string;
  gender?: string;
  avatarId: number | string;
  price?: number;
  practiceLanguage?: string;
  supportedLanguages?: string[];
}

export interface Room {
  roomId: string;
  currentCallId: string;
  agora: {
    male: {
      uid: number;
      token: string;
    };
    female: {
      uid: number;
      token: string;
    };
  };
  status: RoomStatus;
  female: UserInfo;
  male: UserInfo | null;
  createdAt: number;
  updatedAt: number;
  callRequestedAt?: number | null;
  callStartedAt?: number | null;
  chargedAmount?: number | null;
  callRatePerMinute?: number;
  callSettled?: boolean | null;
}

class RoomService {
  private getCurrentUser() {
    const user = auth().currentUser;

    if (!user) {
      throw new Error('User not logged in');
    }

    return user;
  }

  private async getUser(uid: string) {
    const snapshot = await database().ref(`users/${uid}`).once('value');

    if (!snapshot.exists()) {
      throw new Error('User not found');
    }

    return snapshot.val();
  }

  private async logExpertActivity(
    expertUid: string,
    status: 'online' | 'offline' | 'active',
    callId?: string,
  ) {
    const user = await this.getUser(expertUid).catch(() => null);
    const entryRef = database().ref(`expertActivity/${expertUid}`).push();
    const activity = {
      id: entryRef.key,
      expertUid,
      expertName: String(
        user?.profile?.name || user?.profile?.tamilName || 'Host',
      ),
      phone: String(user?.phone || user?.profile?.phone || ''),
      status,
      callId: callId || '',
      createdAt: Date.now(),
    };
    await database()
      .ref()
      .update({
        [`expertActivity/${expertUid}/${entryRef.key}`]: activity,
        [`expertActivityLatest/${expertUid}`]: activity,
      });
  }

  private async armOfflineOnDisconnect(uid: string) {
    // Availability is an account preference, not a socket-presence signal.
    // Cancel legacy handlers so locking/closing the app does not hide females.
    await this.cancelOfflineOnDisconnect(uid);
  }

  private async cancelOfflineOnDisconnect(uid: string) {
    await Promise.all([
      database().ref(`rooms/${uid}`).onDisconnect().cancel(),
      database().ref(`users/${uid}/profile/status`).onDisconnect().cancel(),
    ]);
  }

  private scheduleRoomReset(femaleUid: string, terminalStatus: RoomStatus) {
    setTimeout(() => {
      database()
        .ref(`rooms/${femaleUid}`)
        .transaction(room => {
          if (!room || room.status !== terminalStatus) {
            return;
          }

          return {
            ...room,
            status: 'waiting',
            currentCallId: '',
            male: null,
            callStartedAt: null,
            chargedAmount: null,
            callSettled: null,
            updatedAt: Date.now(),
          };
        })
        .catch(error => console.error('Unable to reset room:', error));
    }, 1000);
  }

  async goOnline() {
    const firebaseUser = this.getCurrentUser();
    const user = await this.getUser(firebaseUser?.uid);
    const agoraRes = await fetchAgoraToken();
    const tamilName = String(user?.profile?.tamilName || '').trim();

    const room: Room = {
      roomId: firebaseUser.uid,
      currentCallId: '',
      status: 'waiting',
      female: {
        uid: firebaseUser.uid,
        name: user.profile.name,
        ...(tamilName ? { tamilName } : {}),
        gender: user.profile.gender,
        avatarId: user.profile.avatarId,
        price: normalizeCallRate(user.profile.price),
        practiceLanguage: String(
          user.profile.practiceLanguage ||
            user.profile.supportedLanguages?.[0] ||
            'English',
        ),
        supportedLanguages: Array.isArray(user.profile.supportedLanguages)
          ? user.profile.supportedLanguages
          : [],
      },
      callRatePerMinute: normalizeCallRate(user.profile.price),
      male: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      agora: {
        male: agoraRes.male,
        female: agoraRes.female,
      },
    };

    await this.armOfflineOnDisconnect(firebaseUser.uid);

    const updates: Record<string, any> = {
      [`rooms/${firebaseUser.uid}`]: room,
      [`users/${firebaseUser.uid}/profile/status`]: 'online',
      [`users/${firebaseUser.uid}/settings/voiceCallsEnabled`]: true,
    };

    try {
      await database().ref().update(updates);
      await AsyncStorage.setItem(FEMALE_AVAILABILITY_KEY, 'true');
      await this.logExpertActivity(firebaseUser.uid, 'online').catch(error =>
        console.warn('Unable to record expert activity:', error),
      );
    } catch (error) {
      await this.cancelOfflineOnDisconnect(firebaseUser.uid);
      throw error;
    }
  }

  async goOffline() {
    const firebaseUser = this.getCurrentUser();

    await AsyncStorage.setItem(FEMALE_AVAILABILITY_KEY, 'false');

    const updates: Record<string, any> = {
      [`rooms/${firebaseUser.uid}/status`]: 'offline',
      [`rooms/${firebaseUser.uid}/male`]: null,
      [`rooms/${firebaseUser.uid}/currentCallId`]: '',
      [`rooms/${firebaseUser.uid}/updatedAt`]: Date.now(),
      [`users/${firebaseUser.uid}/profile/status`]: 'offline',
      [`users/${firebaseUser.uid}/settings/voiceCallsEnabled`]: false,
    };

    await database().ref().update(updates);
    await this.logExpertActivity(firebaseUser.uid, 'offline').catch(error =>
      console.warn('Unable to record expert activity:', error),
    );
    await this.cancelOfflineOnDisconnect(firebaseUser.uid);
  }

  async restoreFemaleAvailability() {
    const firebaseUser = this.getCurrentUser();
    const [userSnapshot, roomSnapshot] = await Promise.all([
      database().ref(`users/${firebaseUser.uid}`).once('value'),
      database().ref(`rooms/${firebaseUser.uid}`).once('value'),
    ]);
    const user = userSnapshot.val();
    if (user?.isExpert !== true) return false;
    // Only the explicit Go Online action enables persistent availability.
    // Back navigation, app backgrounding and reconnects never disable it.
    if (user?.settings?.voiceCallsEnabled !== true) return false;

    const room = roomSnapshot.val() as Room | null;
    if (
      room &&
      ['waiting', 'calling', 'ringing', 'accepted', 'active'].includes(
        room.status,
      )
    ) {
      await this.armOfflineOnDisconnect(firebaseUser.uid);
      if (room.status === 'waiting' && user?.profile?.status !== 'online') {
        await database()
          .ref(`users/${firebaseUser.uid}/profile/status`)
          .set('online');
      }
      return true;
    }

    await this.goOnline();
    return true;
  }

  async isBlocked(firstUid: string, secondUid: string) {
    const [firstBlocksSecond, secondBlocksFirst] = await Promise.all([
      database().ref(`blocks/${firstUid}/${secondUid}`).once('value'),
      database().ref(`blocks/${secondUid}/${firstUid}`).once('value'),
    ]);

    const isActiveBlock = (snapshot: any) =>
      snapshot.exists() && snapshot.val()?.isActive !== false;

    return isActiveBlock(firstBlocksSecond) || isActiveBlock(secondBlocksFirst);
  }

  async callFemale(femaleUid: string) {
    const firebaseUser = this.getCurrentUser();
    const blocked = await this.isBlocked(femaleUid, firebaseUser.uid);
    if (blocked) {
      throw new Error('You are blocked by this user.');
    }
    const [male, female] = await Promise.all([
      this.getUser(firebaseUser.uid),
      this.getUser(femaleUid),
    ]);
    const callRatePerMinute = normalizeCallRate(female?.profile?.price);
    const agoraRes = await fetchAgoraToken();
    const roomRef = database().ref(`rooms/${femaleUid}`);

    // Load the server room before starting the transaction. On a male user's
    // first call attempt, RTDB can otherwise invoke the transaction callback
    // with a cold-cache null even though the room already exists.
    const initialRoomSnapshot = await roomRef.once('value');
    if (!initialRoomSnapshot.exists()) {
      throw new Error('This user is currently offline.');
    }

    const initialRoom = initialRoomSnapshot.val() as Room;
    const callId = database().ref('callHistory').push().key;
    if (!callId) {
      throw new Error('Unable to create call.');
    }

    let transactionInvocationCount = 0;

    const claimRoom = (room: Room | null) => {
      const isFirstInvocation = transactionInvocationCount === 0;
      transactionInvocationCount += 1;

      if (room == null) {
        // Use the server value only for the transaction's first cold-cache
        // invocation. A later null means the room was genuinely removed and
        // must not be recreated from stale data.
        if (!isFirstInvocation) {
          return;
        }

        room = { ...initialRoom };
      }

      if (['rejected', 'men_rejected', 'ended'].includes(room.status)) {
        room.status = 'waiting';
        room.currentCallId = '';
        room.male = null;
        room.callStartedAt = null;
        room.chargedAmount = null;
        room.callSettled = null;
      }

      if (room.status !== 'waiting') {
        return;
      }
      room.status = 'calling';
      room.currentCallId = callId;
      room.callRequestedAt = Date.now();
      room.callStartedAt = null;
      room.chargedAmount = 0;
      room.callSettled = null;
      room.male = {
        uid: firebaseUser.uid,
        name: male.profile.name,
        gender: male.profile.gender,
        avatarId: male.profile.avatarId,
      };
      room.female = {
        ...room.female,
        price: callRatePerMinute,
      };
      room.callRatePerMinute = callRatePerMinute;
      room.agora = {
        male: agoraRes.male,
        female: agoraRes.female,
      };

      room.updatedAt = Date.now();
      return room;
    };

    let transaction = await roomRef.transaction(claimRoom);

    // Some Android RTDB clients can still abort the first transaction while
    // returning the now-cached waiting room. Retry that specific false abort
    // inside this call attempt so the user does not have to tap Call twice.
    if (
      !transaction.committed &&
      (transaction.snapshot.val() as Room | null)?.status === 'waiting'
    ) {
      transactionInvocationCount = 0;
      transaction = await roomRef.transaction(claimRoom);
    }

    if (!transaction.committed) {
      const room = transaction.snapshot.val() as Room | null;

      if (!room) {
        throw new Error('This user is currently offline.');
      }

      if (['calling', 'ringing', 'accepted', 'active'].includes(room.status)) {
        throw new Error('This user is currently busy on another call.');
      }

      throw new Error(
        'This user is not available right now. Please try again.',
      );
    }

    const claimedRoom = transaction.snapshot.val() as Room;
    sendIncomingCallPush({
      recipientUid: femaleUid,
      femaleUid,
      callId,
      callerName: String(male?.profile?.name || 'Someone'),
    })
      .then(response => {
        if (!response?.success || response.delivered === false) return;
        return roomRef.transaction(room => {
          if (
            !room ||
            room.status !== 'calling' ||
            room.currentCallId !== callId
          ) {
            return;
          }
          return { ...room, status: 'ringing', updatedAt: Date.now() };
        });
      })
      .catch(error =>
        console.warn('Unable to send incoming call push:', error),
      );
    return claimedRoom;
  }

  listenIncomingCall(femaleUid: string, callback: (room: Room) => void) {
    const ref = database().ref(`rooms/${femaleUid}`);

    const listener = ref.on('value', snapshot => {
      if (!snapshot.exists()) {
        return;
      }

      callback(snapshot.val() as Room);
    });

    return () => ref.off('value', listener);
  }

  listenCallStatus(femaleUid: string, callback: (room: Room) => void) {
    const ref = database().ref(`rooms/${femaleUid}`);
    const listener = ref.on('value', snapshot => {
      if (!snapshot.exists()) {
        return;
      }
      callback(snapshot.val() as Room);
    });

    return () => ref.off('value', listener);
  }

  async acceptCall(femaleUid: string) {
    const firebaseUser = this.getCurrentUser();
    const updates: Record<string, any> = {
      [`rooms/${femaleUid}/status`]: 'accepted',
      [`rooms/${femaleUid}/updatedAt`]: Date.now(),
      [`users/${firebaseUser.uid}/profile/status`]: 'busy',
    };

    await database().ref().update(updates);
  }

  async rejectCall(femaleUid: string) {
    const firebaseUser = this.getCurrentUser();

    const updates: Record<string, any> = {
      [`rooms/${femaleUid}/status`]: 'rejected',
      [`rooms/${femaleUid}/updatedAt`]: Date.now(),
      [`users/${firebaseUser.uid}/profile/status`]: 'online',
    };

    await database().ref().update(updates);
    this.scheduleRoomReset(femaleUid, 'rejected');
  }

  async menRejectCall(femaleUid: string) {
    const roomRef = database().ref(`rooms/${femaleUid}`);

    const transaction = await roomRef.transaction(room => {
      if (!room || !['calling', 'ringing'].includes(room.status)) {
        return;
      }

      return {
        ...room,
        status: 'men_rejected',
        updatedAt: Date.now(),
      };
    });

    if (transaction.committed) {
      await this.saveCallHistory(transaction.snapshot.val() as Room);
      this.scheduleRoomReset(femaleUid, 'men_rejected');
    }
  }

  async callConnected(femaleUid: string): Promise<number> {
    const roomRef = database().ref(`rooms/${femaleUid}`);
    const connectedAt = Date.now();
    const transaction = await roomRef.transaction(room => {
      if (!room || room.status === 'ended' || room.status === 'waiting') {
        return;
      }

      return {
        ...room,
        status: 'active',
        callStartedAt: room.callStartedAt || connectedAt,
        updatedAt: connectedAt,
      };
    });
    const room = transaction.snapshot.val() as Room | null;
    if (!transaction.committed || !room) return connectedAt;
    await this.logExpertActivity(
      femaleUid,
      'active',
      room.currentCallId,
    ).catch(error => console.warn('Unable to record expert activity:', error));
    return Number(room.callStartedAt || connectedAt);
  }

  async startCallPresence(callId: string, uid: string) {
    const presenceRef = database().ref(`callPresence/${callId}/${uid}`);
    await presenceRef.onDisconnect().remove();
    await presenceRef.set(true);
  }

  async stopCallPresence(callId: string, uid: string) {
    const presenceRef = database().ref(`callPresence/${callId}/${uid}`);
    await presenceRef.onDisconnect().cancel();
    await presenceRef.remove();
  }

  async chargeCallMinute(femaleUid: string): Promise<boolean> {
    const firebaseUser = this.getCurrentUser();
    const roomRef = database().ref(`rooms/${femaleUid}`);
    const roomSnapshot = await roomRef.once('value');
    const room = roomSnapshot.val() as Room | null;

    if (
      !room ||
      room.status !== 'active' ||
      room.male?.uid !== firebaseUser.uid
    ) {
      return false;
    }
    const callRatePerMinute = normalizeCallRate(room.callRatePerMinute);

    const walletTransaction = await database()
      .ref(`users/${firebaseUser.uid}/wallet/balance`)
      .transaction(balance => {
        const currentBalance = Number(balance || 0);

        if (currentBalance < callRatePerMinute) {
          return;
        }

        return currentBalance - callRatePerMinute;
      });

    if (!walletTransaction.committed) {
      return false;
    }

    const billingUpdate = await roomRef.transaction(currentRoom => {
      if (
        !currentRoom ||
        currentRoom.status !== 'active' ||
        currentRoom.male?.uid !== firebaseUser.uid
      ) {
        return;
      }

      return {
        ...currentRoom,
        chargedAmount:
          Number(currentRoom.chargedAmount || 0) + callRatePerMinute,
        updatedAt: Date.now(),
      };
    });

    if (!billingUpdate.committed) {
      await database()
        .ref(`users/${firebaseUser.uid}/wallet/balance`)
        .transaction(balance => Number(balance || 0) + callRatePerMinute);
      return false;
    }

    // A successful charge pays for the upcoming minute, even when it consumes
    // the final balance. The next charge attempt will end the call.
    return true;
  }

  async endCall(femaleUid: string) {
    const roomRef = database().ref(`rooms/${femaleUid}`);
    const endedAt = Date.now();
    const transaction = await roomRef.transaction(room => {
      if (
        !room ||
        room.status === 'ended' ||
        room.status === 'waiting' ||
        room.callSettled
      ) {
        return;
      }

      return {
        ...room,
        status: 'ended',
        callSettled: true,
        updatedAt: endedAt,
      };
    });

    if (!transaction.committed) {
      return;
    }

    const room = transaction.snapshot.val() as Room;

    if (room.currentCallId) {
      await this.saveCallHistory(room, endedAt);
    }
    await this.logExpertActivity(femaleUid, 'online', room.currentCallId).catch(
      error => console.warn('Unable to record expert activity:', error),
    );

    // Wait a moment so both users receive "ended"
    setTimeout(async () => {
      const updatedAt = Date.now();
      await database()
        .ref()
        .update({
          [`rooms/${femaleUid}/status`]: 'waiting',
          [`rooms/${femaleUid}/currentCallId`]: '',
          [`rooms/${femaleUid}/male`]: null,
          [`rooms/${femaleUid}/callStartedAt`]: null,
          [`rooms/${femaleUid}/callSettled`]: null,
          [`rooms/${femaleUid}/chargedAmount`]: null,
          [`rooms/${femaleUid}/updatedAt`]: updatedAt,
          [`users/${femaleUid}/profile/status`]: 'online',
        });
    }, 1000);
  }

  async saveCallHistory(room: Room, endedAt: number = Date.now()) {
    if (!room.currentCallId) {
      return;
    }

    // Only wallet debits recorded while the room was active are billable.
    // Clamp malformed or stale values to whole call minutes at the snapshotted
    // rate, and derive history duration from those billed minutes.
    const rate = normalizeCallRate(room.callRatePerMinute);
    const recordedAmount = Number(room.chargedAmount);
    const amount =
      Number.isFinite(recordedAmount) && recordedAmount > 0
        ? Math.floor(recordedAmount / rate) * rate
        : 0;
    const duration = (amount / rate) * 60 * 1000;

    const history = {
      callId: room.currentCallId,
      startedAt:
        room.callRequestedAt ||
        room.callStartedAt ||
        room.updatedAt ||
        room.createdAt,
      endedAt,
      duration,
      amount,
      callRatePerMinute: rate,
      status: duration === 0 ? 'Missed' : 'Completed',
      maleInfo: room.male,
      femaleInfo: room.female,
    };

    const updates: Record<string, any> = {};

    // Save to male history
    updates[`callHistory/${room?.male?.uid}/${room.currentCallId}`] = history;

    // Save to female history
    updates[`callHistory/${room?.female?.uid}/${room.currentCallId}`] = history;

    await database().ref().update(updates);

    if (amount > 0 && room.female?.uid && room.currentCallId) {
      await settleExpertCallEarnings(room.currentCallId).catch(error =>
        console.warn('Unable to settle expert earnings:', error),
      );
    }

  }

  async getCallHistory() {
    const uid = auth().currentUser?.uid;

    if (!uid) {
      throw new Error('User not logged in');
    }

    const snapshot = await database().ref(`callHistory/${uid}`).once('value');

    const history: CallHistory[] = [];

    snapshot.forEach(child => {
      const item = child.val() as CallHistory;

      if (!item.archivedAt) {
        history.push(item);
      }

      return false;
    });

    history.sort((a, b) => b.startedAt - a.startedAt);

    return history;
  }

  async clearCallHistory() {
    const uid = auth().currentUser?.uid;

    if (!uid) {
      throw new Error('User not logged in');
    }

    const historyRef = database().ref(`callHistory/${uid}`);
    const snapshot = await historyRef.once('value');

    if (!snapshot.exists()) {
      return;
    }

    const archivedAt = Date.now();
    const updates: Record<string, number> = {};

    snapshot.forEach(child => {
      if (child.key) {
        updates[`${child.key}/archivedAt`] = archivedAt;
      }

      return false;
    });

    await historyRef.update(updates);
  }

  listenCallHistory(
    callback: (history: CallHistory[]) => void,
    includeArchived = false,
  ) {
    const uid = auth().currentUser?.uid;

    if (!uid) {
      return () => {};
    }

    const ref = database().ref(`callHistory/${uid}`);

    const listener = ref.on('value', snapshot => {
      const history: CallHistory[] = [];

      snapshot.forEach(child => {
        const item = child.val() as CallHistory;

        if (includeArchived || !item.archivedAt) {
          history.push(item);
        }

        return false;
      });

      history.sort((a, b) => b.startedAt - a.startedAt);

      callback(history);
    });

    return () => ref.off('value', listener);
  }

  listenTotalCallDuration(callback: (duration: number) => void) {
    const uid = auth().currentUser?.uid;

    if (!uid) {
      callback(0);
      return () => {};
    }

    const ref = database().ref(`callHistory/${uid}`);

    const listener = ref.on('value', snapshot => {
      let totalDuration = 0;

      snapshot.forEach(child => {
        const duration = Number(child.val()?.duration || 0);
        totalDuration += Number.isFinite(duration) ? Math.max(0, duration) : 0;

        return false;
      });

      callback(totalDuration);
    });

    return () => ref.off('value', listener);
  }

  async blockUser(blockerUid: string, blockedUid: string) {
    const blockRef = database().ref(`blocks/${blockerUid}/${blockedUid}`);

    await blockRef.transaction(existing => {
      const now = Date.now();

      return {
        ...(existing || {}),
        blockedAt: existing?.blockedAt || now,
        lastBlockedAt: now,
        isActive: true,
        unblockedAt: null,
      };
    });
  }

  async unblockUser(blockerUid: string, blockedUid: string) {
    await database().ref(`blocks/${blockerUid}/${blockedUid}`).update({
      isActive: false,
      unblockedAt: Date.now(),
    });
  }

  async reportUser(reporterUid: string, reportedUid: string, reason: string) {
    const reportId = database().ref('reports').push().key;

    await database().ref(`reports/${reportId}`).set({
      reportId,
      reporterUid,
      reportedUid,
      reason,
      createdAt: Date.now(),
      status: 'pending',
    });
  }

  async removeRoom(uid: string) {
    await database()
      .ref(`rooms/${uid}`)
      .transaction(room => {
        if (!room) {
          return;
        }

        return {
          ...room,
          status: 'offline',
          currentCallId: '',
          male: null,
          closedAt: Date.now(),
          updatedAt: Date.now(),
        };
      });
  }

  async cancelCall(femaleUid: string) {
    await database().ref(`rooms/${femaleUid}`).update({
      status: 'waiting',
      currentCallId: '',
      male: null,
      updatedAt: Date.now(),
    });
  }
  async getRandomFemaleRoom(): Promise<Room> {
    const snapshot = await database()
      .ref('rooms')
      .orderByChild('status')
      .equalTo('waiting')
      .once('value');

    const rooms: Room[] = [];

    snapshot.forEach(child => {
      rooms.push(child.val() as Room);
      return false;
    });

    if (rooms.length === 0) {
      throw new Error('No hosts are currently online.');
    }

    // Shuffle so every user has an equal chance
    const shuffled = rooms.sort(() => Math.random() - 0.5);

    // Return the first room whose user profile is still online
    for (const room of shuffled) {
      const userSnapshot = await database()
        .ref(`users/${room.female.uid}`)
        .once('value');

      if (!userSnapshot.exists()) {
        continue;
      }

      const user = userSnapshot.val();

      if (user?.profile?.status === 'online') {
        const rate = normalizeCallRate(user?.profile?.price);
        room.callRatePerMinute = rate;
        room.female = { ...room.female, price: rate };
        return room;
      }
    }

    throw new Error('No hosts are currently online.');
  }
}

export default new RoomService();
