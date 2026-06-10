import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const { Client } = pg;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const stateId = process.env.SUPABASE_STATE_ID || "gestao-horas";

if (!connectionString) {
  throw new Error("Configure DIRECT_URL ou DATABASE_URL antes de rodar o seed.");
}

const rootPassword = process.env.ROOT_USER_PASSWORD || process.env.APP_LOGIN_PASSWORD;
if (!rootPassword) {
  throw new Error("Configure ROOT_USER_PASSWORD ou APP_LOGIN_PASSWORD antes de rodar o seed.");
}

const emptyStore = {
  users: [],
  projectTypes: [],
  projects: [],
  monthlyEntries: [],
  otherActivityEntries: [],
  timeRecords: [],
  dailyWorkLogs: [],
  mmpRecords: [],
};

function normalizeStore(data) {
  return {
    ...emptyStore,
    ...(data && typeof data === "object" && !Array.isArray(data) ? data : {}),
    users: Array.isArray(data?.users) ? data.users : [],
    projectTypes: Array.isArray(data?.projectTypes) ? data.projectTypes : [],
    projects: Array.isArray(data?.projects) ? data.projects : [],
    monthlyEntries: Array.isArray(data?.monthlyEntries) ? data.monthlyEntries : [],
    otherActivityEntries: Array.isArray(data?.otherActivityEntries) ? data.otherActivityEntries : [],
    timeRecords: Array.isArray(data?.timeRecords) ? data.timeRecords : [],
    dailyWorkLogs: Array.isArray(data?.dailyWorkLogs) ? data.dailyWorkLogs : [],
    mmpRecords: Array.isArray(data?.mmpRecords) ? data.mmpRecords : [],
  };
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt$v1$${salt}$${derivedKey.toString("hex")}`;
}

const now = new Date().toISOString();
const rootUser = {
  id: process.env.ROOT_USER_ID || "root",
  nome: process.env.ROOT_USER_NAME || "Root do Sistema",
  email: (process.env.ROOT_USER_EMAIL || "admin@sistema.local").toLowerCase(),
  cargo: process.env.ROOT_USER_CARGO || "Administrador do sistema",
  status: "ativo",
  role: "ADMIN",
  createdAt: now,
  updatedAt: now,
};

const client = new Client({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      user_id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const result = await client.query(
    "SELECT data FROM app_state WHERE id = $1",
    [stateId],
  );
  const store = normalizeStore(result.rows[0]?.data);
  const existingUser = store.users.find(
    (user) => user.id === rootUser.id || String(user.email).toLowerCase() === rootUser.email,
  );
  const nextRootUser = {
    ...existingUser,
    ...rootUser,
    createdAt: existingUser?.createdAt || rootUser.createdAt,
  };

  store.users = [
    nextRootUser,
    ...store.users.filter(
      (user) => user.id !== rootUser.id && String(user.email).toLowerCase() !== rootUser.email,
    ),
  ];

  await client.query(
    `
      INSERT INTO app_state (id, data, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `,
    [stateId, JSON.stringify(store)],
  );
  await client.query(
    `
      INSERT INTO user_credentials (user_id, password_hash, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (user_id)
      DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()
    `,
    [nextRootUser.id, hashPassword(rootPassword)],
  );

  console.log(`Usuario root cadastrado: ${nextRootUser.email}`);
} finally {
  await client.end();
}
