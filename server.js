// server.js
const express = require("express");
const session = require("express-session");
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const db = require("./db");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "churchSecret",
    resave: false,
    saveUninitialized: false,
  })
);

// ✅ Database connection
db.connect((err) => {
  if (err) console.error("❌ Database connection failed:", err);
  else console.log("✅ Connected to MySQL database (churchdb)");
});

// ✅ Create members table
db.query(
  `CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100),
    gender VARCHAR(10),
    phone VARCHAR(20),
    department VARCHAR(50),
    residence VARCHAR(100),
    fellowship VARCHAR(50),
    added_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  (err) => {
    if (err) console.error("❌ Error creating members table:", err);
    else console.log("✅ Members table ready!");
  }
);

// ✅ Create admins table
db.query(
  `CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255)
  )`,
  (err) => {
    if (err) console.error("❌ Error creating admins table:", err);
    else console.log("✅ Admins table ready!");
  }
);

// ✅ Register admin
app.post("/api/register-admin", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO admins (username, password) VALUES (?, ?)",
      [username, hashed],
      (err) => {
        if (err)
          return res
            .status(400)
            .json({ message: "⚠️ Admin already exists or DB error.", error: err });
        res.json({ message: "✅ Admin registered successfully!" });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "❌ Server error during registration.", error: err });
  }
});

// ✅ Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.query("SELECT * FROM admins WHERE username=?", [username], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error", error: err });
    if (results.length === 0) return res.status(400).json({ message: "User not found" });

    const admin = results[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    req.session.admin = admin.username;
    res.json({ success: true, message: "✅ Login successful" });
  });
});

// ✅ Check session
app.get("/api/check-session", (req, res) => {
  if (req.session.admin) res.json({ loggedIn: true, admin: req.session.admin });
  else res.json({ loggedIn: false });
});

// ✅ Logout
app.get("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out successfully" }));
});

// ✅ Middleware to protect admin routes
function requireLogin(req, res, next) {
  if (!req.session.admin) return res.status(403).json({ message: "Unauthorized access" });
  next();
}

// ✅ Fetch all members (protected)
app.get("/members", requireLogin, (req, res) => {
  db.query("SELECT * FROM members ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error", details: err });
    res.json(results);
  });
});

// ✅ Fellowship-based filtering (protected)
app.get("/members/fellowship/:name", requireLogin, (req, res) => {
  const { name } = req.params;
  db.query("SELECT * FROM members WHERE fellowship = ? ORDER BY id DESC", [name], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error", details: err });
    res.json(results);
  });
});

// ✅ Add member
app.post("/add-member", requireLogin, (req, res) => {
  const { fullname, gender, phone, department, residence, fellowship } = req.body;
  if (!fullname || !gender || !phone) return res.json({ success: false, message: "Please fill all required fields" });

  const addedBy = req.session.admin;
  db.query(
    "INSERT INTO members (fullname, gender, phone, department, residence, fellowship, added_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [fullname, gender, phone, department, residence, fellowship, addedBy],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
      res.json({ success: true, message: "✅ Member added successfully!" });
    }
  );
});

// ✅ Delete member
app.delete("/delete-member/:id", requireLogin, (req, res) => {
  const memberId = req.params.id;
  db.query("DELETE FROM members WHERE id = ?", [memberId], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Member not found" });
    res.json({ success: true, message: "✅ Member deleted successfully" });
  });
});

// ✅ Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Public route for homepage stats (no login required)
app.get("/public/members", (req, res) => {
  db.query("SELECT * FROM members ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error", details: err });
    res.json(results);
  });
});

// ✅ Public route for fellowship-based stats
app.get("/public/members/fellowship/:name", (req, res) => {
  const { name } = req.params;
  db.query("SELECT * FROM members WHERE fellowship = ? ORDER BY id DESC", [name], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error", details: err });
    res.json(results);
  });
});

// ✅ Start server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
