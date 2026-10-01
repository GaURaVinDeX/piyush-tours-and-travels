/**
 * PIYUSH TOURS AND TRAVELS - ADMIN DASHBOARD JAVASCRIPT
 * Full control over Leads, Car Fleet, Rates Per KM, Destinations, Distances, and Business Settings.
 */

let adminToken = sessionStorage.getItem('piyush_admin_token') || localStorage.getItem('piyush_admin_token') || '';

let adminData = {
  settings: {},
  cars: [],
  destinations: [],
  pickupLocations: [],
  leads: []
};

let currentTab = 'leads';

document.addEventListener('DOMContentLoaded', () => {
  checkAuthAndInit();
});

// Check authentication status
function checkAuthAndInit() {
  const loginWrapper = document.getElementById('login-wrapper');
  const dashboardLayout = document.getElementById('dashboard-layout');

  if (!adminToken) {
    if (loginWrapper) loginWrapper.style.display = 'flex';
    if (dashboardLayout) dashboardLayout.style.display = 'none';
    setupLoginForm();
  } else {
    if (loginWrapper) loginWrapper.style.display = 'none';
    if (dashboardLayout) dashboardLayout.style.display = 'flex';
    fetchAdminData();
    setupDashboardUI();
  }
}

// Setup Login Form handler
function setupLoginForm() {
  const form = document.getElementById('admin-login-form');
  const errBox = document.getElementById('login-error-msg');

  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passInput = document.getElementById('admin-password-input');
    const password = passInput ? passInput.value.trim() : '';

    if (!password) {
      if (errBox) {
        errBox.textContent = 'Please enter admin password.';
        errBox.style.display = 'block';
      }
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        adminToken = data.token || password;
        sessionStorage.setItem('piyush_admin_token', adminToken);
        localStorage.setItem('piyush_admin_token', adminToken);
        checkAuthAndInit();
      } else {
        if (errBox) {
          errBox.textContent = data.error || 'Incorrect password. Default is "admin".';
          errBox.style.display = 'block';
        }
      }
    } catch (err) {
      // Local fallback check if offline
      if (password === 'admin') {
        adminToken = 'admin';
        sessionStorage.setItem('piyush_admin_token', adminToken);
        checkAuthAndInit();
      } else if (errBox) {
        errBox.textContent = 'Server connection failed. Try "admin".';
        errBox.style.display = 'block';
      }
    }
  });
}

// Logout handler
window.handleAdminLogout = function() {
  sessionStorage.removeItem('piyush_admin_token');
  localStorage.removeItem('piyush_admin_token');
  adminToken = '';
  location.reload();
};

// Fetch all admin data
async function fetchAdminData() {
  try {
    const res = await fetch('/api/admin/all', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        adminData = data;
        // Merge any leads created offline in localStorage
        mergeLocalLeads();
        renderActiveTab();
        updateTopStats();
        return;
      }
    }
  } catch (err) {
    console.warn('API error, loading cached data:', err);
  }

  // Fallback to local data
  const localBackup = localStorage.getItem('piyush_travels_admin_backup');
  if (localBackup) {
    try {
      adminData = JSON.parse(localBackup);
    } catch(e) {}
  }
  mergeLocalLeads();
  renderActiveTab();
  updateTopStats();
}

// Merge locally saved leads if server was offline
function mergeLocalLeads() {
  try {
    const localLeads = JSON.parse(localStorage.getItem('piyush_local_leads') || '[]');
    if (localLeads.length > 0) {
      if (!Array.isArray(adminData.leads)) adminData.leads = [];
      localLeads.forEach(locLead => {
        if (!adminData.leads.some(l => l.id === locLead.id)) {
          adminData.leads.unshift(locLead);
        }
      });
    }
  } catch (e) {}
}

// Setup dashboard UI tabs and events
function setupDashboardUI() {
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentTab = link.dataset.tab;
      renderActiveTab();
    });
  });

  // Search input for leads
  const searchInput = document.getElementById('lead-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderLeadsTable();
    });
  }

  // Status filter for leads
  const statusFilter = document.getElementById('lead-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      renderLeadsTable();
    });
  }
}

// Update Top Metric Stat Cards
function updateTopStats() {
  const leads = adminData.leads || [];
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => (l.status || '').toLowerCase() === 'new').length;
  const bookedLeads = leads.filter(l => (l.status || '').toLowerCase() === 'booked' || (l.status || '').toLowerCase() === 'completed').length;
  
  // Pipeline estimated value
  const totalPipelineRevenue = leads
    .filter(l => l.status !== 'Cancelled')
    .reduce((acc, curr) => acc + (Number(curr.estimatedFare) || 0), 0);

  const elTotal = document.getElementById('stat-total-leads');
  const elNew = document.getElementById('stat-new-leads');
  const elBooked = document.getElementById('stat-booked-leads');
  const elRev = document.getElementById('stat-pipeline-rev');
  const elBadge = document.getElementById('sidebar-new-leads-badge');

  if (elTotal) elTotal.textContent = totalLeads;
  if (elNew) elNew.textContent = newLeads;
  if (elBooked) elBooked.textContent = bookedLeads;
  if (elRev) elRev.textContent = `₹${totalPipelineRevenue.toLocaleString('en-IN')}`;
  if (elBadge) {
    elBadge.textContent = newLeads;
    elBadge.style.display = newLeads > 0 ? 'inline-block' : 'none';
  }
}

// Render active tab view
function renderActiveTab() {
  const sections = document.querySelectorAll('.admin-tab-section');
  sections.forEach(s => s.style.display = 'none');

  const currentSection = document.getElementById(`tab-content-${currentTab}`);
  if (currentSection) {
    currentSection.style.display = 'block';
  }

  const topbarTitle = document.getElementById('admin-topbar-title');
  if (topbarTitle) {
    const titles = {
      'leads': 'Customer Leads & Inquiries',
      'fleet': 'Fleet & Price per KM Management',
      'destinations': 'Outstation Destinations & Distances',
      'locations': 'Mumbai Pickup Sub-Locations',
      'settings': 'Business & Pricing Settings'
    };
    topbarTitle.textContent = titles[currentTab] || 'Admin Dashboard';
  }

  if (currentTab === 'leads') renderLeadsTable();
  if (currentTab === 'fleet') renderFleetManagement();
  if (currentTab === 'destinations') renderDestinationsManagement();
  if (currentTab === 'locations') renderLocationsManagement();
  if (currentTab === 'settings') renderSettingsForm();
}

// ===================================================================
// TAB 1: CUSTOMER LEADS MANAGEMENT
// ===================================================================
function renderLeadsTable() {
  const tbody = document.getElementById('leads-table-body');
  if (!tbody) return;

  const searchQuery = (document.getElementById('lead-search-input')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('lead-status-filter')?.value || 'all';

  let filtered = (adminData.leads || []).filter(lead => {
    const matchesSearch = 
      (lead.name || '').toLowerCase().includes(searchQuery) ||
      (lead.phone || '').includes(searchQuery) ||
      (lead.pickup || '').toLowerCase().includes(searchQuery) ||
      (lead.drop || '').toLowerCase().includes(searchQuery) ||
      (lead.carName || '').toLowerCase().includes(searchQuery);

    const matchesStatus = (statusFilter === 'all') || ((lead.status || '').toLowerCase() === statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:40px; color:var(--admin-muted);">
          No leads found matching your criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach(lead => {
    const tr = document.createElement('tr');

    const statusClass = (lead.status || 'New').toLowerCase();
    const cleanPhone = (lead.phone || '').replace(/[^\d]/g, '');

    // Formatted WhatsApp reply message
    const replyMsg = `Hello ${lead.name}, Thank you for inquiring with Piyush Tours & Travels Mumbai for your cab to ${lead.drop}. We have ${lead.carName} available for ${lead.date}. Total estimated fare is ₹${lead.estimatedFare}. Shall we confirm your cab?`;
    const waReplyUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(replyMsg)}`;

    tr.innerHTML = `
      <td><strong>${lead.id || 'LEAD'}</strong></td>
      <td>
        <div style="font-weight:700; color:var(--admin-secondary);">${lead.name}</div>
        <div style="font-size:0.8rem; color:var(--admin-muted);">${lead.phone}</div>
      </td>
      <td>
        <div><strong>${lead.pickup}</strong> ${lead.pickupCustom ? `<span style="font-size:0.75rem; color:#b45309;">(${lead.pickupCustom})</span>` : ''}</div>
        <div style="font-size:0.8rem; color:var(--admin-muted);">➔ ${lead.drop} ${lead.dropCustom ? `(${lead.dropCustom})` : ''}</div>
      </td>
      <td>
        <div><span class="badge-status" style="background:#e2e8f0; color:#334155;">${lead.tripType}</span></div>
        <div style="font-size:0.8rem; color:var(--admin-muted); margin-top:3px;">${lead.carName}</div>
      </td>
      <td>
        <div>${lead.date}</div>
        <div style="font-size:0.8rem; color:var(--admin-muted);">${lead.time}</div>
      </td>
      <td>
        <strong style="color:var(--admin-primary); font-size:1rem;">₹${Number(lead.estimatedFare).toLocaleString('en-IN')}</strong>
        <div style="font-size:0.75rem; color:var(--admin-muted);">${lead.km} km</div>
      </td>
      <td>
        <select class="form-control" style="padding:4px 8px; font-size:0.82rem; font-weight:700;" onchange="updateLeadStatus('${lead.id}', this.value)">
          <option value="New" ${lead.status === 'New' ? 'selected' : ''}>🟢 New</option>
          <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>🟡 Contacted</option>
          <option value="Booked" ${lead.status === 'Booked' ? 'selected' : ''}>🔵 Booked</option>
          <option value="Completed" ${lead.status === 'Completed' ? 'selected' : ''}>🟣 Completed</option>
          <option value="Cancelled" ${lead.status === 'Cancelled' ? 'selected' : ''}>🔴 Cancelled</option>
        </select>
      </td>
      <td>
        <div class="action-buttons">
          <a href="tel:+91${cleanPhone}" class="btn-icon call" title="Call Customer">📞</a>
          <a href="${waReplyUrl}" target="_blank" class="btn-icon whatsapp" title="Chat on WhatsApp">💬</a>
          <button class="btn-icon" title="View / Edit Note" onclick="openLeadNotesModal('${lead.id}')">📝</button>
          <button class="btn-icon delete" title="Delete Lead" onclick="deleteLead('${lead.id}')">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Update Lead Status via API
window.updateLeadStatus = async function(leadId, newStatus) {
  try {
    const res = await fetch(`/api/admin/leads/${leadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      const idx = adminData.leads.findIndex(l => l.id === leadId);
      if (idx !== -1) adminData.leads[idx].status = newStatus;
      updateTopStats();
      showAdminToast(`Lead status updated to ${newStatus}`);
    }
  } catch (err) {
    showAdminToast('Failed to update lead status on server', 'error');
  }
};

// Delete a Lead
window.deleteLead = async function(leadId) {
  if (!confirm(`Are you sure you want to delete lead ${leadId}?`)) return;

  try {
    const res = await fetch(`/api/admin/leads/${leadId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.ok) {
      adminData.leads = adminData.leads.filter(l => l.id !== leadId);
      renderLeadsTable();
      updateTopStats();
      showAdminToast(`Lead ${leadId} deleted successfully`);
    }
  } catch (err) {
    showAdminToast('Could not delete lead', 'error');
  }
};

// Export all leads to CSV
window.exportLeadsToCsv = function() {
  window.open(`/api/admin/export-leads?token=${adminToken}`, '_blank');
};

// Open lead notes modal
window.openLeadNotesModal = function(leadId) {
  const lead = adminData.leads.find(l => l.id === leadId);
  if (!lead) return;

  const newNotes = prompt(`Enter notes for customer ${lead.name} (${lead.phone}):`, lead.notes || '');
  if (newNotes !== null) {
    lead.notes = newNotes;
    updateLeadNotes(leadId, newNotes);
  }
};

async function updateLeadNotes(leadId, notes) {
  try {
    await fetch(`/api/admin/leads/${leadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ notes })
    });
    showAdminToast('Notes saved.');
  } catch (e) {}
}

// ===================================================================
// TAB 2: CAR FLEET & PRICE PER KM MANAGEMENT
// ===================================================================
function renderFleetManagement() {
  const container = document.getElementById('cars-table-body');
  if (!container) return;

  container.innerHTML = '';
  (adminData.cars || []).forEach(car => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img src="${car.image || 'images/dzire.svg'}" alt="${car.name}" style="height:36px; object-fit:contain;" />
      </td>
      <td>
        <strong>${car.name}</strong>
        <div style="font-size:0.8rem; color:var(--admin-muted);">${car.description || ''}</div>
      </td>
      <td><span class="badge-status" style="background:#e0f2fe; color:#0369a1;">${car.category}</span></td>
      <td>
        <div style="display:flex; align-items:center; gap:4px;">
          <span>₹</span>
          <input type="number" class="inline-edit-input" value="${car.ratePerKm}" id="rate-input-${car.id}" />
          <span>/km</span>
        </div>
      </td>
      <td>
        <input type="number" class="inline-edit-input" style="width:70px;" value="${car.minKmPerDay || 250}" id="minkm-input-${car.id}" /> km/day
      </td>
      <td>
        <input type="number" class="inline-edit-input" style="width:85px;" value="${car.hourlyPackagePrice || 2200}" id="hourly-input-${car.id}" />
      </td>
      <td>
        <span style="font-size:0.85rem;">👥 ${car.seating}</span>
      </td>
      <td>
        <input type="checkbox" ${car.active !== false ? 'checked' : ''} id="active-check-${car.id}" />
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-primary btn-sm" onclick="saveSingleCar('${car.id}')">Save</button>
          <button class="btn-icon delete" onclick="deleteCar('${car.id}')" title="Delete Car">🗑️</button>
        </div>
      </td>
    `;
    container.appendChild(tr);
  });
}

// Save edited car rates
window.saveSingleCar = async function(carId) {
  const car = adminData.cars.find(c => c.id === carId);
  if (!car) return;

  const rateEl = document.getElementById(`rate-input-${carId}`);
  const minKmEl = document.getElementById(`minkm-input-${carId}`);
  const hourlyEl = document.getElementById(`hourly-input-${carId}`);
  const activeEl = document.getElementById(`active-check-${carId}`);

  if (rateEl) car.ratePerKm = Number(rateEl.value) || car.ratePerKm;
  if (minKmEl) car.minKmPerDay = Number(minKmEl.value) || car.minKmPerDay;
  if (hourlyEl) car.hourlyPackagePrice = Number(hourlyEl.value) || car.hourlyPackagePrice;
  if (activeEl) car.active = activeEl.checked;

  await syncCarsToServer();
};

// Delete a car from fleet
window.deleteCar = async function(carId) {
  if (!confirm('Are you sure you want to remove this car from the fleet?')) return;
  adminData.cars = adminData.cars.filter(c => c.id !== carId);
  await syncCarsToServer();
  renderFleetManagement();
};

// Open Add Car Modal
window.openAddCarModal = function() {
  const modal = document.getElementById('add-car-modal');
  if (modal) modal.classList.add('active');
};

// Save newly created car
window.handleAddCarSubmit = async function(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('new-car-name')?.value.trim();
  const category = document.getElementById('new-car-category')?.value;
  const ratePerKm = Number(document.getElementById('new-car-rate')?.value) || 14;
  const minKmPerDay = Number(document.getElementById('new-car-minkm')?.value) || 250;
  const seating = document.getElementById('new-car-seating')?.value.trim() || '4 + 1 Driver';
  const luggage = document.getElementById('new-car-luggage')?.value.trim() || '3 Bags';
  const hourlyPrice = Number(document.getElementById('new-car-hourly')?.value) || 2400;
  const desc = document.getElementById('new-car-desc')?.value.trim() || '';

  if (!name) {
    alert('Please enter car name');
    return;
  }

  // Pick appropriate SVG graphic based on category
  let defaultSvg = 'images/dzire.svg';
  if (category === 'Hatchback') defaultSvg = 'images/swift.svg';
  if (category === 'SUV') defaultSvg = 'images/ertiga.svg';
  if (category === 'Innova Crysta') defaultSvg = 'images/innova.svg';
  if (category === 'Traveller') defaultSvg = 'images/traveller.svg';

  const newCar = {
    id: 'car-' + Date.now().toString().slice(-5),
    name,
    category,
    ratePerKm,
    minKmPerDay,
    seating,
    luggage,
    hourlyPackagePrice: hourlyPrice,
    hourlyPackageHours: 8,
    hourlyPackageKm: 80,
    airportBaseFare: Math.round(hourlyPrice * 0.5),
    ac: true,
    fuelType: 'Petrol / Diesel',
    image: defaultSvg,
    description: desc,
    active: true
  };

  adminData.cars.push(newCar);
  await syncCarsToServer();
  closeAdminModal('add-car-modal');
  renderFleetManagement();
};

async function syncCarsToServer() {
  try {
    const res = await fetch('/api/admin/cars', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ cars: adminData.cars })
    });
    if (res.ok) {
      showAdminToast('Fleet & Per KM rates updated successfully!');
    }
  } catch (err) {
    showAdminToast('Saved locally', 'warning');
  }
}

// ===================================================================
// TAB 3: DESTINATIONS & KM MANAGEMENT
// ===================================================================
function renderDestinationsManagement() {
  const container = document.getElementById('destinations-table-body');
  if (!container) return;

  container.innerHTML = '';
  (adminData.destinations || []).forEach(dest => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input type="text" class="form-control" style="width:200px; padding:6px 10px;" value="${dest.name}" id="dest-name-${dest.id}" />
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <input type="number" class="inline-edit-input" value="${dest.km}" id="dest-km-${dest.id}" />
          <span>KM</span>
        </div>
      </td>
      <td>
        <input type="text" class="form-control" style="width:120px; padding:6px 10px;" value="${dest.duration || '3 hrs'}" id="dest-dur-${dest.id}" />
      </td>
      <td>
        <input type="checkbox" ${dest.popular ? 'checked' : ''} id="dest-pop-${dest.id}" />
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-primary btn-sm" onclick="saveSingleDestination('${dest.id}')">Save</button>
          <button class="btn-icon delete" onclick="deleteDestination('${dest.id}')" title="Delete">🗑️</button>
        </div>
      </td>
    `;
    container.appendChild(tr);
  });
}

window.saveSingleDestination = async function(destId) {
  const dest = adminData.destinations.find(d => d.id === destId);
  if (!dest) return;

  const nameEl = document.getElementById(`dest-name-${destId}`);
  const kmEl = document.getElementById(`dest-km-${destId}`);
  const durEl = document.getElementById(`dest-dur-${destId}`);
  const popEl = document.getElementById(`dest-pop-${destId}`);

  if (nameEl) dest.name = nameEl.value.trim();
  if (kmEl) dest.km = Number(kmEl.value) || dest.km;
  if (durEl) dest.duration = durEl.value.trim();
  if (popEl) dest.popular = popEl.checked;

  await syncDestinationsToServer();
};

window.deleteDestination = async function(destId) {
  if (!confirm('Are you sure you want to remove this destination?')) return;
  adminData.destinations = adminData.destinations.filter(d => d.id !== destId);
  await syncDestinationsToServer();
  renderDestinationsManagement();
};

window.openAddDestinationModal = function() {
  const modal = document.getElementById('add-destination-modal');
  if (modal) modal.classList.add('active');
};

window.handleAddDestinationSubmit = async function(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('new-dest-name')?.value.trim();
  const km = Number(document.getElementById('new-dest-km')?.value) || 100;
  const duration = document.getElementById('new-dest-duration')?.value.trim() || '3 hrs';
  const popular = document.getElementById('new-dest-popular')?.checked || false;

  if (!name) {
    alert('Please enter destination city/place name');
    return;
  }

  const newDest = {
    id: 'dest-' + Date.now().toString().slice(-5),
    name,
    km,
    duration,
    popular,
    description: `Direct highway cab from Mumbai to ${name}.`
  };

  adminData.destinations.push(newDest);
  await syncDestinationsToServer();
  closeAdminModal('add-destination-modal');
  renderDestinationsManagement();
};

async function syncDestinationsToServer() {
  try {
    const res = await fetch('/api/admin/destinations', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ destinations: adminData.destinations })
    });
    if (res.ok) {
      showAdminToast('Destinations & KM saved successfully!');
    }
  } catch (e) {
    showAdminToast('Saved locally', 'warning');
  }
}

// ===================================================================
// TAB 4: MUMBAI PICKUP LOCATIONS MANAGEMENT
// ===================================================================
function renderLocationsManagement() {
  const container = document.getElementById('locations-list-body');
  if (!container) return;

  container.innerHTML = '';
  (adminData.pickupLocations || []).forEach((loc, index) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.marginBottom = '10px';
    row.style.alignItems = 'center';

    row.innerHTML = `
      <input type="text" class="form-control" value="${loc}" id="loc-input-${index}" style="flex-grow:1;" />
      <button class="btn btn-outline btn-sm" onclick="saveSingleLocation(${index})">Save</button>
      <button class="btn-icon delete" onclick="deleteLocation(${index})" title="Delete">🗑️</button>
    `;
    container.appendChild(row);
  });
}

window.saveSingleLocation = async function(index) {
  const input = document.getElementById(`loc-input-${index}`);
  if (input && input.value.trim()) {
    adminData.pickupLocations[index] = input.value.trim();
    await syncLocationsToServer();
  }
};

window.deleteLocation = async function(index) {
  adminData.pickupLocations.splice(index, 1);
  await syncLocationsToServer();
  renderLocationsManagement();
};

window.addNewLocation = async function() {
  const input = document.getElementById('new-location-input');
  if (input && input.value.trim()) {
    adminData.pickupLocations.push(input.value.trim());
    input.value = '';
    await syncLocationsToServer();
    renderLocationsManagement();
  }
};

async function syncLocationsToServer() {
  try {
    await fetch('/api/admin/pickup-locations', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ pickupLocations: adminData.pickupLocations })
    });
    showAdminToast('Mumbai pickup locations updated');
  } catch (e) {}
}

// ===================================================================
// TAB 5: BUSINESS & PRICING SETTINGS
// ===================================================================
function renderSettingsForm() {
  const s = adminData.settings || {};
  const setValue = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined ? val : '';
  };

  setValue('setting-business-name', s.businessName || 'Piyush tours and travels');
  setValue('setting-phone', s.phone || '+91 97691 32932');
  setValue('setting-whatsapp', s.whatsapp || '919769132932');
  setValue('setting-email', s.email || 'booking@piyushtoursandtravels.com');
  setValue('setting-address', s.address || 'Andheri East, Mumbai');
  setValue('setting-driver-allowance', s.driverAllowancePerDay || 400);
  setValue('setting-night-allowance', s.nightAllowance || 250);
  setValue('setting-min-km', s.minKmPerDay || 250);
  setValue('setting-terms', s.termsNote || '');
}

window.handleSaveSettings = async function(e) {
  if (e) e.preventDefault();

  const getValue = (id) => document.getElementById(id)?.value.trim();

  const updatedSettings = {
    businessName: getValue('setting-business-name'),
    phone: getValue('setting-phone'),
    whatsapp: getValue('setting-whatsapp'),
    email: getValue('setting-email'),
    address: getValue('setting-address'),
    driverAllowancePerDay: Number(getValue('setting-driver-allowance')) || 400,
    nightAllowance: Number(getValue('setting-night-allowance')) || 250,
    minKmPerDay: Number(getValue('setting-min-km')) || 250,
    termsNote: getValue('setting-terms')
  };

  const newPass = getValue('setting-new-password');
  if (newPass) {
    updatedSettings.adminPassword = newPass;
  }

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(updatedSettings)
    });

    if (res.ok) {
      adminData.settings = { ...adminData.settings, ...updatedSettings };
      showAdminToast('All settings saved successfully!');
    }
  } catch (err) {
    showAdminToast('Saved locally', 'warning');
  }
};

// Modal helpers
window.closeAdminModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
};

// Admin Toast
window.showAdminToast = function(msg, type = 'info') {
  let container = document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.background = '#0f172a';
  toast.style.color = '#fff';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.marginBottom = '10px';
  toast.style.fontSize = '0.9rem';
  toast.style.fontWeight = '600';
  toast.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
  toast.style.borderLeft = '4px solid #d97706';
  toast.textContent = msg;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};
