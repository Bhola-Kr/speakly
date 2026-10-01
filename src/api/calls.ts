import Api, { CreateOrderResponse } from '../api/api';

// ============================================
// TYPES
// ============================================

export interface SendOtpResponse {
  success: boolean;
  message: string;
  reqId: string;
}

export interface ResendOtpResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  uid: string;
  token: string;
}

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

export interface FirebaseTokenResponse {
  success: boolean;
  uid: string;
  token: string;
}

// ============================================
// SEND OTP
// ============================================

export const sendOtp = async (phone: string): Promise<SendOtpResponse> => {
  try {
    const response = await Api.sendOtp(phone);
    console.log('response', response);

    return response;
  } catch (error) {
    console.log('sendOtp Error:', error);
    throw error;
  }
};

// ============================================
// RESEND OTP
// ============================================

export const resendMSGOtp = async (
  phone: string,
  reqId: string,
): Promise<ResendOtpResponse> => {
  try {
    const response = await Api.resendOtp(phone, reqId);
    console.log('response', response);

    return response;
  } catch (error) {
    console.log('resendOtp Error:', error);
    throw error;
  }
};

// ============================================
// VERIFY OTP
// ============================================

export const verifyMSGOtp = async (
  phone: string,
  otp: string,
  reqId: string,
): Promise<VerifyOtpResponse> => {
  try {
    const response = await Api.verifyOtp(phone, otp, reqId);
    console.log('response', response);

    return response;
  } catch (error) {
    console.log('verifyOtp Error:', error);
    throw error;
  }
};

export const createOrder = async (
  packId: string,
  customerId: string,
  customerPhone: string,
  customerName: string,
): Promise<CreateOrderResponse> => {
  try {
    const response = await Api.createOrder(
      packId,
      customerId,
      customerPhone,
      customerName,
    );
    console.log('response', response);
    return response;
  } catch (error) {
    console.log('createOrder Error:', error);
    throw error;
  }
};

export const verifyOrder = async (orderId: string, customerId: string) => {
  return Api.verifyOrder(orderId, customerId);
};

export const sendChatNotification = (payload: {
  type: 'chat_message';
  recipientUid: string;
  senderUid: string;
  senderName: string;
  conversationId: string;
  messageId: string;
  messageType: 'text' | 'voice';
  preview: string;
}) => Api.sendChatNotification(payload);

// ============================================
// AGORA TOKEN
// ============================================

export const fetchAgoraToken = async (): Promise<AgoraTokenResponse> => {
  try {
    const response = await Api.generateAgoraToken();

    return response as unknown as AgoraTokenResponse;
  } catch (error) {
    console.log('fetchAgoraToken Error:', error);
    throw error;
  }
};

// ============================================
// FIREBASE TOKEN
// ============================================

export const fetchFirebaseToken = async (phone: string): Promise<string> => {
  try {
    const response = await Api.generateFirebaseToken(phone);

    return response.token;
  } catch (error) {
    console.log('fetchFirebaseToken Error:', error);
    throw error;
  }
};

export const fetchRechargePacks = async () => {
  try {
    const response = await Api.getRechargePacks();
    // @ts-ignore
    return response?.data;
  } catch (error) {
    console.log('fetchRechargePacks Error:', error);
    throw error;
  }
};
