import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Support high-resolution photos base64 upload
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

const DB_FILE = path.join(process.cwd(), "data.json");

const defaultDB = {
  warehouses: [
    { id: 'A', name: 'Gudang A', status: 'KOTOR', area: 'Area Gudang A' },
    { id: 'B', name: 'Gudang B', status: 'KOTOR', area: 'Area Gudang B' },
    { id: 'C', name: 'Gudang C', status: 'KOTOR', area: 'Area Gudang C' },
    { id: 'D', name: 'Gudang D', status: 'KOTOR', area: 'Area Gudang D' },
    { id: 'E', name: 'Gudang E', status: 'KOTOR', area: 'Area Gudang E' },
    { id: 'F', name: 'Gudang F', status: 'KOTOR', area: 'Area Gudang F' },
    { id: 'G', name: 'Gudang G', status: 'KOTOR', area: 'Area Gudang G' },
    { id: 'H', name: 'Gudang H', status: 'KOTOR', area: 'Area Gudang H' },
    { id: 'I', name: 'Gudang I', status: 'KOTOR', area: 'Area Gudang I' },
    { id: 'J', name: 'Gudang J', status: 'KOTOR', area: 'Area Gudang J' },
    { id: 'K', name: 'Gudang K', status: 'KOTOR', area: 'Area Gudang K' },
    { id: 'L', name: 'Gudang L', status: 'KOTOR', area: 'Area Gudang L' },
  ],
  reports: [],
  tasks: [],
  users: []
};

// Initialize or Read DB
function getDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading database file, using defaults", err);
  }
  
  // Write default db if not existing
  saveDB(defaultDB);
  return JSON.parse(JSON.stringify(defaultDB));
}

function saveDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

// REST API Endpoints

// 1. Sync / Get full data
app.get("/api/sync", (req, res) => {
  res.json(getDB());
});

// 2. Submit Report
app.post("/api/reports", (req, res) => {
  const { cleanerName, cleanerEmail, warehouse, description, photoBefore, photoAfter } = req.body;
  if (!cleanerName || !cleanerEmail || !warehouse) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = getDB();
  const newReport = {
    id: "rep-" + Date.now(),
    cleanerName,
    cleanerEmail,
    warehouse,
    description: description || "",
    photoBefore: photoBefore || "",
    photoAfter: photoAfter || "",
    timestamp: new Date().toISOString(),
    status: "PENDING"
  };

  db.reports = [newReport, ...db.reports];

  // Update warehouse status to 'DALAM_PENGERJAAN'
  db.warehouses = db.warehouses.map((w: any) => {
    if (w.id === warehouse) {
      return { ...w, status: "DALAM_PENGERJAAN" };
    }
    return w;
  });

  // Complete pending task for this warehouse assigned to this cleaner
  db.tasks = db.tasks.map((t: any) => {
    if (t.warehouse === warehouse && t.assignedToEmail === cleanerEmail && t.status === "PENDING") {
      return { ...t, status: "COMPLETED" };
    }
    return t;
  });

  saveDB(db);
  res.json({ success: true, report: newReport, db });
});

// 3. Approve Report
app.post("/api/reports/approve", (req, res) => {
  const { id, feedback } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing report ID" });
  }

  const db = getDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  // Update report
  db.reports = db.reports.map((r: any) => {
    if (r.id === id) {
      return {
        ...r,
        status: "APPROVED",
        feedback: feedback || "Laporan disetujui. Area bersih!"
      };
    }
    return r;
  });

  // Mark warehouse as BERSIH
  db.warehouses = db.warehouses.map((w: any) => {
    if (w.id === report.warehouse) {
      return {
        ...w,
        status: "BERSIH",
        lastCleaned: new Date().toISOString(),
        lastCleanedBy: report.cleanerName
      };
    }
    return w;
  });

  saveDB(db);
  res.json({ success: true, db });
});

// 4. Reject Report
app.post("/api/reports/reject", (req, res) => {
  const { id, feedback } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing report ID" });
  }

  const db = getDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  // Reject report with mandatory feedback
  db.reports = db.reports.map((r: any) => {
    if (r.id === id) {
      return {
        ...r,
        status: "REJECTED",
        feedback: feedback || "Mohon dibersihkan kembali secara menyeluruh."
      };
    }
    return r;
  });

  // Mark warehouse back to KOTOR
  db.warehouses = db.warehouses.map((w: any) => {
    if (w.id === report.warehouse) {
      return { ...w, status: "KOTOR" };
    }
    return w;
  });

  // Mark task back to PENDING to let cleaner reclean
  db.tasks = db.tasks.map((t: any) => {
    if (t.warehouse === report.warehouse) {
      return { ...t, status: "PENDING" };
    }
    return t;
  });

  saveDB(db);
  res.json({ success: true, db });
});

// 5. Delete Report
app.post("/api/reports/delete", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing report ID" });
  }

  const db = getDB();
  db.reports = db.reports.filter((r: any) => r.id !== id);
  saveDB(db);
  res.json({ success: true, db });
});

// 6. Add Task
app.post("/api/tasks", (req, res) => {
  const { warehouse, taskName, description, assignedToEmail } = req.body;
  if (!warehouse || !taskName || !assignedToEmail) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = getDB();
  const newTask = {
    id: "task-" + Date.now(),
    warehouse,
    taskName,
    description: description || "",
    assignedToEmail,
    status: "PENDING",
    date: new Date().toISOString().split("T")[0]
  };

  db.tasks = [newTask, ...db.tasks];

  // Set warehouse status to 'KOTOR' if it is currently 'BERSIH'
  db.warehouses = db.warehouses.map((w: any) => {
    if (w.id === warehouse && w.status === "BERSIH") {
      return { ...w, status: "KOTOR" };
    }
    return w;
  });

  saveDB(db);
  res.json({ success: true, task: newTask, db });
});

// 7. Delete Task
app.post("/api/tasks/delete", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing task ID" });
  }

  const db = getDB();
  db.tasks = db.tasks.filter((t: any) => t.id !== id);
  saveDB(db);
  res.json({ success: true, db });
});

// 8. Add/Login User
app.post("/api/users", (req, res) => {
  const { name, email, role, avatarUrl } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = getDB();
  
  // Register user if not exists
  let existing = db.users.find((u: any) => u.email === email);
  if (!existing) {
    existing = {
      id: "u-" + Date.now(),
      name,
      email,
      role,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
    };
    db.users.push(existing);
    saveDB(db);
  }

  res.json({ success: true, user: existing, db });
});

// 9. Delete User
app.post("/api/users/delete", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing user ID" });
  }

  const db = getDB();
  db.users = db.users.filter((u: any) => u.id !== id);
  saveDB(db);
  res.json({ success: true, db });
});

// 10. Update Warehouse Status Directly
app.post("/api/warehouses/status", (req, res) => {
  const { id, status, lastCleanedBy } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: "Missing id or status" });
  }

  const db = getDB();
  db.warehouses = db.warehouses.map((w: any) => {
    if (w.id === id) {
      return {
        ...w,
        status,
        lastCleaned: status === "BERSIH" ? new Date().toISOString() : w.lastCleaned,
        lastCleanedBy: status === "BERSIH" ? (lastCleanedBy || "Sistem") : w.lastCleanedBy
      };
    }
    return w;
  });

  saveDB(db);
  res.json({ success: true, db });
});

// 11. Reset DB
app.post("/api/reset", (req, res) => {
  saveDB(defaultDB);
  res.json({ success: true, db: defaultDB });
});

async function startServer() {
  // Integrate Vite dev middleware or serve production assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[GudangClean Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
