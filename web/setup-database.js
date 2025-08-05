/**
 * Setup Better Auth Database Tables
 * Creates the required tables for Better Auth in our SQLite database
 */

const Database = require("better-sqlite3");
const path = require("path");

console.log("🔧 Setting up Better Auth database tables...");

try {
  // Connect to our existing database
  const dbPath = path.join(process.cwd(), "../.codecontext/memory.db");
  console.log("📁 Database path:", dbPath);
  
  const db = new Database(dbPath);
  console.log("✅ Connected to database");

  // Create Better Auth tables
  console.log("📋 Creating Better Auth tables...");

  // User table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      emailVerified BOOLEAN NOT NULL DEFAULT false,
      name TEXT,
      image TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Created user table");

  // Session table
  db.exec(`
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expiresAt DATETIME NOT NULL,
      token TEXT UNIQUE NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ipAddress TEXT,
      userAgent TEXT,
      userId TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE
    );
  `);
  console.log("✅ Created session table");

  // Account table (for social logins)
  db.exec(`
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      userId TEXT NOT NULL,
      accessToken TEXT,
      refreshToken TEXT,
      idToken TEXT,
      accessTokenExpiresAt DATETIME,
      refreshTokenExpiresAt DATETIME,
      scope TEXT,
      password TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE
    );
  `);
  console.log("✅ Created account table");

  // Verification table (for email verification)
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Created verification table");

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
    CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
    CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
    CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
  `);
  console.log("✅ Created database indexes");

  // Check if tables were created successfully
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('user', 'session', 'account', 'verification')
  `).all();

  console.log("📊 Created tables:", tables.map(t => t.name));

  db.close();
  console.log("🎉 Database setup complete!");
  console.log("✅ Better Auth is now ready to use!");

} catch (error) {
  console.error("❌ Database setup failed:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
}
