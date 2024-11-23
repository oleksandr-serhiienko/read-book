import React, { useState, useEffect } from 'react';
import { WordTranslationPanel, SentenceTranslationPanel } from './panel';
import { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';

interface SlidePanelProps {
  isVisible: boolean;
  content: SentenceTranslation | ResponseTranslation | null;
  onClose: () => void;
  onAnnotateSentence: () => void;
}

const SlidePanel: React.FC<SlidePanelProps> = ({
  isVisible,
  content,
  onClose,
  onAnnotateSentence
}) => {
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    // Reset isAdded when content changes
    setIsAdded(false);
  }, [content]);

  if (!content || !isVisible) return null;

  const isSentenceTranslation = 'Translation' in content;

  const handleAddToDictionary = () => {
    if (!isSentenceTranslation && !isAdded) {
      setIsAdded(true);
    }
  };

  return isSentenceTranslation ? (
    <SentenceTranslationPanel
      content={content}
      isVisible={isVisible}
      onClose={onClose}
    />
  ) : (
    <WordTranslationPanel
      content={content}
      isVisible={isVisible}
      onClose={onClose}
      onAddToDictionary={handleAddToDictionary}
      onAnnotateSentence={onAnnotateSentence}
      isAdded={isAdded}
    />
  );
};

export default SlidePanel;