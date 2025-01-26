import { Text, View, StyleSheet } from "react-native";
import { Word } from "./Word";
import { ParsedWord, SentenceProps } from "../types/types";

export const Sentence: React.FC<SentenceProps> = ({
  sentence,
  parsedSentence,
  isSelected,
  onWordPress,
  onLongPress,
  isWordHighlighted
}) => (
  <View>
    {/* Original text rendering */}
    <Text style={styles.paragraph} onLongPress={onLongPress}>
      {parsedSentence ? (
        parsedSentence.original.map((word, index) => (
          <Word
            key={`original-${index}`}
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
          const parsedWord: ParsedWord = {
            word,
            sentenceNumber: sentence.sentence_number,
            wordIndex: index,
            linkedNumbers: [],
            linkedWordIndices: [],
            isSpace
          };
          return (
            <Word
              key={`unparsed-${index}`}
              word={parsedWord}
              sentence={sentence}
              isHighlighted={false}
              onPress={onWordPress}
              onLongPress={onLongPress}
            />
          );
        })
      )}
    </Text>
    
    {/* Translation text rendering - restructured */}
    {isSelected && parsedSentence && (
      <View style={styles.translationContainer}>
        <Text style={styles.translationText}>
          {parsedSentence.translation.map((word, index) => (
            <Word
              key={`translation-${index}`}
              word={word}
              sentence={sentence}
              isHighlighted={isWordHighlighted(word)}
              onPress={onWordPress}
            />
          ))}
        </Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  translationContainer: {
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    marginTop: 8,
    marginBottom: 16,
    paddingLeft: 16,
  },
  translationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    fontStyle: 'italic',
  },
});