import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  Clipboard,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import UI from '../../constants/ui';
import { SUPPORT_EMAIL } from '../../constants/constants';
import { fetchPaymentHistory, verifyWalletPayment } from '../../api/calls';
import type { PaymentTransaction } from '../../api/api';

const STATUS = {
  success: {
    color: Colors.successStrong,
    background: Colors.successStrongSurface,
    icon: 'check-circle',
    text: 'SUCCESS',
  },

  pending: {
    color: Colors.warningStrong,
    background: Colors.warningStrongSurface,
    icon: 'clock-outline',
    text: 'PENDING',
  },

  initiated: {
    color: Colors.warningStrong,
    background: Colors.warningStrongSurface,
    icon: 'clock-outline',
    text: 'PENDING',
  },

  crediting: {
    color: Colors.warningStrong,
    background: Colors.warningStrongSurface,
    icon: 'sync',
    text: 'CREDITING',
  },

  failed: {
    color: Colors.errorStrong,
    background: Colors.errorStrongSurface,
    icon: 'close-circle',
    text: 'FAILED',
  },
};

const TransactionScreen = ({ navigation }: any) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setTransactions(await fetchPaymentHistory());
    } catch (error) {
      Alert.alert(
        'Unable to Load Transactions',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const copyTxn = (id: string) => {
    Clipboard.setString(id);
    Alert.alert('Copied', 'Transaction ID copied.');
  };

  const handleContactUs = async () => {
    const subject = encodeURIComponent('Speakly 121 Support');

    const body = encodeURIComponent(`Hello Speakly 121 Support Team,
  
  Please describe your issue below:
  
  ----------------------------
  
  
  ----------------------------
  
  Thank you.
  `);

    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Email App Not Found',
          'No email application is installed on this device.',
        );
      }
    } catch {
      Alert.alert('Error', 'Unable to open the email application.');
    }
  };

  const refreshPayment = async (item: PaymentTransaction) => {
    if (item.status === 'failed') {
      navigation.navigate('Wallet');
      return;
    }
    if (item.status === 'success') {
      copyTxn(item.transactionId);
      return;
    }
    try {
      await verifyWalletPayment(item.transactionId);
      await loadPayments(true);
    } catch (error) {
      Alert.alert(
        'Verification Pending',
        error instanceof Error
          ? error.message
          : 'We will check this payment again automatically.',
      );
    }
  };

  const renderItem = ({ item }: { item: PaymentTransaction }) => {
    const status = STATUS[item.status as keyof typeof STATUS];
    const date = new Date(item.createdAt);

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Text style={styles.amountTitle}>Add Coins · ₹{item.amount}</Text>

            <Text style={styles.date}>
              {date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              •{' '}
              {date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View
            style={[
              styles.status,
              {
                backgroundColor: status.background,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={status.icon}
              size={16}
              color={status.color}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color: status.color,
                },
              ]}
            >
              {status.text}
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>Payment Gateway</Text>
          <Text style={styles.value}>
            {item.provider === 'razorpay' ? 'Razorpay' : 'PayU'}
          </Text>
        </View>

        <View style={styles.txnRow}>
          <View style={styles.flex}>
            <Text style={styles.label}>Transaction ID</Text>

            <Text style={styles.value}>{item.transactionId}</Text>
          </View>

          <TouchableOpacity onPress={() => copyTxn(item.transactionId)}>
            <MaterialCommunityIcons
              name="content-copy"
              color={Colors.secondary}
              size={22}
            />
          </TouchableOpacity>
        </View>

        {item.status !== 'failed' && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>
                {item.status === 'success' ? 'Coins Added' : 'Expected Coins'}
              </Text>

              <Text style={styles.price}>{item.creditedAmount} coins</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Bonus</Text>

              <Text
                style={[
                  styles.price,
                  {
                    color: Colors.secondary,
                  },
                ]}
              >
                ₹{item.bonus}
              </Text>
            </View>
          </>
        )}

        {item.status === 'failed' && (
          <Text style={styles.failedText}>
            {item.failureReason || 'Payment was unsuccessful.'}
          </Text>
        )}

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => refreshPayment(item)}
        >
          <MaterialCommunityIcons
            name={
              item.status === 'success'
                ? 'content-copy'
                : item.status === 'failed'
                ? 'refresh'
                : 'sync'
            }
            color={Colors.secondary}
            size={18}
          />

          <Text style={styles.bottomButtonText}>
            {item.status === 'success'
              ? 'Copy Receipt ID'
              : item.status === 'failed'
              ? 'Add Coins Again'
              : 'Refresh Status'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={Colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Transactions</Text>

        <TouchableOpacity onPress={handleContactUs}>
          <MaterialCommunityIcons
            name="headset"
            size={24}
            color={Colors.text}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPayments(true)}
            tintColor={Colors.secondary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.secondary} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="receipt-text-clock-outline"
                  size={42}
                  color={Colors.secondary}
                />
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptyText}>
                  Your coin purchases will appear here.
                </Text>
              </>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  flex: {
    flex: 1,
  },

  header: {
    paddingHorizontal: UI.spacing.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  headerTitle: {
    fontSize: UI.typography.screenTitle,
    fontWeight: '600',
    color: Colors.text,
  },

  listContent: {
    flexGrow: 1,
    padding: UI.spacing.lg,
    paddingBottom: UI.spacing.xl,
  },

  emptyState: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: UI.spacing.xl,
  },

  emptyTitle: {
    marginTop: UI.spacing.lg,
    color: Colors.text,
    fontSize: UI.typography.sectionHeading,
    fontWeight: '600',
  },

  emptyText: {
    marginTop: UI.spacing.sm,
    color: Colors.subText,
    fontSize: UI.typography.secondary,
    textAlign: 'center',
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: UI.radius.card,
    padding: UI.spacing.lg,
    marginBottom: 18,

    borderWidth: 1,
    borderColor: Colors.border,

    ...UI.shadow.card,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  amountTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },

  date: {
    marginTop: 8,
    color: Colors.subText,
    fontSize: 13,
  },

  status: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },

  statusText: {
    marginLeft: 6,
    fontWeight: '700',
    fontSize: 12,
  },

  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 18,
  },

  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    color: Colors.subText,
  },

  value: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  price: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },

  failedText: {
    fontSize: 15,
    color: Colors.errorStrong,
    fontWeight: '600',
    marginBottom: 16,
  },

  bottomButton: {
    marginTop: 10,
    backgroundColor: Colors.surface,
    borderRadius: UI.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomButtonText: {
    marginLeft: 8,
    color: Colors.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
});

export default TransactionScreen;
