import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Colors from '../../constants/colors';
import GradientButton from '../../components/GradientButton';
import { fetchRechargePacks } from '../../api/calls';
import type { RechargePack } from '../../api/api';
import { useUser } from '../../hooks/UserContext';
import { openPayUCheckout } from '../../payment/payuCheckout';
import { openRazorpayCheckout } from '../../payment/razorpayCheckout';
import {
  getActivePaymentGateways,
  listenActivePaymentGateways,
} from '../../firebase/paymentGateways';
import type { PaymentGateway } from '../../firebase/paymentGateways';
import { copy } from '../../constants/strings';
import {
  trackCheckoutStarted,
  trackPaymentSuccess,
} from '../../firebase/analytics';

const WalletScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [packs, setPacks] = useState<RechargePack[]>([]);
  const [selectedPack, setSelectedPack] = useState<RechargePack | null>(null);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [packsError, setPacksError] = useState('');
  const [paying, setPaying] = useState(false);
  const [activePaymentGateways, setActivePaymentGateways] = useState<
    PaymentGateway[]
  >([]);
  const [gatewayConfigLoading, setGatewayConfigLoading] = useState(true);
  const [gatewayConfigError, setGatewayConfigError] = useState('');
  const [paymentGateway, setPaymentGateway] =
    useState<PaymentGateway>('razorpay');

  useEffect(() => {
    const unsubscribe = listenActivePaymentGateways(
      gateways => {
        setActivePaymentGateways(gateways);
        setPaymentGateway(current =>
          gateways.includes(current) ? current : gateways[0] || 'razorpay',
        );
        setGatewayConfigError('');
        setGatewayConfigLoading(false);
      },
      error => {
        console.warn('Unable to load payment gateway config:', error);
        setActivePaymentGateways([]);
        setGatewayConfigError(
          'Unable to load payment methods. Please try again.',
        );
        setGatewayConfigLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadRechargePacks = async () => {
      try {
        setLoadingPacks(true);
        setPacksError('');

        const response = await fetchRechargePacks();

        if (!mounted) {
          return;
        }

        setPacks(response);
        const preferredAmount = Number(route?.params?.preferredAmount || 20);
        setSelectedPack(
          response?.find(
            (pack: RechargePack) => Number(pack.amount) === preferredAmount,
          ) ||
            response?.find(
              (pack: RechargePack) => Number(pack.amount) === 20,
            ) ||
            response?.[0] ||
            null,
        );
      } catch (error) {
        if (mounted) {
          setPacksError(
            error instanceof Error
              ? error.message
              : 'Unable to load coin packs.',
          );
        }
      } finally {
        if (mounted) {
          setLoadingPacks(false);
        }
      }
    };

    loadRechargePacks();

    return () => {
      mounted = false;
    };
  }, [route?.params?.preferredAmount]);

  const totalReceive = useMemo(() => {
    return selectedPack ? selectedPack.amount + selectedPack.bonus : 0;
  }, [selectedPack]);

  const onRecharge = async () => {
    if (!selectedPack || paying) return;
    try {
      setPaying(true);
      trackCheckoutStarted(selectedPack.amount, totalReceive);
      const currentGateways = await getActivePaymentGateways();
      setActivePaymentGateways(currentGateways);
      if (!currentGateways.includes(paymentGateway)) {
        setPaymentGateway(currentGateways[0] || 'razorpay');
        throw new Error(
          currentGateways.length
            ? 'That payment method is no longer active. Please select an active method and try again.'
            : 'No payment methods are currently active.',
        );
      }
      const payment =
        paymentGateway === 'razorpay'
          ? await openRazorpayCheckout(selectedPack.id)
          : await openPayUCheckout(selectedPack.id);
      if (payment.status === 'success') {
        trackPaymentSuccess(payment, paymentGateway);
        Alert.alert(
          'Coins Added',
          `${payment.creditedAmount} coins were added to your balance.`,
        );
      } else if (payment.status === 'failed') {
        Alert.alert(
          'Payment Unsuccessful',
          payment.failureReason || 'No coins were added to your balance.',
        );
      } else {
        Alert.alert(
          'Payment Verification Pending',
          `We are confirming this payment with ${
            paymentGateway === 'razorpay' ? 'Razorpay' : 'PayU'
          }. Your coin balance will update automatically after verification.`,
        );
      }
    } catch (error) {
      Alert.alert(
        'Unable to Complete Payment',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={26}
            color={Colors.text}
          />
          <Text style={styles.headerTitle}>{copy.wallet.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Transaction')}
          activeOpacity={0.8}
          style={styles.transactionButton}
        >
          <MaterialCommunityIcons
            name="history"
            color={Colors.secondary}
            size={18}
          />
          <Text style={styles.transactionText}>Transactions</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={Colors.goldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Image
            source={require('../../assets/coin.png')}
            style={styles.coinImage}
          />

          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>{copy.wallet.balanceLabel}</Text>
            <Text style={styles.balanceAmount}>
              {user?.wallet?.balance || 0}
            </Text>
            <Text style={styles.balanceDescription} numberOfLines={1}>
              Add coins to continue voice calls
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Coin Pack</Text>

          <Text style={styles.sectionSubTitle}>
            Bigger packs give you extra bonus balance.
          </Text>

          <View style={styles.grid}>
            {loadingPacks && (
              <ActivityIndicator
                style={styles.packsStatus}
                size="large"
                color={Colors.secondary}
              />
            )}

            {!loadingPacks && !!packsError && (
              <Text style={styles.packsStatus}>{packsError}</Text>
            )}

            {!loadingPacks && !packsError && packs.length === 0 && (
              <Text style={styles.packsStatus}>
                No coin packs are available right now.
              </Text>
            )}

            {packs.map(pack => {
              const selected = selectedPack?.id === pack.id;

              return (
                <TouchableOpacity
                  key={pack.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedPack(pack)}
                  style={[styles.card, selected && styles.selectedCard]}
                >
                  {(Number(pack.amount) === 20 || !!pack.tag) && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {Number(pack.amount) === 20 ? 'STARTER' : pack.tag}
                      </Text>
                    </View>
                  )}

                  {selected && (
                    <View style={styles.tickCircle}>
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color={Colors.white}
                      />
                    </View>
                  )}

                  <Text style={styles.amount}>₹{pack.amount}</Text>

                  <Text style={styles.bonus}>{pack.bonus} bonus coins</Text>

                  <View style={styles.divider} />

                  <Text style={styles.receiveLabel}>You'll Receive</Text>

                  <View style={styles.receiveContainer}>
                    <Image
                      source={require('../../assets/coin.png')}
                      style={styles.receiveCoin}
                    />
                    <Text style={styles.receive}>
                      {pack.amount + pack.bonus}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {!!selectedPack && (
        <View
          style={[
            styles.bottomContainer,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryTitle}>You'll Receive</Text>

              <View style={styles.receiveContainer}>
                <Image
                  source={require('../../assets/coin.png')}
                  style={styles.receiveCoin}
                />
                <Text style={styles.receive}>{totalReceive}</Text>
              </View>

              <Text style={styles.summaryBonus}>
                Includes {selectedPack.bonus} bonus coins
              </Text>
            </View>

            <Text style={styles.payAmount}>₹{selectedPack.amount}</Text>
          </View>

          {gatewayConfigLoading && (
            <ActivityIndicator
              style={styles.gatewayStatus}
              size="small"
              color={Colors.secondary}
            />
          )}

          {!!gatewayConfigError && (
            <Text style={styles.gatewayStatus}>{gatewayConfigError}</Text>
          )}

          {!gatewayConfigLoading &&
            !gatewayConfigError &&
            activePaymentGateways.length === 0 && (
              <Text style={styles.gatewayStatus}>
                No payment methods are currently active.
              </Text>
            )}

          {!gatewayConfigLoading &&
            !gatewayConfigError &&
            activePaymentGateways.length > 1 &&
            activePaymentGateways.length > 0 && (
              <View style={styles.gatewayRow}>
                {activePaymentGateways.map(gateway => {
                  const selected = paymentGateway === gateway;
                  return (
                    <TouchableOpacity
                      key={gateway}
                      activeOpacity={0.8}
                      disabled={paying}
                      onPress={() => setPaymentGateway(gateway)}
                      style={[
                        styles.gatewayOption,
                        selected && styles.gatewayOptionSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                        size={18}
                        color={selected ? Colors.secondary : Colors.subText}
                      />
                      <Text
                        style={[
                          styles.gatewayText,
                          selected && styles.gatewayTextSelected,
                        ]}
                      >
                        {gateway === 'payu' ? 'PayU' : 'Razorpay'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

          <GradientButton
            title={`Pay ₹${selectedPack.amount}`}
            onPress={onRecharge}
            disabled={
              paying ||
              gatewayConfigLoading ||
              !!gatewayConfigError ||
              activePaymentGateways.length === 0
            }
            loading={paying}
            style={styles.paymentButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  scrollContent: {
    paddingBottom: 270,
  },

  paymentButton: {
    marginTop: 12,
  },

  gatewayRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  gatewayStatus: {
    marginTop: 14,
    textAlign: 'center',
    color: Colors.subText,
  },

  gatewayOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },

  gatewayOptionSelected: {
    borderColor: Colors.secondary,
  },

  gatewayText: {
    color: Colors.subText,
    fontWeight: '600',
  },

  gatewayTextSelected: {
    color: Colors.secondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },

  transactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  transactionText: {
    marginLeft: 6,
    color: Colors.secondary,
    fontWeight: '600',
    fontSize: 13,
  },

  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 16,
  },

  coinImage: {
    width: 58,
    height: 58,
    resizeMode: 'contain',
    marginRight: 6,
  },

  balanceContent: {
    flex: 1,
  },

  balanceLabel: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.9,
  },

  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginVertical: 2,
  },

  balanceDescription: {
    fontSize: 12,
    color: Colors.overlayWhite90,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },

  sectionSubTitle: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.subText,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  packsStatus: {
    width: '100%',
    marginVertical: 24,
    textAlign: 'center',
    color: Colors.subText,
  },

  card: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,

    shadowColor: Colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  selectedCard: {
    borderColor: Colors.secondary,
    borderWidth: 2,
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    marginBottom: 12,
  },

  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  tickCircle: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  amount: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },

  bonus: {
    marginTop: 6,
    color: Colors.secondary,
    fontWeight: '700',
    fontSize: 14,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },

  receiveLabel: {
    color: Colors.subText,
    fontSize: 12,
  },

  receiveContainer: {
    flexDirection: 'row',
  },

  receiveCoin: {
    width: 29,
    height: 29,
    marginEnd: 0,
    alignSelf: 'center',
    resizeMode: 'contain',
  },

  receive: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },

  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: -4,
    },

    elevation: 15,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryTitle: {
    color: Colors.subText,
    fontSize: 12,
  },

  summaryAmount: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },

  summaryBonus: {
    marginTop: 6,
    color: Colors.secondary,
    fontWeight: '500',
  },

  payAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
});

export default WalletScreen;
