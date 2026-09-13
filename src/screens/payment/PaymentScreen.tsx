import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';

import Colors from '../../constants/colors';
import { createOrder, verifyOrder } from '../../api/calls';
import { useUser } from '../../hooks/UserContext';

const PRIVACY_POLICY_URL = 'https://voicetamil.com/privacy-policy';

const PaymentScreen = ({ navigation, route }: any) => {
  const pack = route?.params?.pack;
  const { user } = useUser();
  console.log('PaymentScreen -> user', user);

  const [loading, setLoading] = useState(false);
  const amount = Number(pack?.amount || 0);
  const bonus = Number(pack?.bonus || 0);

  const totalCoins = useMemo(() => {
    return amount + bonus;
  }, [amount, bonus]);

  const customerId = user?.profile?.uid || '';
  const customerPhone = user?.phone || user?.profile?.phone || '';
  const customerName = user?.profile?.name || '';

  const handlePaymentVerification = useCallback(
    async (orderId: string) => {
      try {
        setLoading(true);

        const response = await verifyOrder(orderId, customerId);

        if (!response.success) {
          throw new Error(response.message || 'Unable to verify payment');
        }

        if (response.paid === true) {
          Alert.alert(
            'Payment Successful',
            `₹${
              response.data?.amount ?? amount
            } payment completed successfully.`,
            [{ text: 'Done', onPress: () => navigation.goBack() }],
          );
          return;
        }

        Alert.alert(
          'Payment Pending',
          'We could not confirm the payment yet. Please check your transactions.',
        );
      } catch (error: any) {
        console.error('Payment verification error:', error);
        Alert.alert(
          'Payment Verification Failed',
          error?.message || 'Unable to verify payment.',
        );
      } finally {
        setLoading(false);
      }
    },
    [amount, customerId, navigation],
  );

  useEffect(() => {
    CFPaymentGatewayService.setCallback({
      onVerify: (orderId: string) => {
        console.log('Cashfree payment verified:', orderId);

        handlePaymentVerification(orderId);
      },

      onError: (error: any, orderId: string) => {
        console.log('Cashfree payment error:', error);
        console.log('Order ID:', orderId);

        setLoading(false);

        Alert.alert(
          'Payment Failed',
          error?.message || 'Payment was not completed.',
        );
      },
    });
  }, [handlePaymentVerification]);

  const handlePayNow = async () => {
    try {
      if (loading) {
        return;
      }

      if (!amount || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please select a valid recharge pack.');
        return;
      }

      setLoading(true);

      console.log('Creating Cashfree order...');

      const response = await createOrder(
        pack?.id,
        customerId,
        customerPhone,
        customerName,
      );

      console.log('Cashfree Create Order Response:', response);

      if (!response?.success) {
        throw new Error(response?.message || 'Unable to create payment order');
      }

      const orderId = response?.data?.order_id;
      const paymentSessionId = response?.data?.payment_session_id;

      if (!orderId) {
        throw new Error('Order ID was not returned by server');
      }

      if (!paymentSessionId) {
        throw new Error('Payment session was not returned by server');
      }

      console.log('Order ID:', orderId);
      console.log('Payment Session ID:', paymentSessionId);

      const session = new CFSession(
        paymentSessionId,
        orderId,
        CFEnvironment.SANDBOX,
      );

      CFPaymentGatewayService.doWebPayment(session);
    } catch (error: any) {
      console.error('Payment Error:', error);

      setLoading(false);

      Alert.alert(
        'Payment Failed',
        error?.message || 'Unable to start payment.',
      );
    }
  };

  const openPrivacyPolicy = async () => {
    try {
      const supported = await Linking.canOpenURL(PRIVACY_POLICY_URL);

      if (supported) {
        await Linking.openURL(PRIVACY_POLICY_URL);
      } else {
        Alert.alert('Error', 'Unable to open Privacy Policy.');
      }
    } catch {
      Alert.alert('Error', 'Unable to open Privacy Policy.');
    }
  };

  // UI

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={25}
            color={Colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Payment</Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.intro}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="wallet-plus-outline"
              size={30}
              color={Colors.secondary}
            />
          </View>

          <Text style={styles.title}>Recharge VoiceTamil</Text>

          <Text style={styles.subtitle}>Add coins to your wallet</Text>
        </View>

        <View style={styles.paymentCard}>
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount to Pay</Text>

            <Text style={styles.amount}>₹{amount.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.smallIcon}>
                <MaterialCommunityIcons
                  name="circle-multiple"
                  size={18}
                  color={Colors.secondary}
                />
              </View>

              <Text style={styles.rowLabel}>Coins</Text>
            </View>

            <Text style={styles.rowValue}>{amount}</Text>
          </View>

          {bonus > 0 && (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.smallIcon}>
                  <MaterialCommunityIcons
                    name="gift-outline"
                    size={18}
                    color={Colors.secondary}
                  />
                </View>

                <Text style={styles.rowLabel}>Bonus Coins</Text>
              </View>

              <Text style={styles.bonusValue}>+{bonus}</Text>
            </View>
          )}

          <View style={styles.totalBox}>
            <View>
              <Text style={styles.totalLabel}>Total Coins</Text>

              <Text style={styles.totalSubtext}>Added to your wallet</Text>
            </View>

            <View style={styles.totalRight}>
              <MaterialCommunityIcons
                name="circle-multiple"
                size={20}
                color={Colors.secondary}
              />

              <Text style={styles.totalCoins}>{totalCoins}</Text>
            </View>
          </View>
        </View>

        <View style={styles.secureRow}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={19}
            color={Colors.secondary}
          />

          <Text style={styles.secureText}>
            Secure payment powered by Cashfree
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={loading}
          onPress={handlePayNow}
          style={[styles.payButton, loading && styles.payButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="lock-outline"
                size={19}
                color={Colors.white}
              />

              <Text style={styles.payButtonText}>Pay ₹{amount.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.privacyContainer}>
          <Text style={styles.privacyText}>
            By continuing, you agree to our{' '}
          </Text>

          <TouchableOpacity activeOpacity={0.7} onPress={openPrivacyPolicy}>
            <Text style={styles.privacyLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    flex: 1,
    paddingHorizontal: 18,
  },

  // HEADER

  header: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSpacer: {
    width: 42,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },

  // INTRO

  intro: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 13,
    color: Colors.subText,
  },

  // PAYMENT CARD

  paymentCard: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,

    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  amountSection: {
    alignItems: 'center',
    paddingVertical: 5,
  },

  amountLabel: {
    fontSize: 13,
    color: Colors.subText,
  },

  amount: {
    marginTop: 5,
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 18,
  },

  // ROW

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  smallIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: Colors.subText,
  },

  rowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },

  bonusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },

  // TOTAL

  totalBox: {
    marginTop: 2,
    padding: 15,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },

  totalSubtext: {
    marginTop: 3,
    fontSize: 11,
    color: Colors.subText,
  },

  totalRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  totalCoins: {
    marginLeft: 5,
    fontSize: 21,
    fontWeight: '800',
    color: Colors.secondary,
  },

  // SECURITY

  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  secureText: {
    marginLeft: 6,
    fontSize: 12,
    color: Colors.subText,
  },

  // PAY BUTTON

  payButton: {
    height: 55,
    borderRadius: 17,
    backgroundColor: Colors.secondary,
    marginTop: 18,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  payButtonDisabled: {
    opacity: 0.6,
  },

  payButtonText: {
    marginLeft: 8,
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },

  // PRIVACY

  privacyContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
  },

  privacyText: {
    fontSize: 11,
    color: Colors.subText,
  },

  privacyLink: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
    textDecorationLine: 'underline',
  },
});

export default PaymentScreen;
