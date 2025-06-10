// Updated slidePanel.tsx - Handle EmittedWord type
import React, { useState, useEffect } from 'react';
import { WordTranslationPanel, SentenceTranslationPanel } from './panel';
import { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import { EmittedWord } from './components/events/slidePanelEvents';
import { database } from '@/components/db/database';
import { BookDatabase } from '@/components/db/bookDatabase';
import { Transform } from '@/components/transform';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';
import { useLanguage } from '@/app/languageSelector';

interface SlidePanelProps {
  isVisible: boolean;
  content: SentenceTranslation | ResponseTranslation | EmittedWord | null;
  onClose: () => void;
  onAnnotateSentence: () => void;
}

// Type guards
function isEmittedWord(content: any): content is EmittedWord {
  return content && 
         typeof content.word === 'string' && 
         typeof content.translation === 'string' &&
         !content.Translations && // Not ResponseTranslation
         !content.Translation;    // Not SentenceTranslation
}

function isSentenceTranslation(content: any): content is SentenceTranslation {
  return content && content.Translation && !content.Translations;
}

function isResponseTranslation(content: any): content is ResponseTranslation {
  return content && content.Translations && Array.isArray(content.Translations);
}

const SlidePanel: React.FC<SlidePanelProps> = ({
  isVisible,
  content,
  onClose,
  onAnnotateSentence
}) => {
  const [isAdded, setIsAdded] = useState(false);
  const [displayContent, setDisplayContent] = useState<ResponseTranslation | null>(null);
  const { sourceLanguage, targetLanguage } = useLanguage();

  useEffect(() => {
    // Reset isAdded when content changes
    setIsAdded(false);
    
    if (isEmittedWord(content)) {
      // Convert EmittedWord to ResponseTranslation format for display
      const responseTranslation: ResponseTranslation = {
        Original: content.word,
        Translations: [{ word: content.translation, pos: '' }],
        Contexts: [],
        Book: 'Unknown',
        TextView: ''
      };
      setDisplayContent(responseTranslation);
    } else if (isResponseTranslation(content)) {
      setDisplayContent(content);
    } else {
      setDisplayContent(null);
    }
  }, [content]);

  if (!content || !isVisible) return null;

  const handleAddToDictionary = async () => {
    if (!displayContent) return;
    
    let noWord = await database.WordDoesNotExist(displayContent.Original);
    if (!noWord) {
      return;
    }
    
    if (!isAdded) {
      database.insertCard(
        Transform.fromWordToCard(displayContent, SupportedLanguages[sourceLanguage], SupportedLanguages[targetLanguage]), 
        displayContent.TextView
      );
      setIsAdded(true);
    }
  };

  // Handle SentenceTranslation
  if (isSentenceTranslation(content)) {
    return (
      <SentenceTranslationPanel
        content={content}
        isVisible={isVisible}
        onClose={onClose}
      />
    );
  }

  // Handle ResponseTranslation or converted EmittedWord
  if (displayContent) {
    return (
      <WordTranslationPanel
        content={displayContent}
        isVisible={isVisible}
        onClose={onClose}
        onAddToDictionary={handleAddToDictionary}
        onAnnotateSentence={onAnnotateSentence}
        isAdded={isAdded}
      />
    );
  }

  return null;
};

export default SlidePanel;