import React, { useEffect, useMemo, useState } from 'react';

import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Share,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert, Linking } from 'react-native';
import auth from '@react-native-firebase/auth';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  manAccountMenus,
  supportMenus,
  securityMenus,
  femaleAccountMenus,
} from './dummyData';
import {
  formatDate,
  getUserAvatar,
  SUPPORT_EMAIL,
} from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';
import { useActiveCall } from '../../hooks/ActiveCallContext';
import RoomService from '../../firebase/RoomService';
import authData from '../../firebase/authData';
import { openAppReview } from '../../firebase/appReview';

interface Props {
  navigation: any;
  route: any;
}

const EXPERT_COLORS = {
  background: '#F7FFFE',
  navy: '#071A2D',
  teal: '#08AA91',
  tealDark: '#078A7D',
  tealPale: '#DFF9F4',
  body: '#727A90',
  white: '#FFFFFF',
  border: '#D9F0EC',
  dangerPale: '#FFF0F0',
};

const ProfileSettingScreen = ({ navigation }: Props) => {
  const { user } = useUser();
  const { activeCall, showCall } = useActiveCall();
  const profile = user?.profile;
  const gender = profile?.gender || 'male';
  const isExpert = user?.isExpert === true;
  const phoneNumber = user?.phone || profile?.phone || 'Not available';
  const phoneDigits = String(phoneNumber).replace(/\D/g, '');
  const displayPhoneNumber =
    phoneNumber === 'Not available'
      ? phoneNumber
      : phoneDigits.startsWith('91') && phoneDigits.length === 12
      ? `+91 ${phoneDigits.slice(2)}`
      : String(phoneNumber).startsWith('+')
      ? phoneNumber
      : `+${phoneNumber}`;
  const isAdmin = user?.isAdmin || false;
  const profileName =
    gender === 'female' ? profile?.tamilName || profile?.name : profile?.name;
  const [totalCallDuration, setTotalCallDuration] = useState(0);

  useEffect(() => {
    if (!isExpert) {
      setTotalCallDuration(0);
      return;
    }

    return RoomService.listenTotalCallDuration(setTotalCallDuration);
  }, [isExpert]);

  const formattedTotalCallDuration = useMemo(() => {
    const totalSeconds = Math.floor(totalCallDuration / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }, [totalCallDuration]);

  // Replace with your Play Store package name
  const PLAY_STORE_URL =
    'https://play.google.com/store/apps/details?id=com.ra.speakly';

  const handleLogout = () => {
    if (activeCall) {
      Alert.alert(
        'Call in progress',
        'Please end your call before logging out.',
      );
      showCall();
      return;
    }
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authData.logout();

              // Navigate to Login/Auth screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (e) {
              console.log(e);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Your account will be marked for deletion. Your data will not be deleted immediately and the request will be reviewed within 15 days.\n\nYou can contact the admin during this period. Do you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            try {
              await authData.requestAccountDeletion();
              Alert.alert(
                'Deletion Request Submitted',
                'Your account is under deletion review and is scheduled to be deleted within 15 days. Your current data has not been deleted. Contact the admin if you need help or want to discuss this request.',
              );
            } catch (error: any) {
              Alert.alert(
                'Unable to Submit Request',
                error?.message || 'Please try again.',
              );
            }
          },
        },
      ],
      {
        cancelable: true,
      },
    );
  };

  const handleContactUs = async () => {
    const subject = encodeURIComponent('Speakly Support');

    const body = encodeURIComponent(`Hello Speakly Support Team,

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

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'Speakly',
        message: `Practice languages with expert speakers on Speakly.

Download now:
${PLAY_STORE_URL}`,
      });
    } catch (error) {
      console.log('Unable to share app:', error);
    }
  };

  const handleRateApp = async () => {
    try {
      await openAppReview(auth().currentUser?.uid);
    } catch {
      Alert.alert('Error', 'Unable to open the Play Store.');
    }
  };

  const handleMenuItemPress = (item: any) => {
    if (item.title === 'Contact Us') {
      handleContactUs();
    } else if (item.title === 'Share App') {
      handleShareApp();
    } else if (item.title === 'Rate App') {
      handleRateApp();
    } else if (item.action === 'logout') {
      handleLogout();
    } else if (item.action === 'deleteAccount') {
      handleDeleteAccount();
    } else if (item.screen) {
      if (item.screen === 'Recents') {
        navigation.navigate(isExpert ? 'FemaleHistory' : 'ManHistory', {
          showBack: true,
        });
      } else {
        navigation.navigate(item.screen);
      }
    }
  };

  const renderExpertSection = (title: string, data: any[]) => (
    <View style={expertStyles.sectionWrap}>
      <Text style={expertStyles.sectionTitle}>{title}</Text>
      <View style={expertStyles.menuCard}>
        {data.map((item, index) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => handleMenuItemPress(item)}
              style={expertStyles.menuRow}
            >
              <View
                style={[
                  expertStyles.menuIcon,
                  item.danger && expertStyles.menuIconDanger,
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={24}
                  color={item.danger ? '#E45F5F' : EXPERT_COLORS.tealDark}
                />
              </View>

              <View style={expertStyles.menuContent}>
                <Text
                  style={[
                    expertStyles.menuTitle,
                    item.danger && expertStyles.menuTitleDanger,
                  ]}
                >
                  {item.title}
                </Text>
                {item.value && (
                  <Text style={expertStyles.menuValue}>{item.value}</Text>
                )}
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={27}
                color="#667085"
              />
            </TouchableOpacity>

            {index !== data.length - 1 && <View style={expertStyles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={expertStyles.container}
    >
      <StatusBar
        backgroundColor={EXPERT_COLORS.background}
        barStyle="dark-content"
      />

      <View style={expertStyles.backgroundGlow} pointerEvents="none" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={expertStyles.content}
      >
        <View style={expertStyles.header}>
          <TouchableOpacity
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={expertStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={27}
              color={EXPERT_COLORS.navy}
            />
          </TouchableOpacity>
          <Text style={expertStyles.headerTitle}>Profile</Text>
        </View>

        <View style={expertStyles.profileCard}>
          <View style={expertStyles.profileGlowOne} />
          <View style={expertStyles.profileGlowTwo} />

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => navigation.navigate('EditProfile', { gender })}
            style={expertStyles.avatarWrap}
          >
            <Image source={getUserAvatar(user)} style={expertStyles.avatar} />
            <View style={expertStyles.cameraBadge}>
              <MaterialCommunityIcons
                name="camera"
                size={18}
                color={EXPERT_COLORS.white}
              />
            </View>
          </TouchableOpacity>

          <Text numberOfLines={1} style={expertStyles.profileName}>
            {profileName ?? 'N/A'}
          </Text>

          {gender === 'female' &&
            profile?.tamilName &&
            profile?.name &&
            profile.tamilName !== profile.name && (
              <Text numberOfLines={1} style={expertStyles.englishName}>
                {profile.name}
              </Text>
            )}

          <View style={expertStyles.detailRow}>
            <MaterialCommunityIcons
              name="phone-outline"
              size={20}
              color={EXPERT_COLORS.tealDark}
            />
            <Text style={expertStyles.detailText}>{displayPhoneNumber}</Text>
          </View>

          <View style={expertStyles.detailRow}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={21}
              color={EXPERT_COLORS.tealDark}
            />
            <Text style={expertStyles.detailText}>
              Member since {formatDate(user?.createdAt)}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={expertStyles.editButton}
            onPress={() => navigation.navigate('EditProfile', { gender })}
          >
            <MaterialCommunityIcons
              name="account-edit-outline"
              size={25}
              color={EXPERT_COLORS.tealDark}
            />
            <Text style={expertStyles.editButtonText}>Edit Profile</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={25}
              color={EXPERT_COLORS.tealDark}
              style={expertStyles.editChevron}
            />
          </TouchableOpacity>
        </View>

        {isExpert ? (
          <View style={expertStyles.callTimeCard}>
            <View style={expertStyles.callTimeIcon}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={30}
                color={EXPERT_COLORS.tealDark}
              />
            </View>
            <View style={expertStyles.callTimeDivider} />
            <View style={expertStyles.callTimeContent}>
              <Text style={expertStyles.callTimeLabel}>Total call time</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={expertStyles.callTimeDescription}
              >
                Across all completed calls
              </Text>
            </View>
            <Text style={expertStyles.callTimeValue}>
              {formattedTotalCallDuration}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => navigation.navigate('Wallet')}
            style={expertStyles.walletCard}
          >
            <View style={expertStyles.walletIcon}>
              <Image
                source={require('../../assets/coin.png')}
                style={expertStyles.walletCoin}
              />
            </View>
            <View style={expertStyles.callTimeDivider} />
            <View style={expertStyles.callTimeContent}>
              <Text style={expertStyles.callTimeLabel}>Available balance</Text>
              <Text style={expertStyles.callTimeDescription}>
                Tap to add more coins
              </Text>
            </View>
            <Text style={expertStyles.walletValue}>
              {user?.wallet?.balance || 0}
            </Text>
            <View style={expertStyles.walletAdd}>
              <MaterialCommunityIcons
                name="plus"
                size={22}
                color={EXPERT_COLORS.tealDark}
              />
            </View>
          </TouchableOpacity>
        )}

        {renderExpertSection(
          'Account',
          isExpert ? femaleAccountMenus : manAccountMenus,
        )}

        {isAdmin &&
          renderExpertSection('Administration', [
            {
              id: 'admin-users',
              title: 'Manage Users',
              icon: 'account-cog-outline',
              screen: 'AdminUsers',
            },
          ])}

        {renderExpertSection('Support', supportMenus.slice(0, 3))}
        {renderExpertSection('Help & legal', supportMenus.slice(3))}
        {renderExpertSection('Security', securityMenus)}

        <View style={expertStyles.footer}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={30}
            color={EXPERT_COLORS.teal}
          />
          <Text style={expertStyles.footerText}>
            Secure &amp; Private · Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileSettingScreen;

const expertStyles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: EXPERT_COLORS.background,
  },
  backgroundGlow: {
    position: 'absolute',
    width: 380,
    height: 380,
    top: -240,
    right: -140,
    borderRadius: 190,
    backgroundColor: 'rgba(218,249,244,0.38)',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EXPERT_COLORS.white,
    shadowColor: '#1B5850',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTitle: {
    marginLeft: 18,
    color: EXPERT_COLORS.navy,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  profileCard: {
    minHeight: 340,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 22,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.74)',
    shadowColor: '#23655D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  profileGlowOne: {
    position: 'absolute',
    width: 310,
    height: 310,
    top: 20,
    right: -135,
    borderRadius: 155,
    backgroundColor: 'rgba(213,248,241,0.48)',
  },
  profileGlowTwo: {
    position: 'absolute',
    width: 280,
    height: 280,
    left: -180,
    top: 95,
    borderRadius: 140,
    backgroundColor: 'rgba(232,252,248,0.55)',
  },
  avatarWrap: {
    width: 118,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: EXPERT_COLORS.tealPale,
  },
  cameraBadge: {
    position: 'absolute',
    right: 1,
    bottom: 8,
    width: 36,
    height: 36,
    borderWidth: 3,
    borderColor: EXPERT_COLORS.white,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EXPERT_COLORS.teal,
    shadowColor: EXPERT_COLORS.tealDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 4,
  },
  profileName: {
    maxWidth: '88%',
    marginTop: 9,
    color: EXPERT_COLORS.navy,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  englishName: {
    maxWidth: '85%',
    marginTop: 2,
    color: EXPERT_COLORS.body,
    fontSize: 14,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  detailText: {
    marginLeft: 9,
    color: EXPERT_COLORS.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  editButton: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 24,
    borderWidth: 1.4,
    borderColor: '#BFEDE4',
    borderRadius: 17,
    backgroundColor: 'rgba(234,251,247,0.72)',
  },
  editButtonText: {
    marginLeft: 17,
    color: EXPERT_COLORS.tealDark,
    fontSize: 17,
    fontWeight: '800',
  },
  editChevron: {
    marginLeft: 'auto',
  },
  callTimeCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EEF3F3',
    borderRadius: 24,
    backgroundColor: EXPERT_COLORS.white,
    shadowColor: '#225C55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  walletCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EEF3F3',
    borderRadius: 24,
    backgroundColor: EXPERT_COLORS.white,
    shadowColor: '#225C55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  walletIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EXPERT_COLORS.tealPale,
  },
  walletCoin: {
    width: 39,
    height: 39,
    resizeMode: 'contain',
  },
  walletValue: {
    marginLeft: 6,
    color: EXPERT_COLORS.tealDark,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  walletAdd: {
    width: 38,
    height: 38,
    marginLeft: 10,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EXPERT_COLORS.tealPale,
  },
  callTimeIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EXPERT_COLORS.tealPale,
  },
  callTimeDivider: {
    width: 1,
    height: 45,
    marginHorizontal: 17,
    backgroundColor: '#E6ECEC',
  },
  callTimeContent: {
    flex: 1,
  },
  callTimeLabel: {
    color: EXPERT_COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },
  callTimeDescription: {
    marginTop: 3,
    color: EXPERT_COLORS.body,
    fontSize: 12.5,
  },
  callTimeValue: {
    marginLeft: 6,
    color: EXPERT_COLORS.tealDark,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sectionWrap: {
    marginTop: 28,
  },
  sectionTitle: {
    marginBottom: 14,
    marginLeft: 6,
    color: EXPERT_COLORS.body,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  menuCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF3F3',
    borderRadius: 23,
    backgroundColor: EXPERT_COLORS.white,
    shadowColor: '#225C55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.045,
    shadowRadius: 15,
    elevation: 2,
  },
  menuRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 8,
  },
  menuIcon: {
    width: 46,
    height: 46,
    marginRight: 18,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EXPERT_COLORS.tealPale,
  },
  menuIconDanger: {
    backgroundColor: EXPERT_COLORS.dangerPale,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    color: EXPERT_COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
  },
  menuTitleDanger: {
    color: '#D85050',
  },
  menuValue: {
    marginTop: 3,
    color: EXPERT_COLORS.body,
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 98,
    marginRight: 25,
    backgroundColor: '#E8EEEE',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  footerText: {
    marginLeft: 9,
    color: EXPERT_COLORS.body,
    fontSize: 12.5,
  },
});
