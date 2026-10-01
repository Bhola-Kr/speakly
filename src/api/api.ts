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

  createOrder(
    packId: string,
    customerId: string,
    customerPhone: string,
    customerName: string,
  ) {
    return this.post<CreateOrderResponse>('/createOrder', {
      packId,
      customerId,
      customerPhone,
      customerName,
    });
  }

  verifyOrder(orderId: string, customerId: string) {
    return this.post<VerifyOrderResponse>('/verifyOrder', {
      orderId,
      customerId,
    });
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

export interface CreateOrderResponse {
  success: boolean;
  message: string;

  data: {
    cart_details: any | null;

    cf_order_id: string;

    created_at: string;

    customer_details: {
      customer_id: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      customer_uid: string | null;
    };

    entity: string;

    order_amount: number;

    order_currency: string;

    order_expiry_time: string;

    order_id: string;

    order_meta: {
      notify_url: string;
      offer_filters: any | null;
      payment_methods: string;
      payment_methods_filters: any | null;
      return_url: string;
      upi_app_priority: any | null;
    };

    order_note: string;

    order_splits: any[];

    order_status: string;

    order_tags: {
      company: string;
      name: string;
    };

    payment_session_id: string;

    products: {
      one_click_checkout: {
        enabled: boolean;
        conditions: any[];
      };

      verify_pay: {
        enabled: boolean;
        conditions: any[];
      };
    };

    terminal_data: any | null;
  };
}

export interface RechargePack {
  id: number;
  amount: number;
  bonus: number;
  tag: string;
}

export interface VerifyOrderResponse {
  success: boolean;
  paid?: boolean;
  message: string;
  data?: {
    orderId: string;
    cfOrderId?: string;
    amount?: number;
    currency?: string;
    status: string;
    cashfreeStatus?: string;
    coins?: number;
    coinsAdded?: number;
    balance?: number;
    paymentId?: string;
    customerDetails?: any;
  };
}

export default new Api();
