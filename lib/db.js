const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'database.json');

// Helper to read local database.json
function readLocalDatabase() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { settings: {}, cars: [], destinations: [], pickupLocations: [], leads: [] };
  }
}

// Helper to write local database.json (for local dev without Neon)
function writeLocalDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Local DB write error:', err);
    return false;
  }
}

// Check if Neon DB is configured
function isNeonConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '');
}

// Get Neon client instance
let sqlClient = null;
function getSqlClient() {
  if (sqlClient) return sqlClient;
  if (!isNeonConfigured()) return null;

  try {
    const { neon } = require('@neondatabase/serverless');
    sqlClient = neon(process.env.DATABASE_URL);
    return sqlClient;
  } catch (err) {
    console.warn('Neon serverless driver not installed, falling back to local storage:', err.message);
    return null;
  }
}

// Initialize tables and seed default data if Neon is empty
let initialized = false;
async function initNeonDatabase() {
  if (initialized) return;
  const sql = getSqlClient();
  if (!sql) return;

  try {
    // 1. Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS piyush_settings (
        key VARCHAR(50) PRIMARY KEY,
        value JSONB
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS piyush_cars (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS piyush_destinations (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS piyush_pickup_locations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS piyush_leads (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Check if data needs seeding from database.json
    const existingSettings = await sql`SELECT count(*) FROM piyush_settings;`;
    if (parseInt(existingSettings[0].count, 10) === 0) {
      console.log('🌱 Seeding initial data to Neon Database...');
      const seedData = readLocalDatabase();

      // Seed settings
      if (seedData.settings) {
        for (const [key, value] of Object.entries(seedData.settings)) {
          await sql`
            INSERT INTO piyush_settings (key, value)
            VALUES (${key}, ${JSON.stringify(value)})
            ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)};
          `;
        }
      }

      // Seed cars
      if (Array.isArray(seedData.cars)) {
        for (const car of seedData.cars) {
          await sql`
            INSERT INTO piyush_cars (id, data)
            VALUES (${car.id}, ${JSON.stringify(car)})
            ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(car)};
          `;
        }
      }

      // Seed destinations
      if (Array.isArray(seedData.destinations)) {
        for (const dest of seedData.destinations) {
          await sql`
            INSERT INTO piyush_destinations (id, data)
            VALUES (${dest.id}, ${JSON.stringify(dest)})
            ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(dest)};
          `;
        }
      }

      // Seed pickup locations
      if (Array.isArray(seedData.pickupLocations)) {
        for (const loc of seedData.pickupLocations) {
          await sql`
            INSERT INTO piyush_pickup_locations (name)
            VALUES (${loc})
            ON CONFLICT (name) DO NOTHING;
          `;
        }
      }

      // Seed initial leads
      if (Array.isArray(seedData.leads)) {
        for (const lead of seedData.leads) {
          await sql`
            INSERT INTO piyush_leads (id, data)
            VALUES (${lead.id}, ${JSON.stringify(lead)})
            ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(lead)};
          `;
        }
      }
      console.log('✅ Neon Database seeded successfully!');
    }

    initialized = true;
  } catch (err) {
    console.error('Failed to initialize Neon database:', err);
  }
}

// -------------------------------------------------------------
// PUBLIC DATA METHODS (FOR CALCULATOR & FRONTEND)
// -------------------------------------------------------------
async function getPublicData() {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      // Fetch settings
      const settingsRows = await sql`SELECT key, value FROM piyush_settings;`;
      const settings = {};
      settingsRows.forEach(row => {
        if (row.key !== 'adminPassword') {
          settings[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        }
      });

      // Fetch active cars
      const carRows = await sql`SELECT data FROM piyush_cars;`;
      const cars = carRows
        .map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data))
        .filter(c => c.active !== false);

      // Fetch destinations
      const destRows = await sql`SELECT data FROM piyush_destinations;`;
      const destinations = destRows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));

      // Fetch pickup locations
      const locRows = await sql`SELECT name FROM piyush_pickup_locations ORDER BY id ASC;`;
      const pickupLocations = locRows.map(r => r.name);

      return {
        settings,
        cars,
        destinations,
        pickupLocations
      };
    } catch (err) {
      console.error('Neon getPublicData error:', err);
    }
  }

  // Local fallback
  const local = readLocalDatabase();
  const publicSettings = { ...local.settings };
  delete publicSettings.adminPassword;
  return {
    settings: publicSettings,
    cars: (local.cars || []).filter(c => c.active !== false),
    destinations: local.destinations || [],
    pickupLocations: local.pickupLocations || []
  };
}

// -------------------------------------------------------------
// LEADS METHODS
// -------------------------------------------------------------
async function createLead(lead) {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      await sql`
        INSERT INTO piyush_leads (id, data, created_at)
        VALUES (${lead.id}, ${JSON.stringify(lead)}, NOW());
      `;
      return lead;
    } catch (err) {
      console.error('Neon createLead error:', err);
    }
  }

  // Local fallback
  const db = readLocalDatabase();
  if (!Array.isArray(db.leads)) db.leads = [];
  db.leads.unshift(lead);
  writeLocalDatabase(db);
  return lead;
}

async function getAdminData() {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      // Settings
      const settingsRows = await sql`SELECT key, value FROM piyush_settings;`;
      const settings = {};
      settingsRows.forEach(row => {
        settings[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      });

      // Cars
      const carRows = await sql`SELECT data FROM piyush_cars;`;
      const cars = carRows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));

      // Destinations
      const destRows = await sql`SELECT data FROM piyush_destinations;`;
      const destinations = destRows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));

      // Pickup locations
      const locRows = await sql`SELECT name FROM piyush_pickup_locations ORDER BY id ASC;`;
      const pickupLocations = locRows.map(r => r.name);

      // Leads (latest first)
      const leadRows = await sql`SELECT data FROM piyush_leads ORDER BY created_at DESC;`;
      const leads = leadRows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));

      return { settings, cars, destinations, pickupLocations, leads };
    } catch (err) {
      console.error('Neon getAdminData error:', err);
    }
  }

  return readLocalDatabase();
}

async function updateLead(leadId, updates) {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      const rows = await sql`SELECT data FROM piyush_leads WHERE id = ${leadId};`;
      if (rows.length > 0) {
        const current = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        const merged = { ...current, ...updates };
        await sql`
          UPDATE piyush_leads
          SET data = ${JSON.stringify(merged)}
          WHERE id = ${leadId};
        `;
        return merged;
      }
    } catch (err) {
      console.error('Neon updateLead error:', err);
    }
  }

  // Local fallback
  const db = readLocalDatabase();
  const idx = (db.leads || []).findIndex(l => l.id === leadId);
  if (idx !== -1) {
    db.leads[idx] = { ...db.leads[idx], ...updates };
    writeLocalDatabase(db);
    return db.leads[idx];
  }
  return null;
}

async function deleteLead(leadId) {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      await sql`DELETE FROM piyush_leads WHERE id = ${leadId};`;
      return true;
    } catch (err) {
      console.error('Neon deleteLead error:', err);
    }
  }

  // Local fallback
  const db = readLocalDatabase();
  db.leads = (db.leads || []).filter(l => l.id !== leadId);
  writeLocalDatabase(db);
  return true;
}

// -------------------------------------------------------------
// FLEET, DESTINATIONS, LOCATIONS & SETTINGS UPDATERS
// -------------------------------------------------------------
async function updateCars(cars) {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      await sql`DELETE FROM piyush_cars;`;
      for (const car of cars) {
        await sql`
          INSERT INTO piyush_cars (id, data)
          VALUES (${car.id}, ${JSON.stringify(car)});
        `;
      }
      return cars;
    } catch (err) {
      console.error('Neon updateCars error:', err);
    }
  }

  const db = readLocalDatabase();
  db.cars = cars;
  writeLocalDatabase(db);
  return cars;
}

async function updateDestinations(destinations) {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      await sql`DELETE FROM piyush_destinations;`;
      for (const dest of destinations) {
        await sql`
          INSERT INTO piyush_destinations (id, data)
          VALUES (${dest.id}, ${JSON.stringify(dest)});
        `;
      }
      return destinations;
    } catch (err) {
      console.error('Neon updateDestinations error:', err);
    }
  }

  const db = readLocalDatabase();
  db.destinations = destinations;
  writeLocalDatabase(db);
  return destinations;
}

async function updatePickupLocations(locations) {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      await sql`DELETE FROM piyush_pickup_locations;`;
      for (const loc of locations) {
        await sql`
          INSERT INTO piyush_pickup_locations (name)
          VALUES (${loc});
        `;
      }
      return locations;
    } catch (err) {
      console.error('Neon updatePickupLocations error:', err);
    }
  }

  const db = readLocalDatabase();
  db.pickupLocations = locations;
  writeLocalDatabase(db);
  return locations;
}

async function updateSettings(settings) {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO piyush_settings (key, value)
          VALUES (${key}, ${JSON.stringify(value)})
          ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)};
        `;
      }
      return settings;
    } catch (err) {
      console.error('Neon updateSettings error:', err);
    }
  }

  const db = readLocalDatabase();
  db.settings = { ...db.settings, ...settings };
  writeLocalDatabase(db);
  return db.settings;
}

async function getAdminPassword() {
  const sql = getSqlClient();
  if (sql) {
    await initNeonDatabase();
    try {
      const rows = await sql`SELECT value FROM piyush_settings WHERE key = 'adminPassword';`;
      if (rows.length > 0) {
        return typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
      }
    } catch (err) {
      console.error('Neon getAdminPassword error:', err);
    }
  }

  const db = readLocalDatabase();
  return (db.settings && db.settings.adminPassword) || 'admin';
}

module.exports = {
  isNeonConfigured,
  initNeonDatabase,
  getPublicData,
  getAdminData,
  createLead,
  updateLead,
  deleteLead,
  updateCars,
  updateDestinations,
  updatePickupLocations,
  updateSettings,
  getAdminPassword
};
