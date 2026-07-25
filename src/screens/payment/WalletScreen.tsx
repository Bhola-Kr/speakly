import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import GradientButton from '../../components/GradientButton';

const PACKS = [
  {
    id: 1,
    amount: 25,
    bonus: 0,
    tag: '',
  },
  {
    id: 2,
    amount: 50,
    bonus: 5,
    tag: '',
  },
  {
    id: 3,
    amount: 100,
    bonus: 10,
    tag: '',
  },
  {
    id: 4,
    amount: 150,
    bonus: 18,
    tag: 'POPULAR',
  },
  {
    id: 5,
    amount: 250,
    bonus: 35,
    tag: '',
  },
  {
    id: 6,
    amount: 500,
    bonus: 80,
    tag: 'BEST',
  },
];

const WalletScreen = ({ navigation }: any) => {
  const [selectedPack, setSelectedPack] = useState(PACKS[3]);

  const totalReceive = useMemo(() => {
    return selectedPack.amount + selectedPack.bonus;
  }, [selectedPack]);

  const onRecharge = () => {
    console.log('Recharge Pack', selectedPack);
    // TODO:
    // Razorpay
    // Google Play Billing
    // API
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.headerTitle}>Wallet</Text>
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
        contentContainerStyle={{
          paddingBottom: 270,
        }}
      >
        <LinearGradient
          colors={Colors.goldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <MaterialCommunityIcons
            name="wallet"
            size={38}
            color={Colors.white}
          />

          <Text style={styles.balanceLabel}>Wallet Balance</Text>

          <Text style={styles.balanceAmount}>₹0.00</Text>

          <Text style={styles.balanceDescription}>
            Recharge your wallet and enjoy uninterrupted voice conversations.
          </Text>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Recharge Pack</Text>

          <Text style={styles.sectionSubTitle}>
            Bigger packs give you extra bonus balance.
          </Text>

          <View style={styles.grid}>
            {PACKS.map(pack => {
              const selected = selectedPack.id === pack.id;

              return (
                <TouchableOpacity
                  key={pack.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedPack(pack)}
                  style={[styles.card, selected && styles.selectedCard]}
                >
                  {!!pack.tag && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pack.tag}</Text>
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

                  <Text style={styles.bonus}>Bonus ₹{pack.bonus}</Text>

                  <View style={styles.divider} />

                  <Text style={styles.receiveLabel}>You'll Receive</Text>

                  <Text style={styles.receive}>
                    ₹{pack.amount + pack.bonus}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryTitle}>You'll Receive</Text>

            <Text style={styles.summaryAmount}>₹{totalReceive}</Text>

            <Text style={styles.summaryBonus}>
              Includes Bonus ₹{selectedPack.bonus}
            </Text>
          </View>

          <Text style={styles.payAmount}>₹{selectedPack.amount}</Text>
        </View>

        <GradientButton
          title={`Continue ₹${selectedPack.amount}`}
          onPress={onRecharge}
          style={{ marginTop: 12 }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    borderRadius: 30,
  },

  transactionText: {
    marginLeft: 6,
    color: Colors.secondary,
    fontWeight: '600',
    fontSize: 13,
  },

  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginTop: 10,
  },

  balanceLabel: {
    marginTop: 18,
    color: Colors.white,
    fontSize: 16,
    opacity: 0.9,
  },

  balanceAmount: {
    marginTop: 6,
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
  },

  balanceDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.white,
    opacity: 0.9,
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

  card: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,

    shadowColor: '#000',
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
    color: Colors.black,
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

  receive: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },

  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    shadowColor: '#000',
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
    fontWeight: '600',
  },

  payAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
  },
});

export default WalletScreen;
