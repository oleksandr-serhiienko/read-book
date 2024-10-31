import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Link } from 'expo-router';
import { useLanguage } from '@/app/languageSelector';

interface Book {
  title: string;
  fileName: string;
  fileType: string;
  coverImage: string | null;
}

const { width } = Dimensions.get('window');
const numColumns = 3;
const itemWidth = (width - 40) / numColumns; // 40 is total horizontal padding

const BookScreen: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const serverUrl = "http://192.168.1.41:3000";
  const { sourceLanguage} = useLanguage();
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {      
      const response = await fetch(`${serverUrl}/books/${sourceLanguage.toLocaleLowerCase()}`);
      console.log(`${serverUrl}/books/${sourceLanguage.toLocaleLowerCase()}`);
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    //console.log( `${serverUrl}/covers/${item.coverImage}`);
    return (
      <Link          
        href={{
          pathname: "/page",
          params: {
            bookUrl: `${serverUrl}/books/${sourceLanguage.toLocaleLowerCase()}/${item.fileName}`,
            bookTitle: item.title
          }
        }}
        asChild>
        <TouchableOpacity style={styles.bookItem}>
          {item.coverImage ? (
            <Image
              source={{ uri: `${serverUrl}/covers/${item.coverImage}` }}
              style={styles.coverImage}
            />
          ) : (
            <View style={styles.placeholderCover}>
              <Text style={styles.placeholderText}>{item.title.substring(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.bookTitle} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
        </TouchableOpacity>
      </Link>
    );
  };
  
  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.fileName}
        numColumns={numColumns}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  listContainer: {
    paddingVertical: 10,
  },
  bookItem: {
    width: itemWidth,
    marginBottom: 20,
    alignItems: 'center',
  },
  coverImage: {
    width: itemWidth - 10,
    height: (itemWidth - 10) * 1.5, // 3:2 aspect ratio
    borderRadius: 8,
    marginBottom: 5,
  },
  placeholderCover: {
    width: itemWidth - 10,
    height: (itemWidth - 10) * 1.5,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 5,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#888',
  },
  bookTitle: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
});

export default BookScreen;