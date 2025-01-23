import { Text, View, StyleSheet } from "react-native";
import { Word } from "./Word";
import { SentenceProps } from "../types/types";

export const Sentence: React.FC<SentenceProps> = ({
    sentence,
    parsedSentence,
    isSelected,
    onWordPress,
    onLongPress,
    isWordHighlighted
  }) => (
    <View>
      <Text style={styles.paragraph} onLongPress={onLongPress}>
        {parsedSentence ? (
          parsedSentence.original.map((word, index) => (
            <Word
              key={index}
              word={word}
              sentence={sentence}
              isHighlighted={isWordHighlighted(word)}
              onPress={onWordPress}
              onLongPress={onLongPress}
            />
          ))
        ) : (
          sentence.original_text.split(/(\s+)/).map((word, index) => {
            const isSpace = /^\s+$/.test(word);
            return (
              <Text
                key={index}
                onPress={() => !isSpace && onWordPress(word, sentence)}
                style={[styles.word, isSpace && styles.space]}
              >
                {word}
              </Text>
            );
          })
        )}
      </Text>
      
      {isSelected && parsedSentence && (
        <Text style={styles.translationText}>
          {parsedSentence.translation.map((word, index) => (
            <Word
              key={index}
              word={word}
              sentence={sentence}
              isHighlighted={isWordHighlighted(word)}
              onPress={onWordPress}
            />
          ))}
        </Text>
      )}
    </View>
  );
  const styles = StyleSheet.create({
    word: {
      fontSize: 16,
      lineHeight: 24,
    },
    space: {
      width: 4,
    },
    highlightedWord: {
      backgroundColor: '#3498db',
      color: '#fff',
    },
    paragraph: {
      fontSize: 16,
      marginBottom: 16,
      lineHeight: 24,
    },
    translationText: {
      fontSize: 16,
      lineHeight: 24,
      color: '#666',
      fontStyle: 'italic',
      marginTop: 8,
      marginBottom: 16,
      paddingLeft: 16,
      borderLeftWidth: 2,
      borderLeftColor: '#ddd'
    }
  });