import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Colors from '../constants/colors';
import GradientButton from '../components/GradientButton';

interface Props {
  navigation: any;
}

const ITEM_HEIGHT = 40;

const BirthYearScreen: React.FC<Props> = ({ navigation }) => {
  const years = useMemo(() => {
    return Array.from({ length: 77 }, (_, i) => 2026 - i);
  }, []);

  const scrollRef = useRef<ScrollView>(null);

  const [selectedYear, setSelectedYear] = useState(2000);

  useEffect(() => {
    const index = years.indexOf(selectedYear);

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: index * ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, []);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    const index = Math.round(offsetY / ITEM_HEIGHT);

    if (years[index]) {
      setSelectedYear(years[index]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.8}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.smallTitle}>When's your</Text>

        <Text style={styles.title}>Birth Year?</Text>
      </View>

      <LinearGradient colors={Colors.gradient} style={styles.gradientBorder}>
        <View style={styles.pickerContainer}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={onScrollEnd}
            contentContainerStyle={{
              paddingVertical: ITEM_HEIGHT,
            }}
          >
            {years.map(year => (
              <TouchableOpacity
                key={year}
                activeOpacity={1}
                style={styles.item}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.yearText,
                    selectedYear === year && styles.selectedYear,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      <GradientButton
        title="Next"
        onPress={() => navigation.navigate('Gender')}
      />
    </SafeAreaView>
  );
};

export default BirthYearScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  backButton: {
    marginLeft: 18,
    marginTop: 15,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 42,
    color: Colors.black,
    fontWeight: '300',
  },

  titleContainer: {
    marginTop: 50,
    paddingHorizontal: 24,
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

  gradientBorder: {
    marginTop: 55,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 1.5,

    shadowColor: '#5B6CFF',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  pickerContainer: {
    height: ITEM_HEIGHT * 3,
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
  },

  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  yearText: {
    fontSize: 18,
    color: '#BEBEBE',
  },

  selectedYear: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.text,
  },
});
