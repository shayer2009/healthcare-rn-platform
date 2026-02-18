# World Health Portal

A **global health data exchange and coordination platform** — hospitals, medical services, doctors, research institutes, pharmaceutical companies, pharmacies, equipment shops, government health agencies, and health ministries connected and exchanging health data.

Separate project created for your request:

- `mobile-app`: React Native (Expo) Android app UI based on your screenshots
- `backend`: Node.js + Express + MariaDB API
- `admin-panel`: React web admin panel to manage app settings
- `docker-compose.yml`: MariaDB + phpMyAdmin services

## 1) Start MariaDB

From `healthcare-rn-platform`:

```bash
docker compose up -d
```

MariaDB will run on `localhost:3307`.
phpMyAdmin: `http://localhost:8080`

## 2) Start backend API

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Backend URL: `http://localhost:4000`

### API split

| Role | Endpoints | Used by |
|------|-----------|---------|
| Admin | `POST /api/admin/login`, `GET /api/admin/dashboard`, `PUT /api/admin/settings/:key` | Admin panel (web) |
| Patient | `POST /api/patient/signup`, `POST /api/patient/login`, `GET /api/patient/profile`, `PUT /api/patient/profile`, `GET /api/patient/settings`, `PUT /api/patient/settings/:key` | Mobile app |
| Doctor | `POST /api/doctor/login`, `GET /api/doctor/profile`, `GET /api/doctor/dashboard` | Mobile app, Admin panel |
| Assistant | `POST /api/assistant/login`, `GET /api/assistant/profile`, `GET /api/assistant/dashboard` | Mobile app, Admin panel |

### Login credentials

- **Admin** (web): `admin@healthapp.local` / `admin123` — manages global app settings.
- **Doctor** (web + mobile): `doctor@healthapp.local` / `doctor123`
- **Assistant** (web + mobile): `assistant@healthapp.local` / `assistant123`
- **Patient** (mobile): Sign up or use your own account — each patient gets their own profile, wallet, and preferences (stored in `patient_settings`).

## 3) Start admin panel

```bash
cd ../admin-panel
npm install
npm run dev
```

Open `http://localhost:5173`

## 4) Start mobile app (Android)

```bash
cd ../mobile-app
npm install
npm run android
```

You need Android Studio emulator or a physical Android device with Expo Go.

## Enhanced Telemedicine Features ✅

**All 5 production-ready enhancements implemented:**

1. **Real Video Integration** - Daily.co WebRTC with screen sharing, chat, recording
2. **File Uploads** - Prescriptions, lab reports, images (PDF, JPEG, PNG)
3. **Automated Reminders** - Email & SMS 24h before appointments (cron job)
4. **Real-Time Messaging** - WebSocket chat between patients and doctors
5. **Prescription Fulfillment** - Send to pharmacy, refill requests, approval workflow

See `backend/README-ENHANCEMENTS.md` for details.

## Enterprise Features (13)

All 13 telehealth features are implemented:

1. **Video Consultations** – Room creation, join URLs
2. **Scheduling & Appointments** – Book, list, manage
3. **Security & Compliance** – Audit logs, MFA support
4. **Clinical Records** – Notes, vitals, allergies
5. **E-Prescribing** – Prescriptions list, refills
6. **Payments & Billing** – Invoices, insurance
7. **Notifications** – In-app, templates
8. **Patient Portal** – Intake forms
9. **Provider Tools** – Availability, queue
10. **Analytics** – KPIs, revenue
11. **Integrations** – EHR, labs, API keys
12. **Infrastructure** – System status (`/api/system/status`)
13. **Multi-Tenancy** – **Toggle on/off in Admin Panel** under "13. Multi-Tenancy"

### Multi-Tenancy Toggle

In the Admin Panel (web), go to **13. Multi-Tenancy**. Use the **Multitenancy Enabled** toggle to turn multi-tenancy on or off. When enabled, you can manage organizations.

### World Health Portal (Admin Panel)

- **World Health Portal** — Global dashboard showing all connected stakeholders (hospitals, medical services, research institutes, pharma, pharmacies, equipment shops, government agencies, health ministries).
- **Global Health Conditions** — Disease trends, vaccination, outbreaks by region and country.
- **Stakeholder Management** — View counts for each stakeholder type.
- **Health Data Exchanges** — Data flows between stakeholders (clinical, lab, prescription, epidemiology, drug safety, research, regulatory).

## Notes

- **Admin panel (web)** supports Admin, Doctor, and Assistant login with role-based dashboards. Sidebar includes all 13 enterprise feature sections.
- **Mobile app** shows a role selector: Patient | Doctor | Assistant. Each role has a dedicated login and dashboard. Open the drawer and tap **Enterprise Features (13)** to access all feature screens.
- **Mobile app** uses patient signup/login — each patient has their own profile, wallet, and preferences (stored in `patient_settings`, separate from admin settings).
- Android emulator: app uses `http://10.0.2.2:4000`. On a physical device, set `API_URL` in `mobile-app/App.js` to your PC’s LAN IP (e.g. `http://192.168.1.15:4000`).
