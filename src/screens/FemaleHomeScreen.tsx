import React, { use, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';

import Colors from '../constants/colors';
import { useUser } from '../hooks/UserContext';
import { getUserAvatar } from '../constants/constants';
const { width } = Dimensions.get('window');

const BANNER_WIDTH = width - 40;

const tutorialData = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900',
  },
];

const noticeData = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=900',
  },
];

const leaderboardData = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=900',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900',
  },
];

interface Props {
  navigation: any;
}

const FemaleHomeScreen: React.FC<Props> = ({ navigation }) => {
  const [page, setPage] = useState(0);
  const isFocused = useIsFocused();
  const { user, updateProfile } = useUser();
  const bannerRef = useRef<FlatList>(null);

  React.useEffect(() => {
    updateProfile({ status: 'Offline' });
  }, [isFocused]);

  const goOnLine = async () => {
    try {
      await updateProfile({ status: 'Online' });
      navigation.navigate('OnlineRoom');
    } catch (e) {
      console.log('goOnLine -> e', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good To See You! 👋</Text>

            <Text numberOfLines={1} style={styles.userName}>
              {user?.profile?.name || 'N/A'}
            </Text>

            <Text style={styles.subtitle}>Ready to meet new people today?</Text>
          </View>

          <View style={styles.rightHeader}>
            {/* <TouchableOpacity style={styles.notification}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={Colors.text}
              />
            </TouchableOpacity> */}

            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ProfileSetting', {
                  gender: 'female',
                })
              }
            >
              <Image source={getUserAvatar(user)} style={styles.avatar} />
            </TouchableOpacity>
          </View>
        </View>

        {/* TUTORIAL */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tutorials</Text>

            {/* <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity> */}
          </View>

          <FlatList
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={tutorialData}
            keyExtractor={item => item.id}
            onMomentumScrollEnd={e => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / BANNER_WIDTH,
              );

              setPage(index);
            }}
            renderItem={({ item }) => (
              <View style={styles.bannerContainer}>
                <Image source={item.image} style={styles.banner} />

                <View style={styles.playButton}>
                  <Ionicons name="play" size={30} color="#FFF" />
                </View>
              </View>
            )}
          />

          <View style={styles.indicatorContainer}>
            {tutorialData.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, page === index && styles.activeDot]}
              />
            ))}
          </View>
        </View>

        {/* GO ONLINE */}

        <TouchableOpacity onPress={goOnLine} activeOpacity={0.9}>
          <LinearGradient
            colors={Colors.buttonGradient}
            style={styles.onlineButton}
          >
            <View style={styles.onlineDot} />

            <Text style={styles.onlineText}>GO ONLINE</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ===================== LEADERBOARD =====================

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Leaderboards</Text>

            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={leaderboardData}
            keyExtractor={item => item.id}
            contentContainerStyle={{
              paddingHorizontal: 20,
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.smallBannerCard}
              >
                <Image
                  source={{
                    uri: item.image,
                  }}
                  style={styles.smallBanner}
                />

                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.65)']}
                  style={styles.bannerOverlay}
                >
                  <Text style={styles.bannerTitle}>Weekly Stars</Text>

                  <Text style={styles.bannerSubtitle}>Top verified users</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          />
        </View> */}

        {/* ===================== NOTICEBOARD ===================== */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Noticeboard</Text>

            {/* <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity> */}
          </View>

          {noticeData.map(item => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              style={styles.noticeCard}
            >
              <Image
                source={{
                  uri: item.image,
                }}
                style={styles.noticeImage}
              />

              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>Invite Friends & Earn</Text>

                <Text style={styles.noticeDesc}>
                  Invite your friends and earn bonus coins instantly after their
                  first recharge.
                </Text>

                {/* <TouchableOpacity style={styles.noticeButton}>
                  <Text style={styles.noticeButtonText}>Learn More</Text>
                </TouchableOpacity> */}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={{
            height: 40,
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    paddingBottom: 120,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 25,
  },

  greeting: {
    fontSize: 16,
    color: Colors.subText,
    fontWeight: '500',
  },

  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.subText,
    marginTop: 6,
  },

  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notification: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },

  card: {
    backgroundColor: Colors.card,
    marginHorizontal: 18,
    marginBottom: 22,
    borderRadius: 24,
    paddingVertical: 20,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 5,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '700',
  },

  viewAll: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },

  bannerContainer: {
    width: BANNER_WIDTH,
    alignItems: 'center',
  },

  banner: {
    width: BANNER_WIDTH,
    height: 185,
    borderRadius: 22,
    resizeMode: 'cover',
  },

  playButton: {
    position: 'absolute',
    top: 65,

    width: 62,
    height: 62,

    borderRadius: 31,

    backgroundColor: 'rgba(0,0,0,0.45)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
    backgroundColor: Colors.disabled,
  },

  activeDot: {
    width: 24,
    backgroundColor: Colors.secondary,
  },

  onlineButton: {
    height: 62,
    marginHorizontal: 18,
    marginBottom: 22,

    borderRadius: 31,

    justifyContent: 'center',
    alignItems: 'center',

    flexDirection: 'row',
  },

  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,

    backgroundColor: '#00E676',

    marginRight: 12,
  },

  onlineText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 1,
  },

  smallBannerCard: {
    width: 240,
    height: 170,

    marginRight: 16,

    borderRadius: 22,

    overflow: 'hidden',
  },

  smallBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,

    padding: 16,
  },

  bannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  bannerSubtitle: {
    color: '#EEE',
    marginTop: 4,
    fontSize: 13,
  },

  noticeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,

    marginHorizontal: 20,
    marginBottom: 18,

    borderRadius: 20,

    overflow: 'hidden',
  },

  noticeImage: {
    width: 110,
    height: 120,
    resizeMode: 'cover',
  },

  noticeContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },

  noticeTitle: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 16,
  },

  noticeDesc: {
    color: Colors.subText,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 20,
  },

  noticeButton: {
    alignSelf: 'flex-start',

    marginTop: 12,

    backgroundColor: Colors.secondary,

    paddingHorizontal: 18,
    paddingVertical: 8,

    borderRadius: 18,
  },

  noticeButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});

export default FemaleHomeScreen;
