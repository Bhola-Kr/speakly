import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  Clipboard,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
const transactions = [
  {
    id: '1',
    amount: 140,
    credited: 168,
    bonus: 28,
    status: 'pending',
    txnId: '121369466',
    date: '22 Jul 2026',
    time: '10:59 AM',
  },
  {
    id: '2',
    amount: 250,
    credited: 285,
    bonus: 35,
    status: 'success',
    txnId: '983456729',
    date: '20 Jul 2026',
    time: '08:12 PM',
  },
  {
    id: '3',
    amount: 100,
    credited: 100,
    bonus: 0,
    status: 'failed',
    txnId: '982311122',
    date: '18 Jul 2026',
    time: '04:36 PM',
  },
];

const STATUS = {
  success: {
    color: '#16a34a',
    background: '#eaf8ef',
    icon: 'check-circle',
    text: 'SUCCESS',
  },

  pending: {
    color: '#d97706',
    background: '#fff6e8',
    icon: 'clock-outline',
    text: 'PENDING',
  },

  failed: {
    color: '#dc2626',
    background: '#fdecec',
    icon: 'close-circle',
    text: 'FAILED',
  },
};

const TransactionScreen = ({ navigation }: any) => {
  const copyTxn = (id: string) => {
    Clipboard.setString(id);
    Alert.alert('Copied', 'Transaction ID copied.');
  };

  const renderItem = ({ item }: any) => {
    const status = STATUS[item.status as keyof typeof STATUS];

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.amountTitle}>Recharge ₹{item.amount}</Text>

            <Text style={styles.date}>
              {item.time} • {item.date}
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

        <View style={styles.txnRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Transaction ID</Text>

            <Text style={styles.value}>{item.txnId}</Text>
          </View>

          <TouchableOpacity onPress={() => copyTxn(item.txnId)}>
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
              <Text style={styles.label}>Wallet Credited</Text>

              <Text style={styles.price}>₹{item.credited}</Text>
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
          <Text style={styles.failedText}>Payment was unsuccessful.</Text>
        )}

        <TouchableOpacity style={styles.bottomButton}>
          <MaterialCommunityIcons
            name={
              item.status === 'success' ? 'file-document-outline' : 'lifebuoy'
            }
            color={Colors.secondary}
            size={18}
          />

          <Text style={styles.bottomButtonText}>
            {item.status === 'success'
              ? 'Download Invoice'
              : item.status === 'failed'
              ? 'Retry Recharge'
              : 'Need Help'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={28}
            color={Colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Transactions</Text>

        <TouchableOpacity>
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
        contentContainerStyle={{
          padding: 18,
          paddingBottom: 40,
        }}
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

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,

    borderWidth: 1,
    borderColor: Colors.border,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
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
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: 16,
  },

  bottomButton: {
    marginTop: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
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
