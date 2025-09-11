#!/usr/bin/env node

/**
 * TodoWrite-SOW Integration Hook
 *
 * This hook is triggered when TodoWrite tasks change status.
 * It automatically updates the corresponding SOW document.
 *
 * Usage: Called automatically by Claude when TodoWrite events occur
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SOW_BASE_PATH = '/Users/thkt/.claude/workspace/sow';
const STATE_FILE = 'sow.state.json';
const SOW_FILE = 'sow.md';

/**
 * Main hook handler
 * @param {Object} event - TodoWrite event object
 */
function handleTodoWriteEvent(event) {
  console.log(`[TodoWrite-SOW Hook] Processing event: ${event.type}`);

  switch (event.type) {
    case 'task_completed':
      handleTaskCompleted(event);
      break;
    case 'task_started':
      handleTaskStarted(event);
      break;
    case 'task_blocked':
      handleTaskBlocked(event);
      break;
    default:
      console.log(`[TodoWrite-SOW Hook] Unknown event type: ${event.type}`);
  }
}

/**
 * Handle task completion event
 */
function handleTaskCompleted(event) {
  const { taskId, taskContent, timestamp } = event;

  // Find SOW containing this task
  const sowPath = findSOWWithTask(taskId);
  if (!sowPath) {
    console.log(`[TodoWrite-SOW Hook] No SOW found for task: ${taskId}`);
    return;
  }

  // Update SOW document
  updateSOWAcceptanceCriteria(sowPath, taskId, true, timestamp);

  // Update state file
  updateSOWState(sowPath, taskId, 'completed', timestamp);

  // Recalculate progress
  updateSOWProgress(sowPath);

  console.log(`[TodoWrite-SOW Hook] Updated SOW for completed task: ${taskId}`);
}

/**
 * Find SOW containing a specific task ID
 */
function findSOWWithTask(taskId) {
  const sowDirs = fs.readdirSync(SOW_BASE_PATH)
    .filter(dir => fs.statSync(path.join(SOW_BASE_PATH, dir)).isDirectory());

  for (const dir of sowDirs) {
    const sowPath = path.join(SOW_BASE_PATH, dir, SOW_FILE);
    if (fs.existsSync(sowPath)) {
      const content = fs.readFileSync(sowPath, 'utf8');
      if (content.includes(`<!--todo-id:${taskId}-->`)) {
        return path.join(SOW_BASE_PATH, dir);
      }
    }
  }

  return null;
}

/**
 * Update Acceptance Criteria in SOW
 */
function updateSOWAcceptanceCriteria(sowDir, taskId, completed, timestamp) {
  const sowPath = path.join(sowDir, SOW_FILE);
  let content = fs.readFileSync(sowPath, 'utf8');

  // Find and update the criteria line
  const regex = new RegExp(
    `^(\\s*-)\\s*\\[([ x])\\]\\s*(.+?)\\s*<!--todo-id:${taskId}-->(.*)$`,
    'gm'
  );

  content = content.replace(regex, (match, prefix, check, text, suffix) => {
    if (completed) {
      const date = new Date(timestamp).toISOString().split('T')[0];
      return `${prefix} [x] ${text} <!--todo-id:${taskId}--> ✅ [${date}]`;
    } else {
      return match; // No change
    }
  });

  fs.writeFileSync(sowPath, content, 'utf8');
}

/**
 * Update SOW state file
 */
function updateSOWState(sowDir, taskId, status, timestamp) {
  const statePath = path.join(sowDir, STATE_FILE);
  let state = {};

  if (fs.existsSync(statePath)) {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  // Initialize structure if needed
  if (!state.todowrite_mapping) {
    state.todowrite_mapping = {};
  }

  // Find AC ID for this task
  const sowContent = fs.readFileSync(path.join(sowDir, SOW_FILE), 'utf8');
  const acMatch = sowContent.match(
    new RegExp(`(AC-\\d+):[^\\n]+<!--todo-id:${taskId}-->`)
  );

  if (acMatch) {
    const acId = acMatch[1];
    state.todowrite_mapping[acId] = {
      task_id: taskId,
      status: status,
      [`${status}_at`]: timestamp,
      updated_by: 'todowrite-hook'
    };
  }

  // Update sync status
  state.sync_status = {
    last_sync: timestamp,
    conflicts: [],
    warnings: []
  };

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Update overall SOW progress
 */
function updateSOWProgress(sowDir) {
  const sowPath = path.join(sowDir, SOW_FILE);
  let content = fs.readFileSync(sowPath, 'utf8');

  // Count completed criteria
  const totalCriteria = (content.match(/<!--todo-id:[\w-]+-->/g) || []).length;
  const completedCriteria = (content.match(/\[x\].*<!--todo-id:[\w-]+-->/g) || []).length;

  const percentage = totalCriteria > 0
    ? Math.round((completedCriteria / totalCriteria) * 100)
    : 0;

  // Update progress section
  const progressRegex = /<!--progress:auto-->[\s\S]*?<!--progress:end-->/;
  const timestamp = new Date().toISOString();

  const newProgress = `<!--progress:auto-->
### Overall Progress
\`\`\`
Planning    ████████░░ 100%
Development ████████░░ ${percentage}%
Testing     ░░░░░░░░░░ 0%
Deployment  ░░░░░░░░░░ 0%

Overall: ${percentage}% Complete
\`\`\`

### Task Completion
- Completed: ${completedCriteria}/${totalCriteria}
- In Progress: 0
- Blocked: 0

### Last Updated
${timestamp}
<!--progress:end-->`;

  if (progressRegex.test(content)) {
    content = content.replace(progressRegex, newProgress);
  } else {
    // Add progress section if it doesn't exist
    content = content.replace(
      /## 📈 Implementation Progress/,
      `## 📈 Implementation Progress\n\n${newProgress}`
    );
  }

  fs.writeFileSync(sowPath, content, 'utf8');
}

/**
 * Handle task started event
 */
function handleTaskStarted(event) {
  const { taskId, timestamp } = event;

  const sowPath = findSOWWithTask(taskId);
  if (!sowPath) return;

  updateSOWState(sowPath, taskId, 'in_progress', timestamp);
  console.log(`[TodoWrite-SOW Hook] Marked task as in progress: ${taskId}`);
}

/**
 * Handle task blocked event
 */
function handleTaskBlocked(event) {
  const { taskId, timestamp, reason } = event;

  const sowPath = findSOWWithTask(taskId);
  if (!sowPath) return;

  // Update state with blocked status
  const statePath = path.join(sowPath, STATE_FILE);
  let state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  if (!state.blocked_tasks) {
    state.blocked_tasks = [];
  }

  state.blocked_tasks.push({
    task_id: taskId,
    blocked_at: timestamp,
    reason: reason
  });

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  console.log(`[TodoWrite-SOW Hook] Marked task as blocked: ${taskId}`);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleTodoWriteEvent,
    findSOWWithTask,
    updateSOWAcceptanceCriteria,
    updateSOWState,
    updateSOWProgress
  };
}

// Handle CLI invocation
if (require.main === module) {
  // Parse event from command line arguments or stdin
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: todowrite-sow-hook.js <event-json>');
    console.log('Example: todowrite-sow-hook.js \'{"type":"task_completed","taskId":"task-001"}\'');
    process.exit(1);
  }

  try {
    const event = JSON.parse(args[0]);
    handleTodoWriteEvent(event);
  } catch (error) {
    console.error(`[TodoWrite-SOW Hook] Error processing event: ${error.message}`);
    process.exit(1);
  }
}
