import React, { useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';
import authData from '../firebase/authData';
import { copy } from '../constants/strings';

interface Props {
  navigation: any;
  route: any;
}

interface Language {
  id: number;
  name: string;
  symbol: string;
}

const LANGUAGES: Language[] = [
  {
    id: 0,
    name: 'English',
    symbol: 'A',
  },
  {
    id: 1,
    name: 'Hindi',
    symbol: 'अ',
  },
  {
    id: 2,
    name: 'Sanskrit',
    symbol: 'सं',
  },
  {
    id: 3,
    name: 'Telugu',
    symbol: 'అ',
  },
  {
    id: 4,
    name: 'Bangla',
    symbol: 'অ',
  },
  {
    id: 5,
    name: 'Tamil',
    symbol: 'அ',
  },
  {
    id: 6,
    name: 'Kannada',
    symbol: 'ಅ',
  },
  {
    id: 7,
    name: 'Malayalam',
    symbol: 'അ',
  },
];

const LanguageScreen: React.FC<Props> = ({ navigation, route }) => {
  const [selected, setSelected] = useState('English');
  const [loading, setLoading] = useState(false);

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
        <Text style={styles.smallTitle}>How would you like to connect?</Text>

        <Text style={styles.title}>Conversation language</Text>

        <Text style={styles.note}>
          You can update this later from your profile.
        </Text>
      </View>

      <FlatList
        data={LANGUAGES}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      <GradientButton
        style={styles.continueButton}
        title={loading ? 'Please wait...' : copy.common.continue}
        disabled={loading}
        onPress={async () => {
          try {
            setLoading(true);
            await authData.updateProfile({ practiceLanguage: selected });
            navigation.navigate('Nickname', {
              user: route?.params?.user,
              gender: route?.params?.gender,
              role: route?.params?.role,
            });
          } finally {
            setLoading(false);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default LanguageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
  },

  header: {
    marginTop: 24,
    marginBottom: 18,
  },
  listContent: {
    paddingBottom: 15,
  },
  continueButton: {
    marginBottom: 25,
  },

  smallTitle: {
    fontSize: 20,
    color: Colors.gray122,
    fontWeight: '400',
  },

  title: {
    marginTop: 2,
    fontSize: 30,
    color: Colors.darkBackground,
    letterSpacing: -0.8,
  },

  note: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.blueAction,
    fontWeight: '500',
  },

  card: {
    height: 78,

    borderRadius: 18,

    marginBottom: 10,

    backgroundColor: Colors.blueLight,

    borderWidth: 1.8,
    borderColor: Colors.blueAction,

    flexDirection: 'row',

    alignItems: 'center',

    overflow: 'hidden',

    paddingHorizontal: 16,
  },

  selectedCard: {
    backgroundColor: Colors.blueAction,
  },

  radio: {
    width: 28,
    height: 28,

    borderRadius: 14,

    borderWidth: 3,

    borderColor: Colors.blueAction,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: Colors.white,
  },

  radioSelected: {
    borderColor: Colors.white,
  },

  innerRadio: {
    width: 18,
    height: 18,

    borderRadius: 9,

    backgroundColor: Colors.white,

    justifyContent: 'center',
    alignItems: 'center',
  },

  check: {
    color: Colors.blueAction,
    fontSize: 14,
    fontWeight: '700',
  },

  language: {
    marginLeft: 14,

    fontSize: 21,

    fontWeight: '700',

    color: Colors.blueActionDark,
  },

  languageActive: {
    color: Colors.white,
  },

  symbol: {
    position: 'absolute',

    right: 18,

    bottom: -10,

    fontSize: 64,

    fontWeight: '700',

    color: Colors.blueOverlay,
  },

  symbolActive: {
    color: Colors.overlayWhite18,
  },
});
