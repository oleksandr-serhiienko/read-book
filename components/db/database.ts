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
  context?: Array<{ sentence: string; translation: string, isBad: boolean }>;
  history?: Array<{ date: Date; contextId?: number; success: boolean, cardId: number, number: string }>;
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
        sourceLanguage TEXT NOT NULL,
        targetLanguage TEXT NOT NULL
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
          currentLocation TEXT NULL
        );
    `);   
  }

  async insertCard(card: Card): Promise<number> {
    
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    
    const result = await this.db.runAsync(
      `INSERT INTO cards (word, translations, lastRepeat, level, userId, source, sourceLanguage, targetLanguage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.word,
        JSON.stringify(card.translations),
        card.lastRepeat.toISOString(),
        card.level,
        card.userId,
        card.source,
        card.sourceLanguage,
        card.targetLanguage
      ]
    );
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
        c.source, c.sourceLanguage, c.targetLanguage,
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
        sourceLanguage: results[0].sourceLanguage,
        targetLanguage: results[0].targetLanguage,
        context: []
      };

      // Add all contexts
      results.forEach(row => {
        if (row.contextId) {
          card.context!.push({
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

  async getCardToLearnBySource(source: string, sourceLanguage: string, targetLanguage: string): Promise<Card[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');

    if (source === 'All Cards'){
      return this.getAllCards(sourceLanguage, targetLanguage);
    }
  
    const query = `
      SELECT 
        c.id, c.word, c.translations, c.lastRepeat, c.level, c.userId, 
        c.source, c.sourceLanguage, c.targetLanguage,
        ctx.id as contextId, ctx.sentence, ctx.translation
      FROM cards c
      LEFT JOIN contexts ctx ON c.id = ctx.cardId
      WHERE c.source = ? AND c.sourceLanguage = ? AND c.targetLanguage = ?
      ORDER BY c.lastRepeat DESC
    `;
  
    try {
      const results = await this.db.getAllAsync<any>(query, [source, sourceLanguage, targetLanguage]);
      const cardMap = new Map<number, Card>();

      for (const row of results) {
        if (!cardMap.has(row.id)) {
          cardMap.set(row.id, {
            id: row.id,
            word: row.word,
            translations: JSON.parse(row.translations),
            lastRepeat: new Date(row.lastRepeat),
            level: row.level,
            userId: row.userId,
            source: row.source,
            sourceLanguage: row.sourceLanguage,
            targetLanguage: row.targetLanguage,
            context: []
          });
        }
  
        const card = cardMap.get(row.id)!;
  
        if (row.contextId) {
          card.context!.push({
            sentence: row.sentence,
            translation: row.translation,
            isBad: false  // Default value since it's not in the database
          });
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
    const query = `
      SELECT 
        c.id, c.word, c.translations, c.lastRepeat, c.level, c.userId, 
        c.source, c.sourceLanguage, c.targetLanguage,
        ctx.id as contextId, ctx.sentence, ctx.translation
      FROM cards c
      LEFT JOIN contexts ctx ON c.id = ctx.cardId
      WHERE c.sourceLanguage = ? AND c.targetLanguage = ?
      ORDER BY c.lastRepeat DESC
    `;
  
    const results = await this.db.getAllAsync<any>(query, [sourceLanguage, targetLanguage]);
    const cardMap = new Map<number, Card>();
  
    for (const row of results) {
      if (!cardMap.has(row.id)) {
        cardMap.set(row.id, {
          id: row.id,
          word: row.word,
          translations: JSON.parse(row.translations),
          lastRepeat: new Date(row.lastRepeat),
          level: row.level,
          userId: row.userId,
          source: row.source,
          sourceLanguage: row.sourceLanguage,
          targetLanguage: row.targetLanguage,
          context: []
        });
      }
  
      const card = cardMap.get(row.id)!;
  
      if (row.contextId) {
        card.context!.push({
          sentence: row.sentence,
          translation: row.translation,
          isBad: false
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
        userId = ?, source = ?, sourceLanguage = ?, targetLanguage = ?
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
        card.id ?? 0
      ]
    );
  
    // Update contexts if they exist
    if (card.context && card.context.length > 0) {
      // First delete existing contexts
      await this.db.runAsync('DELETE FROM contexts WHERE cardId = ?', [card.id ?? 1]);
      
      // Then insert new contexts
      for (const context of card.context) {
        await this.db.runAsync(
          `INSERT INTO contexts (sentence, translation, cardId, isBad)
           VALUES (?, ?, ?, ?)`,
          [
            context.sentence,
            context.translation,
            card.id ?? 1,
            context.isBad || false
          ]
        );
      }
    }
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
        currentLocation: result.currentLocation
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