// Enhanced BookDatabase.ts with improved connection handling
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export interface DBSentence {
  id: number;
  sentence_number: number;
  chapter_id: number;
  original_text: string;
  original_parsed_text: string | null;
  translation_parsed_text: string | null;
  created_at: string;
}

export interface WordTranslationWithContext {
  translations: string[];
  contexts: TranslationContext[];
  info?: string;
}

export interface TranslationContext {
  original_text: string;
  translated_text: string;
}

export class BookDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName: string;
  private bookTitle: string;
  private dbPath: string;
  private isConnecting: boolean = false;
  
  constructor(bookTitle: string) {
    this.bookTitle = bookTitle;
    this.dbName = `${bookTitle}.db`;
    // Store directly in the SQLite directory
    this.dbPath = `${FileSystem.documentDirectory}SQLite/${this.dbName}`;
  }

  async initialize(): Promise<boolean> {
    // If we're already connecting, wait for that to finish
    if (this.isConnecting) {
      let attempts = 0;
      while (this.isConnecting && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (this.db !== null) {
        return true;
      }
    }
    
    // If we already have a db instance, verify it's still valid by running a simple query
    if (this.db !== null) {
      try {
        // Test query to verify database is still valid
        await this.db.getFirstAsync('SELECT 1');
        console.log("Verified existing database connection is valid");
        return true;
      } catch (error) {
        console.warn("Database connection test failed, reopening:", error);
        this.db = null; // Clear the invalid connection
      }
    }

    this.isConnecting = true;

    try {
      // Ensure SQLite directory exists
      const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
      const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
      }

      // Check if database exists
      const dbInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (!dbInfo.exists) {
        console.log("Database file does not exist yet");
        this.isConnecting = false;
        return false;
      }

      try {
        console.log("Attempting to open database...");
        
        // Close existing connection explicitly if it exists
        if (this.db) {
          try {
            //await this.db.closeAsync();
            this.db = null;
          } catch (closeError) {
            console.warn("Error closing previous connection:", closeError);
            // Continue with opening a new connection
          }
        }
        
        // Open fresh connection
        this.db = await SQLite.openDatabaseAsync(this.dbName);
        console.log("Database opened successfully");
        
        // Verify database is properly setup by running a simple query
        await this.db.getFirstAsync('SELECT 1');
        
        this.isConnecting = false;
        return true;
      } catch (dbError) {
        console.error("Database open error:", dbError);
        this.isConnecting = false;
        return false;
      }
    } catch (error) {
      console.error("Error initializing book database:", error);
      this.isConnecting = false;
      throw error;
    }
  }

  public getDbName(): string {
    return this.bookTitle;
  }
  
  private async cleanupDatabase(): Promise<void> {
    try {
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
      }

      // Clean up both locations
      const dbInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (dbInfo.exists) {
        await FileSystem.deleteAsync(this.dbPath);
      }

      const sqlitePath = `${FileSystem.documentDirectory}SQLite/${this.dbName}`;
      const sqliteInfo = await FileSystem.getInfoAsync(sqlitePath);
      if (sqliteInfo.exists) {
        await FileSystem.deleteAsync(sqlitePath);
      }

      console.log("Cleaned up database files");
    } catch (error) {
      console.error("Error cleaning up database:", error);
    }
  }

  async downloadDatabase(bookUrl: string): Promise<void> {
    try {
      const dbUrl = bookUrl.replace('/books/', '/download-db/');
      
      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (fileInfo.exists) {
        console.log("Database already exists locally");
        return;
      }

      // Validate URL
      if (!dbUrl.startsWith('http')) {
        throw new Error(`Invalid database URL: ${dbUrl}`);
      }

      console.log(`Starting database download from: ${dbUrl}`);
      console.log(`Saving directly to SQLite directory: ${this.dbPath}`);

      // Download directly to the SQLite directory
      const downloadResumable = FileSystem.createDownloadResumable(
        dbUrl,
        this.dbPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${(progress * 100).toFixed(2)}%`);
        }
      );

      await downloadResumable.downloadAsync();
      console.log(`Database downloaded successfully to SQLite directory.`);
    } catch (error) {
      console.error("Download error:", error);
      throw new Error(`Failed to download database: ${error}`);
    }
  }
  
  // Added retry mechanism for database operations
  private async withRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Database operation failed: ${error}`);
      
      if (retries > 0) {
        // Try to reinitialize the connection
        console.log(`Attempting to reconnect (${retries} retries left)...`);
        await this.initialize();
        
        // Retry the operation
        return this.withRetry(operation, retries - 1);
      }
      
      throw error;
    }
  }

  async rewriteSentence(id: number, originalNew: string, translationNew: string): Promise<boolean> {
    return this.withRetry(async () => {
      if (!this.db) {
        throw new Error('Database is not initialized');
      }
      
      // Find the chapter sentence and update it, including the created_at timestamp
      const chapterQuery = `
        UPDATE book_sentences 
        SET original_parsed_text = ?, 
            translation_parsed_text = ?,
            created_at = CURRENT_TIMESTAMP
        WHERE id = ? 
      `;
      await this.db.runAsync(chapterQuery, [originalNew, translationNew, id]);
      return true;
    });
  }

  async getSentences(): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      console.log("Getting sentences");
      
      return await this.db.getAllAsync<DBSentence>(
        `SELECT id, sentence_number, chapter_id, original_text, original_parsed_text, translation_parsed_text 
         FROM book_sentences 
         ORDER BY sentence_number`
      );
    });
  }

  async getChapterSentences(chapterNumber: number): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      if (!this.db) {
        await this.initialize();
        if (!this.db) {
          throw new Error('Database not initialized');
        }
      }
      
      console.log("Getting chapter sentences for chapter:", chapterNumber);
      console.log("Book:", this.getDbName());
      
      return await this.db.getAllAsync<DBSentence>(
        `SELECT 
          id,
          sentence_number,
          chapter_id,
          original_text,
          original_parsed_text,
          translation_parsed_text,
          created_at
        FROM book_sentences 
        WHERE chapter_id = ? 
        ORDER BY sentence_number`,
        [chapterNumber]
      );
    });
  }

  async getChapterSentencesBySnd(sentenceNumber: number): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      return await this.db.getAllAsync<DBSentence>(
        `SELECT 
          id,
          sentence_number,
          chapter_id,
          original_text,
          original_parsed_text,
          translation_parsed_text,
          created_at
        FROM book_sentences 
        WHERE sentence_number = ? 
        ORDER BY sentence_number`,
        [sentenceNumber]
      );
    });
  }

  async getTotalChapters(): Promise<number> {
    return this.withRetry(async () => {
      if (!this.db) {
        await this.initialize();
        if (!this.db) {
          throw new Error('Database not initialized after retry');
        }
      }
      
      const result = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(DISTINCT chapter_id) as count FROM book_sentences'
      );
      
      return result?.count ?? 0;
    });
  }

  async getChapterSentenceCount(chapterNumber: number): Promise<number> {
    return this.withRetry(async () => {
      if (!this.db) {
        await this.initialize();
        if (!this.db) {
          throw new Error('Database not initialized after retry');
        }
      }
      
      console.log("Getting sentence count for chapter:", chapterNumber);
      
      const result = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM book_sentences WHERE chapter_id = ?',
        [chapterNumber]
      );
      
      return result?.count ?? 0;
    });
  }


  async getWordTranslation(word: string): Promise<WordTranslationWithContext | null> {
    return this.withRetry(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // First get the word ID and translations
      const wordQuery = await this.db.getFirstAsync<{ id: number, translations: string }>(
        'SELECT id, translations FROM word_translations WHERE word = ?',
        [word]
      );

      if (!wordQuery) {
        return null;
      }

      // Split translations string into array
      const translations = wordQuery.translations
        .split(',')
        .map(t => t.trim());

      // Get contexts for the word
      const contexts = await this.db.getAllAsync<TranslationContext>(
        `SELECT original_text, translated_text 
         FROM word_contexts 
         WHERE word_id = ?`,
        [wordQuery.id]
      );

      // Get additional word info if available
      const wordInfo = await this.db.getFirstAsync<{ info: string }>(
        'SELECT info FROM word_info WHERE word_id = ?',
        [wordQuery.id]
      );

      return {
        translations,
        contexts: contexts || [],
        info: wordInfo?.info
      };
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        console.log("Closing database connection");
        await this.db.closeAsync();
      } catch (error) {
        console.error("Error closing database:", error);
      } finally {
        this.db = null;
      }
    }
  }
}