import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';

export type RoomStatus =
  | 'offline'
  | 'waiting'
  | 'ringing'
  | 'accepted'
  | 'active'
  | 'rejected'
  | 'ended';

export interface UserInfo {
  uid: string;
  name: string;
  avatarId: number | string;
}

export interface Room {
  roomId: string;
  currentCallId: string;
  status: RoomStatus;

  female: UserInfo;
  male: UserInfo | null;

  createdAt: number;
  updatedAt: number;

  callStartedAt?: number;
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

  async goOnline() {
    const firebaseUser = this.getCurrentUser();

    const user = await this.getUser(firebaseUser.uid);

    const room: Room = {
      roomId: firebaseUser.uid,

      currentCallId: '',

      status: 'waiting',

      female: {
        uid: firebaseUser.uid,

        name: user.profile.name,

        avatarId: user.profile.avatarId,
      },

      male: null,

      createdAt: Date.now(),

      updatedAt: Date.now(),
    };

    await database()
      .ref(`rooms/${firebaseUser.uid}`)

      .set(room);

    await database()
      .ref(`users/${firebaseUser.uid}`)

      .update({
        status: 'online',

        lastSeen: Date.now(),
      });
  }

  async goOffline() {
    const firebaseUser = this.getCurrentUser();

    await database().ref(`rooms/${firebaseUser.uid}`).update({
      status: 'offline',
      male: null,
      currentCallId: '',
      updatedAt: Date.now(),
    });

    await database().ref(`users/${firebaseUser.uid}`).update({
      status: 'offline',
      lastSeen: Date.now(),
    });
  }

  async isBlocked(femaleUid: string, maleUid: string) {
    const snapshot = await database()
      .ref(`blocks/${femaleUid}/${maleUid}`)
      .once('value');

    return snapshot.exists();
  }

  async callFemale(femaleUid: string) {
    const firebaseUser = this.getCurrentUser();

    const blocked = await this.isBlocked(
      femaleUid,

      firebaseUser.uid,
    );

    if (blocked) {
      throw new Error('You are blocked by this user.');
    }

    const male = await this.getUser(firebaseUser.uid);

    const roomRef = database().ref(`rooms/${femaleUid}`);
    const transaction = await roomRef.transaction(room => {
      if (room == null) {
        return;
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
      throw new Error('User Busy');
    }

    return transaction.snapshot.val();
  }

  listenIncomingCall(femaleUid: string, callback: (room: Room) => void) {
    const ref = database().ref(`rooms/${femaleUid}`);

    const listener = ref.on('value', snapshot => {
      if (!snapshot.exists()) {
        return;
      }

      const room = snapshot.val() as Room;
      if (room.status === 'ringing') {
        callback(room);
      }
    });

    return () => ref.off('value', listener);
  }

  listenCallStatus(
    femaleUid: string,

    callback: (room: Room) => void,
  ) {
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
    await database().ref(`rooms/${femaleUid}`).update({
      status: 'accepted',
      updatedAt: Date.now(),
    });
  }

  async rejectCall(femaleUid: string) {
    await database().ref(`rooms/${femaleUid}`).update({
      status: 'rejected',
      male: null,
      currentCallId: '',
      updatedAt: Date.now(),
    });
  }

  async callConnected(femaleUid: string) {
    await database().ref(`rooms/${femaleUid}`).update({
      status: 'active',
      callStartedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  async endCall(femaleUid: string) {
    const roomRef = database().ref(`rooms/${femaleUid}`);
    const snapshot = await roomRef.once('value');
    if (!snapshot.exists()) {
      return;
    }
    const room = snapshot.val() as Room;

    if (room.currentCallId) {
      await this.saveCallHistory(room);
    }

    await roomRef.update({
      status: 'ended',
      updatedAt: Date.now(),
    });

    // Wait a moment so both users receive "ended"
    setTimeout(async () => {
      await roomRef.update({
        status: 'waiting',
        currentCallId: '',
        male: null,
        updatedAt: Date.now(),
      });
    }, 1000);
  }

  async saveCallHistory(room: Room) {
    if (!room.currentCallId) {
      return;
    }

    await database()
      .ref(`callHistory/${room.currentCallId}`)
      .set({
        callId: room.currentCallId,
        femaleUid: room.female.uid,
        maleUid: room.male?.uid ?? '',
        startedAt: room.createdAt,
        endedAt: Date.now(),
        duration: room.callStartedAt ? Date.now() - room.callStartedAt : 0,
        status: 'completed',
      });
  }

  async blockUser(femaleUid: string, maleUid: string) {
    await database().ref(`blocks/${femaleUid}/${maleUid}`).set({
      blockedAt: Date.now(),
    });
  }

  async unblockUser(femaleUid: string, maleUid: string) {
    await database().ref(`blocks/${femaleUid}/${maleUid}`).remove();
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
    await database().ref(`rooms/${uid}`).remove();
  }

  async cancelCall(femaleUid: string) {
    await database().ref(`rooms/${femaleUid}`).update({
      status: 'waiting',
      currentCallId: '',
      male: null,
      updatedAt: Date.now(),
    });
  }
}

export default new RoomService();
