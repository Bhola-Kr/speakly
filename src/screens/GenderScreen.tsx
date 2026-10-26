import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';
import authData from '../firebase/authData';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Role = 'learner' | 'expert';

interface Props {
  navigation: any;
  route: any;
}

const GenderScreen: React.FC<Props> = ({ navigation, route }) => {
  const user = route.params.user;

  const [role, setRole] = useState<Role>('learner');
  const [loading, setLoading] = useState(false);

  const updateRole = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      // Legacy call services still use gender as their learner/expert switch.
      const gender = role === 'expert' ? 'female' : 'male';
      await authData.createUser(user, gender, role);
      await authData.updateProfile({
        gender,
        role,
      });

      navigation.navigate('Language', { user, gender, role });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to save your choice.');
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (
    type: Role,
    icon: string,
    title: string,
    subtitle?: string,
  ) => {
    const selected = role === type;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, selected && styles.selectedCard]}
        onPress={() => setRole(type)}
      >
        {selected && (
          <View style={styles.checkContainer}>
            <Text style={styles.check}>✓</Text>
          </View>
        )}

        <View style={[styles.roleIcon, selected && styles.selectedRoleIcon]}>
          <MaterialCommunityIcons
            name={icon}
            size={58}
            color={selected ? Colors.white : Colors.tealDark}
          />
        </View>

        <Text style={styles.genderText}>{title}</Text>

        {subtitle ? <Text style={styles.subTitle}>{subtitle}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.smallTitle}>How will you use Speakly?</Text>

          <Text style={styles.title}>Choose your role</Text>
        </View>

        {renderCard(
          'learner',
          'account-voice',
          'Practice a language',
          'Choose a topic and speak with an expert',
        )}

        <View style={{ height: 18 }} />

        {renderCard(
          'expert',
          'teach',
          'Become an expert',
          'Help learners build real conversation skills',
        )}

        <Text style={styles.note}>
          Speakly is for language practice—not dating or matchmaking.
        </Text>

        <GradientButton
          style={styles.actionButton}
          title={loading ? 'Please wait...' : 'Proceed'}
          disabled={loading}
          onPress={updateRole}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default GenderScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  scrollContent: {
    paddingHorizontal: 26,
    paddingTop: 10,
    paddingBottom: 28,
  },

  header: {
    marginTop: 50,
    marginBottom: 5,
  },

  smallTitle: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '400',
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },

  card: {
    width: '88%',
    maxWidth: 310,
    alignSelf: 'center',

    backgroundColor: Colors.white,

    borderRadius: 20,

    borderWidth: 2,
    borderColor: Colors.transparent,

    paddingTop: 22,
    paddingBottom: 18,

    alignItems: 'center',
  },

  selectedCard: {
    borderColor: Colors.secondary,
  },

  checkContainer: {
    position: 'absolute',

    right: 14,
    top: 14,

    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: Colors.secondary,

    justifyContent: 'center',
    alignItems: 'center',
  },

  check: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },

  roleIcon: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: Colors.screenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedRoleIcon: {
    backgroundColor: Colors.secondary,
  },

  genderText: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },

  subTitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.subText,
    textAlign: 'center',
    fontWeight: '400',
  },

  note: {
    marginTop: 18,
    marginBottom: 18,
    textAlign: 'center',
    color: Colors.subText,
    fontSize: 15,
    fontWeight: '400',
  },

  actionButton: {
    marginBottom: 0,
    marginTop: 0,
  },
});
