import Api from '../api/api';

export interface AgoraTokenResponse {
  success: boolean;
  appId: string;
  channelName: string;
  expiresAt: number;
  male: {
    uid: number;
    token: string;
  };
  female: {
    uid: number;
    token: string;
  };
}

export const fetchAgoraToken = async (): Promise<AgoraTokenResponse> => {
  try {
    const response = await Api.generateAgoraToken();
    return response as unknown as AgoraTokenResponse;
  } catch (error) {
    console.log('fetchAgoraToken Error:', error);
    throw error;
  }
};

export const fetchFirebaseToken = async (phone: string): Promise<string> => {
  try {
    const response = await Api.generateFirebaseToken(phone);

    return response.token;
  } catch (error) {
    console.log('fetchFirebaseToken Error:', error);
    throw error;
  }
};
