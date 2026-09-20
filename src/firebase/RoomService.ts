import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import {
  calculateCallAmount,
  CALL_RATE_PER_MINUTE,
} from '../constants/constants';
import { fetchAgoraToken } from '../api/calls';

export type RoomStatus =
  | 'offline'
  | 'waiting'
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
  status: CallStatus;
  maleInfo: UserInfo;
  femaleInfo: UserInfo;
  archivedAt?: number;
}
export interface UserInfo {
  uid: string;
  name: string;
  tamilName?: string;
  avatarId: number | string;
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
  callStartedAt?: number;
  chargedAmount?: number;
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
        avatarId: user.profile.avatarId,
      },
      male: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      agora: {
        male: agoraRes.male,
        female: agoraRes.female,
      },
    };

    const updates: Record<string, any> = {
      [`rooms/${firebaseUser.uid}`]: room,
      [`users/${firebaseUser.uid}/profile/status`]: 'online',
    };

    await database().ref().update(updates);
  }

  async goOffline() {
    const firebaseUser = this.getCurrentUser();

    const updates: Record<string, any> = {
      [`rooms/${firebaseUser.uid}/status`]: 'offline',
      [`rooms/${firebaseUser.uid}/male`]: null,
      [`rooms/${firebaseUser.uid}/currentCallId`]: '',
      [`rooms/${firebaseUser.uid}/updatedAt`]: Date.now(),
      [`users/${firebaseUser.uid}/profile/status`]: 'offline',
    };

    await database().ref().update(updates);
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
    const male = await this.getUser(firebaseUser.uid);
    const roomRef = database().ref(`rooms/${femaleUid}`);
    const transaction = await roomRef.transaction(room => {
      if (room == null) {
        return;
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
      room.status = 'ringing';
      const callId = database().ref('callHistory').push().key;
      if (!callId) {
        throw new Error('Unable to create call.');
      }
      room.currentCallId = callId;
      room.male = {
        uid: firebaseUser.uid,
        name: male.profile.name,
        avatarId: male.profile.avatarId,
      };

      room.updatedAt = Date.now();
      return room;
    });
    if (!transaction.committed) {
      const room = transaction.snapshot.val() as Room | null;

      if (!room) {
        throw new Error('This user is currently offline.');
      }

      if (['ringing', 'accepted', 'active'].includes(room.status)) {
        throw new Error('This user is currently busy on another call.');
      }

      throw new Error(
        'This user is not available right now. Please try again.',
      );
    }

    return transaction.snapshot.val();
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
      if (!room || room.status !== 'ringing') {
        return;
      }

      return {
        ...room,
        status: 'men_rejected',
        male: null,
        currentCallId: '',
        updatedAt: Date.now(),
      };
    });

    if (transaction.committed) {
      this.scheduleRoomReset(femaleUid, 'men_rejected');
    }
  }

  async callConnected(femaleUid: string) {
    await database().ref(`rooms/${femaleUid}`).update({
      status: 'active',
      callStartedAt: Date.now(),
      updatedAt: Date.now(),
    });
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

    let charged = false;
    await database()
      .ref(`users/${firebaseUser.uid}/wallet/balance`)
      .transaction(balance => {
        const currentBalance = Number(balance || 0);

        if (currentBalance < CALL_RATE_PER_MINUTE) {
          return;
        }

        charged = true;
        return currentBalance - CALL_RATE_PER_MINUTE;
      });

    if (!charged) {
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
          Number(currentRoom.chargedAmount || 0) + CALL_RATE_PER_MINUTE,
        updatedAt: Date.now(),
      };
    });

    if (!billingUpdate.committed) {
      await database()
        .ref(`users/${firebaseUser.uid}/wallet/balance`)
        .transaction(balance => Number(balance || 0) + CALL_RATE_PER_MINUTE);
      return false;
    }

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

    // Wait a moment so both users receive "ended"
    setTimeout(async () => {
      await roomRef.update({
        status: 'waiting',
        currentCallId: '',
        male: null,
        callSettled: null,
        chargedAmount: null,
        updatedAt: Date.now(),
      });
    }, 1000);
  }

  async saveCallHistory(room: Room, endedAt: number = Date.now()) {
    if (!room.currentCallId) {
      return;
    }

    const duration = room.callStartedAt ? endedAt - room.callStartedAt : 0;

    const amount =
      typeof room.chargedAmount === 'number'
        ? room.chargedAmount
        : room.callStartedAt
        ? calculateCallAmount(room.callStartedAt, endedAt)
        : 0;

    const history = {
      callId: room.currentCallId,
      startedAt: room.createdAt,
      endedAt,
      duration,
      amount,
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

    if (
      amount > 0 &&
      room.male?.uid &&
      typeof room.chargedAmount !== 'number'
    ) {
      await database()
        .ref(`users/${room.male.uid}/wallet/balance`)
        .transaction(balance => Math.max(0, Number(balance || 0) - amount));
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
      throw new Error('No female users are currently online.');
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
        return room;
      }
    }

    throw new Error('No female users are currently online.');
  }
}

export default new RoomService();
