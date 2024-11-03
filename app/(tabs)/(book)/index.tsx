import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Dimensions, ListRenderItem } from 'react-native';
import { Link } from 'expo-router';
import { useLanguage } from '@/app/languageSelector';
import { Book, database } from '@/components/db/database';

interface ServerBook {
  title: string;
  fileName: string;
  fileType: string;
  coverImage: string | null;
}

interface BookSection {
  title: string;
  data: (Book | ServerBook)[];
}

const { width } = Dimensions.get('window');
const numColumns = 3;
const itemWidth = (width - 40) / numColumns;

const BookScreen: React.FC = () => {
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [otherBooks, setOtherBooks] = useState<ServerBook[]>([]);
  const serverUrl = "http://192.168.1.41:3000";
  const { sourceLanguage } = useLanguage();

  useEffect(() => {
    fetchAllBooks();
  }, [sourceLanguage]);

  const fetchAllBooks = async () => {
    try {
      // Fetch books from database
      const localBooks = await database.getAllBooks(sourceLanguage.toLowerCase());
      setMyBooks(localBooks);

      // Fetch books from server
      const response = await fetch(`${serverUrl}/books/${sourceLanguage.toLowerCase()}`);
      const serverBooks: ServerBook[] = await response.json();

      // Filter out books that are already in the database
      const uniqueServerBooks = serverBooks.filter(serverBook => 
        !localBooks.some(localBook => localBook.name === serverBook.title)
      );

      setOtherBooks(uniqueServerBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const renderBookItem = ({ item, isLocalBook }: { item: Book | ServerBook; isLocalBook: boolean }) => {
    const title = isLocalBook ? (item as Book).name : (item as ServerBook).title;
    const imageUrl = isLocalBook 
      ? (item as Book).imageUrl 
      : `${serverUrl}/covers/${(item as ServerBook).coverImage}`;
    const bookUrl = isLocalBook 
      ? (item as Book).bookUrl 
      : `${serverUrl}/books/${(item as ServerBook).fileName}`;

    return (
      <Link
        href={{
          pathname: "/page",
          params: {
            bookUrl: bookUrl,
            bookTitle: title,
            imageUrl: isLocalBook ? imageUrl : `${serverUrl}/covers/${(item as ServerBook).coverImage}`
          }
        }}
        asChild>
        <TouchableOpacity style={styles.bookItem}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.coverImage}
            />
          ) : (
            <View style={styles.placeholderCover}>
              <Text style={styles.placeholderText}>{title.substring(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.bookTitle} numberOfLines={2} ellipsizeMode="tail">{title}</Text>
        </TouchableOpacity>
      </Link>
    );
  };

  const renderSection: ListRenderItem<BookSection> = ({ item }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{item.title}</Text>
      <FlatList
        data={item.data}
        renderItem={({ item: bookItem }) => renderBookItem({ 
          item: bookItem, 
          isLocalBook: item.title === 'My Books' 
        })}
        keyExtractor={(bookItem) => 
          'fileName' in bookItem ? bookItem.fileName : bookItem.name
        }
        numColumns={numColumns}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );

  const sections: BookSection[] = [
    { title: 'My Books', data: myBooks },
    { title: 'Other Books', data: otherBooks }
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item) => item.title}
        contentContainerStyle={styles.mainContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  mainContainer: {
    padding: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 10,
    color: '#333',
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
    height: (itemWidth - 10) * 1.5,
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