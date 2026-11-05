import auth from '@react-native-firebase/auth';

export const API_BASE_URL =
  'https://us-central1-recent-chat-7fd34.cloudfunctions.net/api';

class Api {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
  ): Promise<T> {
    const idToken = await auth().currentUser?.getIdToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const responseText = await response.text();
      let json: any;
      try {
        json = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error('The server returned an invalid response.');
      }
      if (!response.ok || json.success === false) {
        throw new Error(
          json.message || json.error || `Request failed (${response.status})`,
        );
      }
      return json as T;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('The request timed out. Please check your connection.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
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

  initiatePayment(packId: number) {
    return this.post<InitiatePaymentResponse>('/payments/initiate', { packId });
  }

  initiateRazorpayPayment(packId: number) {
    return this.post<InitiateRazorpayPaymentResponse>(
      '/payments/razorpay/initiate',
      { packId },
    );
  }

  verifyPayment(transactionId: string) {
    return this.post<PaymentResponse>(
      `/payments/${encodeURIComponent(transactionId)}/verify`,
    );
  }

  confirmPayment(transactionId: string, payuResponse: unknown) {
    return this.post<PaymentResponse>(
      `/payments/${encodeURIComponent(transactionId)}/confirm`,
      { payuResponse },
    );
  }

  confirmRazorpayPayment(
    transactionId: string,
    response: RazorpayCheckoutResponse,
  ) {
    return this.post<PaymentResponse>(
      `/payments/${encodeURIComponent(transactionId)}/razorpay/confirm`,
      response,
    );
  }

  getPayments() {
    return this.get<PaymentsResponse>('/payments');
  }

  getMyExpertCompensation() {
    return this.get<ExpertCompensationResponse>('/expert-compensation/me');
  }

  getExpertCompensationForAdmin(uid: string) {
    return this.get<ExpertCompensationResponse>(
      `/admin/users/${encodeURIComponent(uid)}/expert-compensation`,
    );
  }

  updateExpertCompensation(uid: string, callRatePerMinute: number) {
    return this.put<ExpertCompensationResponse>(
      `/admin/users/${encodeURIComponent(uid)}/expert-compensation`,
      { callRatePerMinute },
    );
  }

  settleExpertEarnings(callId: string) {
    return this.post<{ success: boolean }>(
      `/calls/${encodeURIComponent(callId)}/settle-expert-earnings`,
    );
  }

  sendExpertApprovalNotification(uid: string) {
    return this.post<{ success: boolean; delivered: boolean }>(
      `/admin/users/${encodeURIComponent(uid)}/expert-approval-notification`,
    );
  }

  notifyAdminsOfExpertApplication() {
    return this.post<{ success: boolean; delivered: number }>(
      '/expert-applications/notify-admins',
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

export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'crediting'
  | 'success'
  | 'failed';

export interface PaymentTransaction {
  id: string;
  transactionId: string;
  amount: number;
  bonus: number;
  creditedAmount: number;
  currency: 'INR';
  status: PaymentStatus;
  provider?: 'payu' | 'razorpay';
  createdAt: number;
  updatedAt: number;
  creditedAt?: number | null;
  payuId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  bankReferenceNumber?: string | null;
  paymentMode?: string | null;
  failureReason?: string | null;
}

export interface PayUPaymentParams {
  key: string;
  transactionId: string;
  amount: string;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
  android_surl: string;
  android_furl: string;
  ios_surl: string;
  ios_furl: string;
  environment: '0' | '1';
  userCredential: string;
  userToken: string;
  additionalParam: Record<string, string>;
}

export interface InitiatePaymentResponse {
  success: boolean;
  data: {
    transaction: PaymentTransaction;
    paymentParams: PayUPaymentParams;
  };
}

export interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes: { transactionId: string };
  theme: { color: string };
}

export interface InitiateRazorpayPaymentResponse {
  success: boolean;
  data: {
    transaction: PaymentTransaction;
    checkoutOptions: RazorpayCheckoutOptions;
  };
}

export interface PaymentResponse {
  success: boolean;
  data: PaymentTransaction;
}

export interface PaymentsResponse {
  success: boolean;
  data: PaymentTransaction[];
}

export interface ExpertCompensationResponse {
  success: boolean;
  data: { callRatePerMinute: number };
}

export default new Api();
