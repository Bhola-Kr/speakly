import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
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
import type { CallFollowUpIntent } from '../../types/callFollowUp';

const WalletScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [packs, setPacks] = useState<RechargePack[]>([]);
  const [selectedPack, setSelectedPack] = useState<RechargePack | null>(null);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [packsError, setPacksError] = useState('');
  const [paying, setPaying] = useState(false);
  const [showMoreAmounts, setShowMoreAmounts] = useState(false);
  const [activePaymentGateways, setActivePaymentGateways] = useState<
    PaymentGateway[]
  >([]);
  const [gatewayConfigLoading, setGatewayConfigLoading] = useState(true);
  const [gatewayConfigError, setGatewayConfigError] = useState('');
  const [paymentGateway, setPaymentGateway] =
    useState<PaymentGateway>('razorpay');
  const autoCheckoutStartedRef = useRef(false);
  const followUpIntent = route?.params?.followUpIntent as
    | CallFollowUpIntent
    | undefined;

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
              : 'Unable to load recharge amounts.',
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

  const visiblePacks = useMemo(
    () =>
      showMoreAmounts
        ? packs
        : packs.filter(pack => Number(pack.amount) <= 100),
    [packs, showMoreAmounts],
  );

  const packLabel = (amount: number) => {
    if (amount === 10) return 'QUICK RECHARGE';
    if (amount === 20) return 'STARTER';
    if (amount === 50) return 'MORE TIME';
    if (amount === 100) return 'BEST VALUE';
    return '';
  };

  const continueWithHost = useCallback(() => {
    if (!followUpIntent?.hostUid) {
      navigation.navigate('Main');
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          params: {
            pendingCall: {
              uid: followUpIntent.hostUid,
              profile: followUpIntent.hostProfile,
              originalCallId: followUpIntent.originalCallId,
            },
          },
        },
      ],
    });
  }, [followUpIntent, navigation]);

  const returnHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }, [navigation]);

  const showPaymentSuccess = useCallback(
    (creditedAmount: number) => {
      if (!followUpIntent?.hostUid) {
        Alert.alert(
          'Recharge successful',
          `₹${creditedAmount} was recharged to your Speakly balance.`,
        );
        return;
      }

      Alert.alert(
        'Recharge successful',
        `${followUpIntent.hostName} is waiting for you. Continue talking now?`,
        [
          { text: 'Back to Home', style: 'cancel', onPress: returnHome },
          {
            text: `Call ${followUpIntent.hostName} Again`,
            onPress: continueWithHost,
          },
        ],
      );
    },
    [continueWithHost, followUpIntent, returnHome],
  );

  const onRecharge = useCallback(async () => {
    if (!selectedPack || paying) return;
    try {
      setPaying(true);
      trackCheckoutStarted(selectedPack.amount, totalReceive, paymentGateway);
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
        showPaymentSuccess(payment.creditedAmount);
      } else if (payment.status === 'failed') {
        Alert.alert(
          'Payment Unsuccessful',
          payment.failureReason || 'Your balance was not recharged.',
        );
      } else {
        Alert.alert(
          'Payment Verification Pending',
          `We are confirming this payment with ${
            paymentGateway === 'razorpay' ? 'Razorpay' : 'PayU'
          }. Your Speakly balance will update automatically after verification.`,
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
  }, [paying, paymentGateway, selectedPack, showPaymentSuccess, totalReceive]);

  useEffect(() => {
    if (
      route?.params?.autoCheckout !== true ||
      autoCheckoutStartedRef.current ||
      loadingPacks ||
      gatewayConfigLoading ||
      gatewayConfigError ||
      activePaymentGateways.length === 0 ||
      !selectedPack ||
      Number(selectedPack.amount) !== Number(route?.params?.preferredAmount)
    ) {
      return;
    }

    autoCheckoutStartedRef.current = true;
    onRecharge();
  }, [
    gatewayConfigError,
    gatewayConfigLoading,
    activePaymentGateways.length,
    loadingPacks,
    onRecharge,
    route?.params?.autoCheckout,
    route?.params?.preferredAmount,
    selectedPack,
  ]);

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
        {!!followUpIntent?.hostUid && (
          <View style={styles.continueCard}>
            <View style={styles.continueIcon}>
              <MaterialCommunityIcons
                name="phone-in-talk"
                size={22}
                color={Colors.primary}
              />
            </View>
            <View style={styles.continueCopy}>
              <Text style={styles.continueTitle}>
                Continue with {followUpIntent.hostName}
              </Text>
              <Text style={styles.continueText}>
                ₹{selectedPack?.amount || route?.params?.preferredAmount || 10}{' '}
                gives you about{' '}
                {Math.max(
                  1,
                  Math.floor(
                    Number(
                      selectedPack?.amount ||
                        route?.params?.preferredAmount ||
                        10,
                    ) / Math.max(1, followUpIntent.ratePerMinute),
                  ),
                )}{' '}
                more minutes at ₹{followUpIntent.ratePerMinute}/min.
              </Text>
            </View>
          </View>
        )}

        <LinearGradient
          colors={Colors.goldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceIcon}>
            <MaterialCommunityIcons
              name="currency-inr"
              size={31}
              color={Colors.white}
            />
          </View>

          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>{copy.wallet.balanceLabel}</Text>
            <Text style={styles.balanceAmount}>
              ₹{user?.wallet?.balance || 0}
            </Text>
            <Text style={styles.balanceDescription} numberOfLines={1}>
              Recharge to continue voice calls
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a recharge amount</Text>

          <Text style={styles.sectionSubTitle}>
            Recharge in rupees. Any bonus is added directly to your balance.
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
                No recharge amounts are available right now.
              </Text>
            )}

            {visiblePacks.map(pack => {
              const selected = selectedPack?.id === pack.id;
              const label = packLabel(Number(pack.amount));

              return (
                <TouchableOpacity
                  key={pack.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedPack(pack)}
                  style={[styles.card, selected && styles.selectedCard]}
                >
                  {!!label && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{label}</Text>
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

                  <Text style={styles.bonus}>
                    {pack.bonus > 0 ? `₹${pack.bonus} bonus` : 'No extra fee'}
                  </Text>

                  <View style={styles.divider} />

                  <Text style={styles.receiveLabel}>Speakly Balance</Text>
                  <Text style={styles.receive}>
                    ₹{pack.amount + pack.bonus}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {packs.some(pack => Number(pack.amount) > 100) && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowMoreAmounts(current => !current)}
              style={styles.moreAmountsButton}
            >
              <Text style={styles.moreAmountsText}>
                {showMoreAmounts ? 'Show fewer amounts' : 'View more amounts'}
              </Text>
              <MaterialCommunityIcons
                name={showMoreAmounts ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.primary}
              />
            </TouchableOpacity>
          )}
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
              <Text style={styles.summaryTitle}>Speakly Balance</Text>
              <Text style={styles.receive}>₹{totalReceive}</Text>

              <Text style={styles.summaryBonus}>
                {selectedPack.bonus > 0
                  ? `Includes ₹${selectedPack.bonus} bonus`
                  : 'No subscription or automatic renewal'}
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

          <View style={styles.trustCard}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={22}
              color={Colors.success}
            />
            <View style={styles.trustCopy}>
              <Text style={styles.trustTitle}>Secure payment</Text>
              <Text style={styles.trustText}>
                No subscription or automatic renewal. Your payment only
                recharges your Speakly balance.
              </Text>
            </View>
          </View>

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
    paddingBottom: 340,
  },

  continueCard: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  continueCopy: {
    flex: 1,
    marginLeft: 12,
  },
  continueTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  continueText: {
    marginTop: 3,
    color: Colors.subText,
    fontSize: 13,
    lineHeight: 18,
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

  balanceIcon: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.overlayWhite18,
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
    marginTop: 20,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },

  sectionSubTitle: {
    marginTop: 5,
    fontSize: 13,
    color: Colors.subText,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  packsStatus: {
    width: '100%',
    marginVertical: 24,
    textAlign: 'center',
    color: Colors.subText,
  },

  moreAmountsButton: {
    alignSelf: 'center',
    marginTop: 2,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },
  moreAmountsText: {
    marginRight: 4,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },

  card: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 10,
    marginBottom: 10,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 50,
    marginBottom: 5,
  },

  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  tickCircle: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  amount: {
    marginTop: 3,
    fontSize: 21,
    fontWeight: '800',
    color: Colors.text,
  },

  bonus: {
    marginTop: 3,
    color: Colors.secondary,
    fontWeight: '700',
    fontSize: 12,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },

  receiveLabel: {
    color: Colors.subText,
    fontSize: 11,
  },

  receive: {
    fontSize: 19,
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

  trustCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.successStrongSurface,
  },
  trustCopy: {
    flex: 1,
    marginLeft: 9,
  },
  trustTitle: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  trustText: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  payAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
});

export default WalletScreen;
