const LS_WORKOUT_LOGS = "pf_workout_logs_v1";

function loadAllLogs() {
  const raw = localStorage.getItem(LS_WORKOUT_LOGS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAllLogs(allLogs) {
  localStorage.setItem(LS_WORKOUT_LOGS, JSON.stringify(allLogs));
}

export function loadUserWorkoutLogs(userKey) {
  if (!userKey) return {};
  const allLogs = loadAllLogs();
  const userLogs = allLogs[userKey];
  return userLogs && typeof userLogs === "object" ? userLogs : {};
}

export function upsertUserWorkoutLog(userKey, dateKey, text) {
  if (!userKey || !dateKey) return loadUserWorkoutLogs(userKey);
  const allLogs = loadAllLogs();
  const userLogs = allLogs[userKey] && typeof allLogs[userKey] === "object" ? allLogs[userKey] : {};
  allLogs[userKey] = { ...userLogs, [dateKey]: text };
  saveAllLogs(allLogs);
  return allLogs[userKey];
}
