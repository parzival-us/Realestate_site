const bcrypt = require("bcryptjs");

function schemaFor(client) {
  if (client === "pg") {
    return [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(180) UNIQUE NOT NULL,
        phone VARCHAR(40),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(40) NOT NULL DEFAULT 'customer',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        title VARCHAR(180) NOT NULL,
        slug VARCHAR(220) UNIQUE NOT NULL,
        listing_type VARCHAR(80) NOT NULL,
        city VARCHAR(120) NOT NULL,
        state VARCHAR(120) NOT NULL,
        address TEXT,
        price NUMERIC(14, 2) NOT NULL DEFAULT 0,
        price_label VARCHAR(80),
        area NUMERIC(12, 2) NOT NULL DEFAULT 0,
        area_unit VARCHAR(30) NOT NULL DEFAULT 'sq ft',
        bedrooms INTEGER DEFAULT 0,
        bathrooms INTEGER DEFAULT 0,
        status VARCHAR(60) NOT NULL DEFAULT 'Available',
        description TEXT,
        highlights TEXT,
        image_url TEXT,
        featured INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS galleries (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption VARCHAR(180),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(180),
        phone VARCHAR(40),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'new',
        source VARCHAR(60) DEFAULT 'website',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
        preferred_date DATE NOT NULL,
        preferred_time VARCHAR(40),
        notes TEXT,
        status VARCHAR(40) NOT NULL DEFAULT 'requested',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS content_blocks (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(120) UNIQUE NOT NULL,
        section VARCHAR(80) NOT NULL,
        title VARCHAR(180),
        body TEXT,
        metadata TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`
    ];
  }

  if (client === "mysql") {
    return [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(180) UNIQUE NOT NULL,
        phone VARCHAR(40),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(40) NOT NULL DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS properties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(180) NOT NULL,
        slug VARCHAR(220) UNIQUE NOT NULL,
        listing_type VARCHAR(80) NOT NULL,
        city VARCHAR(120) NOT NULL,
        state VARCHAR(120) NOT NULL,
        address TEXT,
        price DECIMAL(14, 2) NOT NULL DEFAULT 0,
        price_label VARCHAR(80),
        area DECIMAL(12, 2) NOT NULL DEFAULT 0,
        area_unit VARCHAR(30) NOT NULL DEFAULT 'sq ft',
        bedrooms INT DEFAULT 0,
        bathrooms INT DEFAULT 0,
        status VARCHAR(60) NOT NULL DEFAULT 'Available',
        description TEXT,
        highlights TEXT,
        image_url TEXT,
        featured INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS galleries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT,
        image_url TEXT NOT NULL,
        caption VARCHAR(180),
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_galleries_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(180),
        phone VARCHAR(40),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS inquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        property_id INT,
        message TEXT NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'new',
        source VARCHAR(60) DEFAULT 'website',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_inquiries_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        CONSTRAINT fk_inquiries_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        property_id INT,
        preferred_date DATE NOT NULL,
        preferred_time VARCHAR(40),
        notes TEXT,
        status VARCHAR(40) NOT NULL DEFAULT 'requested',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        CONSTRAINT fk_bookings_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS content_blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(120) UNIQUE NOT NULL,
        section VARCHAR(80) NOT NULL,
        title VARCHAR(180),
        body TEXT,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    ];
  }

  return [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      listing_type TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      address TEXT,
      price REAL NOT NULL DEFAULT 0,
      price_label TEXT,
      area REAL NOT NULL DEFAULT 0,
      area_unit TEXT NOT NULL DEFAULT 'sq ft',
      bedrooms INTEGER DEFAULT 0,
      bathrooms INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Available',
      description TEXT,
      highlights TEXT,
      image_url TEXT,
      featured INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS galleries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      caption TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      source TEXT DEFAULT 'website',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
      preferred_date TEXT NOT NULL,
      preferred_time TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'requested',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS content_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      section TEXT NOT NULL,
      title TEXT,
      body TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ];
}

async function ensureSchema(db) {
  for (const statement of schemaFor(db.client)) {
    await db.run(statement);
  }
}

const propertySeeds = [
  {
    title: "Malati Greens Villa Enclave",
    slug: "malati-greens-villa-enclave",
    listing_type: "Villa",
    city: "Bhubaneswar",
    state: "Odisha",
    address: "Patia, Bhubaneswar",
    price: 9800000,
    price_label: "98 Lakh",
    area: 2450,
    area_unit: "sq ft",
    bedrooms: 4,
    bathrooms: 4,
    status: "Available",
    description: "A gated villa address with landscaped streets, private decks, and quick access to schools, hospitals, and IT corridors.",
    highlights: "Gated campus, Clubhouse, Landscaped park, Modular kitchen",
    image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80",
    featured: 1
  },
  {
    title: "Bana Residency Heights",
    slug: "bana-residency-heights",
    listing_type: "Apartment",
    city: "Cuttack",
    state: "Odisha",
    address: "CDA Sector 9, Cuttack",
    price: 6450000,
    price_label: "64.5 Lakh",
    area: 1480,
    area_unit: "sq ft",
    bedrooms: 3,
    bathrooms: 2,
    status: "Ready to Move",
    description: "Sunlit apartments with efficient layouts, covered parking, lift access, and a calm residential neighborhood.",
    highlights: "Ready possession, Covered parking, Lift, Community hall",
    image_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80",
    featured: 1
  },
  {
    title: "Daya Riverfront Plots",
    slug: "daya-riverfront-plots",
    listing_type: "Land",
    city: "Bhubaneswar",
    state: "Odisha",
    address: "Near Dhauli Road, Bhubaneswar",
    price: 2850000,
    price_label: "28.5 Lakh",
    area: 1800,
    area_unit: "sq ft",
    bedrooms: 0,
    bathrooms: 0,
    status: "Booking Open",
    description: "Clear-title residential plots with road access, drainage planning, and future-ready township development.",
    highlights: "Clear title, Boundary marked, 30 ft road, Drainage planned",
    image_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80",
    featured: 1
  },
  {
    title: "Utkal Commercial Square",
    slug: "utkal-commercial-square",
    listing_type: "Commercial",
    city: "Puri",
    state: "Odisha",
    address: "Grand Road Extension, Puri",
    price: 12100000,
    price_label: "1.21 Cr",
    area: 1120,
    area_unit: "sq ft",
    bedrooms: 0,
    bathrooms: 2,
    status: "Under Construction",
    description: "A high-visibility commercial block designed for showrooms, clinics, offices, and investor-owned rentals.",
    highlights: "Main road frontage, Power backup, Visitor parking, High footfall",
    image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80",
    featured: 0
  },
  {
    title: "Konark Weekend Farm Lands",
    slug: "konark-weekend-farm-lands",
    listing_type: "Farmland",
    city: "Konark",
    state: "Odisha",
    address: "Konark Marine Drive belt",
    price: 1850000,
    price_label: "18.5 Lakh",
    area: 43560,
    area_unit: "sq ft",
    bedrooms: 0,
    bathrooms: 0,
    status: "Available",
    description: "Weekend farmland parcels with plantation planning, internal tracks, and a peaceful coastal approach.",
    highlights: "Plantation zone, Internal track, Water access, Weekend homes allowed",
    image_url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1400&q=80",
    featured: 0
  },
  {
    title: "Emerald Courtyard Duplex",
    slug: "emerald-courtyard-duplex",
    listing_type: "Duplex",
    city: "Bhubaneswar",
    state: "Odisha",
    address: "Khandagiri, Bhubaneswar",
    price: 8750000,
    price_label: "87.5 Lakh",
    area: 2100,
    area_unit: "sq ft",
    bedrooms: 3,
    bathrooms: 3,
    status: "Available",
    description: "A compact duplex with a family lounge, balcony garden, and two-car approach inside a secured lane.",
    highlights: "Private terrace, 2 car approach, Secured lane, Balcony garden",
    image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
    featured: 0
  }
];

const gallerySeeds = [
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80"
];

const contentSeeds = [
  {
    slug: "hero",
    section: "home",
    title: "BanaMalati Infra",
    body: "Premium homes, land parcels, and commercial projects across Odisha with clear guidance from first visit to final handover.",
    metadata: JSON.stringify({ cta: "Explore Listings" })
  },
  {
    slug: "about",
    section: "company",
    title: "Built around trust, location intelligence, and long-term value",
    body: "BanaMalati Infra helps families and investors compare properties, verify essentials, schedule site visits, and move with confidence.",
    metadata: "{}"
  },
  {
    slug: "contact",
    section: "contact",
    title: "BanaMalati Infra Sales Office",
    body: "Plot 18, Jaydev Vihar, Bhubaneswar, Odisha 751013",
    metadata: JSON.stringify({
      phone: "+91 98765 43210",
      email: "sales@banamalatiinfra.com",
      hours: "Mon-Sat, 10:00 AM - 7:00 PM"
    })
  }
];

async function seedDatabase(db) {
  const adminEmail = String(process.env.ADMIN_EMAIL || "admin@banamalatiinfra.com").toLowerCase();
  const adminExists = await db.get("SELECT id FROM users WHERE lower(email) = lower(?)", [adminEmail]);
  if (!adminExists) {
    const password = process.env.ADMIN_PASSWORD || "Admin@12345";
    await db.insert("users", {
      name: "BanaMalati Admin",
      email: adminEmail,
      phone: "+91 98765 43210",
      password_hash: await bcrypt.hash(password, 10),
      role: "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  const propertyCount = await db.get("SELECT COUNT(*) AS count FROM properties");
  if (Number(propertyCount.count || 0) === 0) {
    for (const seed of propertySeeds) {
      const property = await db.insert("properties", {
        ...seed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      for (let index = 0; index < gallerySeeds.length; index += 1) {
        await db.insert("galleries", {
          property_id: property.id,
          image_url: gallerySeeds[index],
          caption: `${property.title} view ${index + 1}`,
          sort_order: index + 1,
          created_at: new Date().toISOString()
        });
      }
    }
  }

  for (const block of contentSeeds) {
    const exists = await db.get("SELECT id FROM content_blocks WHERE slug = ?", [block.slug]);
    if (!exists) {
      await db.insert("content_blocks", {
        ...block,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
}

module.exports = {
  ensureSchema,
  seedDatabase
};
