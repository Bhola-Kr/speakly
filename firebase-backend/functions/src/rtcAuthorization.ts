import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import { logger } from 'firebase-functions';

export const createAgoraTokenHandler =
  (appId: string, appCertificate: string) =>
  async (req: Request, res: Response) => {
    try {
      const bearer = String(req.headers.authorization || '').replace(
        /^Bearer /,
        '',
      );
      if (!bearer)
        return res
          .status(401)
          .json({ success: false, message: 'Sign in zaroori hai.' });
      const caller = await admin.auth().verifyIdToken(bearer);

      const requestedChannel = String(req.body?.channelName || '').trim();
      let participantRole = '';
      if (!requestedChannel)
        return res
          .status(400)
          .json({ success: false, message: 'Call channel zaroori hai.' });
      if (requestedChannel) {
        if (!/^call_[a-zA-Z0-9_-]+$/.test(requestedChannel)) {
          return res
            .status(400)
            .json({ success: false, message: 'Call channel sahi nahi hai.' });
        }
        const rooms = admin.database().ref('speakly/rooms');
        const [matchingRooms, callerRooms] = await Promise.all([
          rooms
            .orderByChild('currentCallId')
            .equalTo(requestedChannel.slice(5))
            .once('value'),
          rooms.orderByChild('male/uid').equalTo(caller.uid).once('value'),
        ]);
        const session: any = Object.values(matchingRooms.val() || {}).find(
          (room: any) =>
            ['calling', 'ringing', 'accepted', 'active'].includes(
              room.status,
            ) &&
            (room.male?.uid === caller.uid || room.female?.uid === caller.uid),
        );
        participantRole =
          session?.male?.uid === caller.uid
            ? 'male'
            : session?.female?.uid === caller.uid
            ? 'female'
            : '';
        if (!session)
          return res
            .status(403)
            .json({ success: false, message: 'Call access nahi mila.' });
        const conflicting = Object.values(callerRooms.val() || {}).some(
          (room: any) =>
            room.currentCallId !== requestedChannel.slice(5) &&
            ['calling', 'ringing', 'accepted', 'active'].includes(room.status),
        );
        if (conflicting)
          return res.status(409).json({
            success: false,
            message: 'Pehle chal rahi call khatam karo.',
          });
      }
      const channelName = /^[a-zA-Z0-9_-]{1,64}$/.test(requestedChannel)
        ? requestedChannel
        : `idle_${admin.database().ref().push().key}`;

      // UIDs are scoped to a unique channel and must survive token refreshes.
      const maleUid = 1;
      const femaleUid = 2;

      const expireSeconds = 60 * 60 * 24;

      const currentTimestamp = Math.floor(Date.now() / 1000);

      const privilegeExpire = currentTimestamp + expireSeconds;

      const maleToken = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        maleUid,
        RtcRole.PUBLISHER,
        expireSeconds,
        expireSeconds,
      );

      const femaleToken = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        femaleUid,
        RtcRole.PUBLISHER,
        expireSeconds,
        expireSeconds,
      );

      return res.status(200).json({
        success: true,
        appId,
        channelName,
        expiresAt: privilegeExpire,

        male: {
          uid: maleUid,
          token: participantRole === 'male' ? maleToken : '',
        },

        female: {
          uid: femaleUid,
          token: participantRole === 'female' ? femaleToken : '',
        },
      });
    } catch (error) {
      logger.error(error);

      return res.status(500).json({
        success: false,
        message: 'Call ki permission verify nahi hui.',
      });
    }
  };
