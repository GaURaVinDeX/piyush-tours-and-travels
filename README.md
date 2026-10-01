# 🚕 Piyush Tours and Travels - Mumbai Car Rental & Outstation Cab Website

A fast, responsive, one-page car rental website with an integrated **No-Code Admin Panel** designed specifically for **Piyush Tours and Travels**, Mumbai.

---

## 🌟 Key Features

### 1. One-Page Customer Website
- **Branded Header**: High-resolution luxury emblem, instant **Call Now** button (`tel:`) and **WhatsApp** chat button.
- **Hero Section**: "Car Rental in Mumbai" with 24/7 service highlights, sanitized vehicle guarantee, verified chauffeurs, and transparent per-KM billing.
- **Interactive Instant Price Calculator**:
  - **Trip Types**:
    - 🚕 **One-Way Outstation**: Direct point-to-point drop.
    - 🔄 **Round-Trip Outstation**: Auto-calculates return distance with minimum daily KM rule (e.g. 250 or 300 km/day).
    - ⏱️ **Hourly Rental (Local Mumbai)**: 8 Hours / 80 KM or 12 Hours / 120 KM for city travel.
    - ✈️ **Airport Transfer**: Flat/distance pickup and drop for Mumbai Airport (Terminal 1 & Terminal 2).
  - **Customer Info**: Name, 10-digit Mobile Number with +91 indicator.
  - **Fixed Mumbai Pickup**: Dropdown of Mumbai sub-locations (*Andheri, Borivali, Airport T1/T2, Bandra, Dadar, Thane, Navi Mumbai, Colaba, etc.*) + custom address option.
  - **Outstation Destinations (Admin-Editable)**: Pre-configured popular routes (*Pune, Lonavala, Nashik, Shirdi, Mahabaleshwar, Alibaug, Goa, etc.*) that automatically calculate total KM. Also allows customers to type any custom destination and distance!
  - **Car Selection**:
    - **Hatchback** (WagonR / Swift)
    - **Sedan** (Maruti Dzire / Toyota Etios)
    - **SUV** (Maruti Ertiga / Carens)
    - **Innova Crysta** (Toyota Innova Crysta Luxury 7-Seater)
    - **Tempo Traveller** (Force 13 / 17 Seater)
  - **Pricing Breakdown**:
    - Billable KM
    - Base fare
    - Driver allowance per day (₹400/day)
    - Chilled AC toggle
    - Fuel included badge
    - Clearly displays: *"Tolls, parking & state entry taxes are extra as per actual receipts"*.
  - **Dual Action Buttons**:
    1. **"Get Quote on WhatsApp Now"**: Formats a booking itinerary and opens WhatsApp directly to the owner's phone number + automatically saves the lead to the database.
    2. **"Submit Booking Request"**: Saves the lead to the admin panel and presents a confirmation modal with Booking ID.

### 2. Fleet & Price List Section
- Displays all cars with crisp SVG vehicle illustrations.
- Shows rate per KM, seating capacity, luggage capacity, AC, and fuel type.
- One-click **"Book This Car"** button that automatically scrolls up and selects that car in the calculator.

### 3. Popular Outstation Routes Section
- Cards showing popular trips from Mumbai:
  - Mumbai ➔ Pune (150 KM)
  - Mumbai ➔ Lonavala / Khandala (85 KM)
  - Mumbai ➔ Nashik (170 KM)
  - Mumbai ➔ Shirdi Sai Baba Temple (245 KM)
  - Mumbai ➔ Mahabaleshwar / Panchgani (260 KM)
  - Mumbai ➔ Alibaug (100 KM via Atal Setu)
- Real-time starting price calculation for each route.

---

## 🔐 The Admin Panel (No Coding Required)

The owner can manage everything via a password-protected web dashboard:

- **URL**: `/admin` (e.g. `https://your-domain.vercel.app/admin` or `http://localhost:3000/admin`)
- **Default Password**: `admin` *(Can be changed anytime inside the Settings tab)*

---

## 🚀 How to Host on Vercel with NeonDB (Step-by-Step Guide)

### Step 1: Create a Free Neon Database (Postgres)
1. Go to **[https://neon.tech](https://neon.tech)** and sign up for a free account.
2. Click **"Create Project"**. Name it `piyush-tours-db` and select the region closest to India (e.g., `Asia Pacific - Singapore` or `AWS us-east-2`).
3. After project creation, your **Connection String** will appear on your Neon dashboard.
4. Copy the connection string. It looks like:
   ```env
   DATABASE_URL="postgres://neondb_owner:npg_xyz123@ep-cool-fog-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   ```

*(Note: The application automatically creates all tables and seeds default cars, rates, Mumbai pickup points, and routes on first run!)*

---

### Step 2: Push Your Code to GitHub
1. Open your terminal in this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Piyush tours and travels"
   ```
2. Create a new repository on **[GitHub.com](https://github.com)** (e.g. `piyush-tours-and-travels`).
3. Push your repository:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/piyush-tours-and-travels.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 3: Deploy on Vercel
1. Log in to **[https://vercel.com](https://vercel.com)** (Sign in with GitHub).
2. Click **"Add New..."** ➔ **"Project"**.
3. Select your **`piyush-tours-and-travels`** repository from GitHub and click **"Import"**.
4. In the **"Environment Variables"** section:
   - **Key**: `DATABASE_URL`
   - **Value**: *(Paste your Neon database connection string from Step 1)*
5. Click **"Deploy"**.
6. In ~30 seconds, your website is live worldwide with an active HTTPS domain (e.g., `https://piyush-tours-and-travels.vercel.app`)!

---

### Step 4: Access Your Live Website & Admin Panel
- **Customer Website**: `https://your-app.vercel.app`
- **Owner Admin Portal**: `https://your-app.vercel.app/admin` (Password: `admin`)

---

## 💻 Local Development (Optional)

You can also run locally anytime:

```bash
# 1. Install dependencies
npm install

# 2. Run local server
npm start
```
- Open [http://localhost:3000](http://localhost:3000) for the website.
- Open [http://localhost:3000/admin](http://localhost:3000/admin) for the Admin Panel.
