import auth from '@react-native-firebase/auth';

const BASE_URL = 'https://us-central1-voice-tamil.cloudfunctions.net/api';

class Api {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
  ): Promise<T> {
    const idToken = await auth().currentUser?.getIdToken();

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json();

    if (!response.ok || json.success === false) {
      throw new Error(json.message || json.error || 'Something went wrong');
    }

    return json;
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, 'POST', body);
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, 'GET');
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, 'PUT', body);
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, 'DELETE');
  }

  // ============================================
  // MSG91 - SEND OTP
  // ============================================

  sendOtp(phone: string) {
    return this.post<SendOtpResponse>('/sendOtp', {
      phone,
    });
  }

  // ============================================
  // MSG91 - RESEND OTP VIA SMS
  // ============================================

  resendOtp(phone: string, reqId: string) {
    return this.post<ResendOtpResponse>('/resendOtp', {
      phone,
      reqId,
    });
  }

  // ============================================
  // MSG91 - VERIFY OTP
  // ============================================

  verifyOtp(phone: string, otp: string, reqId: string) {
    return this.post<VerifyOtpResponse>('/verifyOtp', {
      phone,
      otp,
      reqId,
    });
  }

  // ============================================
  // AGORA
  // ============================================

  generateAgoraToken() {
    return this.post<AgoraTokenResponse>('/generateAgoraToken');
  }

  // ============================================
  // FIREBASE TOKEN
  // ============================================

  generateFirebaseToken(phone: string) {
    return this.post<FirebaseTokenResponse>('/generateFirebaseToken', {
      phone,
    });
  }

  getRechargePacks() {
    return this.get<RechargePack[]>('/rechargePacks');
  }

  sendChatNotification(payload: {
    type: 'chat_message';
    recipientUid: string;
    senderUid: string;
    senderName: string;
    conversationId: string;
    messageId: string;
    messageType: 'text' | 'voice';
    preview: string;
  }) {
    return this.post<{ success: boolean; delivered?: boolean }>(
      '/sendChatNotification',
      payload,
    );
  }

  sendIncomingCallNotification(payload: {
    recipientUid: string;
    femaleUid: string;
    callId: string;
    callerName: string;
  }) {
    return this.post<{ success: boolean; delivered?: boolean }>(
      '/sendCallNotification',
      { type: 'incoming_call', ...payload },
    );
  }
}

// ============================================
// MSG91 TYPES
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

// ============================================
// AGORA TYPES
// ============================================

export interface AgoraTokenResponse {
  success: boolean;
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  expiresAt: number;
}

// ============================================
// FIREBASE TOKEN TYPES
// ============================================

export interface FirebaseTokenResponse {
  success: boolean;
  uid: string;
  token: string;
}

export interface RechargePack {
  id: number;
  amount: number;
  bonus: number;
  tag: string;
}

export default new Api();
