import React, { useEffect, useMemo, useState } from 'react';

import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Share,
} from 'react-native';

import { Alert, Linking } from 'react-native';
import auth from '@react-native-firebase/auth';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';

import Colors from '../../constants/colors';

import {
  manAccountMenus,
  supportMenus,
  securityMenus,
  femaleAccountMenus,
} from './dummyData';
import { formatDate, getUserAvatar } from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';
import { useActiveCall } from '../../hooks/ActiveCallContext';
import RoomService from '../../firebase/RoomService';
import authData from '../../firebase/authData';
import { openAppReview } from '../../firebase/appReview';

interface Props {
  navigation: any;
  route: any;
}

const ProfileSettingScreen = ({ navigation }: Props) => {
  const SUPPORT_EMAIL = 'tamizhkuralhelp@gmail.com';

  const { user } = useUser();
  const { activeCall, showCall } = useActiveCall();
  const profile = user?.profile;
  const gender = profile?.gender || 'male';
  const phoneNumber = user?.phone || profile?.phone || 'Not available';
  const profileName =
    gender === 'female' ? profile?.tamilName || profile?.name : profile?.name;
  const [totalCallDuration, setTotalCallDuration] = useState(0);

  useEffect(() => {
    if (gender !== 'female') {
      setTotalCallDuration(0);
      return;
    }

    return RoomService.listenTotalCallDuration(setTotalCallDuration);
  }, [gender]);

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
    'https://play.google.com/store/apps/details?id=com.cozyds.voicetamil';

  const handleLogout = () => {
    if (activeCall) {
      Alert.alert('Call in progress', 'Please end your call before logging out.');
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
      'Deleting your account is permanent and cannot be undone.\n\nAll your profile information, wallet history, call history, and other associated data will be permanently removed.\n\nDo you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            const user = auth().currentUser;

            const supportEmail = 'tamizhkuralhelp@gmail.com';

            const subject = encodeURIComponent('Delete Account Request');

            const body = encodeURIComponent(`Hello Support Team,

I would like to permanently delete my account.

User ID: ${user?.uid}

Registered Mobile: ${user?.phoneNumber ?? 'N/A'}

Please permanently delete my account and all associated data.

Thank you.
`);

            Linking.openURL(
              `mailto:${supportEmail}?subject=${subject}&body=${body}`,
            ).catch(() => {
              Alert.alert(
                'Email App Not Found',
                'No email application is installed on this device.',
              );
            });
          },
        },
      ],
      {
        cancelable: true,
      },
    );
  };

  const handleContactUs = async () => {
    const subject = encodeURIComponent('VoiceTamil Support');

    const body = encodeURIComponent(`Hello VoiceTamil Support Team,

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
        title: 'VoiceTamil',
        message: `Talk, connect, and enjoy conversations on VoiceTamil.

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

  const renderSection = (title: string, data: any[]) => (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.menuCard}>
        {data.map((item, index) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
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
                    navigation.navigate(
                      gender === 'male' ? 'ManHistory' : 'FemaleHistory',
                      {
                        showBack: true,
                      },
                    );
                  } else {
                    navigation.navigate(item.screen);
                  }
                }
              }}
              style={styles.menuRow}
            >
              <View style={styles.menuIcon}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={item.danger ? Colors.danger : Colors.secondary}
                />
              </View>

              <View style={styles.menuContent}>
                <Text
                  style={[
                    styles.menuTitle,
                    item.danger && { color: Colors.danger },
                  ]}
                >
                  {item.title}
                </Text>

                {item.value && (
                  <Text style={styles.menuValue}>{item.value}</Text>
                )}
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={26}
                color={Colors.placeholder}
              />
            </TouchableOpacity>

            {index !== data.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.leftHeader}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={26}
                color={Colors.text}
              />
            </TouchableOpacity>

            <Text style={styles.title}>Profile</Text>
          </View>

          {gender === 'male' && (
            <TouchableOpacity
              style={styles.wallet}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Image
                source={require('../../assets/coin.png')}
                style={{
                  width: 24,
                  height: 24,
                  resizeMode: 'contain',
                }}
              />

              <Text
                style={{
                  color: Colors.white,
                  fontWeight: '700',
                  marginHorizontal: 8,
                }}
              >
                {user?.wallet?.balance || 0}
              </Text>

              <View style={styles.plus}>
                <MaterialCommunityIcons
                  name="plus"
                  size={15}
                  color={Colors.black}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.profileCard}>
          <Image source={getUserAvatar(user)} style={styles.avatar} />

          <Text style={styles.tamilName}>{profileName ?? 'N/A'}</Text>

          {gender === 'female' &&
            profile?.tamilName &&
            profile?.name &&
            profile.tamilName !== profile.name && (
              <Text style={styles.englishName}>{profile.name}</Text>
            )}

          <View style={styles.phoneRow}>
            <MaterialCommunityIcons
              name="phone-outline"
              size={16}
              color={Colors.subText}
            />

            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </View>

          <Text style={styles.memberSince}>
            Member since: {formatDate(user?.createdAt)}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.outlineButton}
              onPress={() =>
                navigation.navigate('EditProfile', {
                  gender,
                })
              }
            >
              <Text style={styles.outlineText}>Edit Profile</Text>
            </TouchableOpacity>

            {gender === 'male' && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.primaryButton}
                onPress={() => navigation.navigate('AddBalance')}
              >
                <Text style={styles.primaryText}>Add Balance</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {gender === 'female' && (
          <View style={styles.callTimeCard}>
            <View style={styles.callTimeIcon}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={24}
                color={Colors.secondary}
              />
            </View>

            <View style={styles.callTimeContent}>
              <Text style={styles.callTimeLabel}>Total call time</Text>
              <Text style={styles.callTimeDescription}>
                Across all completed calls
              </Text>
            </View>

            <Text style={styles.callTimeValue}>
              {formattedTotalCallDuration}
            </Text>
          </View>
        )}

        {renderSection(
          'Account',
          gender === 'male' ? manAccountMenus : femaleAccountMenus,
        )}

        {renderSection('Support', supportMenus)}

        {renderSection('Security', securityMenus)}

        <View style={styles.footer}>
          <MaterialCommunityIcons
            name="shield-check"
            size={46}
            color={Colors.secondary}
          />

          <Text style={styles.footerTitle}>Secure & Private</Text>

          <Text style={styles.footerVersion}>Version {'1.0.0'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileSettingScreen;
