import React, { memo, useCallback } from 'react';
import { FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const COLORS = {
  teal: '#08AA91',
  tealDark: '#078A7D',
  body: '#71788E',
  white: '#FFFFFF',
  border: '#E1ECEA',
};

interface Props {
  categories: string[];
  selected: string;
  onSelect: (item: string) => void;
}

const CategoryList = ({ categories, selected, onSelect }: Props) => {
  const renderItem = useCallback(
    ({ item }: { item: string }) => {
      const active = item === selected;

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelect(item)}
          style={styles.chipTouch}
        >
          <LinearGradient
            colors={
              active ? [COLORS.teal, COLORS.tealDark] : ['#FFFFFF', '#FFFFFF']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.chip, !active && styles.chipInactive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {item}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    },
    [onSelect, selected],
  );

  return (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={item => item}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      renderItem={renderItem}
    />
  );
};

export default memo(CategoryList);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  chipTouch: {
    marginRight: 9,
  },
  chip: {
    height: 36,
    minWidth: 68,
    paddingHorizontal: 14,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  chipInactive: {
    borderColor: COLORS.border,
  },
  label: {
    color: COLORS.body,
    fontSize: 14,
    lineHeight: 19,
    paddingTop: 1,
    fontWeight: '700',
  },
  labelActive: {
    color: COLORS.white,
  },
});
