import { Alert } from 'react-native';

const API_KEY = '7c00d126-98dc-11f1-9cb1-0200cd936042';

const BASE_URL = 'https://2factor.in/API/V1';

const TEMPLATE_NAME = 'VTAM';

interface OTPResponse {
  Status?: string;
  Details?: string;
}

class OTPService {
  private sessionId: string | null = null;
  private phoneNumber: string | null = null;

  /**
   * Normalize Indian phone number
   */
  private normalizePhoneNumber(phoneNumber: string): string | null {
    if (!phoneNumber) {
      return null;
    }

    let phone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');

    if (phone.startsWith('+91')) {
      phone = phone.substring(3);
    }

    if (phone.startsWith('91') && phone.length === 12) {
      phone = phone.substring(2);
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return null;
    }

    return phone;
  }

  /**
   * SEND SMS OTP
   *
   * 2Factor generates the OTP automatically.
   */
  async sendOTP(phoneNumber: string): Promise<boolean> {
    try {
      const phone = this.normalizePhoneNumber(phoneNumber);

      if (!phone) {
        Alert.alert(
          'Number Sahi Nahi Hai',
          'Sahi 10-digit mobile number likho.',
        );

        return false;
      }

      const url =
        `${BASE_URL}/${API_KEY}` + `/SMS/${phone}/AUTOGEN/${TEMPLATE_NAME}`;

      console.log('2Factor SMS OTP URL:', url.replace(API_KEY, '********'));

      const controller = new AbortController();

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const rawResponse = await response.text();

        console.log('2Factor HTTP Status:', response.status);

        console.log('2Factor Response:', rawResponse);

        let data: OTPResponse;

        try {
          data = JSON.parse(rawResponse);
        } catch (error) {
          console.error('2Factor JSON Parse Error:', error);

          Alert.alert(
            'OTP Mein Dikkat',
            `OTP service se sahi jawaab nahi mila. Code ${response.status}`,
          );

          return false;
        }

        console.log('2Factor Parsed Response:', data);

        if (response.ok && data.Status?.toLowerCase() === 'success') {
          /**
           * AUTOGEN returns the OTP/session
           * information in Details depending
           * on the 2Factor API configuration.
           */
          this.sessionId = data.Details || null;

          this.phoneNumber = phone;

          Alert.alert(
            'OTP Bhej Diya',
            `SMS se OTP bhej diya hai: +91 ${phone}.`,
          );

          return true;
        }

        Alert.alert('OTP Verify Nahi Hua', 'OTP nahi gaya. Dobara try karo.');

        return false;
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error?.name === 'AbortError') {
          Alert.alert(
            'Request Mein Der Ho Gayi',
            'OTP aane mein der ho gayi. Dobara try karo.',
          );

          return false;
        }

        throw error;
      }
    } catch (error) {
      console.error('Send OTP Error:', error);

      Alert.alert(
        'Network Mein Dikkat',
        'OTP service se connect nahi hua. Internet check karke dobara try karo.',
      );

      return false;
    }
  }

  /**
   * VERIFY OTP
   *
   * For the legacy AUTOGEN API, the
   * verification endpoint uses the
   * session/OTP details returned by 2Factor.
   */
  async verifyOTP(otp: string): Promise<boolean> {
    try {
      if (!this.sessionId) {
        Alert.alert('Session Khatam Ho Gaya', 'Naya OTP mangao.');

        return false;
      }

      if (!otp) {
        Alert.alert('OTP Likho', 'Jo OTP mila hai, woh likho.');

        return false;
      }

      const cleanOTP = otp.replace(/\s/g, '');

      if (!/^\d{4,6}$/.test(cleanOTP)) {
        Alert.alert('OTP Sahi Nahi Hai', 'Sahi OTP likho.');

        return false;
      }

      const url =
        `${BASE_URL}/${API_KEY}` + `/SMS/VERIFY/${this.sessionId}/${cleanOTP}`;

      console.log('Verifying OTP...');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const rawResponse = await response.text();

      console.log('2Factor Verify Response:', rawResponse);

      let data: OTPResponse;

      try {
        data = JSON.parse(rawResponse);
      } catch {
        Alert.alert(
          'Verification Mein Dikkat',
          'OTP service se sahi jawaab nahi mila.',
        );

        return false;
      }

      if (
        data.Status?.toLowerCase() === 'success' &&
        (data.Details?.toLowerCase().includes('matched') ||
          data.Details?.toLowerCase().includes('verified'))
      ) {
        Alert.alert('Success', 'Mobile number verify ho gaya.');

        return true;
      }

      Alert.alert('OTP Sahi Nahi Hai', 'Aapka OTP sahi nahi hai.');

      return false;
    } catch (error) {
      console.error('Verify OTP Error:', error);

      Alert.alert(
        'Verification Nahi Hui',
        'OTP verify nahi hua. Dobara try karo.',
      );

      return false;
    }
  }

  /**
   * RESEND OTP
   */
  async resendOTP(): Promise<boolean> {
    try {
      if (!this.phoneNumber) {
        Alert.alert('Error', 'Mobile number nahi mila. Dobara shuru karo.');

        return false;
      }

      return await this.sendOTP(this.phoneNumber);
    } catch (error) {
      console.error('Resend OTP Error:', error);

      Alert.alert(
        'OTP Phir Nahi Bhej Paaye',
        'OTP dobara nahi gaya. Thodi der baad try karo.',
      );

      return false;
    }
  }

  /**
   * Clear OTP session
   */
  clearSession(): void {
    this.sessionId = null;
    this.phoneNumber = null;
  }

  /**
   * Check whether session exists
   */
  hasSession(): boolean {
    return this.sessionId !== null;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get phone number
   */
  getPhoneNumber(): string | null {
    return this.phoneNumber;
  }
}

export default new OTPService();
