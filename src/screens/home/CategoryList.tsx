import React from 'react';
import { FlatList, TouchableOpacity, Text } from 'react-native';
import Colors from '../../constants/colors';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (item: string) => void;
}

const CategoryList = ({ categories, selected, onSelect }: Props) => {
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
      renderItem={({ item }) => {
        const active = item === selected;

        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onSelect(item)}
            style={{
              height: 42,
              paddingHorizontal: 20,
              borderRadius: 22,
              marginRight: 12,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: active ? Colors.primary : Colors.white,
              borderWidth: 1,
              borderColor: Colors.secondary,
            }}
          >
            <Text
              style={{
                fontWeight: '700',
                color: active ? Colors.secondary : Colors.text,
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
};

export default CategoryList;
