import auth from '@react-native-firebase/auth';
import Api from '../api/api';
import { scopedDatabase as database } from './firebase';
import { normalizeCallRate } from '../constants/constants';
import { prepareAgoraToken, sendIncomingCallPush } from '../api/calls';
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

export type CallStatus = 'Missed' | 'Completed' | 'Failed';

export interface CallHistory {
  callId: string;
  startedAt: number;
  endedAt: number;
  duration: number; // milliseconds
  amount: number; // amount charged
  expertAmount?: number; // earnings credited to the expert
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
  billingReports?: any;
  billingSince?: number | null;
  billingConfirmedAt?: number;
  billableMs?: number;
  roomId: string;
  currentCallId: string;
  agora: {
    channelName?: string;
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
  private availabilityUpdateInProgress = false;

  private getCurrentUser() {
    const user = auth().currentUser;

    if (!user) {
      throw new Error('Pehle sign in karo');
    }

    return user;
  }

  private async getUser(uid: string) {
    const snapshot = await database().ref(`users/${uid}`).once('value');

    if (!snapshot.exists()) {
      throw new Error('User nahi mila');
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

  async goOnline() {
    this.availabilityUpdateInProgress = true;
    try {
      await this.setOnline();
    } finally {
      this.availabilityUpdateInProgress = false;
    }
  }

  private async setOnline() {
    await Api.post('/hostAvailability', { online: true });
    await AsyncStorage.setItem(FEMALE_AVAILABILITY_KEY, 'true');
    this.logExpertActivity(this.getCurrentUser().uid, 'online').catch(
      console.warn,
    );
  }

  async goOffline() {
    this.availabilityUpdateInProgress = true;
    try {
      await Api.post('/hostAvailability', { online: false });
      await AsyncStorage.setItem(FEMALE_AVAILABILITY_KEY, 'false');
      this.logExpertActivity(this.getCurrentUser().uid, 'offline').catch(
        console.warn,
      );
    } finally {
      this.availabilityUpdateInProgress = false;
    }
  }

  async restoreFemaleAvailability() {
    // A connection event can arrive while an explicit Go Online/Offline update
    // is still being written. Do not let its stale snapshot trigger a competing
    // availability update.
    if (this.availabilityUpdateInProgress) return false;

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

  async callFemale(femaleUid: string, maximumRate?: number) {
    const response = await Api.post<{ success: boolean; room: Room }>(
      '/claimCall',
      { hostUid: femaleUid, maximumRate },
    );
    const room = response.room;
    sendIncomingCallPush({
      recipientUid: femaleUid,
      femaleUid,
      callId: room.currentCallId,
      callerName: room.male?.name || 'User',
    })
      .then(result => {
        if (!result?.success || result.delivered === false) return;
        return database()
          .ref(`rooms/${femaleUid}`)
          .transaction(current => {
            if (
              !current ||
              current.currentCallId !== room.currentCallId ||
              current.status !== 'calling'
            )
              return;
            return { ...current, status: 'ringing', updatedAt: Date.now() };
          });
      })
      .catch(error => console.warn('Call notification nahi gayi:', error));
    return room;
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

  async acceptCall(femaleUid: string, callId?: string) {
    if (this.getCurrentUser().uid !== femaleUid)
      throw new Error('Call access nahi mila.');
    if (!callId) throw new Error('Call ID zaroori hai.');
    void prepareAgoraToken(`call_${callId}`).catch(() => {});
    const ref = database().ref(`rooms/${femaleUid}`);
    // Populate the native transaction cache before its first callback.
    await ref.once('value');
    const result = await ref.transaction(room => {
      if (
        !room ||
        room.currentCallId !== callId ||
        room.female?.uid !== femaleUid
      )
        return;
      if (['accepted', 'active'].includes(room.status)) return room;
      if (!['calling', 'ringing'].includes(room.status)) return;
      if (Date.now() - Number(room.callRequestedAt || 0) > 30000) return;
      return { ...room, status: 'accepted', updatedAt: Date.now() };
    });
    if (!result.committed) throw new Error('Call ab available nahi hai.');
  }

  async rejectCall(femaleUid: string, callId?: string) {
    if (this.getCurrentUser().uid !== femaleUid)
      throw new Error('Call access nahi mila.');
    await Api.post('/transitionCall', {
      hostUid: femaleUid,
      callId,
      action: 'reject',
    });
  }

  async menRejectCall(femaleUid: string, callId?: string) {
    if (!callId) return;
    await Api.post('/transitionCall', {
      hostUid: femaleUid,
      callId,
      action: 'cancel',
    });
  }

  async callConnected(femaleUid: string, callId: string): Promise<number> {
    const result = await this.callSessionEvent(femaleUid, callId, 'connected');
    return result.startedAt;
  }

  async callSessionEvent(hostUid: string, callId: string, event: string) {
    return Api.post<{
      success: boolean;
      active: boolean;
      ended: boolean;
      insufficient: boolean;
      startedAt: number;
      duration: number;
    }>('/callSessionEvent', { hostUid, callId, event });
  }

  async startCallPresence(
    callId: string,
    uid: string,
    isCurrent: () => boolean,
  ) {
    const presenceRef = database().ref(`callPresence/${callId}/${uid}`);
    await presenceRef.onDisconnect().remove();
    if (isCurrent()) await presenceRef.set(true);
    else await this.stopCallPresence(callId, uid);
  }

  async stopCallPresence(callId: string, uid: string) {
    const presenceRef = database().ref(`callPresence/${callId}/${uid}`);
    await presenceRef.onDisconnect().cancel();
    await presenceRef.remove();
  }

  async chargeCallMinute(femaleUid: string, callId: string): Promise<boolean> {
    const result = await this.callSessionEvent(femaleUid, callId, 'heartbeat');
    return !result.ended && !result.insufficient;
  }

  async endCall(femaleUid: string, callId?: string) {
    if (!callId) throw new Error('Call ID zaroori hai.');
    await this.callSessionEvent(femaleUid, callId, 'end');
  }

  async getCallHistory() {
    const uid = auth().currentUser?.uid;

    if (!uid) {
      throw new Error('Pehle sign in karo');
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
      throw new Error('Pehle sign in karo');
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
    const earningsRef = database().ref(`users/${uid}/expertEarnings/creditedCalls`);
    let currentHistory: CallHistory[] = [];
    let creditedCalls: Record<string, { amount?: number }> = {};

    const publish = () => {
      const history = currentHistory
        .map(item => ({
          ...item,
          expertAmount:
            item.expertAmount ??
            Number(creditedCalls[item.callId]?.amount || 0),
        }))
        .sort((a, b) => b.startedAt - a.startedAt);
      callback(history);
    };

    const listener = ref.on('value', snapshot => {
      currentHistory = [];

      snapshot.forEach(child => {
        const item = child.val() as CallHistory;

        if (includeArchived || !item.archivedAt) {
          currentHistory.push(item);
        }

        return false;
      });

      publish();
    });

    const earningsListener = earningsRef.on('value', snapshot => {
      creditedCalls = snapshot.val() || {};
      publish();
    });

    return () => {
      ref.off('value', listener);
      earningsRef.off('value', earningsListener);
    };
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
    const room = (
      await database().ref(`rooms/${femaleUid}`).once('value')
    ).val();
    if (!room?.currentCallId) return;
    if (this.getCurrentUser().uid === femaleUid)
      await this.rejectCall(femaleUid, room.currentCallId);
    else await this.menRejectCall(femaleUid, room.currentCallId);
  }
  async getRandomFemaleRoom(
    excludedUids: string[] = [],
    maximumRate = Infinity,
  ): Promise<Room> {
    const snapshot = await database().ref('rooms').once('value');

    const rooms: Room[] = [];

    snapshot.forEach(child => {
      const room = child.val() as Room;
      if (
        ['waiting', 'ended', 'rejected', 'men_rejected'].includes(room.status)
      )
        rooms.push(room);
      return false;
    });

    if (rooms.length === 0) {
      throw new Error('Abhi koi expert online nahi hai.');
    }

    // Shuffle so every user has an equal chance
    const shuffled = rooms.sort(() => Math.random() - 0.5);

    // Return the first room whose user profile is still online
    for (const room of shuffled) {
      if (excludedUids.includes(room.female.uid)) continue;
      if (await this.isBlocked(room.female.uid, this.getCurrentUser().uid))
        continue;
      const userSnapshot = await database()
        .ref(`users/${room.female.uid}`)
        .once('value');

      if (!userSnapshot.exists()) {
        continue;
      }

      const user = userSnapshot.val();

      if (user?.isExpert === true && user?.profile?.status === 'online') {
        const rate = normalizeCallRate(user?.profile?.price);
        if (rate > maximumRate) continue;
        room.callRatePerMinute = rate;
        room.female = { ...room.female, price: rate };
        return room;
      }
    }

    throw new Error('Abhi koi expert online nahi hai.');
  }
}

export default new RoomService();
