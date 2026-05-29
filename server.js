require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { db, getDbClient } = require("./src/db");
const { ensureSchema, seedDatabase } = require("./src/schema");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "local-development-secret-change-me";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://plus.unsplash.com"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 700 }));
app.use(express.static(path.join(__dirname, "public")));

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role
  };
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await db.get("SELECT * FROM users WHERE id = ?", [payload.id]);
    if (!user) {
      return res.status(401).json({ error: "Invalid session." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

function adminRequired(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  return next();
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value) {
  if (value === true || value === "true" || value === "1" || value === 1) return 1;
  return 0;
}

function normalizePropertyInput(body, existing = {}) {
  const slugSource = body.slug || body.title || existing.title || "";
  const slug = String(slugSource)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    title: body.title ?? existing.title,
    slug: slug || existing.slug,
    listing_type: body.listing_type ?? existing.listing_type ?? "Apartment",
    city: body.city ?? existing.city,
    state: body.state ?? existing.state ?? "Odisha",
    address: body.address ?? existing.address,
    price: toNumber(body.price) ?? existing.price ?? 0,
    price_label: body.price_label ?? existing.price_label ?? "",
    area: toNumber(body.area) ?? existing.area ?? 0,
    area_unit: body.area_unit ?? existing.area_unit ?? "sq ft",
    bedrooms: toNumber(body.bedrooms) ?? existing.bedrooms ?? 0,
    bathrooms: toNumber(body.bathrooms) ?? existing.bathrooms ?? 0,
    status: body.status ?? existing.status ?? "Available",
    description: body.description ?? existing.description ?? "",
    highlights: body.highlights ?? existing.highlights ?? "",
    image_url: body.image_url ?? existing.image_url ?? "",
    featured: toBoolean(body.featured ?? existing.featured)
  };
}

async function createOrFindCustomer(input) {
  const email = String(input.email || "").trim().toLowerCase();
  const phone = String(input.phone || "").trim();

  let customer = null;
  if (email) {
    customer = await db.get("SELECT * FROM customers WHERE lower(email) = lower(?)", [email]);
  }

  if (!customer && phone) {
    customer = await db.get("SELECT * FROM customers WHERE phone = ?", [phone]);
  }

  if (customer) {
    const updates = {
      name: input.name || customer.name,
      email: email || customer.email,
      phone: phone || customer.phone,
      updated_at: new Date().toISOString()
    };
    return db.update("customers", customer.id, updates);
  }

  return db.insert("customers", {
    name: input.name,
    email,
    phone,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

function parsePage(query) {
  const limit = Math.min(Math.max(Number(query.limit || 24), 1), 100);
  const page = Math.max(Number(query.page || 1), 1);
  return { limit, offset: (page - 1) * limit };
}

app.get("/api/health", asyncRoute(async (req, res) => {
  const propertyCount = await db.get("SELECT COUNT(*) AS count FROM properties");
  res.json({
    ok: true,
    app: "BanaMalati Infra",
    database: getDbClient(),
    properties: Number(propertyCount.count || 0)
  });
}));

app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const existing = await db.get("SELECT id FROM users WHERE lower(email) = lower(?)", [email]);
  if (existing) {
    return res.status(409).json({ error: "An account already exists for this email." });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await db.insert("users", {
    name,
    email: String(email).trim().toLowerCase(),
    phone: phone || "",
    password_hash,
    role: "customer",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  res.status(201).json({ user: publicUser(user), token: makeToken(user) });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await db.get("SELECT * FROM users WHERE lower(email) = lower(?)", [email]);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  res.json({ user: publicUser(user), token: makeToken(user) });
}));

app.get("/api/auth/me", authRequired, asyncRoute(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));

app.get("/api/properties", asyncRoute(async (req, res) => {
  const filters = [];
  const params = [];
  const { limit, offset } = parsePage(req.query);

  if (req.query.type) {
    filters.push("lower(listing_type) = lower(?)");
    params.push(req.query.type);
  }
  if (req.query.city) {
    filters.push("lower(city) = lower(?)");
    params.push(req.query.city);
  }
  if (req.query.status) {
    filters.push("lower(status) = lower(?)");
    params.push(req.query.status);
  }
  if (req.query.featured !== undefined) {
    filters.push("featured = ?");
    params.push(toBoolean(req.query.featured));
  }
  if (req.query.minPrice) {
    filters.push("price >= ?");
    params.push(Number(req.query.minPrice));
  }
  if (req.query.maxPrice) {
    filters.push("price <= ?");
    params.push(Number(req.query.maxPrice));
  }
  if (req.query.keyword) {
    const keyword = `%${String(req.query.keyword).toLowerCase()}%`;
    filters.push("(lower(title) LIKE ? OR lower(city) LIKE ? OR lower(address) LIKE ? OR lower(description) LIKE ?)");
    params.push(keyword, keyword, keyword, keyword);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const rows = await db.all(
    `SELECT * FROM properties ${where} ORDER BY featured DESC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const countRow = await db.get(`SELECT COUNT(*) AS count FROM properties ${where}`, params);

  res.json({ data: rows, total: Number(countRow.count || 0), limit, offset });
}));

app.get("/api/properties/:slugOrId", asyncRoute(async (req, res) => {
  const value = req.params.slugOrId;
  const property = /^\d+$/.test(value)
    ? await db.get("SELECT * FROM properties WHERE id = ?", [Number(value)])
    : await db.get("SELECT * FROM properties WHERE slug = ?", [value]);

  if (!property) {
    return res.status(404).json({ error: "Property not found." });
  }

  const gallery = await db.all("SELECT * FROM galleries WHERE property_id = ? ORDER BY sort_order ASC, id ASC", [property.id]);
  res.json({ ...property, gallery });
}));

app.post("/api/properties", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const input = normalizePropertyInput(req.body);
  const created = await db.insert("properties", {
    ...input,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  res.status(201).json(created);
}));

app.put("/api/properties/:id", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const existing = await db.get("SELECT * FROM properties WHERE id = ?", [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: "Property not found." });
  }

  const input = normalizePropertyInput(req.body, existing);
  const updated = await db.update("properties", existing.id, {
    ...input,
    updated_at: new Date().toISOString()
  });
  res.json(updated);
}));

app.delete("/api/properties/:id", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const existing = await db.get("SELECT * FROM properties WHERE id = ?", [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: "Property not found." });
  }
  await db.run("DELETE FROM galleries WHERE property_id = ?", [existing.id]);
  await db.run("DELETE FROM properties WHERE id = ?", [existing.id]);
  res.json({ ok: true });
}));

app.post("/api/properties/:id/gallery", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const property = await db.get("SELECT id FROM properties WHERE id = ?", [req.params.id]);
  if (!property) {
    return res.status(404).json({ error: "Property not found." });
  }
  const created = await db.insert("galleries", {
    property_id: property.id,
    image_url: req.body.image_url,
    caption: req.body.caption || "",
    sort_order: toNumber(req.body.sort_order) || 0,
    created_at: new Date().toISOString()
  });
  res.status(201).json(created);
}));

app.delete("/api/galleries/:id", authRequired, adminRequired, asyncRoute(async (req, res) => {
  await db.run("DELETE FROM galleries WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
}));

app.post("/api/inquiries", asyncRoute(async (req, res) => {
  const { name, email, phone, property_id, message } = req.body;
  if (!name || (!email && !phone) || !message) {
    return res.status(400).json({ error: "Name, contact detail, and message are required." });
  }

  const customer = await createOrFindCustomer({ name, email, phone });
  const created = await db.insert("inquiries", {
    customer_id: customer.id,
    property_id: property_id || null,
    message,
    status: "new",
    source: "website",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  res.status(201).json(created);
}));

app.get("/api/inquiries", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const rows = await db.all(`
    SELECT inquiries.*, customers.name AS customer_name, customers.email AS customer_email,
           customers.phone AS customer_phone, properties.title AS property_title
    FROM inquiries
    LEFT JOIN customers ON customers.id = inquiries.customer_id
    LEFT JOIN properties ON properties.id = inquiries.property_id
    ORDER BY inquiries.created_at DESC
  `);
  res.json(rows);
}));

app.patch("/api/inquiries/:id", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const updated = await db.update("inquiries", req.params.id, {
    status: req.body.status || "new",
    updated_at: new Date().toISOString()
  });
  res.json(updated);
}));

app.post("/api/bookings", asyncRoute(async (req, res) => {
  const { name, email, phone, property_id, preferred_date, preferred_time, notes } = req.body;
  if (!name || (!email && !phone) || !preferred_date) {
    return res.status(400).json({ error: "Name, contact detail, and date are required." });
  }

  const customer = await createOrFindCustomer({ name, email, phone });
  const created = await db.insert("bookings", {
    customer_id: customer.id,
    property_id: property_id || null,
    preferred_date,
    preferred_time: preferred_time || "",
    notes: notes || "",
    status: "requested",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  res.status(201).json(created);
}));

app.get("/api/bookings", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const rows = await db.all(`
    SELECT bookings.*, customers.name AS customer_name, customers.email AS customer_email,
           customers.phone AS customer_phone, properties.title AS property_title
    FROM bookings
    LEFT JOIN customers ON customers.id = bookings.customer_id
    LEFT JOIN properties ON properties.id = bookings.property_id
    ORDER BY bookings.created_at DESC
  `);
  res.json(rows);
}));

app.patch("/api/bookings/:id", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const updated = await db.update("bookings", req.params.id, {
    status: req.body.status || "requested",
    updated_at: new Date().toISOString()
  });
  res.json(updated);
}));

app.get("/api/customers", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const rows = await db.all("SELECT * FROM customers ORDER BY created_at DESC");
  res.json(rows);
}));

app.get("/api/content", asyncRoute(async (req, res) => {
  const rows = await db.all("SELECT * FROM content_blocks ORDER BY section ASC, slug ASC");
  res.json(rows);
}));

app.put("/api/content/:slug", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const existing = await db.get("SELECT * FROM content_blocks WHERE slug = ?", [req.params.slug]);
  if (!existing) {
    return res.status(404).json({ error: "Content block not found." });
  }
  const updated = await db.update("content_blocks", existing.id, {
    title: req.body.title ?? existing.title,
    body: req.body.body ?? existing.body,
    metadata: req.body.metadata ?? existing.metadata,
    updated_at: new Date().toISOString()
  });
  res.json(updated);
}));

app.get("/api/admin/stats", authRequired, adminRequired, asyncRoute(async (req, res) => {
  const [properties, inquiries, bookings, customers] = await Promise.all([
    db.get("SELECT COUNT(*) AS count FROM properties"),
    db.get("SELECT COUNT(*) AS count FROM inquiries"),
    db.get("SELECT COUNT(*) AS count FROM bookings"),
    db.get("SELECT COUNT(*) AS count FROM customers")
  ]);
  res.json({
    properties: Number(properties.count || 0),
    inquiries: Number(inquiries.count || 0),
    bookings: Number(bookings.count || 0),
    customers: Number(customers.count || 0)
  });
}));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found." });
  }
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  const message = process.env.NODE_ENV === "production" ? "Server error." : error.message;
  res.status(500).json({ error: message });
});

async function start() {
  await db.connect();
  await ensureSchema(db);
  await seedDatabase(db);

  app.listen(PORT, () => {
    console.log(`BanaMalati Infra is running at http://localhost:${PORT}`);
    console.log(`Database client: ${getDbClient()}`);
  });
}

start().catch((error) => {
  console.error("Failed to start BanaMalati Infra:", error);
  process.exit(1);
});
