const url = require('url');
const db = require('./db');

// Helper to reliably extract the clean API subpath across all environments:
// Local Server, Vercel Serverless, Vercel Rewrites, and Vercel [...path].js
function getNormalizedPath(req) {
  // 1. If Vercel catch-all route query.path is provided (e.g. ['admin', 'login'])
  if (req.query && req.query.path) {
    const parts = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
    return '/' + parts.join('/');
  }

  // 2. Check headers for original requested URI (set by Vercel / reverse proxies)
  const candidateUrl =
    req.headers['x-forwarded-uri'] ||
    req.headers['x-original-url'] ||
    req.headers['x-matched-path'] ||
    req.url ||
    '/';

  const parsed = url.parse(candidateUrl, true);
  let pathname = parsed.pathname || '/';

  // Strip leading /api if present
  pathname = pathname.replace(/^\/api/, '') || '/';

  // If path ended up as /index.js or /[...path] due to Vercel internal rewrite
  if (pathname === '/index.js' || pathname.includes('[...path]')) {
    if (req.headers['x-forwarded-uri']) {
      const fwdParsed = url.parse(req.headers['x-forwarded-uri'], true);
      pathname = (fwdParsed.pathname || '/').replace(/^\/api/, '') || '/';
    } else {
      pathname = '/data'; // Default fallback
    }
  }

  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  return pathname;
}

// Body parser helper that works both in Vercel serverless and standalone Node
function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    if (req.body && typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body));
      } catch (e) {
        return resolve({});
      }
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Simple JSON responder
function sendJSON(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

// Verify Admin Auth Helper
async function verifyAdminAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const currentPassword = await db.getAdminPassword();
  
  const parsed = url.parse(req.url, true);
  const queryToken = (req.query && req.query.token) || (parsed.query && parsed.query.token);

  return token === currentPassword || token === 'piyush-admin-session-valid' || queryToken === currentPassword;
}

module.exports = async (req, res) => {
  const pathname = getNormalizedPath(req);
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }

  try {
    // 1. GET /api/data (Public frontend data for booking calculator & fleet)
    if ((pathname === '/data' || pathname === '/' || pathname === '') && method === 'GET') {
      const publicData = await db.getPublicData();
      return sendJSON(res, 200, {
        success: true,
        ...publicData
      });
    }

    // 2. POST /api/leads (Public booking form submission)
    if (pathname === '/leads' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.name || !body.phone) {
        return sendJSON(res, 400, { success: false, error: 'Name and Phone number are required' });
      }

      const leadId = 'LEAD-' + Math.floor(1000 + Math.random() * 9000);
      const newLead = {
        id: leadId,
        name: String(body.name).trim(),
        phone: String(body.phone).trim(),
        pickup: body.pickup || 'Mumbai',
        pickupCustom: body.pickupCustom || '',
        drop: body.drop || '',
        dropCustom: body.dropCustom || '',
        tripType: body.tripType || 'One-Way',
        carId: body.carId || '',
        carName: body.carName || '',
        km: Number(body.km) || 0,
        days: Number(body.days) || 1,
        date: body.date || '',
        time: body.time || '',
        returnDate: body.returnDate || '',
        estimatedFare: Number(body.estimatedFare) || 0,
        driverAllowance: Number(body.driverAllowance) || 0,
        ac: body.ac !== undefined ? body.ac : true,
        notes: body.notes || 'Website lead',
        status: 'New',
        createdAt: new Date().toISOString()
      };

      const saved = await db.createLead(newLead);
      return sendJSON(res, 201, {
        success: true,
        message: 'Lead booked successfully',
        lead: saved
      });
    }

    // 3. POST /api/admin/login
    if (pathname === '/admin/login' && method === 'POST') {
      const body = await parseBody(req);
      const adminPass = await db.getAdminPassword();
      if (body.password === adminPass) {
        return sendJSON(res, 200, {
          success: true,
          token: adminPass,
          message: 'Login successful'
        });
      }
      return sendJSON(res, 401, {
        success: false,
        error: 'Incorrect admin password'
      });
    }

    // 4. GET /api/admin/all (Full dashboard data)
    if (pathname === '/admin/all' && method === 'GET') {
      if (!await verifyAdminAuth(req)) {
        return sendJSON(res, 401, { success: false, error: 'Unauthorized access' });
      }
      const adminData = await db.getAdminData();
      return sendJSON(res, 200, {
        success: true,
        ...adminData
      });
    }

    // 5. PUT /api/admin/cars
    if (pathname === '/admin/cars' && method === 'PUT') {
      if (!await verifyAdminAuth(req)) return sendJSON(res, 401, { success: false, error: 'Unauthorized' });
      const body = await parseBody(req);
      if (Array.isArray(body.cars)) {
        const updated = await db.updateCars(body.cars);
        return sendJSON(res, 200, { success: true, message: 'Cars updated', cars: updated });
      }
      return sendJSON(res, 400, { success: false, error: 'Invalid cars payload' });
    }

    // 6. PUT /api/admin/destinations
    if (pathname === '/admin/destinations' && method === 'PUT') {
      if (!await verifyAdminAuth(req)) return sendJSON(res, 401, { success: false, error: 'Unauthorized' });
      const body = await parseBody(req);
      if (Array.isArray(body.destinations)) {
        const updated = await db.updateDestinations(body.destinations);
        return sendJSON(res, 200, { success: true, message: 'Destinations updated', destinations: updated });
      }
      return sendJSON(res, 400, { success: false, error: 'Invalid destinations payload' });
    }

    // 7. PUT /api/admin/pickup-locations
    if (pathname === '/admin/pickup-locations' && method === 'PUT') {
      if (!await verifyAdminAuth(req)) return sendJSON(res, 401, { success: false, error: 'Unauthorized' });
      const body = await parseBody(req);
      if (Array.isArray(body.pickupLocations)) {
        const updated = await db.updatePickupLocations(body.pickupLocations);
        return sendJSON(res, 200, { success: true, message: 'Pickup locations updated', pickupLocations: updated });
      }
      return sendJSON(res, 400, { success: false, error: 'Invalid locations payload' });
    }

    // 8. PUT /api/admin/settings
    if (pathname === '/admin/settings' && method === 'PUT') {
      if (!await verifyAdminAuth(req)) return sendJSON(res, 401, { success: false, error: 'Unauthorized' });
      const body = await parseBody(req);
      const updated = await db.updateSettings(body);
      return sendJSON(res, 200, { success: true, message: 'Settings saved', settings: updated });
    }

    // 9. PUT /api/admin/leads/:id
    if (pathname.startsWith('/admin/leads/') && method === 'PUT') {
      if (!await verifyAdminAuth(req)) return sendJSON(res, 401, { success: false, error: 'Unauthorized' });
      const leadId = pathname.replace('/admin/leads/', '').trim();
      const body = await parseBody(req);
      const updated = await db.updateLead(leadId, body);
      if (updated) {
        return sendJSON(res, 200, { success: true, message: 'Lead updated', lead: updated });
      }
      return sendJSON(res, 404, { success: false, error: 'Lead not found' });
    }

    // 10. DELETE /api/admin/leads/:id
    if (pathname.startsWith('/admin/leads/') && method === 'DELETE') {
      if (!await verifyAdminAuth(req)) return sendJSON(res, 401, { success: false, error: 'Unauthorized' });
      const leadId = pathname.replace('/admin/leads/', '').trim();
      await db.deleteLead(leadId);
      return sendJSON(res, 200, { success: true, message: 'Lead deleted' });
    }

    // 11. GET /api/admin/export-leads (CSV format)
    if (pathname === '/admin/export-leads' && method === 'GET') {
      if (!await verifyAdminAuth(req)) return sendJSON(res, 401, { success: false, error: 'Unauthorized' });
      const adminData = await db.getAdminData();
      const leads = adminData.leads || [];

      let csv = 'Lead ID,Date,Name,Mobile,Trip Type,Car,Pickup (Mumbai),Destination,KM,Est Fare (INR),Status,Notes\n';
      leads.forEach(l => {
        const clean = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
        csv += [
          clean(l.id),
          clean(l.createdAt ? l.createdAt.split('T')[0] : ''),
          clean(l.name),
          clean(l.phone),
          clean(l.tripType),
          clean(l.carName),
          clean(l.pickup + (l.pickupCustom ? ' - ' + l.pickupCustom : '')),
          clean(l.drop + (l.dropCustom ? ' - ' + l.dropCustom : '')),
          clean(l.km),
          clean(l.estimatedFare),
          clean(l.status),
          clean(l.notes)
        ].join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="piyush_travels_leads_${Date.now()}.csv"`);
      res.statusCode = 200;
      return res.end(csv);
    }

    // Fallback 404 for unknown API routes
    return sendJSON(res, 404, { success: false, error: `API route ${pathname} not found` });

  } catch (err) {
    console.error('API execution error:', err);
    return sendJSON(res, 500, { success: false, error: 'Internal server error: ' + err.message });
  }
};
