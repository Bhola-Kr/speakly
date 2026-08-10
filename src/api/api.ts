const BASE_URL = 'https://us-central1-voice-tamil.cloudfunctions.net/api';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

class Api {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
  ): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
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

  generateAgoraToken() {
    return this.post<AgoraTokenResponse>('/generateAgoraToken');
  }

  generateFirebaseToken(phone: string) {
    return this.post<AgoraTokenResponse>('/generateFirebaseToken', {
      phone,
    });
  }
}

export interface AgoraTokenResponse {
  success: boolean;
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  expiresAt: number;
}

export default new Api();
