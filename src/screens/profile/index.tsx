import React from 'react';

import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';

import Colors from '../../constants/colors';

import {
  profile,
  accountMenus,
  preferenceMenus,
  supportMenus,
} from './dummyData';
import { femaleAvatars } from '../../constants/constants';

const ProfileScreen = ({ navigation }: any) => {
  const avatar =
    femaleAvatars.find(a => a.id === profile.avatarId) || femaleAvatars[0];

  const renderSection = (title: string, data: any[]) => (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.menuCard}>
        {data.map((item, index) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (item.screen) {
                  navigation.navigate(item.screen);
                }
              }}
              style={styles.menuRow}
            >
              <View style={styles.menuIcon}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={Colors.secondary}
                />
              </View>

              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>

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
          <Text style={styles.title}>Profile</Text>

          <TouchableOpacity
            style={styles.wallet}
            onPress={() => navigation.navigate('Wallet')}
          >
            <MaterialCommunityIcons
              name="wallet-outline"
              size={18}
              color={Colors.secondary}
            />

            <Text style={styles.walletText}>₹{profile.balance.toFixed(2)}</Text>

            <View style={styles.plus}>
              <MaterialCommunityIcons
                name="plus"
                size={15}
                color={Colors.black}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <Image source={avatar.image} style={styles.avatar} />

          <Text style={styles.tamilName}>{profile.tamilName}</Text>

          <Text style={styles.englishName}>{profile.englishName}</Text>

          <Text style={styles.memberSince}>
            Member since {profile.memberSince}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.outlineButton}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={styles.outlineText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.primaryButton}
              onPress={() => navigation.navigate('AddBalance')}
            >
              <Text style={styles.primaryText}>Add Balance</Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderSection('Account', accountMenus)}

        {renderSection('Preferences', preferenceMenus)}

        {renderSection('Support', supportMenus)}

        <View style={styles.footer}>
          <MaterialCommunityIcons
            name="shield-check"
            size={46}
            color={Colors.secondary}
          />

          <Text style={styles.footerTitle}>Secure & Private</Text>

          <Text style={styles.footerVersion}>Version {profile.version}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
