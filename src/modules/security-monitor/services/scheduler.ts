import { CronJob } from "cron";
import { getDb } from "@/shared/db";
import { runSecurityTests } from "./test-runner";

interface ScheduledJob {
  id: string;
  job: CronJob;
}

const scheduledJobs: Map<string, ScheduledJob> = new Map();

/**
 * Initialize the security test scheduler
 * Loads all schedules from the database and sets up cron jobs
 */
export async function initializeScheduler() {
  try {
    const db = getDb();
    
    const schedules = await db.securityTestSchedule.findMany({
      where: { enabled: true },
    });

    console.log(`[Security Monitor] Loading ${schedules.length} schedules...`);

    for (const schedule of schedules) {
      await setupScheduleJob(schedule);
    }

    console.log(`[Security Monitor] Scheduler initialized with ${scheduledJobs.size} jobs`);
  } catch (error) {
    console.error("[Security Monitor] Failed to initialize scheduler:", error);
  }
}

/**
 * Setup a cron job for a schedule
 */
async function setupScheduleJob(schedule: any) {
  try {
    // Check if job already exists
    if (scheduledJobs.has(schedule.id)) {
      return;
    }

    const job = new CronJob(
      schedule.cronExpression,
      async () => {
        try {
          console.log(`[Security Monitor] Running scheduled test: ${schedule.name}`);
          
          const result = await runSecurityTests({
            testSuite: schedule.testSuite,
            triggeredBy: "scheduled",
          });

          // Update last run info
          const db = getDb();
          await db.securityTestSchedule.update({
            where: { id: schedule.id },
            data: {
              lastRunAt: new Date(),
              lastRunId: result.success ? "success" : "failed",
            },
          });

          console.log(`[Security Monitor] Scheduled test completed: ${schedule.name} - ${result.status}`);
        } catch (error) {
          console.error(`[Security Monitor] Scheduled test failed: ${schedule.name}:", error);
        }
      },
      null,
      true,
      "UTC"
    );

    scheduledJobs.set(schedule.id, {
      id: schedule.id,
      job,
    });

    console.log(`[Security Monitor] Scheduled job: ${schedule.name} (${schedule.cronExpression})`);
  } catch (error) {
    console.error(`[Security Monitor] Failed to setup schedule: ${schedule.name}:", error);
  }
}

/**
 * Add a new schedule
 */
export async function addSchedule(schedule: any) {
  try {
    const db = getDb();
    
    const newSchedule = await db.securityTestSchedule.create({
      data: schedule,
    });

    if (newSchedule.enabled) {
      await setupScheduleJob(newSchedule);
    }

    return newSchedule;
  } catch (error) {
    console.error("[Security Monitor] Failed to add schedule:", error);
    throw error;
  }
}

/**
 * Update a schedule
 */
export async function updateSchedule(id: string, updates: any) {
  try {
    const db = getDb();
    
    const updatedSchedule = await db.securityTestSchedule.update({
      where: { id },
      data: updates,
    });

    // If enabled state changed, update the job
    const existingJob = scheduledJobs.get(id);
    if (existingJob) {
      existingJob.job.stop();
      scheduledJobs.delete(id);
    }

    if (updatedSchedule.enabled) {
      await setupScheduleJob(updatedSchedule);
    }

    return updatedSchedule;
  } catch (error) {
    console.error("[Security Monitor] Failed to update schedule:", error);
    throw error;
  }
}

/**
 * Remove a schedule
 */
export async function removeSchedule(id: string) {
  try {
    const db = getDb();
    
    // Stop the job
    const existingJob = scheduledJobs.get(id);
    if (existingJob) {
      existingJob.job.stop();
      scheduledJobs.delete(id);
    }

    // Delete from database
    await db.securityTestSchedule.delete({
      where: { id },
    });

    return true;
  } catch (error) {
    console.error("[Security Monitor] Failed to remove schedule:", error);
    throw error;
  }
}

/**
 * Run all scheduled tests now (for testing/debugging)
 */
export async function runAllScheduledTests() {
  try {
    const db = getDb();
    
    const schedules = await db.securityTestSchedule.findMany({
      where: { enabled: true },
    });

    const results = [];
    for (const schedule of schedules) {
      const result = await runSecurityTests({
        testSuite: schedule.testSuite,
        triggeredBy: "manual-scheduled",
      });
      results.push({
        schedule: schedule.name,
        result,
      });
    }

    return results;
  } catch (error) {
    console.error("[Security Monitor] Failed to run all scheduled tests:", error);
    throw error;
  }
}

/**
 * Shutdown the scheduler
 */
export function shutdownScheduler() {
  console.log("[Security Monitor] Shutting down scheduler...");
  
  for (const [id, job] of scheduledJobs) {
    job.job.stop();
    scheduledJobs.delete(id);
  }
  
  console.log("[Security Monitor] Scheduler stopped");
}
