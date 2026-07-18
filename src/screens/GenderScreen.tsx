import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert,
} from 'react-native';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';
import authData from '../firebase/authData';

type Gender = 'male' | 'female';

interface Props {
  navigation: any;
  route: any;
}

const GenderScreen: React.FC<Props> = ({ navigation, route }) => {
  const user = route.params.user;

  const [gender, setGender] = useState<Gender>('male');
  const [loading, setLoading] = useState(false);

  const updateGender = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      await authData.createUser(user, gender);
      await authData.updateProfile({
        gender,
      });

      navigation.navigate('Nickname');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to update gender.');
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (
    type: Gender,
    image: any,
    title: string,
    subtitle?: string,
  ) => {
    const selected = gender === type;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, selected && styles.selectedCard]}
        onPress={() => setGender(type)}
      >
        {selected && (
          <View style={styles.checkContainer}>
            <Text style={styles.check}>✓</Text>
          </View>
        )}

        <Image source={image} style={styles.avatar} />

        <Text style={styles.genderText}>{title}</Text>

        {subtitle ? <Text style={styles.subTitle}>{subtitle}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.smallTitle}>Your</Text>

        <Text style={styles.title}>Gender</Text>
      </View>

      {renderCard('male', require('../assets/man.png'), 'Male')}

      <View style={{ height: 18 }} />

      {renderCard(
        'female',
        require('../assets/woman.png'),
        'Female',
        '(Audio verification needed)',
      )}

      <View style={{ flex: 1 }} />

      <Text style={styles.note}>Gender cannot be changed later.</Text>

      <GradientButton
        style={{
          marginBottom: 25,
        }}
        title={loading ? 'Please wait...' : 'Proceed'}
        disabled={loading}
        onPress={updateGender}
      />
    </SafeAreaView>
  );
};

export default GenderScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 26,
  },

  header: {
    marginTop: 50,
    marginBottom: 28,
  },

  smallTitle: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '400',
  },

  title: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },

  card: {
    width: '88%',
    maxWidth: 310,
    alignSelf: 'center',

    backgroundColor: '#FFF',

    borderRadius: 22,

    borderWidth: 2,
    borderColor: 'transparent',

    paddingTop: 22,
    paddingBottom: 18,

    alignItems: 'center',
  },

  selectedCard: {
    borderColor: '#4D73F8',
  },

  checkContainer: {
    position: 'absolute',

    right: 14,
    top: 14,

    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: '#4D73F8',

    justifyContent: 'center',
    alignItems: 'center',
  },

  check: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    resizeMode: 'cover',
  },

  genderText: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: '500',
    color: '#2F2F2F',
    textAlign: 'center',
  },

  subTitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#8E8E8E',
    textAlign: 'center',
    fontWeight: '400',
  },

  note: {
    marginBottom: 18,
    textAlign: 'center',
    color: '#5A5A5A',
    fontSize: 15,
    fontWeight: '400',
  },
});
