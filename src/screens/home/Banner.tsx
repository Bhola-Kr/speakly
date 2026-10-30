import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/colors';
import UI from '../../constants/ui';

interface Props {
  randomCall: () => void;
  calling: boolean;
}

const Banner = ({ randomCall, calling }: Props) => {
  return (
    <LinearGradient
      colors={[Colors.primary, Colors.navySurface]}
      style={styles.banner}
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>
            Practice with{' '}
            <Text style={{ color: Colors.secondary }}>Language Experts</Text>
          </Text>

          <Text style={styles.description}>
            Pick a conversation topic and build fluency through a focused
            one-to-one voice session.
          </Text>

          <TouchableOpacity
            onPress={randomCall}
            activeOpacity={0.9}
            disabled={calling}
            style={[styles.button, calling && styles.buttonDisabled]}
          >
            {calling ? (
              <>
                <ActivityIndicator size="small" color={Colors.black} />

                <Text style={styles.buttonText}>Connecting...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="phone"
                  size={17}
                  color={Colors.white}
                />

                <Text style={styles.buttonText}>Find an expert</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <MaterialCommunityIcons
          name="account-voice"
          size={56}
          color={Colors.overlayGold18}
          style={styles.artwork}
        />
      </View>
    </LinearGradient>
  );
};

export default memo(Banner);

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: UI.spacing.lg,
    marginTop: UI.spacing.lg,
    borderRadius: UI.radius.card,
    padding: UI.spacing.lg,
    ...UI.shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: Colors.white,
    fontSize: UI.typography.sectionHeading,
    lineHeight: 26,
    fontWeight: '800',
  },
  description: {
    color: Colors.gray184,
    fontSize: UI.typography.secondary,
    lineHeight: 19,
    marginTop: 7,
  },
  button: {
    marginTop: 16,
    backgroundColor: Colors.secondary,
    minHeight: 44,
    borderRadius: UI.radius.button,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 146,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray138,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 7,
  },
  artwork: {
    marginRight: 2,
  },
});
