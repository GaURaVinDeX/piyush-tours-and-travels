/**
 * PIYUSH TOURS AND TRAVELS - CLIENT APPLICATION JAVASCRIPT
 * Handles real-time fare calculator, booking submissions, WhatsApp integration,
 * dynamic fleet rendering, and route cards.
 */

// Global State
let appData = {
  settings: {
    businessName: "Piyush tours and travels",
    phone: "+91 97691 32932",
    whatsapp: "919769132932",
    email: "booking@piyushtoursandtravels.com",
    address: "Andheri East, Western Express Highway, Mumbai 400069",
    driverAllowancePerDay: 400,
    nightAllowance: 250,
    minKmPerDay: 250,
    currency: "₹"
  },
  cars: [],
  destinations: [],
  pickupLocations: []
};

let currentBookingState = {
  tripType: 'one-way', // 'one-way', 'round-trip', 'hourly', 'airport'
  pickup: '',
  pickupCustom: '',
  drop: '',
  dropCustom: '',
  dropKm: 150,
  carId: '',
  date: '',
  time: '08:00',
  returnDate: '',
  days: 1,
  ac: true,
  calculatedKm: 150,
  baseFare: 0,
  driverAllowance: 400,
  totalFare: 0,
  hourlyPackage: '8hr-80km'
};

// Default fallback data (used if backend is temporarily unreachable)
const DEFAULT_FALLBACK_DATA = {
  settings: {
    businessName: "Piyush tours and travels",
    phone: "+91 97691 32932",
    whatsapp: "919769132932",
    driverAllowancePerDay: 400,
    minKmPerDay: 250,
    currency: "₹"
  },
  cars: [
    { id: "car-hatchback", name: "Maruti Swift / WagonR", category: "Hatchback", ratePerKm: 11, seating: "4 + 1 Driver", luggage: "2 Bags", minKmPerDay: 250, hourlyPackagePrice: 1800, airportBaseFare: 900, ac: true, image: "images/swift.svg", description: "Budget-friendly economical ride for small families." },
    { id: "car-sedan", name: "Maruti Dzire / Etios", category: "Sedan", ratePerKm: 13, seating: "4 + 1 Driver", luggage: "3 Bags", minKmPerDay: 250, hourlyPackagePrice: 2200, airportBaseFare: 1100, ac: true, image: "images/dzire.svg", description: "Most popular choice! Comfortable legroom and large boot space." },
    { id: "car-suv", name: "Maruti Ertiga / Carens", category: "SUV", ratePerKm: 16, seating: "6 + 1 Driver", luggage: "4 Bags", minKmPerDay: 300, hourlyPackagePrice: 2800, airportBaseFare: 1600, ac: true, image: "images/ertiga.svg", description: "Spacious 7-seater for family getaways and extra luggage." },
    { id: "car-innova", name: "Toyota Innova Crysta", category: "Innova Crysta", ratePerKm: 21, seating: "7 + 1 Driver", luggage: "5 Bags", minKmPerDay: 300, hourlyPackagePrice: 3600, airportBaseFare: 2200, ac: true, image: "images/innova.svg", description: "Ultimate comfort, captain seats, perfect for long highway tours." },
    { id: "car-traveller", name: "Force Tempo Traveller", category: "Traveller", ratePerKm: 28, seating: "13 / 17 + 1 Driver", luggage: "10+ Bags", minKmPerDay: 300, hourlyPackagePrice: 5200, airportBaseFare: 3500, ac: true, image: "images/traveller.svg", description: "Ideal for large groups, pilgrimage & family functions." }
  ],
  destinations: [
    { id: "dest-pune", name: "Pune", km: 150, duration: "3 hrs", popular: true },
    { id: "dest-lonavala", name: "Lonavala / Khandala", km: 85, duration: "2 hrs", popular: true },
    { id: "dest-nashik", name: "Nashik", km: 170, duration: "3.5 hrs", popular: true },
    { id: "dest-shirdi", name: "Shirdi Sai Baba Temple", km: 245, duration: "4.5 hrs", popular: true },
    { id: "dest-mahabaleshwar", name: "Mahabaleshwar / Panchgani", km: 260, duration: "5.5 hrs", popular: true },
    { id: "dest-alibaug", name: "Alibaug", km: 100, duration: "2.5 hrs", popular: true },
    { id: "dest-goa", name: "Goa (North/South)", km: 590, duration: "10 hrs", popular: true },
    { id: "dest-surat", name: "Surat", km: 285, duration: "5 hrs", popular: false }
  ],
  pickupLocations: [
    "Mumbai Airport (Terminal 1 Domestic)",
    "Mumbai Airport (Terminal 2 International)",
    "Andheri (East / West)",
    "Bandra / BKC",
    "Borivali / Kandivali",
    "Dadar / Prabhadevi",
    "Thane / Mulund",
    "Navi Mumbai (Vashi / Panvel)",
    "Colaba / Churchgate",
    "Goregaon / Malad",
    "Powai / Ghatkopar",
    "Chembur / Kurla",
    "Kalyan / Dombivli",
    "Other Mumbai Location (Specify below)"
  ]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupDates();
  await loadData();
  initFormControls();
  renderFleetSection();
  renderRoutesSection();
  updateContactLinks();
  recalculateFare();
});

// Setup default date & return date
function setupDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateInput = document.getElementById('calc-pickup-date');
  const returnDateInput = document.getElementById('calc-return-date');

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (dateInput) {
    dateInput.value = todayStr;
    dateInput.min = todayStr;
    currentBookingState.date = todayStr;
  }
  if (returnDateInput) {
    returnDateInput.value = tomorrowStr;
    returnDateInput.min = todayStr;
    currentBookingState.returnDate = tomorrowStr;
  }
}

// Fetch live data from backend or local fallback
async function loadData() {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        appData.settings = data.settings || DEFAULT_FALLBACK_DATA.settings;
        appData.cars = (data.cars && data.cars.length > 0) ? data.cars : DEFAULT_FALLBACK_DATA.cars;
        appData.destinations = (data.destinations && data.destinations.length > 0) ? data.destinations : DEFAULT_FALLBACK_DATA.destinations;
        appData.pickupLocations = (data.pickupLocations && data.pickupLocations.length > 0) ? data.pickupLocations : DEFAULT_FALLBACK_DATA.pickupLocations;
        return;
      }
    }
  } catch (err) {
    console.warn('Backend API unavailable, using offline dataset:', err);
  }

  // Fallback to local storage or defaults
  const cached = localStorage.getItem('piyush_travels_data');
  if (cached) {
    try {
      appData = JSON.parse(cached);
      return;
    } catch (e) {}
  }
  appData = JSON.parse(JSON.stringify(DEFAULT_FALLBACK_DATA));
}

// Update Phone and WhatsApp anchor links across the page
function updateContactLinks() {
  const phone = appData.settings.phone || '+91 97691 32932';
  const whatsapp = appData.settings.whatsapp || '919769132932';
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  document.querySelectorAll('.js-phone-text').forEach(el => el.textContent = phone);
  document.querySelectorAll('.js-phone-link').forEach(el => el.href = `tel:${cleanPhone}`);
  document.querySelectorAll('.js-whatsapp-link').forEach(el => {
    el.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Hello Piyush Tours & Travels, I would like to inquire about car rental from Mumbai.')}`;
  });
}

// Initialize Interactive Form Controls
function initFormControls() {
  // Populate Mumbai Pickup Locations
  const pickupSelect = document.getElementById('calc-pickup-location');
  if (pickupSelect) {
    pickupSelect.innerHTML = '<option value="">-- Select Pickup Area in Mumbai --</option>';
    appData.pickupLocations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc;
      opt.textContent = loc;
      if (loc.includes('Andheri')) opt.selected = true;
      pickupSelect.appendChild(opt);
    });
    currentBookingState.pickup = pickupSelect.value;
  }

  // Populate Destinations
  populateDestinationsDropdown();

  // Populate Form Car Category Selector
  populateCarSelector();

  // Trip Type Tabs
  const tripTabs = document.querySelectorAll('.trip-tab-btn');
  tripTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tripTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentBookingState.tripType = tab.dataset.tripType;
      handleTripTypeChange();
      recalculateFare();
    });
  });

  // Pickup change
  const pickupEl = document.getElementById('calc-pickup-location');
  const pickupCustomBox = document.getElementById('pickup-custom-box');
  if (pickupEl) {
    pickupEl.addEventListener('change', (e) => {
      currentBookingState.pickup = e.target.value;
      if (e.target.value.includes('Other')) {
        if (pickupCustomBox) pickupCustomBox.style.display = 'block';
      } else {
        if (pickupCustomBox) pickupCustomBox.style.display = 'none';
        currentBookingState.pickupCustom = '';
      }
      recalculateFare();
    });
  }

  // Drop change
  const dropEl = document.getElementById('calc-drop-location');
  const dropCustomBox = document.getElementById('drop-custom-box');
  if (dropEl) {
    dropEl.addEventListener('change', (e) => {
      const selectedVal = e.target.value;
      if (selectedVal === 'custom') {
        if (dropCustomBox) dropCustomBox.style.display = 'block';
        currentBookingState.drop = 'Custom Destination';
        const customKmInput = document.getElementById('calc-custom-km');
        currentBookingState.dropKm = Number(customKmInput?.value) || 100;
      } else {
        if (dropCustomBox) dropCustomBox.style.display = 'none';
        const dest = appData.destinations.find(d => d.id === selectedVal || d.name === selectedVal);
        if (dest) {
          currentBookingState.drop = dest.name;
          currentBookingState.dropKm = dest.km;
        }
      }
      recalculateFare();
    });
  }

  // Custom KM input change
  const customKmInput = document.getElementById('calc-custom-km');
  if (customKmInput) {
    customKmInput.addEventListener('input', (e) => {
      currentBookingState.dropKm = Math.max(10, Number(e.target.value) || 50);
      recalculateFare();
    });
  }

  // Dates & Times
  const dateInput = document.getElementById('calc-pickup-date');
  const timeInput = document.getElementById('calc-pickup-time');
  const returnDateInput = document.getElementById('calc-return-date');

  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      currentBookingState.date = e.target.value;
      if (returnDateInput) {
        returnDateInput.min = e.target.value;
        if (returnDateInput.value < e.target.value) {
          returnDateInput.value = e.target.value;
        }
      }
      updateDaysCount();
      recalculateFare();
    });
  }

  if (timeInput) {
    timeInput.addEventListener('change', (e) => {
      currentBookingState.time = e.target.value;
    });
  }

  if (returnDateInput) {
    returnDateInput.addEventListener('change', (e) => {
      currentBookingState.returnDate = e.target.value;
      updateDaysCount();
      recalculateFare();
    });
  }

  // AC Toggle switch
  const acToggle = document.getElementById('calc-toggle-ac');
  if (acToggle) {
    acToggle.addEventListener('change', (e) => {
      currentBookingState.ac = e.target.checked;
      recalculateFare();
    });
  }

  // Hourly package select
  const hourlySelect = document.getElementById('calc-hourly-package');
  if (hourlySelect) {
    hourlySelect.addEventListener('change', (e) => {
      currentBookingState.hourlyPackage = e.target.value;
      recalculateFare();
    });
  }

  // Booking Form Submission Buttons
  const btnWhatsApp = document.getElementById('btn-book-whatsapp');
  if (btnWhatsApp) {
    btnWhatsApp.addEventListener('click', (e) => {
      e.preventDefault();
      handleBookingAction('whatsapp');
    });
  }

  const btnDirect = document.getElementById('btn-book-direct');
  if (btnDirect) {
    btnDirect.addEventListener('click', (e) => {
      e.preventDefault();
      handleBookingAction('direct');
    });
  }
}

// Populate Destinations dropdown list
function populateDestinationsDropdown() {
  const dropSelect = document.getElementById('calc-drop-location');
  if (!dropSelect) return;

  dropSelect.innerHTML = '<option value="">-- Select Destination from Mumbai --</option>';

  // Group popular ones
  const optGroupPopular = document.createElement('optgroup');
  optGroupPopular.label = 'Popular Outstation Routes (from Mumbai)';

  appData.destinations.forEach(dest => {
    const opt = document.createElement('option');
    opt.value = dest.id || dest.name;
    opt.textContent = `${dest.name} (${dest.km} km)`;
    optGroupPopular.appendChild(opt);
  });
  dropSelect.appendChild(optGroupPopular);

  // Custom destination option
  const optCustom = document.createElement('option');
  optCustom.value = 'custom';
  optCustom.textContent = '📍 Other Destination (Custom Distance)';
  dropSelect.appendChild(optCustom);

  // Set default to Pune if available
  const pune = appData.destinations.find(d => d.name.toLowerCase().includes('pune'));
  if (pune) {
    dropSelect.value = pune.id || pune.name;
    currentBookingState.drop = pune.name;
    currentBookingState.dropKm = pune.km;
  }
}

// Populate Car Category Selector inside the Booking Widget
function populateCarSelector() {
  const container = document.getElementById('car-selection-container');
  if (!container) return;

  container.innerHTML = '';
  appData.cars.forEach((car, index) => {
    const item = document.createElement('div');
    item.className = `car-select-item ${index === 1 ? 'selected' : ''}`;
    item.dataset.carId = car.id;

    if (index === 1) {
      currentBookingState.carId = car.id;
    }

    item.innerHTML = `
      <div class="car-type-name">${car.category}</div>
      <div class="car-rate-tag">₹${car.ratePerKm}/km</div>
      <div class="car-seats-tag">${car.seating.split(' ')[0]} Seater</div>
    `;

    item.addEventListener('click', () => {
      document.querySelectorAll('.car-select-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      currentBookingState.carId = car.id;
      recalculateFare();
    });

    container.appendChild(item);
  });

  if (!currentBookingState.carId && appData.cars.length > 0) {
    currentBookingState.carId = appData.cars[0].id;
  }
}

// Handle Trip Type switching logic
function handleTripTypeChange() {
  const type = currentBookingState.tripType;
  const returnDateGroup = document.getElementById('return-date-group');
  const dropLocationGroup = document.getElementById('drop-location-group');
  const hourlyGroup = document.getElementById('hourly-package-group');
  const pickupLabel = document.getElementById('pickup-field-label');

  if (returnDateGroup) {
    returnDateGroup.style.display = (type === 'round-trip') ? 'flex' : 'none';
  }

  if (dropLocationGroup) {
    dropLocationGroup.style.display = (type === 'hourly') ? 'none' : 'flex';
  }

  if (hourlyGroup) {
    hourlyGroup.style.display = (type === 'hourly') ? 'flex' : 'none';
  }

  if (pickupLabel) {
    if (type === 'airport') {
      pickupLabel.innerHTML = `Pickup / Drop Airport <span class="mumbai-fixed-badge">MUMBAI</span>`;
    } else {
      pickupLabel.innerHTML = `Pickup Location <span class="mumbai-fixed-badge">MUMBAI</span>`;
    }
  }

  updateDaysCount();
}

// Calculate days between pickup & return date for Round-Trip
function updateDaysCount() {
  if (currentBookingState.tripType === 'round-trip') {
    const start = new Date(currentBookingState.date);
    const end = new Date(currentBookingState.returnDate);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      currentBookingState.days = Math.max(1, diffDays);
    } else {
      currentBookingState.days = 1;
    }
  } else {
    currentBookingState.days = 1;
  }
}

// Core Fare Calculation Engine
function recalculateFare() {
  const selectedCar = appData.cars.find(c => c.id === currentBookingState.carId) || appData.cars[0];
  if (!selectedCar) return;

  const tripType = currentBookingState.tripType;
  const ratePerKm = Number(selectedCar.ratePerKm) || 12;
  const driverAllowancePerDay = Number(appData.settings.driverAllowancePerDay) || 400;
  let totalKm = 0;
  let baseFare = 0;
  let driverAllowance = 0;
  let billableKm = 0;

  if (tripType === 'one-way') {
    // One-way outstation: Exact road distance
    totalKm = currentBookingState.dropKm || 150;
    billableKm = totalKm;
    baseFare = billableKm * ratePerKm;
    driverAllowance = driverAllowancePerDay * 1;
  } else if (tripType === 'round-trip') {
    // Round-trip outstation: Double distance, check minimum km per day rule (e.g. 250 or 300 km/day)
    const minKmPerDay = Number(selectedCar.minKmPerDay) || Number(appData.settings.minKmPerDay) || 250;
    const actualRoundKm = (currentBookingState.dropKm || 150) * 2;
    const minRequiredKm = minKmPerDay * currentBookingState.days;

    billableKm = Math.max(actualRoundKm, minRequiredKm);
    totalKm = actualRoundKm;
    baseFare = billableKm * ratePerKm;
    driverAllowance = driverAllowancePerDay * currentBookingState.days;
  } else if (tripType === 'hourly') {
    // Local Mumbai 8hr/80km or 12hr/120km
    const packageType = currentBookingState.hourlyPackage || '8hr-80km';
    if (packageType === '12hr-120km') {
      baseFare = Math.round((selectedCar.hourlyPackagePrice || 2200) * 1.45);
      billableKm = 120;
    } else {
      baseFare = Number(selectedCar.hourlyPackagePrice) || 2200;
      billableKm = 80;
    }
    driverAllowance = 0; // Included in hourly rental package
  } else if (tripType === 'airport') {
    // Airport transfers
    baseFare = Number(selectedCar.airportBaseFare) || 1100;
    billableKm = 40;
    driverAllowance = 0;
  }

  // Non-AC discount / adjustment if customer explicitly turned AC off
  if (!currentBookingState.ac && (tripType === 'one-way' || tripType === 'round-trip')) {
    baseFare = Math.round(baseFare * 0.95); // 5% discount for Non-AC
  }

  const totalFare = Math.round(baseFare + driverAllowance);

  currentBookingState.calculatedKm = billableKm;
  currentBookingState.baseFare = baseFare;
  currentBookingState.driverAllowance = driverAllowance;
  currentBookingState.totalFare = totalFare;

  // Update UI Elements
  const elKm = document.getElementById('fare-display-km');
  const elBase = document.getElementById('fare-display-base');
  const elDriver = document.getElementById('fare-display-driver');
  const elTotal = document.getElementById('fare-display-total');
  const elDriverRow = document.getElementById('fare-driver-row');

  if (elKm) elKm.textContent = `${billableKm} KM`;
  if (elBase) elBase.textContent = `₹${baseFare.toLocaleString('en-IN')}`;
  if (elDriver) elDriver.textContent = `₹${driverAllowance.toLocaleString('en-IN')}`;
  if (elTotal) elTotal.textContent = `₹${totalFare.toLocaleString('en-IN')}`;

  if (elDriverRow) {
    elDriverRow.style.display = (driverAllowance > 0) ? 'flex' : 'none';
  }
}

// Validate Customer Inputs & Handle Booking Submission
async function handleBookingAction(actionType) {
  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const pickupCustomInput = document.getElementById('calc-pickup-custom');
  const dropCustomInput = document.getElementById('calc-drop-custom');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';

  if (!name) {
    showToast('Please enter your Name', 'error');
    if (nameInput) nameInput.focus();
    return;
  }

  // Clean phone number
  const cleanPhone = phone.replace(/[^\d]/g, '');
  if (cleanPhone.length < 10) {
    showToast('Please enter a valid 10-digit Mobile Number', 'error');
    if (phoneInput) phoneInput.focus();
    return;
  }

  const selectedCar = appData.cars.find(c => c.id === currentBookingState.carId) || appData.cars[0];
  const pickupLocation = currentBookingState.pickup || 'Mumbai';
  const pickupCustom = pickupCustomInput ? pickupCustomInput.value.trim() : '';
  const dropLocation = currentBookingState.drop || 'Pune';
  const dropCustom = dropCustomInput ? dropCustomInput.value.trim() : '';

  // Prepare Payload
  const leadPayload = {
    name: name,
    phone: cleanPhone,
    pickup: pickupLocation,
    pickupCustom: pickupCustom,
    drop: dropLocation,
    dropCustom: dropCustom,
    tripType: currentBookingState.tripType,
    carId: selectedCar.id,
    carName: selectedCar.name,
    km: currentBookingState.calculatedKm,
    days: currentBookingState.days,
    date: currentBookingState.date,
    time: currentBookingState.time,
    returnDate: (currentBookingState.tripType === 'round-trip') ? currentBookingState.returnDate : '',
    estimatedFare: currentBookingState.totalFare,
    driverAllowance: currentBookingState.driverAllowance,
    ac: currentBookingState.ac,
    notes: `Booked via website calculator (${actionType.toUpperCase()})`
  };

  // 1. Submit lead to database
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadPayload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.lead) leadPayload.id = data.lead.id;
    }
  } catch (err) {
    console.warn('Could not post lead to server, saving locally:', err);
    // Local fallback persistence
    saveLeadLocally(leadPayload);
  }

  // 2. Format WhatsApp Message
  const tripTypeFormatted = currentBookingState.tripType.toUpperCase().replace('-', ' ');
  const pickupFormatted = pickupCustom ? `${pickupLocation} (${pickupCustom})` : pickupLocation;
  const dropFormatted = dropCustom ? `${dropLocation} (${dropCustom})` : dropLocation;

  const waText = 
`*🚕 NEW CAB BOOKING ENQUIRY*
*Piyush Tours & Travels Mumbai*
----------------------------------------
👤 *Customer Name:* ${leadPayload.name}
📱 *Mobile Number:* ${leadPayload.phone}
📍 *Pickup:* ${pickupFormatted}
🎯 *Destination:* ${dropFormatted}
🛣️ *Trip Type:* ${tripTypeFormatted}
🚗 *Vehicle:* ${selectedCar.name} (${selectedCar.category})
📅 *Pickup Date:* ${leadPayload.date} at ${leadPayload.time}
${leadPayload.returnDate ? `🔄 *Return Date:* ${leadPayload.returnDate} (${leadPayload.days} Days)\n` : ''}💰 *Estimated Fare:* ₹${leadPayload.estimatedFare.toLocaleString('en-IN')}
----------------------------------------
• Driver Allowance: ₹${leadPayload.driverAllowance} included
• Toll & Parking: Extra as per actual receipts
• AC Status: ${leadPayload.ac ? 'AC Included' : 'Non-AC'}
----------------------------------------
_Please send driver & car details to confirm booking._`;

  const whatsappNumber = appData.settings.whatsapp || '919769132932';
  const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waText)}`;

  if (actionType === 'whatsapp') {
    // Open WhatsApp immediately
    window.open(waUrl, '_blank');
    showBookingSuccessModal(leadPayload, waUrl);
  } else {
    // Show direct confirmation modal with option to continue to WhatsApp
    showBookingSuccessModal(leadPayload, waUrl);
  }
}

// Fallback: save lead to localStorage if server is offline
function saveLeadLocally(lead) {
  try {
    lead.id = 'LOCAL-' + Date.now().toString().slice(-4);
    lead.createdAt = new Date().toISOString();
    const stored = JSON.parse(localStorage.getItem('piyush_local_leads') || '[]');
    stored.unshift(lead);
    localStorage.setItem('piyush_local_leads', JSON.stringify(stored));
  } catch (e) {}
}

// Display Booking Confirmation Modal
function showBookingSuccessModal(lead, waUrl) {
  const modal = document.getElementById('booking-modal');
  const detailsBox = document.getElementById('modal-booking-summary');
  const modalWaBtn = document.getElementById('modal-whatsapp-btn');

  if (detailsBox) {
    detailsBox.innerHTML = `
      <div class="summary-row"><span>Lead ID:</span> <strong>${lead.id || 'Confirmed'}</strong></div>
      <div class="summary-row"><span>Customer:</span> <strong>${lead.name} (${lead.phone})</strong></div>
      <div class="summary-row"><span>Pickup:</span> <strong>${lead.pickup}</strong></div>
      <div class="summary-row"><span>Destination:</span> <strong>${lead.drop}</strong></div>
      <div class="summary-row"><span>Vehicle:</span> <strong>${lead.carName}</strong></div>
      <div class="summary-row"><span>Date & Time:</span> <strong>${lead.date} at ${lead.time}</strong></div>
      <div class="summary-row"><span>Estimated Fare:</span> <strong style="color:var(--primary); font-size:1.1rem;">₹${Number(lead.estimatedFare).toLocaleString('en-IN')}</strong></div>
    `;
  }

  if (modalWaBtn) {
    modalWaBtn.href = waUrl;
  }

  if (modal) {
    modal.classList.add('active');
  }
}

// Close Modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Render Fleet Section Cards
function renderFleetSection() {
  const grid = document.getElementById('fleet-cards-grid');
  if (!grid) return;

  grid.innerHTML = '';
  appData.cars.forEach((car, idx) => {
    const card = document.createElement('div');
    card.className = 'car-card';

    const isPopular = car.category === 'Sedan' || car.category === 'Innova Crysta';

    card.innerHTML = `
      ${isPopular ? '<div class="car-card-badge popular">★ Most Popular in Mumbai</div>' : ''}
      <div class="car-image-box">
        <img src="${car.image || 'images/dzire.svg'}" alt="${car.name}" loading="lazy" />
      </div>
      <div class="car-card-content">
        <div class="car-card-header">
          <div>
            <h3 class="car-card-name">${car.name}</h3>
            <span class="car-card-category">${car.category}</span>
          </div>
          <div class="car-card-rate">
            <div class="rate-amount">₹${car.ratePerKm}</div>
            <div class="rate-unit">per KM</div>
          </div>
        </div>

        <div class="car-specs-grid">
          <div class="spec-item"><span class="icon">👥</span> ${car.seating}</div>
          <div class="spec-item"><span class="icon">🧳</span> ${car.luggage}</div>
          <div class="spec-item"><span class="icon">❄️</span> ${car.ac ? 'Chilled AC' : 'Non-AC'}</div>
          <div class="spec-item"><span class="icon">⛽</span> ${car.fuelType || 'Fuel Included'}</div>
        </div>

        <p class="car-card-desc">${car.description || 'Verified commercial taxi with professional driver.'}</p>

        <div class="car-card-actions">
          <button class="btn btn-primary" onclick="selectCarAndScroll('${car.id}')">Book This Car</button>
          <a href="https://wa.me/${appData.settings.whatsapp}?text=${encodeURIComponent(`Hi, I would like to book ${car.name} (₹${car.ratePerKm}/km) from Mumbai.`)}" target="_blank" class="btn btn-whatsapp btn-sm">💬</a>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Render Popular Outstation Routes Section
function renderRoutesSection() {
  const grid = document.getElementById('routes-cards-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const popularRoutes = appData.destinations.filter(d => d.popular).slice(0, 6);
  const sedan = appData.cars.find(c => c.category === 'Sedan') || appData.cars[0] || { ratePerKm: 13 };

  popularRoutes.forEach(route => {
    const card = document.createElement('div');
    card.className = 'route-card';

    const estSedanFare = (route.km * sedan.ratePerKm) + (appData.settings.driverAllowancePerDay || 400);

    card.innerHTML = `
      <div class="route-header">
        <h4 class="route-destination">Mumbai ➔ ${route.name}</h4>
        <span class="route-distance-badge">${route.km} KM</span>
      </div>
      <div class="route-details">
        <span>⏱️ ${route.duration || 'Fast Route'}</span>
        <span>🛣️ Highway</span>
      </div>
      <p style="font-size:0.84rem; color:var(--text-muted); margin-bottom:14px;">${route.description || 'Direct highway pickup from anywhere in Mumbai.'}</p>
      <div class="route-price-box">
        <div>
          <span class="route-price-label">Sedan One-Way from</span>
          <div class="route-price-val">₹${estSedanFare.toLocaleString('en-IN')}</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="selectRouteAndScroll('${route.id || route.name}')">Book Now</button>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Select Car from fleet card & scroll to calculator
window.selectCarAndScroll = function(carId) {
  currentBookingState.carId = carId;
  const items = document.querySelectorAll('.car-select-item');
  items.forEach(el => {
    el.classList.toggle('selected', el.dataset.carId === carId);
  });
  recalculateFare();

  const calcSection = document.getElementById('instant-calculator');
  if (calcSection) {
    calcSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Select Route & scroll to calculator
window.selectRouteAndScroll = function(routeId) {
  const dropSelect = document.getElementById('calc-drop-location');
  if (dropSelect) {
    dropSelect.value = routeId;
    const dest = appData.destinations.find(d => d.id === routeId || d.name === routeId);
    if (dest) {
      currentBookingState.drop = dest.name;
      currentBookingState.dropKm = dest.km;
    }
    recalculateFare();
  }
  const calcSection = document.getElementById('instant-calculator');
  if (calcSection) {
    calcSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Global Toast helper
window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '🚕'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Global modal close handler
window.closeBookingModal = function() {
  closeModal('booking-modal');
};
