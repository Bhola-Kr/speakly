import type { UserInfo } from '../firebase/RoomService';

export type CallFollowUpIntent = {
  action: 'call_again';
  hostUid: string;
  hostName: string;
  hostProfile: UserInfo;
  originalCallId: string;
  ratePerMinute: number;
  source: 'free_call_expired' | 'insufficient_balance';
  createdAt: number;
};
