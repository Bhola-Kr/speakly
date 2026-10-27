import React, { memo, useCallback } from 'react';
import { FlatList, TouchableOpacity, Text } from 'react-native';
import Colors from '../../constants/colors';

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
          style={{
            height: 40,
            paddingHorizontal: 18,
            borderRadius: 14,
            marginRight: 10,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: active ? Colors.secondary : Colors.white,
            borderWidth: 1,
            borderColor: active ? Colors.secondary : Colors.border,
          }}
        >
          <Text
            style={{
              fontWeight: '700',
              color: active ? Colors.white : Colors.subText,
            }}
          >
            {item}
          </Text>
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
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingBottom: 10,
      }}
      renderItem={renderItem}
    />
  );
};

export default memo(CategoryList);
