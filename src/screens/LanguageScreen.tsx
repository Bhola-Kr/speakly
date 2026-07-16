import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';

interface Props {
  navigation: any;
}

interface Language {
  id: number;
  name: string;
  symbol: string;
}

const LANGUAGES: Language[] = [
  {
    id: 1,
    name: 'Hindi',
    symbol: 'अ',
  },
  {
    id: 2,
    name: 'Telugu',
    symbol: 'అ',
  },
  {
    id: 3,
    name: 'Bangla',
    symbol: 'অ',
  },
  {
    id: 4,
    name: 'Tamil',
    symbol: 'அ',
  },
  {
    id: 5,
    name: 'Kannada',
    symbol: 'ಅ',
  },
  {
    id: 6,
    name: 'Malayalam',
    symbol: 'അ',
  },
];

const LanguageScreen: React.FC<Props> = ({ navigation }) => {
  const [selected, setSelected] = useState('Hindi');

  const renderItem = ({ item }: { item: Language }) => {
    const active = selected === item.name;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSelected(item.name)}
        style={[styles.card, active && styles.selectedCard]}
      >
        {/* Radio */}

        <View style={[styles.radio, active && styles.radioSelected]}>
          {active && (
            <View style={styles.innerRadio}>
              <Text style={styles.check}>✓</Text>
            </View>
          )}
        </View>

        {/* Title */}

        <Text style={[styles.language, active && styles.languageActive]}>
          {item.name}
        </Text>

        {/* Background Letter */}

        <Text style={[styles.symbol, active && styles.symbolActive]}>
          {item.symbol}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.smallTitle}>Select your</Text>

        <Text style={styles.title}>Primary Language</Text>

        <Text style={styles.note}>
          *You cannot change this once you go ahead
        </Text>
      </View>

      <FlatList
        data={LANGUAGES}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 15,
        }}
      />

      <GradientButton
        style={{
          marginBottom: 25,
        }}
        title="Set Language"
        onPress={() => navigation.navigate('Avatar')}
      />
    </SafeAreaView>
  );
};

export default LanguageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },

  header: {
    marginTop: 72,
    marginBottom: 26,
  },

  smallTitle: {
    fontSize: 20,
    color: '#7A7A7A',
    fontWeight: '400',
  },

  title: {
    marginTop: 2,
    fontSize: 30,
    color: '#111111',
    letterSpacing: -0.8,
  },

  note: {
    marginTop: 4,
    fontSize: 14,
    color: '#4E7CF7',
    fontWeight: '500',
  },

  card: {
    height: 112,

    borderRadius: 24,

    marginBottom: 16,

    backgroundColor: '#EEF3FF',

    borderWidth: 1.8,
    borderColor: '#4E7CF7',

    flexDirection: 'row',

    alignItems: 'center',

    overflow: 'hidden',

    paddingHorizontal: 20,
  },

  selectedCard: {
    backgroundColor: '#4E7CF7',
  },

  radio: {
    width: 34,
    height: 34,

    borderRadius: 17,

    borderWidth: 3,

    borderColor: '#4E7CF7',

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#FFFFFF',
  },

  radioSelected: {
    borderColor: '#FFFFFF',
  },

  innerRadio: {
    width: 22,
    height: 22,

    borderRadius: 11,

    backgroundColor: '#FFFFFF',

    justifyContent: 'center',
    alignItems: 'center',
  },

  check: {
    color: '#4E7CF7',
    fontSize: 14,
    fontWeight: '700',
  },

  language: {
    marginLeft: 18,

    fontSize: 25,

    fontWeight: '700',

    color: '#3E72F0',
  },

  languageActive: {
    color: '#FFFFFF',
  },

  symbol: {
    position: 'absolute',

    right: 18,

    bottom: -10,

    fontSize: 90,

    fontWeight: '700',

    color: 'rgba(78,124,247,0.12)',
  },

  symbolActive: {
    color: 'rgba(255,255,255,0.18)',
  },
});
