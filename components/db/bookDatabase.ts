import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export interface DBSentence {
  sentence_number: number;
  original_text: string;
  translation: string | null;
}

export interface WordTranslation {
  german_word: string;
  english_translation: string;
}

export class BookDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName: string;
  private bookDirectory: string;

  constructor(bookTitle: string) {
    this.dbName = `${bookTitle}.db`;
    this.bookDirectory = `${FileSystem.documentDirectory}books/`;
  }

  async initialize(): Promise<boolean> {
    if (this.db !== null) {
      return true;
    }

    try {
      // Check if directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.bookDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.bookDirectory, { intermediates: true });
      }

      // Check if database file exists
      const dbPath = this.getLocalPath();
      const dbInfo = await FileSystem.getInfoAsync(dbPath);
      
      if (!dbInfo.exists) {
        console.log("Database file does not exist yet");
        return false;
      }

      // Try to open the database
      try {
        // Instead of using the full file path, use just the filename
        // SQLite.openDatabaseAsync expects a name, not a full path
        const dbName = this.dbName;
        
        // Check if we need to copy the file to the correct location
        const dbDir = `${FileSystem.documentDirectory}SQLite`;
        await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
        
        const finalDbPath = `${dbDir}/${dbName}`;
        const finalDbInfo = await FileSystem.getInfoAsync(finalDbPath);
        
        if (!finalDbInfo.exists) {
          // Copy the downloaded file to SQLite directory
          await FileSystem.copyAsync({
            from: dbPath,
            to: finalDbPath
          });
        }

        // Open the database using just the name
        this.db = await SQLite.openDatabaseAsync(dbName);
        
        // Verify database structure
        const tables = await this.db.getFirstAsync(
          "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('book_sentences', 'word_translations')"
        );
        
        if (!tables) {
          throw new Error('Invalid database structure');
        }

        console.log("Book database initialized successfully");
        return true;
      } catch (dbError) {
        console.error("Error opening database:", dbError);
        // If database is corrupted or invalid, delete both copies
        try {
          await FileSystem.deleteAsync(dbPath);
          const finalDbPath = `${FileSystem.documentDirectory}SQLite/${this.dbName}`;
          const finalDbInfo = await FileSystem.getInfoAsync(finalDbPath);
          if (finalDbInfo.exists) {
            await FileSystem.deleteAsync(finalDbPath);
          }
        } catch (deleteError) {
          console.error("Error cleaning up database files:", deleteError);
        }
        return false;
      }
    } catch (error) {
      console.error("Error initializing book database:", error);
      throw error;
    }
  }

  getLocalPath(): string {
    return `${this.bookDirectory}${this.dbName}`;
  }

  async downloadDatabase(bookUrl: string): Promise<void> {
    try {
      const dbUrl = bookUrl.replace('/books/', '/download-db/');
      const localPath = this.getLocalPath();
      
      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        console.log("Database already exists locally");
        return;
      }

      // Validate URL
      if (!dbUrl.startsWith('http')) {
        throw new Error(`Invalid database URL: ${dbUrl}`);
      }

      console.log(`Starting database download from: ${dbUrl}`);
      console.log(`Saving to: ${localPath}`);

      // Download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        dbUrl,
        localPath,
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

      // Verify the downloaded file exists and has size
      const downloadedFileInfo = await FileSystem.getInfoAsync(localPath);
      if (!downloadedFileInfo.exists || !downloadedFileInfo.size) {
        throw new Error(`Download failed - file ${downloadedFileInfo.exists ? 'is empty' : 'does not exist'}`);
      }

      // Verify file header (SQLite files start with "SQLite format 3\0")
      const header = await FileSystem.readAsStringAsync(localPath, { 
        length: 16,
        position: 0,
        encoding: FileSystem.EncodingType.UTF8 
      });
      
      if (!header.startsWith('SQLite format 3')) {
        throw new Error('Downloaded file is not a valid SQLite database');
      }

      console.log(`Database downloaded successfully. File size: ${downloadedFileInfo.size} bytes`);
    } catch (error) {
      console.error("Download error details:", {
        error
      });
      
      // Clean up failed download
      try {
        const failedFileInfo = await FileSystem.getInfoAsync(this.getLocalPath());
        if (failedFileInfo.exists) {
          await FileSystem.deleteAsync(this.getLocalPath());
          console.log("Cleaned up failed download file");
        }
      } catch (cleanupError) {
        console.error("Error cleaning up failed download:", cleanupError);
      }

      throw new Error(`Failed to download database: ${error}`);
    }
  }

  async getSentences(): Promise<DBSentence[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.getAllAsync<DBSentence>(
        'SELECT sentence_number, original_text, translation FROM book_sentences ORDER BY sentence_number'
      );
      return result;
    } catch (error) {
      console.error('Error fetching sentences:', error);
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