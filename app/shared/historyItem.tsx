// File path: app/shared/components/HistoryItem.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { HistoryEntry, Card } from '@/components/db/database';

interface HistoryItemProps {
  entry: HistoryEntry;
  index: number;
  card: Card | null;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ entry, index, card }) => {
  const [contextSentence, setContextSentence] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  useEffect(() => {
    loadContextSentence();
  }, [entry.contextId]);

  // Format date in a readable way
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load the context sentence from the card data
  const loadContextSentence = () => {
    if (!entry.contextId || !card || !card.context) {
      return;
    }

    setIsLoadingContext(true);
    
    try {
      // Find the context with matching ID
      const context = card.context.find(ctx => ctx.id === entry.contextId);
      if (context) {
        // Extract the word from the sentence (typically in <em> tags)
        const cleanSentence = context.sentence.replace(/<\/?em>/g, (match) => {
          return match === '<em>' ? '«' : '»';
        });
        
        setContextSentence(cleanSentence);
      }
    } catch (error) {
      console.error('Error loading context sentence:', error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  // Get a shorter version of the type if it's too long
  const getShortTypeDisplay = (type: string | null) => {
    if (!type) return 'Standard Review';
    
    // If type contains parentheses, extract just the main type
    if (type.includes('(')) {
      const mainType = type.split('(')[0].trim();
      return mainType;
    }
    
    return type;
  };

  return (
    <View style={[
      styles.historyItem, 
      index % 2 === 0 ? styles.evenHistoryItem : styles.oddHistoryItem
    ]}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
        <View style={[
          styles.historyStatus, 
          entry.success ? styles.successStatus : styles.failureStatus
        ]}>
          <Text style={styles.historyStatusText}>
            {entry.success ? 'Success' : 'Failure'}
          </Text>
        </View>
      </View>

      <View style={styles.historyDetails}>
        <Text style={styles.historyType}>
          <Text style={styles.historyLabel}>Type:</Text> {getShortTypeDisplay(entry.type)}
        </Text>
        
        {entry.contextId && (
          <View style={styles.contextContainer}>
            <View style={styles.contextHeader}>
              <Text style={styles.historyLabel}>Context:</Text>
              <Text style={styles.contextId}>ID: {entry.contextId}</Text>
            </View>
            
            {isLoadingContext ? (
              <ActivityIndicator size="small" color="#666" style={styles.contextLoader} />
            ) : contextSentence ? (
              <Text style={styles.contextSentence}>{contextSentence}</Text>
            ) : (
              <Text style={styles.noContextText}>No context available</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  historyItem: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  evenHistoryItem: {
    backgroundColor: '#f8f9fa',
  },
  oddHistoryItem: {
    backgroundColor: '#f0f4f8',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    color: '#555',
  },
  historyStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  successStatus: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  failureStatus: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyDetails: {
    marginTop: 8,
  },
  historyType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  historyLabel: {
    fontWeight: 'bold',
    color: '#555',
  },
  contextContainer: {
    marginTop: 4,
  },
  contextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextId: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  contextSentence: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  noContextText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  contextLoader: {
    marginTop: 4,
  }
});

export default HistoryItem;