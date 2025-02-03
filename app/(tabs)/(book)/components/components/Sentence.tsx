// Sentence.tsx
import { Text, View, StyleSheet } from "react-native";
import { Word } from "./Word";
import { ParsedSentence, ParsedWord } from "../types/types";
import { BookDatabase, DBSentence } from "@/components/db/bookDatabase";
import { database } from "@/components/db/database";

export interface SentenceProps {
  sentence: DBSentence;
  parsedSentence?: ParsedSentence;
  isSelected: boolean;
  bookTitle: string;
  fontSize: number;  // Add fontSize prop
  onWordPress: (word: string, sentence: DBSentence, index: number) => Promise<ParsedWord>;
  onLongPress: () => void;
  isWordHighlighted: (word: ParsedWord) => boolean;
  database: BookDatabase
}

export const Sentence: React.FC<SentenceProps> = ({
  sentence,
  parsedSentence,
  isSelected,
  bookTitle,
  fontSize,  // Add fontSize to props
  onWordPress,
  onLongPress,
  isWordHighlighted, 
  database
}) => {
  const dynamicStyles = StyleSheet.create({
    paragraph: {
      fontSize: fontSize,
      marginBottom: 16,
      lineHeight: fontSize * 1.5,
    },
    translationText: {
      fontSize: fontSize,
      lineHeight: fontSize * 1.5,
      color: '#666',
      fontStyle: 'italic',
    }
  });

  return (
    <View>
      {/* Original text rendering */}
      <Text style={dynamicStyles.paragraph} onLongPress={onLongPress}>
        {parsedSentence ? (
          parsedSentence.original.map((word, index) => (
            <Word
              key={`original-${index}`}
              word={word}
              sentence={sentence}
              fontSize={fontSize}  // Pass fontSize to Word
              isHighlighted={isWordHighlighted(word)}
              onPress={onWordPress}
              onLongPress={onLongPress}
              database={database}
            />
          ))
        ) : (
          sentence.original_text.split(/(\s+)/).map((word, index) => {
            const isSpace = /^\s+$/.test(word);
            const parsedWord: ParsedWord = {
              word,
              sentenceNumber: sentence.sentence_number,
              wordIndex: index, 
              groupNumber: 0,             
              linkeNumber: [],
              wordLinkedNumber: [],
              linkedWordMirror: [],
              wordLinkedWordMirror: [],
              isSpace,
              isTranslation: false
            };
            return (
              <Word
                key={`unparsed-${index}`}
                word={parsedWord}
                sentence={sentence}
                isHighlighted={false}
                fontSize={fontSize}  // Pass fontSize to Word
                onPress={onWordPress}
                onLongPress={onLongPress}
                database={database}
              />
            );
          })
        )}
      </Text>
      
      {/* Translation text rendering */}
      {isSelected && parsedSentence && (
        <View style={styles.translationContainer}>
          <Text style={dynamicStyles.translationText}>
            {parsedSentence.translation.map((word, index) => (
              <Word
                key={`translation-${index}`}
                word={word}
                sentence={sentence}
                isHighlighted={isWordHighlighted(word)}
                fontSize={fontSize}  // Pass fontSize to Word
                onPress={onWordPress}
                database={database}
              />
            ))}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  translationContainer: {
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    marginTop: 8,
    marginBottom: 16,
    paddingLeft: 16,
  },
});