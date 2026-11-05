import Api from '../api/api';

export const fetchMyExpertCompensation = () => Api.getMyExpertCompensation();

export const fetchExpertCompensationForAdmin = (uid: string) =>
  Api.getExpertCompensationForAdmin(uid);

export const saveExpertCompensation = (uid: string, rate: number) =>
  Api.updateExpertCompensation(uid, rate);

export const settleExpertCallEarnings = (callId: string) =>
  Api.settleExpertEarnings(callId);

export const sendExpertApprovalNotification = (uid: string) =>
  Api.sendExpertApprovalNotification(uid);

export const notifyAdminsOfExpertApplication = () =>
  Api.notifyAdminsOfExpertApplication();

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

export const sendIncomingCallPush = (payload: {
  recipientUid: string;
  femaleUid: string;
  callId: string;
  callerName: string;
}) => Api.sendIncomingCallNotification(payload);

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

export const initiateWalletPayment = (packId: number) =>
  Api.initiatePayment(packId);

export const initiateRazorpayWalletPayment = (packId: number) =>
  Api.initiateRazorpayPayment(packId);

export const verifyWalletPayment = (transactionId: string) =>
  Api.verifyPayment(transactionId);

export const confirmWalletPayment = (
  transactionId: string,
  payuResponse: unknown,
) => Api.confirmPayment(transactionId, payuResponse);

export const confirmRazorpayWalletPayment = (
  transactionId: string,
  response: import('./api').RazorpayCheckoutResponse,
) => Api.confirmRazorpayPayment(transactionId, response);

export const fetchPaymentHistory = async () => {
  const response = await Api.getPayments();
  return response.data;
};
