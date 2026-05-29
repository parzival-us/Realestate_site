const fs = require("fs");
const path = require("path");

let pg;
let mysql;

function getDbClient() {
  const value = String(process.env.DB_CLIENT || "sqlite").toLowerCase();
  if (value === "postgres" || value === "postgresql") return "pg";
  if (value === "mysql" || value === "mysql2" || value === "mariadb") return "mysql";
  return "sqlite";
}

function convertForPostgres(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function normalizeRows(result) {
  if (Array.isArray(result)) return result;
  if (result?.rows) return result.rows;
  return [];
}

class Database {
  constructor() {
    this.client = getDbClient();
    this.connection = null;
  }

  async connect() {
    if (this.connection) return;

    if (this.client === "pg") {
      pg = pg || require("pg");
      this.connection = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
      });
      return;
    }

    if (this.client === "mysql") {
      mysql = mysql || require("mysql2/promise");
      this.connection = await mysql.createPool({
        host: process.env.MYSQL_HOST || "localhost",
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "",
        database: process.env.MYSQL_DATABASE || "banamalati_infra",
        waitForConnections: true,
        connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10)
      });
      return;
    }

    const { DatabaseSync } = require("node:sqlite");
    const file = path.resolve(process.env.SQLITE_FILE || path.join("data", "banamalati.sqlite"));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.connection = new DatabaseSync(file);
    this.connection.exec("PRAGMA foreign_keys = ON;");
  }

  async all(sql, params = []) {
    await this.connect();
    if (this.client === "pg") {
      const result = await this.connection.query(convertForPostgres(sql), params);
      return normalizeRows(result);
    }
    if (this.client === "mysql") {
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    }
    return this.connection.prepare(sql).all(...params);
  }

  async get(sql, params = []) {
    await this.connect();
    if (this.client === "pg") {
      const result = await this.connection.query(convertForPostgres(sql), params);
      return result.rows[0] || null;
    }
    if (this.client === "mysql") {
      const [rows] = await this.connection.execute(sql, params);
      return rows[0] || null;
    }
    return this.connection.prepare(sql).get(...params) || null;
  }

  async run(sql, params = []) {
    await this.connect();
    if (this.client === "pg") {
      return this.connection.query(convertForPostgres(sql), params);
    }
    if (this.client === "mysql") {
      const [result] = await this.connection.execute(sql, params);
      return result;
    }
    return this.connection.prepare(sql).run(...params);
  }

  async insert(table, data) {
    const keys = Object.keys(data).filter((key) => data[key] !== undefined);
    const values = keys.map((key) => data[key]);
    const columns = keys.join(", ");
    const marks = keys.map(() => "?").join(", ");

    if (this.client === "pg") {
      const rows = await this.all(`INSERT INTO ${table} (${columns}) VALUES (${marks}) RETURNING *`, values);
      return rows[0];
    }

    const result = await this.run(`INSERT INTO ${table} (${columns}) VALUES (${marks})`, values);
    const id = this.client === "mysql" ? result.insertId : Number(result.lastInsertRowid);
    return this.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  }

  async update(table, id, data) {
    const keys = Object.keys(data).filter((key) => data[key] !== undefined);
    const values = keys.map((key) => data[key]);
    const assignments = keys.map((key) => `${key} = ?`).join(", ");

    if (!assignments) {
      return this.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    }

    if (this.client === "pg") {
      const rows = await this.all(`UPDATE ${table} SET ${assignments} WHERE id = ? RETURNING *`, [...values, id]);
      return rows[0] || null;
    }

    await this.run(`UPDATE ${table} SET ${assignments} WHERE id = ?`, [...values, id]);
    return this.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  }

  async close() {
    if (!this.connection) return;
    if (this.client === "pg") await this.connection.end();
    if (this.client === "mysql") await this.connection.end();
    if (this.client === "sqlite") this.connection.close();
    this.connection = null;
  }
}

module.exports = {
  db: new Database(),
  getDbClient
};
