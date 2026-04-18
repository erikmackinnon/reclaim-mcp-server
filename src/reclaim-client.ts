/**
 * Compatibility facade for the legacy task-centric client module.
 *
 * WU-02 extracts transport logic into `client/core/http` and task behavior into
 * `client/domains/tasks`, while preserving this module's public API.
 */

export { reclaim } from "./client/core/http.js";
export {
  addTimeToTask,
  batchArchiveTasks,
  batchCompleteTasks,
  batchDeleteTasks,
  batchUpdateTasks,
  bulkRescheduleTaskEvents,
  clearTaskExceptions,
  createTask,
  createTaskAtTime,
  deleteTask,
  fetchAccountTimeZone,
  fetchTaskDefaults,
  filterActiveTasks,
  getTask,
  getTaskDefaults,
  getRecommendedTasks,
  getTaskMinIndex,
  listTasks,
  logWorkForTask,
  markTaskComplete,
  markTaskIncomplete,
  parseDeadline,
  planWorkTask,
  prioritizeTask,
  reindexTask,
  reindexTasksByDue,
  rescheduleTaskEvent,
  restartTask,
  startTaskTimer,
  stopTaskTimer,
  updateTask,
} from "./client/domains/tasks/index.js";
