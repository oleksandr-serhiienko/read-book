import * as SQLite from 'expo-sqlite';

export interface Card {
  id?: number;
  word: string;
  translations: string[];
  lastRepeat: Date;
  level: number;
  userId: string;
  source: string;
  sourceLanguage: string;
  targetLanguage: string;
  comment: string;
  context?: Array<{ id?: number; sentence: string; translation: string; isBad: boolean }>;
  history?: Array<HistoryEntry>;
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
  contextId: number | null;
  type: string | null;
}

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
        translations TEXT NOT NULL,
        lastRepeat DATETIME NOT NULL,
        level INTEGER NOT NULL,
        userId TEXT NOT NULL,
        source TEXT NOT NULL,
        comment TEXT NUT NULL,
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
        type TEXT NULL,
        FOREIGN KEY (cardId) REFERENCES cards(id)
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
    try {
      const tableInfo = await this.db.getAllAsync(
        "PRAGMA table_info(cards)"
      );
      
      const hasInfoColumn = tableInfo.some(
        (column: any) => column.name === 'info'
      );
  
      if (!hasInfoColumn) {
        await this.db.execAsync(
          "ALTER TABLE cards ADD COLUMN info TEXT DEFAULT '{}'"
        );
        console.log("Added info column to cards table");
      }
    } catch (error) {
      console.error("Error checking/adding info column:", error);
      throw error;
    }
  }

  async WordDoesNotExist(name: string): Promise<boolean>{
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
     console.log("Info being inserted:", infoString); // Debug log

    const result = await this.db.runAsync(
      `INSERT INTO cards (word, translations, lastRepeat, level, userId, source, sourceLanguage, targetLanguage, info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.word,
        JSON.stringify(card.translations),
        card.lastRepeat.toISOString(),
        card.level,
        card.userId,
        card.source,
        card.sourceLanguage,
        card.targetLanguage,
        infoString
      ]
    );
    console.log("Result:");
    console.log(await this.getCardById(result.lastInsertRowId));
    console.log("First part success")
    if (card.context == null){
      return result.lastInsertRowId;
    }
    for (let context of card.context) {
      console.log("Inserting context:", context);
      try {
        await this.db.runAsync(
          `INSERT INTO contexts (sentence, translation, cardId, isBad)
           VALUES (?, ?, ?, ?)`,
          [
            context.sentence,
            context.translation,
            result.lastInsertRowId,
            context.isBad || false
          ]
        );
        console.log("Context inserted successfully");
      } catch (error) {
        console.error("Error inserting context:", error);
        throw error; 
      }
    }
    console.log("card added");
    return result.lastInsertRowId;
  }

  async getNextContextForCard(cardId: number): Promise<number | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    try {
      // First get all non-bad contexts for the card
      const goodContextsQuery = `
        SELECT id, cardId
        FROM contexts 
        WHERE cardId = ? AND isBad = 0
        ORDER BY id
      `;
      const goodContexts = await this.db.getAllAsync<{ id: number, cardId: number }>(goodContextsQuery, [cardId]);

      if (goodContexts.length === 0) {
        return null;
      }

      // Get history of context usage for this card
      const historyQuery = `
        SELECT contextId, MAX(date) as lastUsed
        FROM histories
        WHERE cardId = ? AND contextId IS NOT NULL
        GROUP BY contextId
        ORDER BY date ASC
      `;
      const contextHistory = await this.db.getAllAsync<{ contextId: number, lastUsed: string }>(historyQuery, [cardId]);

      // If there are good contexts that haven't been used yet
      const usedContextIds = contextHistory.map(h => h.contextId);
      const unusedContexts = goodContexts.filter(ctx => !usedContextIds.includes(ctx.id));

      if (unusedContexts.length > 0) {
        // Return a random unused context
        const randomIndex = Math.floor(Math.random() * unusedContexts.length);
        return unusedContexts[randomIndex].id;
      }

      // If all contexts have been used, return the one used longest ago
      if (contextHistory.length > 0) {
        // Find the oldest used context that's still in the good contexts list
        for (const history of contextHistory) {
          if (goodContexts.some(ctx => ctx.id === history.contextId)) {
            return history.contextId;
          }
        }
      }

      // If no history exists, return the first good context
      return goodContexts[0].id;

    } catch (error) {
      console.error('Error getting next context:', error);
      return null;
    }
  }

  async getCardById(id: number): Promise<Card | null> {
    await this.initialize();    
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    const query = `
      SELECT 
        c.id, c.word, c.translations, c.lastRepeat, c.level, c.userId, 
        c.source, c.sourceLanguage, c.targetLanguage, c.info, c.comment,
        ctx.id as contextId, ctx.sentence, ctx.translation, ctx.isBad
      FROM cards c
      LEFT JOIN contexts ctx ON c.id = ctx.cardId
      WHERE c.id = ?
    `;

    try {
      const results = await this.db.getAllAsync<any>(query, [id]);
      
      if (results.length === 0) return null;

      // Create the base card from the first result
      const card: Card = {
        id: results[0].id,
        word: results[0].word,
        translations: JSON.parse(results[0].translations),
        lastRepeat: new Date(results[0].lastRepeat),
        level: results[0].level,
        userId: results[0].userId,
        source: results[0].source,
        comment: results[0].comment,
        sourceLanguage: results[0].sourceLanguage,
        targetLanguage: results[0].targetLanguage,
        context: [],
        info: ensureCardInfo(JSON.parse(results[0].info || '{}'))
      };

      // Add all contexts
      results.forEach(row => {
        if (row.contextId) {
          card.context!.push({
            id: row.contextId,
            sentence: row.sentence,
            translation: row.translation,
            isBad: Boolean(row.isBad)
          });
        }
      });

      return card;
    } catch (error) {
      console.error('Error getting card by id:', error);
      throw error;
    }
  }

  async getCardByWord(word: string): Promise<Card | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
  
    const query = `
      SELECT 
        c.id, c.word, c.translations, c.lastRepeat, c.level, c.userId, 
        c.source, c.sourceLanguage, c.targetLanguage, c.comment, c.info,
        ctx.id as contextId, ctx.sentence, ctx.translation, ctx.isBad
      FROM cards c
      LEFT JOIN contexts ctx ON c.id = ctx.cardId
      WHERE c.word = ?
    `;
  
    try {
      const results = await this.db.getAllAsync<any>(query, [word]);
      
      if (results.length === 0) return null;
  
      const card: Card = {
        id: results[0].id,
        word: results[0].word,
        translations: JSON.parse(results[0].translations),
        lastRepeat: new Date(results[0].lastRepeat),
        level: results[0].level,
        userId: results[0].userId,
        source: results[0].source,
        comment: results[0].comment,
        sourceLanguage: results[0].sourceLanguage,
        targetLanguage: results[0].targetLanguage,
        context: [],
        info: ensureCardInfo(JSON.parse(results[0].info || '{}'))
      };
  
      results.forEach(row => {
        if (row.contextId) {
          card.context!.push({
            id: row.contextId,
            sentence: row.sentence,
            translation: row.translation,
            isBad: Boolean(row.isBad)
          });
        }
      });
  
      return card;
    } catch (error) {
      console.error('Error getting card by word:', error);
      throw error;
    }
  }

  async deleteBook(name: string, sourceLanguage: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
  
    try {
      // First get the book to ensure it exists
      const book = await this.getBookByName(name, sourceLanguage);
      if (!book) {
        throw new Error(`Book '${name}' not found.`);
      }
  
      // Delete book record
      await this.db.runAsync(
        'DELETE FROM books WHERE name = ? AND sourceLanguage = ?',
        [name, sourceLanguage]
      );
  
      // Get all cards associated with this book as a source
      const cardsQuery = `
        SELECT id FROM cards
        WHERE source = ? AND sourceLanguage = ?
      `;
      
      const cardIds = await this.db.getAllAsync<{ id: number }>(
        cardsQuery, 
        [name, sourceLanguage]
      );
  
      // Delete associated contexts and histories for each card
      for (const { id } of cardIds) {
        await this.db.runAsync('DELETE FROM contexts WHERE cardId = ?', [id]);
        await this.db.runAsync('DELETE FROM histories WHERE cardId = ?', [id]);
      }
  
      // Delete the cards themselves
      await this.db.runAsync(
        'DELETE FROM cards WHERE source = ? AND sourceLanguage = ?',
        [name, sourceLanguage]
      );
  
      console.log(`Book '${name}' and all associated data successfully deleted.`);
    } catch (error) {
      console.error(`Error deleting book '${name}':`, error);
      throw error;
    }
  }

  async getCardToLearnBySource(source: string, sourceLanguage: string, targetLanguage: string): Promise<Card[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    if (source === 'All Cards') {
      return this.getAllCards(sourceLanguage, targetLanguage);
    }
    const query = `
      SELECT 
        c.id,
        c.word,
        c.translations,
        c.lastRepeat,
        c.level,
        c.userId,
        c.source,
        c.sourceLanguage,
        c.targetLanguage,
        c.comment,
        c.info,
        ctx.id as contextId,
        ctx.sentence,
        ctx.translation,
        ctx.isBad,
        h.id as historyId,
        h.date as historyDate,
        h.success as historySuccess,
        h.contextId as historyContextId,
        h.type as historyType
      FROM cards c
      LEFT JOIN contexts ctx ON c.id = ctx.cardId
      LEFT JOIN histories h ON c.id = h.cardId
      WHERE c.source = ?
        AND c.sourceLanguage = ?
        AND c.targetLanguage = ?
      ORDER BY c.lastRepeat DESC, h.date DESC
    `;
    
    try {
      const results = await this.db.getAllAsync<any>(query, [source, sourceLanguage, targetLanguage]);
      const cardMap = new Map<number, Card>();
      
      for (const row of results) {
        // Create card if it doesn't exist in the map
        if (!cardMap.has(row.id)) {
          cardMap.set(row.id, {
            id: row.id,
            word: row.word,
            translations: JSON.parse(row.translations),
            lastRepeat: new Date(row.lastRepeat),
            level: row.level,
            userId: row.userId,
            source: row.source,
            comment: row.comment,
            sourceLanguage: row.sourceLanguage,
            targetLanguage: row.targetLanguage,
            context: [],
            history: [],
            info: ensureCardInfo(JSON.parse(row.info || '{}'))
          });
        }
        
        const card = cardMap.get(row.id)!;
        
        // Add context if it exists and isn't already added
        if (row.contextId) {
          const contextExists = card.context!.some(c => c.sentence === row.sentence);
          if (!contextExists) {
            card.context!.push({
              id : row.contextId,
              sentence: row.sentence,
              translation: row.translation,
              isBad: row.isBad === 1 || row.isBad === true
            });
          }
        }
        
        // Add history entry if it exists and isn't already added
        if (row.historyId && !card.history!.some(h => h.id === row.historyId)) {
          card.history!.push({
            id: row.historyId,
            date: new Date(row.historyDate),
            success: row.historySuccess === 1 || row.historySuccess === true,
            cardId: row.id,
            contextId: row.historyContextId,
            type: row.historyType
          });
        }
      }
      
      // Sort history entries by date (newest first) for each card
      for (const card of cardMap.values()) {
        if (card.history && card.history.length > 0) {
          card.history.sort((a, b) => b.date.getTime() - a.date.getTime());
          console.log("History: " + card.history?.length);
        }
      }
      
      console.log(`Got ${cardMap.size} cards for source: ${source}`);
      return Array.from(cardMap.values());
    } catch (error) {
      console.error(`Error getting cards for source ${source}:`, error);
      throw error;
    }
  }
 
  async getAllCards(sourceLanguage: string, targetLanguage: string): Promise<Card[]> {
    await this.initialize();    
    
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    // Step 1: Get all cards with their basic information
    const cardsQuery = `
      SELECT 
        id, word, translations, lastRepeat, level, userId,
        source, sourceLanguage, targetLanguage, comment, info
      FROM cards
      WHERE sourceLanguage = ? AND targetLanguage = ?
      ORDER BY lastRepeat DESC
    `;
    
    const cards = await this.db.getAllAsync<any>(cardsQuery, [sourceLanguage, targetLanguage]);
    
    // Create the base cards
    const cardMap = new Map<number, Card>();
    const cardIds: number[] = [];
    
    for (const card of cards) {
      cardIds.push(card.id);
      cardMap.set(card.id, {
        id: card.id,
        word: card.word,
        translations: JSON.parse(card.translations),
        lastRepeat: new Date(card.lastRepeat),
        level: card.level,
        userId: card.userId,
        source: card.source,
        comment: card.comment,
        sourceLanguage: card.sourceLanguage,
        targetLanguage: card.targetLanguage,
        context: [],
        history: [],
        info: ensureCardInfo(JSON.parse(card.info || '{}'))
      });
    }
    
    // If we have no cards, return empty array
    if (cardIds.length === 0) {
      return [];
    }
    
    // Step 2: Get contexts for all cards in a single query
    const placeholders = cardIds.map(() => '?').join(',');
    const contextsQuery = `
      SELECT id, cardId, sentence, translation, isBad
      FROM contexts
      WHERE cardId IN (${placeholders})
    `;
    
    const contexts = await this.db.getAllAsync<any>(contextsQuery, cardIds);
    
    // Add contexts to cards
    for (const context of contexts) {
      const card = cardMap.get(context.cardId);
      if (card) {
        card.context!.push({
          id: context.id,
          sentence: context.sentence,
          translation: context.translation,
          isBad: context.isBad === 1 || context.isBad === true
        });
      }
    }
    
    // Step 3: Get histories for all cards in a single query
    const historiesQuery = `
      SELECT id, cardId, date, success, contextId, type
      FROM histories
      WHERE cardId IN (${placeholders})
      ORDER BY date DESC
    `;
    
    const histories = await this.db.getAllAsync<any>(historiesQuery, cardIds);
    
    // Add histories to cards
    for (const history of histories) {
      const card = cardMap.get(history.cardId);
      if (card) {
        card.history!.push({
          id: history.id,
          date: new Date(history.date),
          success: history.success === "true" || history.success === true || history.success === 1|| history.success === "1",
          cardId: history.cardId,
          contextId: history.contextId,
          type: history.type
        });
      }
    }
    
    return Array.from(cardMap.values());
  }
  async updateCard(card: Card): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
     
    // Update the card
    await this.db.runAsync(
      `UPDATE cards SET 
        word = ?, translations = ?, lastRepeat = ?, level = ?, 
        userId = ?, source = ?, sourceLanguage = ?, targetLanguage = ?,
        info = ?
       WHERE id = ?`,
      [
        card.word,
        JSON.stringify(card.translations),
        card.lastRepeat.toISOString(),
        card.level,
        card.userId,
        card.source,
        card.sourceLanguage,
        card.targetLanguage,
        JSON.stringify(card.info || {}),
        card.id ?? 0
      ]
    );
  }

  async updateCardComment(card: Card): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    // Update the card
    await this.db.runAsync(
      `UPDATE cards SET 
       comment = ?
       WHERE id = ?`,
      [
        card.comment, 
        card.id ?? 0     
      ]
    );
  }
  
  async updateHistory(history: HistoryEntry): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    const result = await this.db.runAsync(
      `INSERT INTO histories (date, success, cardId, contextId, type)
       VALUES (?, ?, ?, ?, ?)`,
      [
        history.date.toISOString(),
        history.success,
        history.cardId ,
        history.contextId,
        history.type
      ]
    )
    console.log("history upated");
  }
  
  async getCardHistory(cardId: number): Promise<HistoryEntry[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    const history = await this.db.getAllAsync<any>(
      'SELECT * FROM histories WHERE cardId = ? ORDER BY date DESC',
      [cardId]
    );

    console.log("card history got");
    return history.map(entry => ({
      ...entry,
      date: new Date(entry.date),
      success: entry.success
    }));
  }

  async deleteCard(id: number): Promise<void> {
    await this.initialize();

    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    await this.db.runAsync('DELETE FROM cards WHERE id = ?', id);
    console.log("card deleted");
  }

  async insertBook(book: Book): Promise<number> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    const bookExist = await  this.getBookByName(book.name, book.sourceLanguage);
    if (bookExist !== null){
      return 0;      
    }
    try {
      console.log("try to insert....");
      const result = await this.db.runAsync(
        `INSERT INTO books (name, sourceLanguage, updateDate, lastreadDate, bookUrl, imageUrl, currentLocation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          book.name,
          book.sourceLanguage,
          book.updateDate.toISOString(),
          book.lastreadDate.toISOString(),
          book.bookUrl,
          book.imageUrl || null,
          book.currentLocation || null
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
        console.log(`Fetching all books for language: ${sourceLanguage}`);
        const result = await this.db.getAllAsync<{
            id: number;
            name: string;
            sourceLanguage: string;
            updateDate: string;
            lastreadDate: string;
            bookUrl: string;
            imageUrl: string | null;
            currentLocation: string | null;
            progress: number;
        }>(
            `SELECT * FROM books WHERE sourceLanguage = ? ORDER BY lastreadDate DESC`,
            [sourceLanguage]
        );

        const books: Book[] = result.map(row => ({
            name: row.name,
            sourceLanguage: row.sourceLanguage,
            updateDate: new Date(row.updateDate),
            lastreadDate: new Date(row.lastreadDate),
            bookUrl: row.bookUrl,
            imageUrl: row.imageUrl,
            currentLocation: row.currentLocation,
            progress: row.progress
        }));

        console.log(`Found ${books.length} books for language ${sourceLanguage}`);
        return books;
    } catch (error) {
        console.error(`Error fetching books for language ${sourceLanguage}:`, error);
        throw error;
    }
  }
  
  async getBookLocationById(id: number): Promise<string | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
  
    try {
      const result = await this.db.getFirstAsync<{ currentLocation: string | null }>(
        'SELECT currentLocation FROM books WHERE id = ?',
        [id]
      );
      
      return result ? result.currentLocation : null;
    } catch (error) {
      console.error("Error getting book location:", error);
      throw error;
    }
  }

  // Update getBooksByName to include language filter
  async getBookByName(name: string, sourceLanguage: string): Promise<Book | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
  
    try {
      const query = `SELECT * FROM books WHERE name = ? AND sourceLanguage = ?`;
      const result = await this.db.getFirstAsync<Book>(query, [name, sourceLanguage.toLowerCase()]);
      
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
  async updateBookProgress(name: string, source: string, progress: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
  
    await this.db.runAsync(
      `UPDATE books SET progress = ? WHERE name = ? AND sourceLanguage = ?`,
      [progress, name, source.toLowerCase()]
    );
  }

  async updateBook(name: string, source: string, currentLocation: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    try {
      await this.db.runAsync(
        `UPDATE books 
         SET currentLocation = ?,
             lastreadDate = ?
         WHERE name = ? AND sourceLanguage = ?`,
        [
          currentLocation,
          new Date().toISOString(),  // Update lastreadDate to current time
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
  
}

// Export a single instance of the Database class
export const database = new Database();

function ensureCardInfo(info: any): CardInfo {
  // First, define default values
  const DEFAULT_CARD_INFO: CardInfo = {
    status: 'reviewing', // Existing cards should be in review mode since they're already in the system
    learningProgress: {
      wordToMeaning: 2,  // Consider existing cards as "graduated"
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
    sentence: info.sentence
  };
}
