// =============================================================================
// BACKUP SERVICE
// Daily PostgreSQL backup system with compression and rotation
// =============================================================================

import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);
const fsPromises = fs.promises;

// =============================================================================
// CONFIGURATION
// =============================================================================

const BACKUP_DIR = "/home/administrator/nexus-command-center/backups";
const BACKUP_PREFIX = "nexus-backup";
const BACKUP_EXTENSION = ".sql.gz";

// Default database configuration (can be overridden via environment variables)
const DB_CONFIG = {
  host: process.env.PGHOST || process.env.DATABASE_HOST || "localhost",
  port: process.env.PGPORT || process.env.DATABASE_PORT || "5432",
  user: process.env.PGUSER || process.env.DATABASE_USER || "postgres",
  password: process.env.PGPASSWORD || process.env.DATABASE_PASSWORD || "",
  database: process.env.PGDATABASE || process.env.DATABASE_NAME || "nexus",
};

// =============================================================================
// TYPES
// =============================================================================

export interface BackupResult {
  success: boolean;
  filename?: string;
  filepath?: string;
  size?: number;
  sizeFormatted?: string;
  duration?: number;
  error?: string;
  timestamp: Date;
}

export interface BackupStatus {
  lastBackup: {
    filename: string | null;
    filepath: string | null;
    timestamp: Date | null;
    size: number | null;
    sizeFormatted: string | null;
  };
  nextScheduledBackup: Date | null;
  backupDirectory: string;
  isSchedulerRunning: boolean;
  backupCount: number;
}

export interface BackupFile {
  filename: string;
  filepath: string;
  size: number;
  sizeFormatted: string;
  createdAt: Date;
}

// =============================================================================
// BACKUP SERVICE CLASS
// =============================================================================

class BackupService {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private lastBackupResult: BackupResult | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.ensureBackupDirectory();
  }

  // ---------------------------------------------------------------------------
  // UTILITY FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Ensures the backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fsPromises.mkdir(BACKUP_DIR, { recursive: true });
      this.log("Backup directory ensured:", BACKUP_DIR);
    } catch (error) {
      this.logError("Failed to create backup directory:", error);
    }
  }

  /**
   * Formats file size to human-readable string
   */
  private formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Generates backup filename with current date
   */
  private generateBackupFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${BACKUP_PREFIX}-${year}-${month}-${day}${BACKUP_EXTENSION}`;
  }

  /**
   * Logs backup operation messages
   */
  private log(...args: unknown[]): void {
    console.log(`[Backup Service] ${new Date().toISOString()}`, ...args);
  }

  /**
   * Logs backup operation errors
   */
  private logError(...args: unknown[]): void {
    console.error(`[Backup Service] ${new Date().toISOString()} ERROR:`, ...args);
  }

  // ---------------------------------------------------------------------------
  // BACKUP OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Creates a PostgreSQL database backup
   * Uses pg_dump and gzip for compression
   */
  async createBackup(): Promise<BackupResult> {
    if (this.isRunning) {
      return {
        success: false,
        error: "A backup is already in progress",
        timestamp: new Date(),
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const filename = this.generateBackupFilename();
    const filepath = path.join(BACKUP_DIR, filename);

    this.log("Starting backup:", filename);

    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      // Build pg_dump command arguments
      const pgDumpArgs = [
        "-h", DB_CONFIG.host,
        "-p", DB_CONFIG.port,
        "-U", DB_CONFIG.user,
        "-d", DB_CONFIG.database,
        "--no-password",
        "-Fc", // Custom format for better compression and flexibility
      ];

      // Create the backup using pg_dump piped to gzip
      await new Promise<void>((resolve, reject) => {
        // Set PGPASSWORD environment variable for authentication
        const env = { ...process.env, PGPASSWORD: DB_CONFIG.password };

        // Use pg_dump with custom format, then pipe output through gzip
        const pgDump = spawn("pg_dump", pgDumpArgs, { env });
        const gzip = spawn("gzip", ["-9"]); // Maximum compression
        const output = fs.createWriteStream(filepath);

        // Pipe pg_dump output to gzip, then to file
        pgDump.stdout.pipe(gzip.stdin);
        gzip.stdout.pipe(output);

        let pgDumpError = "";
        let gzipError = "";

        pgDump.stderr.on("data", (data) => {
          pgDumpError += data.toString();
        });

        gzip.stderr.on("data", (data) => {
          gzipError += data.toString();
        });

        pgDump.on("error", (error) => {
          reject(new Error(`pg_dump process error: ${error.message}`));
        });

        gzip.on("error", (error) => {
          reject(new Error(`gzip process error: ${error.message}`));
        });

        output.on("error", (error) => {
          reject(new Error(`File write error: ${error.message}`));
        });

        pgDump.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`pg_dump exited with code ${code}: ${pgDumpError}`));
          }
        });

        gzip.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`gzip exited with code ${code}: ${gzipError}`));
          }
        });

        output.on("finish", () => {
          resolve();
        });
      });

      // Get file stats
      const stats = await fsPromises.stat(filepath);
      const duration = Date.now() - startTime;

      this.log(`Backup completed: ${filename} (${this.formatFileSize(stats.size)}) in ${duration}ms`);

      // Delete old backups after successful backup
      await this.deleteOldBackups(filename);

      const result: BackupResult = {
        success: true,
        filename,
        filepath,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        duration,
        timestamp: new Date(),
      };

      this.lastBackupResult = result;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError("Backup failed:", errorMessage);

      // Clean up partial backup file if it exists
      try {
        await fsPromises.unlink(filepath);
      } catch {
        // Ignore cleanup errors
      }

      const result: BackupResult = {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };

      this.lastBackupResult = result;
      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Deletes old backups, keeping only the most recent one
   * Called automatically after a successful backup
   */
  async deleteOldBackups(currentBackupFilename?: string): Promise<{ deleted: string[]; errors: string[] }> {
    const deleted: string[] = [];
    const errors: string[] = [];

    this.log("Cleaning up old backups...");

    try {
      // Check if backup directory exists
      try {
        await fsPromises.access(BACKUP_DIR);
      } catch {
        this.log("Backup directory does not exist, nothing to clean");
        return { deleted, errors };
      }

      // List all backup files
      const files = await fsPromises.readdir(BACKUP_DIR);
      const backupFiles = files.filter(
        (f) => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_EXTENSION)
      );

      // Sort by name (date) descending to keep newest
      backupFiles.sort().reverse();

      // Delete all except the current/newest backup
      for (let i = 0; i < backupFiles.length; i++) {
        const file = backupFiles[i];

        // Keep the current backup (either by name or the first/newest one)
        if (file === currentBackupFilename || (i === 0 && !currentBackupFilename)) {
          this.log(`Keeping backup: ${file}`);
          continue;
        }

        try {
          const filepath = path.join(BACKUP_DIR, file);
          await fsPromises.unlink(filepath);
          deleted.push(file);
          this.log(`Deleted old backup: ${file}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to delete ${file}: ${errorMessage}`);
          this.logError(`Failed to delete ${file}:`, errorMessage);
        }
      }

      this.log(`Cleanup complete. Deleted ${deleted.length} old backup(s)`);
      return { deleted, errors };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Cleanup failed: ${errorMessage}`);
      this.logError("Cleanup failed:", errorMessage);
      return { deleted, errors };
    }
  }

  // ---------------------------------------------------------------------------
  // STATUS & INFO
  // ---------------------------------------------------------------------------

  /**
   * Gets the current backup status including last backup info
   */
  async getBackupStatus(): Promise<BackupStatus> {
    let lastBackupFile: BackupFile | null = null;
    let backupCount = 0;

    try {
      // Check if backup directory exists
      try {
        await fsPromises.access(BACKUP_DIR);
      } catch {
        // Directory doesn't exist yet
        return {
          lastBackup: {
            filename: null,
            filepath: null,
            timestamp: null,
            size: null,
            sizeFormatted: null,
          },
          nextScheduledBackup: this.getNextScheduledTime(),
          backupDirectory: BACKUP_DIR,
          isSchedulerRunning: this.schedulerInterval !== null,
          backupCount: 0,
        };
      }

      // List all backup files
      const files = await fsPromises.readdir(BACKUP_DIR);
      const backupFiles = files.filter(
        (f) => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_EXTENSION)
      );

      backupCount = backupFiles.length;

      // Get the most recent backup
      if (backupFiles.length > 0) {
        // Sort by name (date) descending
        backupFiles.sort().reverse();
        const mostRecentFile = backupFiles[0];
        const filepath = path.join(BACKUP_DIR, mostRecentFile);

        try {
          const stats = await fsPromises.stat(filepath);
          lastBackupFile = {
            filename: mostRecentFile,
            filepath,
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            createdAt: stats.mtime,
          };
        } catch {
          // File might have been deleted
        }
      }
    } catch (error) {
      this.logError("Error getting backup status:", error);
    }

    return {
      lastBackup: {
        filename: lastBackupFile?.filename || null,
        filepath: lastBackupFile?.filepath || null,
        timestamp: lastBackupFile?.createdAt || null,
        size: lastBackupFile?.size || null,
        sizeFormatted: lastBackupFile?.sizeFormatted || null,
      },
      nextScheduledBackup: this.getNextScheduledTime(),
      backupDirectory: BACKUP_DIR,
      isSchedulerRunning: this.schedulerInterval !== null,
      backupCount,
    };
  }

  /**
   * Lists all existing backup files
   */
  async listBackups(): Promise<BackupFile[]> {
    const backups: BackupFile[] = [];

    try {
      // Check if backup directory exists
      try {
        await fsPromises.access(BACKUP_DIR);
      } catch {
        return backups;
      }

      const files = await fsPromises.readdir(BACKUP_DIR);
      const backupFiles = files.filter(
        (f) => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_EXTENSION)
      );

      for (const filename of backupFiles) {
        const filepath = path.join(BACKUP_DIR, filename);
        try {
          const stats = await fsPromises.stat(filepath);
          backups.push({
            filename,
            filepath,
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            createdAt: stats.mtime,
          });
        } catch {
          // Skip files that can't be accessed
        }
      }

      // Sort by date descending
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
      this.logError("Error listing backups:", error);
    }

    return backups;
  }

  // ---------------------------------------------------------------------------
  // SCHEDULER
  // ---------------------------------------------------------------------------

  /**
   * Gets the next scheduled backup time (daily at 2:00 AM)
   */
  private getNextScheduledTime(): Date | null {
    if (!this.schedulerInterval) {
      return null;
    }

    const now = new Date();
    const next = new Date(now);

    // Set to 2:00 AM
    next.setHours(2, 0, 0, 0);

    // If it's already past 2 AM today, schedule for tomorrow
    if (now >= next) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Calculates milliseconds until next 2:00 AM
   */
  private getMillisecondsUntilNextBackup(): number {
    const now = new Date();
    const next = new Date(now);

    // Set to 2:00 AM
    next.setHours(2, 0, 0, 0);

    // If it's already past 2 AM today, schedule for tomorrow
    if (now >= next) {
      next.setDate(next.getDate() + 1);
    }

    return next.getTime() - now.getTime();
  }

  /**
   * Starts the daily backup scheduler
   * Runs backups at 2:00 AM every day
   */
  scheduleBackup(): { success: boolean; message: string; nextBackup: Date | null } {
    if (this.schedulerInterval) {
      return {
        success: false,
        message: "Backup scheduler is already running",
        nextBackup: this.getNextScheduledTime(),
      };
    }

    this.log("Starting daily backup scheduler...");

    // Function to schedule next backup
    const scheduleNextBackup = () => {
      const msUntilBackup = this.getMillisecondsUntilNextBackup();

      this.log(`Next backup scheduled in ${Math.round(msUntilBackup / 1000 / 60)} minutes`);

      // Clear any existing timeout
      if (this.schedulerInterval) {
        clearTimeout(this.schedulerInterval);
      }

      // Schedule the backup
      this.schedulerInterval = setTimeout(async () => {
        this.log("Executing scheduled backup...");
        await this.createBackup();

        // Schedule the next day's backup
        scheduleNextBackup();
      }, msUntilBackup);
    };

    // Start the scheduler
    scheduleNextBackup();

    const nextBackup = this.getNextScheduledTime();
    this.log("Scheduler started. Next backup at:", nextBackup?.toISOString());

    return {
      success: true,
      message: "Daily backup scheduler started",
      nextBackup,
    };
  }

  /**
   * Stops the daily backup scheduler
   */
  stopScheduler(): { success: boolean; message: string } {
    if (!this.schedulerInterval) {
      return {
        success: false,
        message: "Backup scheduler is not running",
      };
    }

    clearTimeout(this.schedulerInterval);
    this.schedulerInterval = null;

    this.log("Scheduler stopped");

    return {
      success: true,
      message: "Daily backup scheduler stopped",
    };
  }

  /**
   * Checks if the scheduler is currently running
   */
  isSchedulerRunning(): boolean {
    return this.schedulerInterval !== null;
  }

  /**
   * Gets the last backup result
   */
  getLastBackupResult(): BackupResult | null {
    return this.lastBackupResult;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const backupService = new BackupService();

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const createBackup = () => backupService.createBackup();
export const deleteOldBackups = (currentFilename?: string) =>
  backupService.deleteOldBackups(currentFilename);
export const getBackupStatus = () => backupService.getBackupStatus();
export const listBackups = () => backupService.listBackups();
export const scheduleBackup = () => backupService.scheduleBackup();
export const stopScheduler = () => backupService.stopScheduler();
export const isSchedulerRunning = () => backupService.isSchedulerRunning();
export const getLastBackupResult = () => backupService.getLastBackupResult();
