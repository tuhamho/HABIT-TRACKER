const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let mainWindow;
let dbPath;
let preloadPath;

const DEFAULT_CATEGORIES = ["Tinh thần", "Sức khỏe", "Trí tuệ", "Tài chính", "Kỷ luật", "Mối quan hệ"];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultDb() {
  const today = localDateKey();

  return {
    schemaVersion: 1,
    habits: [
      {
        id: "gym",
        name: "Tập gym",
        category: "Sức khỏe",
        priority: "high",
        createdAt: today
      },
      {
        id: "code",
        name: "Viết code",
        category: "Trí tuệ",
        priority: "high",
        createdAt: today
      },
      {
        id: "read",
        name: "Đọc sách",
        category: "Trí tuệ",
        priority: "medium",
        createdAt: today
      }
    ],
    completions: {},
    notes: {},
    events: {},
    focus: {},
    settings: {
      xpPerCompletion: 10,
      levelSize: 250,
      milestoneTitle: "Quỹ Porsche 718",
      milestoneTargetXp: 10000,
      categories: DEFAULT_CATEGORIES
    },
    updatedAt: new Date().toISOString()
  };
}

function ensureDatabaseFile() {
  const userDataDir = app.getPath("userData");
  dbPath = path.join(userDataDir, "habit-dashboard-db.json");

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    writeDb(createDefaultDb());
    return;
  }

  const db = readDb();
  const fallback = createDefaultDb();

  const normalized = {
    schemaVersion: Number.isInteger(db.schemaVersion) ? db.schemaVersion : fallback.schemaVersion,
    habits: Array.isArray(db.habits) && db.habits.length > 0 ? db.habits : fallback.habits,
    completions: db.completions && typeof db.completions === "object" ? db.completions : {},
    notes: db.notes && typeof db.notes === "object" ? db.notes : {},
    events: db.events && typeof db.events === "object" ? db.events : {},
    focus: db.focus && typeof db.focus === "object" ? db.focus : {},
    settings: {
      ...fallback.settings,
      ...(db.settings && typeof db.settings === "object" ? db.settings : {})
    },
    updatedAt: typeof db.updatedAt === "string" ? db.updatedAt : new Date().toISOString()
  };

  normalized.habits = normalized.habits.map((habit) => {
    let nextHabit = { ...habit };
    if (nextHabit.id === "gym" && nextHabit.name === "Gym") nextHabit.name = "Tập gym";
    if (nextHabit.id === "code" && nextHabit.name === "Code") nextHabit.name = "Viết code";
    if (nextHabit.id === "read" && nextHabit.name === "Read") nextHabit.name = "Đọc sách";
    if (!nextHabit.category) {
      if (nextHabit.id === "gym") nextHabit.category = "Sức khỏe";
      else if (nextHabit.id === "code" || nextHabit.id === "read") nextHabit.category = "Trí tuệ";
      else nextHabit.category = "Kỷ luật";
    }
    return nextHabit;
  });

  normalized.settings.categories = normalizeCategories(normalized.settings.categories);
  normalized.habits.forEach((habit) => {
    if (habit.category && !normalized.settings.categories.includes(habit.category)) {
      normalized.settings.categories.push(habit.category);
    }
  });

  if (normalized.settings.milestoneTitle === "Porsche 718 Fund") {
    normalized.settings.milestoneTitle = "Quỹ Porsche 718";
  }

  writeDb(normalized);
}

function ensurePreloadFile() {
  preloadPath = path.join(app.getPath("userData"), "habit-dashboard-preload.js");
  const preloadSource = `
const { contextBridge, ipcRenderer } = require("electron");

const allowedChannels = new Set([
  "db:get",
  "completion:toggle",
  "note:save",
  "event:save",
  "focus:save",
  "db:export",
  "db:import",
  "habit:add",
  "habit:delete",
  "habit:update",
  "categories:update",
  "settings:updateGoalTitle"
]);

contextBridge.exposeInMainWorld("habitApi", {
  invoke(channel, payload) {
    if (!allowedChannels.has(channel)) {
      return Promise.reject(new Error("Blocked IPC channel."));
    }

    return ipcRenderer.invoke(channel, payload);
  }
});
`;

  fs.writeFileSync(preloadPath, preloadSource.trimStart(), "utf8");
}

function readDb() {
  try {
    const raw = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    const backupPath = `${dbPath}.corrupt-${Date.now()}`;

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    const fresh = createDefaultDb();
    writeDb(fresh);
    return fresh;
  }
}

function writeDb(db) {
  const nextDb = {
    ...db,
    updatedAt: new Date().toISOString()
  };
  const tempPath = `${dbPath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(nextDb, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, dbPath);
}

function isValidDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidHabitId(db, habitId) {
  return typeof habitId === "string" && db.habits.some((habit) => habit.id === habitId);
}

function normalizePriority(priority) {
  const value = String(priority || "").trim().toLowerCase();
  if (["high", "medium", "low"].includes(value)) {
    return value;
  }

  return "medium";
}

function normalizeCategories(value) {
  const source = Array.isArray(value) ? value : DEFAULT_CATEGORIES;
  const clean = [];

  source.forEach((item) => {
    const category = String(item || "").trim().slice(0, 40);
    if (category && !clean.includes(category)) {
      clean.push(category);
    }
  });

  return clean.length > 0 ? clean : [...DEFAULT_CATEGORIES];
}

function getDbCategories(db) {
  const settingsCategories = db && db.settings ? db.settings.categories : null;
  return normalizeCategories(settingsCategories);
}

function normalizeCategory(category, db) {
  const value = String(category || "").trim();
  const allowed = getDbCategories(db);

  if (allowed.includes(value)) {
    return value;
  }

  return allowed[0] || DEFAULT_CATEGORIES[0];
}

function createHabitId(name) {
  const slug = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return `${slug || "habit"}-${crypto.randomBytes(4).toString("hex")}`;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: "#0f172a",
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: !app.isPackaged
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  ensureDatabaseFile();
  ensurePreloadFile();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("db:get", () => {
  return readDb();
});

ipcMain.handle("completion:toggle", (_event, payload) => {
  const db = readDb();
  const habitId = payload && payload.habitId;
  const date = payload && payload.date;

  if (!isValidHabitId(db, habitId)) {
    throw new Error("Invalid habit id.");
  }

  if (!isValidDateKey(date)) {
    throw new Error("Invalid date.");
  }

  if (!db.completions[habitId]) {
    db.completions[habitId] = {};
  }

  const currentValue = db.completions[habitId][date] === true;
  const nextValue = !currentValue;

  if (nextValue) {
    db.completions[habitId][date] = true;
  } else {
    delete db.completions[habitId][date];

    if (Object.keys(db.completions[habitId]).length === 0) {
      delete db.completions[habitId];
    }
  }

  writeDb(db);

  return {
    db: readDb(),
    changed: {
      habitId,
      date,
      completed: nextValue
    }
  };
});

ipcMain.handle("note:save", (_event, payload) => {
  const db = readDb();
  const date = payload && payload.date;
  const note = payload && payload.note;

  if (!isValidDateKey(date)) {
    throw new Error("Invalid date.");
  }

  if (typeof note !== "string") {
    throw new Error("Invalid note.");
  }

  const cleanNote = note.slice(0, 5000);

  if (cleanNote.trim().length === 0) {
    delete db.notes[date];
  } else {
    db.notes[date] = {
      note: cleanNote,
      updatedAt: new Date().toISOString()
    };
  }

  writeDb(db);

  return readDb();
});

ipcMain.handle("event:save", (_event, payload) => {
  const db = readDb();
  const date = payload && payload.date;
  const text = payload && payload.text;

  if (!isValidDateKey(date)) {
    throw new Error("Invalid event date.");
  }

  if (typeof text !== "string") {
    throw new Error("Invalid event text.");
  }

  if (!db.events || typeof db.events !== "object") {
    db.events = {};
  }

  const cleanText = text.trim().slice(0, 160);

  if (cleanText.length === 0) {
    delete db.events[date];
  } else {
    db.events[date] = {
      text: cleanText,
      updatedAt: new Date().toISOString()
    };
  }

  writeDb(db);

  return readDb();
});

ipcMain.handle("focus:save", (_event, payload) => {
  const db = readDb();
  const date = payload && payload.date;
  const seconds = Math.floor(Number(payload && payload.seconds));

  if (!isValidDateKey(date)) {
    throw new Error("Invalid focus date.");
  }

  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("Invalid focus duration.");
  }

  if (!db.focus || typeof db.focus !== "object") {
    db.focus = {};
  }

  db.focus[date] = Math.max(0, Math.floor(Number(db.focus[date]) || 0)) + seconds;
  writeDb(db);

  return readDb();
});

ipcMain.handle("db:export", async () => {
  const db = readDb();
  const defaultPath = path.join(
    app.getPath("documents"),
    `habit-dashboard-backup-${localDateKey()}.json`
  );
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export Habit Dashboard Data",
    defaultPath,
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  fs.writeFileSync(result.filePath, `${JSON.stringify(db, null, 2)}\n`, "utf8");

  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("db:import", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Import Habit Dashboard Data",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true, db: readDb() };
  }

  const raw = fs.readFileSync(result.filePaths[0], "utf8");
  const imported = JSON.parse(raw);

  if (!imported || typeof imported !== "object" || !Array.isArray(imported.habits)) {
    throw new Error("Invalid backup file.");
  }

  const fallback = createDefaultDb();
  const normalized = {
    schemaVersion: Number.isInteger(imported.schemaVersion) ? imported.schemaVersion : fallback.schemaVersion,
    habits: Array.isArray(imported.habits) && imported.habits.length > 0 ? imported.habits : fallback.habits,
    completions: imported.completions && typeof imported.completions === "object" ? imported.completions : {},
    notes: imported.notes && typeof imported.notes === "object" ? imported.notes : {},
    events: imported.events && typeof imported.events === "object" ? imported.events : {},
    focus: imported.focus && typeof imported.focus === "object" ? imported.focus : {},
    settings: {
      ...fallback.settings,
      ...(imported.settings && typeof imported.settings === "object" ? imported.settings : {})
    },
    updatedAt: new Date().toISOString()
  };

  normalized.settings.categories = normalizeCategories(normalized.settings.categories);
  normalized.habits.forEach((habit) => {
    if (habit.category && !normalized.settings.categories.includes(habit.category)) {
      normalized.settings.categories.push(habit.category);
    }
  });

  writeDb(normalized);

  return { canceled: false, db: readDb() };
});

ipcMain.handle("habit:add", (_event, payload) => {
  const db = readDb();
  const name = String((payload && payload.name) || "").trim().slice(0, 80);
  const category = normalizeCategory(payload && payload.category, db);
  const priority = normalizePriority(payload && payload.priority);

  if (!name) {
    throw new Error("Tên thói quen không được để trống.");
  }

  const habit = {
    id: createHabitId(name),
    name,
    category,
    priority,
    createdAt: localDateKey()
  };

  db.habits.push(habit);
  writeDb(db);

  return readDb();
});

ipcMain.handle("habit:update", (_event, payload) => {
  const db = readDb();
  const habitId = payload && payload.habitId;
  const name = String((payload && payload.name) || "").trim().slice(0, 80);
  const category = normalizeCategory(payload && payload.category, db);

  if (!isValidHabitId(db, habitId)) {
    throw new Error("Thói quen không tồn tại.");
  }

  if (!name) {
    throw new Error("Tên thói quen không được để trống.");
  }

  db.habits = db.habits.map((habit) => {
    if (habit.id !== habitId) {
      return habit;
    }

    return {
      ...habit,
      name,
      category
    };
  });

  writeDb(db);

  return readDb();
});

ipcMain.handle("habit:delete", (_event, payload) => {
  const db = readDb();
  const habitId = payload && payload.habitId;

  if (!isValidHabitId(db, habitId)) {
    throw new Error("Thói quen không tồn tại.");
  }

  db.habits = db.habits.filter((habit) => habit.id !== habitId);
  delete db.completions[habitId];
  writeDb(db);

  return readDb();
});

ipcMain.handle("categories:update", (_event, payload) => {
  const db = readDb();
  const nextCategories = normalizeCategories(payload && payload.categories);
  const renames = Array.isArray(payload && payload.renames) ? payload.renames : [];

  if (!db.settings || typeof db.settings !== "object") {
    db.settings = createDefaultDb().settings;
  }

  renames.forEach((rename) => {
    const oldName = String((rename && rename.oldName) || "").trim();
    const newName = String((rename && rename.newName) || "").trim().slice(0, 40);

    if (!oldName || !newName || oldName === newName) {
      return;
    }

    db.habits = db.habits.map((habit) => {
      if (habit.category !== oldName) {
        return habit;
      }

      return {
        ...habit,
        category: newName
      };
    });
  });

  db.settings.categories = nextCategories;
  db.habits.forEach((habit) => {
    if (habit.category && !db.settings.categories.includes(habit.category)) {
      db.settings.categories.push(habit.category);
    }
  });

  writeDb(db);

  return readDb();
});

ipcMain.handle("settings:updateGoalTitle", (_event, payload) => {
  const db = readDb();
  const title = String((payload && payload.title) || "").trim().slice(0, 100);

  if (!title) {
    throw new Error("Tên mục tiêu không được để trống.");
  }

  db.settings.milestoneTitle = title;
  writeDb(db);

  return readDb();
});
