import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SentenceTranslation } from '@/components/reverso/reverso';
import { BookDatabase } from '../../../components/db/bookDatabase';

export default function SentenceInfo() {
  const { content } = useLocalSearchParams();
  const parsedContent: SentenceTranslation = JSON.parse(content as string);
  const router = useRouter();
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [originalText, setOriginalText] = useState(parsedContent.Original);
  const [translationText, setTranslationText] = useState(parsedContent.Translation);
  const [db] = useState(() => new BookDatabase(parsedContent.bookTitle as string));
  
  useEffect(() => {
    const initialize = async () => {
      await db.initialize();
    };
    initialize();
  }, []);
  
  const handleSave = async () => {
    if (parsedContent.id === null || parsedContent.id === undefined) {
      Alert.alert("Error", "Cannot save - no sentence ID");
      return;
    }
    
    try {
      // Find the sentence in the database and update it
      // This is a simplified example - you'll need to implement the actual database update      
      await db.rewriteSentence(parsedContent.id, originalText, translationText);
      
      Alert.alert("Success", "Sentence updated successfully", [
        { 
          text: "OK", 
          onPress: () => {
            // Navigate back to the reader or refresh the current page
            router.back();
          }
        }
      ]);
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving sentence:", error);
      Alert.alert("Error", "Failed to save changes");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Original</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            multiline
            value={originalText}
            onChangeText={setOriginalText}
          />
        ) : (
          <Text style={styles.content}>
            {(parsedContent.Original)}
          </Text>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Translation</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            multiline
            value={translationText}
            onChangeText={setTranslationText}
          />
        ) : (
          <Text style={styles.content}>
            {(parsedContent.Translation)}
          </Text>
        )}
      </View>
      
      {parsedContent.id !== null && (
        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => {
                  setIsEditing(false);
                  // Reset text to original values
                  setOriginalText(parsedContent.Original);
                  setTranslationText(parsedContent.Translation);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.editButton]} 
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  content: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  textInput: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    margin: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#4A90E2',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});