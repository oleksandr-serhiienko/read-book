import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export interface Word {
  id?: number;
  name?: string;
  baseForm?: string;
  additionalInfo?: string;
  translations?: Translation[];
}

export interface Translation {
  type?: string;
  meaning?: string;
  additionalInfo?: string;
  examples?: Example[];
}

export interface Example {
  sentence?: string;
  translation?: string;
}

export interface Card {
  id?: number;
  lastRepeat: Date;
  level: number;
  userId: string;
  source: string;
  sourceLanguage: string;
  targetLanguage: string;
  comment: string;
  history?: Array<HistoryEntry>;
  word: string;
  wordInfo?: Word;
  info?: CardInfo;
}

interface LearningProgress {
  wordToMeaning: number;
  meaningToWord: number;
  context: number;
  contextLetters: number;
}

interface CardInfo {
  status: 'learning' | 'reviewing';
  learningProgress: LearningProgress;
  sentence: string;
}

export interface Book {
  id?: number;
  name: string;
  sourceLanguage: string;
  updateDate: Date;
  lastreadDate: Date;
  bookUrl: string;
  imageUrl?: string | null;
  currentLocation?: string | null;
  progress: number;
}

export interface HistoryEntry {
  id?: number;
  date: Date;
  success: boolean;
  cardId: number;
  exampleHash?: string;
  type: string | null;
}

export const cardHelpers = {
  getAllExamples: (card: Card): Example[] => {
    return card.wordInfo?.translations?.flatMap(t => t.examples || []) || [];
  },
  
  getAllMeanings: (card: Card): string[] => {
    return card.wordInfo?.translations
      ?.map(t => t.meaning)
      .filter((meaning): meaning is string => meaning !== undefined) || [];
  },
  
  getFirstExample: (card: Card): Example | null => {
    const examples = cardHelpers.getAllExamples(card);
    return examples[0] || null;
  },
  
  getFirstMeaning: (card: Card): string => {
    return card.wordInfo?.translations?.[0]?.meaning || '';
  },
  
  getAlternateMeanings: (card: Card): string[] => {
    return card.wordInfo?.translations
      ?.slice(1)
      .map(t => t.meaning)
      .filter((meaning): meaning is string => meaning !== undefined) || [];
  }
};

export class Database {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db != null) {
      return;
    }

    try {
      console.log("Initializing database");
      this.db = await SQLite.openDatabaseAsync('myAppDatabase.db');
      await this.createTables();
      await this.migrateDataToNewFormat();
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        wordInfo TEXT,
        lastRepeat DATETIME NOT NULL,
        level INTEGER NOT NULL,
        userId TEXT NOT NULL,
        source TEXT NOT NULL,
        comment TEXT NOT NULL,
        sourceLanguage TEXT NOT NULL,
        targetLanguage TEXT NOT NULL,
        info TEXT DEFAULT '{}'
      );
    
      CREATE TABLE IF NOT EXISTS contexts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sentence TEXT NOT NULL,
        translation TEXT NOT NULL,
        cardId INTEGER NOT NULL,
        isBad BOOL NOT NULL DEFAULT 0,
        FOREIGN KEY (cardId) REFERENCES cards(id)
      );

      CREATE TABLE IF NOT EXISTS histories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        success TEXT NOT NULL,
        cardId INTEGER NOT NULL,
        contextId INTEGER NULL,
        exampleHash TEXT NULL,
        type TEXT NULL,
        FOREIGN KEY (cardId) REFERENCES cards(id),
        FOREIGN KEY (contextId) REFERENCES contexts(id)
      );

      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sourceLanguage TEXT NOT NULL,
        updateDate TEXT NOT NULL,
        lastreadDate TEXT NOT NULL,
        bookUrl TEXT NOT NULL,
        imageUrl TEXT NULL,
        currentLocation TEXT NULL, 
        progress INTEGER DEFAULT 0
      );
    `);

    // Check for new columns and add them if they don't exist
    await this.ensureColumnExists('cards', 'wordInfo', 'TEXT');
    await this.ensureColumnExists('cards', 'info', "TEXT DEFAULT '{}'");
    await this.ensureColumnExists('histories', 'exampleHash', 'TEXT NULL');
  }

  private async ensureColumnExists(table: string, column: string, type: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const tableInfo = await this.db.getAllAsync(`PRAGMA table_info(${table})`);
      const hasColumn = tableInfo.some((col: any) => col.name === column);
      
      if (!hasColumn) {
        await this.db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`Added ${column} column to ${table} table`);
      }
    } catch (error) {
      console.error(`Error checking/adding ${column} column:`, error);
      throw error;
    }
  }

  async createExampleHash(source: string, target: string): Promise<string> {
    // Create a deterministic hash from source and target
    const content = `${source}||${target}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      content,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash.substring(0, 16); // Use first 16 chars for brevity
  }

  async migrateDataToNewFormat(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    console.log("Starting migration to new format...");
    
    // Check if migration is needed
    const needsMigration = await this.checkIfMigrationNeeded();
    if (!needsMigration) {
      console.log("Migration not needed or already completed");
      return;
    }

    // Get all cards that need migration
    const cards = await this.db.getAllAsync<any>(`
      SELECT * FROM cards 
      WHERE wordInfo IS NULL 
      AND translations IS NOT NULL
    `);

    for (const card of cards) {
      try {
        // Parse old data
        const oldTranslations = JSON.parse(card.translations || '[]');
        
        // Get contexts for this card
        const contexts = await this.db.getAllAsync<any>(
          'SELECT * FROM contexts WHERE cardId = ? ORDER BY id',
          [card.id]
        );

        // Create new Word structure
        const word: Word = {
          name: card.word,
          baseForm: '',
          additionalInfo: '',
          translations: []
        };

        // Create translations with examples
        for (let i = 0; i < oldTranslations.length; i++) {
          const translation: Translation = {
            type: '',
            meaning: oldTranslations[i],
            additionalInfo: '',
            examples: []
          };

          // Add corresponding context as example, or distribute remaining contexts
          if (i < contexts.length) {
            translation.examples!.push({
              sentence: contexts[i].sentence,
              translation: contexts[i].translation
            });
          }

          word.translations!.push(translation);
        }

        // Distribute remaining contexts to the last translation
        if (contexts.length > oldTranslations.length && word.translations!.length > 0) {
          const lastTranslation = word.translations![word.translations!.length - 1];
          for (let i = oldTranslations.length; i < contexts.length; i++) {
            if (!contexts[i].isBad) {
              lastTranslation.examples!.push({
                sentence: contexts[i].sentence,
                translation: contexts[i].translation
              });
            }
          }
        }

        // Update card with new structure
        await this.db.runAsync(
          'UPDATE cards SET wordInfo = ? WHERE id = ?',
          [JSON.stringify(word), card.id]
        );

        // Update history entries with example hashes
        await this.migrateHistoryForCard(card.id, contexts);

        console.log(`Migrated card: ${card.word}`);
      } catch (error) {
        console.error(`Error migrating card ${card.id}:`, error);
      }
    }

    console.log("Migration completed successfully");
  }

  private async checkIfMigrationNeeded(): Promise<boolean> {
    if (!this.db) return false;

    // Check if there are cards with old format
    const result = await this.db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM cards 
      WHERE translations IS NOT NULL 
      AND wordInfo IS NULL
    `);

    return result ? result.count > 0 : false;
  }

  private async migrateHistoryForCard(cardId: number, contexts: any[]): Promise<void> {
    if (!this.db) return;

    // Get history entries for this card with contextId
    const historyEntries = await this.db.getAllAsync<any>(
      'SELECT * FROM histories WHERE cardId = ? AND contextId IS NOT NULL',
      [cardId]
    );

    for (const entry of historyEntries) {
      // Find the context referenced by this history entry
      const context = contexts.find(c => c.id === entry.contextId);
      if (context) {
        // Generate hash for this example
        const hash = await this.createExampleHash(context.sentence, context.translation);
        
        // Update history entry with hash
        await this.db.runAsync(
          'UPDATE histories SET exampleHash = ? WHERE id = ?',
          [hash, entry.id]
        );
      }
    }
  }

  async WordDoesNotExist(name: string): Promise<boolean> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    const result = await this.db.getFirstAsync<{ name: string }>(
      'SELECT * FROM cards WHERE word = ?',
      [name]
    );

    return result === null;
  }

  async insertCard(card: Card, sentence: string): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    const defaultInfo: CardInfo = {
      status: 'learning',
      learningProgress: {
        wordToMeaning: 0,
        meaningToWord: 0,
        context: 0,
        contextLetters: 0
      },
      sentence: sentence
    };
    const infoString = JSON.stringify(defaultInfo);
    const wordInfoString = JSON.stringify(card.wordInfo || {});

    const result = await this.db.runAsync(
      `INSERT INTO cards (word, wordInfo, lastRepeat, level, userId, source, sourceLanguage, targetLanguage, comment, info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.word || '',
        wordInfoString,
        card.lastRepeat.toISOString(),
        card.level,
        card.userId,
        card.source,
        card.sourceLanguage,
        card.targetLanguage,
        card.comment,
        infoString
      ]
    );

    console.log("Card added with ID:", result.lastInsertRowId);
    return result.lastInsertRowId;
  }

  async getCardById(id: number): Promise<Card | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    try {
      const result = await this.db.getFirstAsync<any>(
        'SELECT * FROM cards WHERE id = ?',
        [id]
      );
      
      if (!result) return null;

      const card: Card = {
        id: result.id,
        word: result.word,
        wordInfo: result.wordInfo ? JSON.parse(result.wordInfo) : undefined,
        lastRepeat: new Date(result.lastRepeat),
        level: result.level,
        userId: result.userId,
        source: result.source,
        comment: result.comment,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        info: ensureCardInfo(JSON.parse(result.info || '{}'))
      };

      return card;
    } catch (error) {
      console.error('Error getting card by id:', error);
      throw error;
    }
  }

  async getCardByWord(word: string): Promise<Card | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    try {
      const result = await this.db.getFirstAsync<any>(
        'SELECT * FROM cards WHERE word = ?',
        [word]
      );
      
      if (!result) return null;

      const card: Card = {
        id: result.id,
        word: result.word,
        wordInfo: result.wordInfo ? JSON.parse(result.wordInfo) : undefined,
        lastRepeat: new Date(result.lastRepeat),
        level: result.level,
        userId: result.userId,
        source: result.source,
        comment: result.comment,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        info: ensureCardInfo(JSON.parse(result.info || '{}'))
      };

      return card;
    } catch (error) {
      console.error('Error getting card by word:', error);
      throw error;
    }
  }

  async updateCard(card: Card): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    await this.db.runAsync(
      `UPDATE cards SET 
        word = ?, wordInfo = ?, lastRepeat = ?, level = ?, 
        userId = ?, source = ?, sourceLanguage = ?, targetLanguage = ?,
        comment = ?, info = ?
       WHERE id = ?`,
      [
        card.word || '',
        JSON.stringify(card.wordInfo || {}),
        card.lastRepeat.toISOString(),
        card.level,
        card.userId,
        card.source,
        card.sourceLanguage,
        card.targetLanguage,
        card.comment,
        JSON.stringify(card.info || {}),
        card.id ?? 0
      ]
    );
  }

  async updateCardComment(card: Card): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    await this.db.runAsync(
      `UPDATE cards SET comment = ? WHERE id = ?`,
      [card.comment, card.id ?? 0]
    );
  }

  async updateHistory(history: HistoryEntry): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    const result = await this.db.runAsync(
      `INSERT INTO histories (date, success, cardId, exampleHash, type)
       VALUES (?, ?, ?, ?, ?)`,
      [
        history.date.toISOString(),
        history.success,
        history.cardId,
        history.exampleHash || null,
        history.type || null
      ]
    );
    
    console.log("History updated");
  }

  async getCardHistory(cardId: number): Promise<HistoryEntry[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    const history = await this.db.getAllAsync<any>(
      'SELECT * FROM histories WHERE cardId = ? ORDER BY date DESC',
      [cardId]
    );

    return history.map(entry => ({
      ...entry,
      date: new Date(entry.date),
      success: entry.success === "true" || entry.success === true || entry.success === 1 || entry.success === "1",
    }));
  }

  async getNextExampleForCard(cardId: number): Promise<{ translation: Translation, example: Example, hash: string } | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    try {
      const card = await this.getCardById(cardId);
      if (!card || !card.wordInfo || !card.wordInfo.translations) return null;

      // Get all examples with their hashes
      const allExamples: Array<{ translation: Translation, example: Example, hash: string }> = [];
      
      for (const translation of card.wordInfo.translations) {
        if (translation.examples) {
          for (const example of translation.examples) {
            const hash = await this.createExampleHash(example.sentence || '', example.translation || '');
            allExamples.push({ translation, example, hash });
          }
        }
      }

      if (allExamples.length === 0) return null;

      // Get history of example usage for this card
      const historyQuery = `
        SELECT exampleHash, MAX(date) as lastUsed
        FROM histories
        WHERE cardId = ? AND exampleHash IS NOT NULL
        GROUP BY exampleHash
        ORDER BY date ASC
      `;
      const exampleHistory = await this.db.getAllAsync<{ exampleHash: string, lastUsed: string }>(
        historyQuery, 
        [cardId]
      );

      // Find unused examples
      const usedHashes = exampleHistory.map(h => h.exampleHash);
      const unusedExamples = allExamples.filter(e => !usedHashes.includes(e.hash));

      if (unusedExamples.length > 0) {
        // Return a random unused example
        const randomIndex = Math.floor(Math.random() * unusedExamples.length);
        return unusedExamples[randomIndex];
      }

      // If all examples have been used, return the one used longest ago
      if (exampleHistory.length > 0) {
        const oldestHash = exampleHistory[0].exampleHash;
        return allExamples.find(e => e.hash === oldestHash) || allExamples[0];
      }

      // If no history exists, return the first example
      return allExamples[0];

    } catch (error) {
      console.error('Error getting next example:', error);
      return null;
    }
  }

  async deleteCard(id: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    // Delete associated histories first
    await this.db.runAsync('DELETE FROM histories WHERE cardId = ?', [id]);
    
    // Delete the card
    await this.db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
    
    console.log("Card deleted");
  }

  async getCardToLearnBySource(source: string, sourceLanguage: string, targetLanguage: string): Promise<Card[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    if (source === 'All Cards') {
      return this.getAllCards(sourceLanguage, targetLanguage);
    }

    const cardsQuery = `
      SELECT * FROM cards
      WHERE sourceLanguage = ? AND targetLanguage = ? AND source = ?
      ORDER BY lastRepeat DESC
    `;
    
    const cards = await this.db.getAllAsync<any>(cardsQuery, [sourceLanguage, targetLanguage, source]);
    
    // Create the cards with their histories
    const cardPromises = cards.map(async (card: any) => {
      const history = await this.getCardHistory(card.id);
      
      return {
        id: card.id,
        word: card.word,
        wordInfo: card.wordInfo ? JSON.parse(card.wordInfo) : undefined,
        lastRepeat: new Date(card.lastRepeat),
        level: card.level,
        userId: card.userId,
        source: card.source,
        comment: card.comment,
        sourceLanguage: card.sourceLanguage,
        targetLanguage: card.targetLanguage,
        history: history,
        info: ensureCardInfo(JSON.parse(card.info || '{}'))
      };
    });
    
    return Promise.all(cardPromises);
  }

  async getAllCards(sourceLanguage: string, targetLanguage: string): Promise<Card[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    const cardsQuery = `
      SELECT * FROM cards
      WHERE sourceLanguage = ? AND targetLanguage = ?
      ORDER BY lastRepeat DESC
    `;
    
    const cards = await this.db.getAllAsync<any>(cardsQuery, [sourceLanguage, targetLanguage]);
    
    // Create the cards with their histories
    const cardPromises = cards.map(async (card: any) => {
      const history = await this.getCardHistory(card.id);
      
      return {
        id: card.id,
        word: card.word,
        wordInfo: card.wordInfo ? JSON.parse(card.wordInfo) : undefined,
        lastRepeat: new Date(card.lastRepeat),
        level: card.level,
        userId: card.userId,
        source: card.source,
        comment: card.comment,
        sourceLanguage: card.sourceLanguage,
        targetLanguage: card.targetLanguage,
        history: history,
        info: ensureCardInfo(JSON.parse(card.info || '{}'))
      };
    });
    
    return Promise.all(cardPromises);
  }

  // Book-related methods remain the same
  async insertBook(book: Book): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    const bookExist = await this.getBookByName(book.name, book.sourceLanguage);
    if (bookExist !== null) {
      return 0;
    }
    
    try {
      const result = await this.db.runAsync(
        `INSERT INTO books (name, sourceLanguage, updateDate, lastreadDate, bookUrl, imageUrl, currentLocation, progress)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          book.name,
          book.sourceLanguage,
          book.updateDate.toISOString(),
          book.lastreadDate.toISOString(),
          book.bookUrl,
          book.imageUrl || null,
          book.currentLocation || null,
          book.progress || 0
        ]
      );
      
      console.log("Book inserted successfully");
      return result.lastInsertRowId;
    } catch (error) {
      console.error("Error inserting book:", error);
      throw error;
    }
  }

  async getAllBooks(sourceLanguage: string): Promise<Book[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    try {
      const result = await this.db.getAllAsync<any>(
        `SELECT * FROM books WHERE sourceLanguage = ? ORDER BY lastreadDate DESC`,
        [sourceLanguage]
      );

      const books: Book[] = result.map((row: any) => ({
        id: row.id,
        name: row.name,
        sourceLanguage: row.sourceLanguage,
        updateDate: new Date(row.updateDate),
        lastreadDate: new Date(row.lastreadDate),
        bookUrl: row.bookUrl,
        imageUrl: row.imageUrl,
        currentLocation: row.currentLocation,
        progress: row.progress
      }));

      return books;
    } catch (error) {
      console.error(`Error fetching books for language ${sourceLanguage}:`, error);
      throw error;
    }
  }

  async getBookByName(name: string, sourceLanguage: string): Promise<Book | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    try {
      const query = `SELECT * FROM books WHERE name = ? AND sourceLanguage = ?`;
      const result = await this.db.getFirstAsync<any>(query, [name, sourceLanguage.toLowerCase()]);
      
      if (!result) {
        return null;
      }

      return {
        id: result.id,
        name: result.name,
        sourceLanguage: result.sourceLanguage,
        updateDate: new Date(result.updateDate),
        lastreadDate: new Date(result.lastreadDate),
        bookUrl: result.bookUrl,
        imageUrl: result.imageUrl,
        currentLocation: result.currentLocation,
        progress: result.progress
      };
    } catch (error) {
      console.error("Error getting book by name:", error);
      throw error;
    }
  }

  async updateBook(name: string, source: string, currentLocation: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    try {
      await this.db.runAsync(
        `UPDATE books 
         SET currentLocation = ?, lastreadDate = ?
         WHERE name = ? AND sourceLanguage = ?`,
        [
          currentLocation,
          new Date().toISOString(),
          name,
          source.toLowerCase()
        ]
      );
      
      console.log("Book updated successfully");
    } catch (error) {
      console.error("Error updating book:", error);
      throw error;
    }
  }

  async updateBookProgress(name: string, source: string, progress: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `UPDATE books SET progress = ? WHERE name = ? AND sourceLanguage = ?`,
      [progress, name, source.toLowerCase()]
    );
  }

  async deleteBook(name: string, sourceLanguage: string, deleteCards: boolean): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    try {
      const book = await this.getBookByName(name, sourceLanguage);
      if (!book) {
        throw new Error(`Book '${name}' not found.`);
      }

      // Delete book record
      await this.db.runAsync(
        'DELETE FROM books WHERE name = ? AND sourceLanguage = ?',
        [name, sourceLanguage]
      );
      
      if (deleteCards) {
        // Get all cards associated with this book
        const cardIds = await this.db.getAllAsync<{ id: number }>(
          'SELECT id FROM cards WHERE source = ? AND sourceLanguage = ?',
          [name, sourceLanguage]
        );

        // Delete associated histories and cards
        for (const { id } of cardIds) {
          await this.db.runAsync('DELETE FROM histories WHERE cardId = ?', [id]);
        }

        await this.db.runAsync(
          'DELETE FROM cards WHERE source = ? AND sourceLanguage = ?',
          [name, sourceLanguage]
        );
      }
      
      console.log(`Book '${name}' and associated data successfully deleted.`);
    } catch (error) {
      console.error(`Error deleting book '${name}':`, error);
      throw error;
    }
  }
}

// Export a single instance of the Database class
export const database = new Database();

function ensureCardInfo(info: any): CardInfo {
  const DEFAULT_CARD_INFO: CardInfo = {
    status: 'reviewing',
    learningProgress: {
      wordToMeaning: 2,
      meaningToWord: 2,
      context: 2,
      contextLetters: 2
    },
    sentence: ""
  };
  
  if (!info) return DEFAULT_CARD_INFO;
  
  return {
    status: info.status || DEFAULT_CARD_INFO.status,
    learningProgress: {
      wordToMeaning: info.learningProgress?.wordToMeaning ?? DEFAULT_CARD_INFO.learningProgress.wordToMeaning,
      meaningToWord: info.learningProgress?.meaningToWord ?? DEFAULT_CARD_INFO.learningProgress.meaningToWord,
      context: info.learningProgress?.context ?? DEFAULT_CARD_INFO.learningProgress.context,
      contextLetters: info.learningProgress?.contextLetters ?? DEFAULT_CARD_INFO.learningProgress.contextLetters
    },
    sentence: info.sentence || ""
  };
}