// =============================================================================
// BACKUP ROUTER - Database backup management endpoints
// =============================================================================

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";
import {
  backupService,
  createBackup,
  deleteOldBackups,
  getBackupStatus,
  listBackups,
  scheduleBackup,
  stopScheduler,
  isSchedulerRunning,
  getLastBackupResult,
} from "../services/backup-service";

export const backupRouter = createTRPCRouter({
  // ═══════════════════════════════════════════════════════════════════════════
  // GET BACKUP STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Returns the current backup system status including:
   * - Last backup information (filename, size, timestamp)
   * - Next scheduled backup time
   * - Whether the scheduler is running
   * - Total backup count
   */
  status: protectedProcedure.query(async () => {
    const status = await getBackupStatus();
    const lastResult = getLastBackupResult();

    return {
      ...status,
      lastBackupResult: lastResult
        ? {
            success: lastResult.success,
            timestamp: lastResult.timestamp,
            duration: lastResult.duration,
            error: lastResult.error,
          }
        : null,
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST ALL BACKUPS
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Lists all existing backup files with their details
   */
  list: protectedProcedure.query(async () => {
    const backups = await listBackups();
    return {
      backups,
      totalCount: backups.length,
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGER MANUAL BACKUP
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Manually triggers a database backup
   * Requires admin privileges
   */
  trigger: adminProcedure.mutation(async () => {
    console.log("[Backup Router] Manual backup triggered");

    const result = await createBackup();

    return {
      success: result.success,
      message: result.success
        ? `Backup created successfully: ${result.filename}`
        : `Backup failed: ${result.error}`,
      backup: result.success
        ? {
            filename: result.filename,
            filepath: result.filepath,
            size: result.size,
            sizeFormatted: result.sizeFormatted,
            duration: result.duration,
          }
        : null,
      error: result.error,
      timestamp: result.timestamp,
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // START SCHEDULER
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Starts the daily backup scheduler (runs at 2:00 AM)
   * Requires admin privileges
   */
  startScheduler: adminProcedure.mutation(async () => {
    console.log("[Backup Router] Starting backup scheduler");

    const result = scheduleBackup();

    return {
      success: result.success,
      message: result.message,
      nextBackup: result.nextBackup,
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // STOP SCHEDULER
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Stops the daily backup scheduler
   * Requires admin privileges
   */
  stopScheduler: adminProcedure.mutation(async () => {
    console.log("[Backup Router] Stopping backup scheduler");

    const result = stopScheduler();

    return {
      success: result.success,
      message: result.message,
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP OLD BACKUPS
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Manually triggers cleanup of old backups
   * Keeps only the most recent backup
   * Requires admin privileges
   */
  cleanup: adminProcedure.mutation(async () => {
    console.log("[Backup Router] Manual cleanup triggered");

    const result = await deleteOldBackups();

    return {
      success: result.errors.length === 0,
      deleted: result.deleted,
      deletedCount: result.deleted.length,
      errors: result.errors,
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GET SCHEDULER STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Returns whether the backup scheduler is currently running
   */
  schedulerStatus: protectedProcedure.query(async () => {
    const status = await getBackupStatus();

    return {
      isRunning: isSchedulerRunning(),
      nextBackup: status.nextScheduledBackup,
    };
  }),
});
