// db.js
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root", // change if you used another username
  password: "blessed_Joe123", // put your MySQL password here
  database: "churchdb",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL database (churchdb)");
  }
});

module.exports = db;
