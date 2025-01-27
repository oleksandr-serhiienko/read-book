import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export interface DBSentence {
  sentence_number: number;
  chapter_id: number;
  original_text: string;
  original_parsed_text: string | null;
  translation_parsed_text: string | null;
}

export interface WordTranslation {
  german_word: string;
  english_translation: string;
}


export class BookDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName: string;
  private dbPath: string;

  constructor(bookTitle: string) {
    this.dbName = `${bookTitle}.db`;
    this.dbPath = `${FileSystem.documentDirectory}books/${this.dbName}`;
  }

  async initialize(): Promise<boolean> {
    if (this.db !== null) {
      return true;
    }

    try {
      // Ensure directory exists
      const dirPath = `${FileSystem.documentDirectory}books`;
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      // Check if database exists
      const dbInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (!dbInfo.exists) {
        console.log("Database file does not exist yet");
        return false;
      }

      try {
        // First, copy the database to SQLite directory
        const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
        await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
        
        const sqlitePath = `${sqliteDir}/${this.dbName}`;
        await FileSystem.copyAsync({
          from: this.dbPath,
          to: sqlitePath
        });
        
        console.log("Attempting to open database...");
        this.db = await SQLite.openDatabaseAsync(this.dbName);
        console.log("Database opened successfully");

        // Verify tables exist using a simpler approach
        try {
          // Try to query both tables
          await this.db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM book_sentences'
          );
          await this.db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM word_translations'
          );
          
          // If we got here, both tables exist
          console.log("Database structure verified successfully");
          
          // Get some basic stats
          const sentencesCount = await this.db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM book_sentences'
          );
          console.log(`Total sentences: ${sentencesCount?.count ?? 0}`);
          
          const translationsCount = await this.db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM word_translations'
          );
          console.log(`Total translations: ${translationsCount?.count ?? 0}`);
          
          const chaptersCount = await this.db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(DISTINCT chapter_id) as count FROM book_sentences'
          );
          console.log(`Total chapters: ${chaptersCount?.count ?? 0}`);

          return true;
        } catch (verifyError) {
          console.error("Database verification failed:", verifyError);
          throw new Error('Invalid database structure');
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        //await this.cleanupDatabase();
        return false;
      }
    } catch (error) {
      console.error("Error initializing book database:", error);
      throw error;
    }
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
      console.log(`Saving to: ${this.dbPath}`);

      // Download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        dbUrl,
        this.dbPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${(progress * 100).toFixed(2)}%`);
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      
      if (!downloadResult) {
        throw new Error('Download failed - no result returned');
      }

      // Verify the downloaded file
      const downloadedFileInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (!downloadedFileInfo.exists || !downloadedFileInfo.size) {
        throw new Error(`Download failed - file ${downloadedFileInfo.exists ? 'is empty' : 'does not exist'}`);
      }

      // Verify SQLite header
      const header = await FileSystem.readAsStringAsync(this.dbPath, { 
        length: 16,
        position: 0,
        encoding: FileSystem.EncodingType.UTF8 
      });
      
      if (!header.startsWith('SQLite format 3')) {
        throw new Error('Downloaded file is not a valid SQLite database');
      }

      console.log(`Database downloaded successfully. File size: ${downloadedFileInfo.size} bytes`);
    } catch (error) {
      console.error("Download error:", error);
      //await this.cleanupDatabase();
      throw new Error(`Failed to download database: ${error}`);
    }
  }

  async getSentences(): Promise<DBSentence[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.getAllAsync<DBSentence>(
        `SELECT sentence_number, chapter_id, original_text, original_parsed_text, translation_parsed_text 
         FROM book_sentences 
         ORDER BY sentence_number`
      );
      return result;
    } catch (error) {
      console.error('Error fetching sentences:', error);
      throw error;
    }
  }

  async getChapterSentences(chapterNumber: number): Promise<DBSentence[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      return await this.db.getAllAsync<DBSentence>(
        `SELECT sentence_number, chapter_id, original_text, original_parsed_text, translation_parsed_text 
         FROM book_sentences 
         WHERE chapter_id = ? AND original_text NOT IN ('···', '-')
         ORDER BY sentence_number`,
        [chapterNumber]
      );
    } catch (error) {
      console.error('Error fetching chapter sentences:', error);
      throw error;
    }
  }

  async getTotalChapters(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(DISTINCT chapter_id) as count FROM book_sentences'
      );
      return result?.count ?? 0;
    } catch (error) {
      console.error('Error getting total chapters:', error);
      throw error;
    }
  }

  async getWordTranslation(word: string): Promise<WordTranslation | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.getFirstAsync<WordTranslation>(
        'SELECT german_word, english_translation FROM word_translations WHERE german_word = ? COLLATE NOCASE',
        [word]
      );
      return result;
    } catch (error) {
      console.error('Error fetching word translation:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}