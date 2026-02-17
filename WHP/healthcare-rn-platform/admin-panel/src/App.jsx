import { useMemo, useState, useEffect } from "react";

const API_URL = "http://localhost:4000";

const FEATURE_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "whp-overview", label: "🌍 World Health Portal" },
  { id: "whp-global-conditions", label: "  Global Health Conditions" },
  { id: "whp-stakeholders", label: "  Stakeholder Management" },
  { id: "whp-data-exchanges", label: "  Health Data Exchanges" },
  { id: "phase1-fhir", label: "🔬 Phase 1: FHIR & Interoperability" },
  { id: "phase2-compliance", label: "🔒 Phase 2: Compliance & Security" },
  { id: "phase3-scalability", label: "⚡ Phase 3: Scalability" },
  { id: "phase4-integrations", label: "🔌 Phase 4: Real Integrations" },
  { id: "phase5-advanced", label: "🤖 Phase 5: Advanced Features" },
  { id: "1-video", label: "1. Video Consultations" },
  { id: "2-scheduling", label: "2. Scheduling" },
  { id: "3-security", label: "3. Security & Compliance" },
  { id: "4-clinical", label: "4. Clinical Records" },
  { id: "5-prescriptions", label: "5. E-Prescribing" },
  { id: "6-payments", label: "6. Payments & Billing" },
  { id: "7-notifications", label: "7. Notifications" },
  { id: "8-portal", label: "8. Patient Portal" },
  { id: "9-provider", label: "9. Provider Tools" },
  { id: "10-analytics", label: "10. Analytics" },
  { id: "11-integrations", label: "11. Integrations" },
  { id: "12-infrastructure", label: "12. Infrastructure" },
  { id: "13-multitenancy", label: "13. Multi-Tenancy" }
];

const ENTERPRISE_KEYS = [
  "multitenancy_enabled",
  "video_enabled",
  "scheduling_enabled",
  "mfa_enabled",
  "ehr_enabled",
  "eprescribing_enabled",
  "payments_enabled",
  "notifications_enabled",
  "intake_forms_enabled",
  "analytics_enabled",
  "integrations_enabled",
  "audit_logging_enabled"
];

export default function App() {
  const [token, setToken] = useState("");
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("admin@healthapp.local");
  const [password, setPassword] = useState("admin123");
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [enterpriseSettings, setEnterpriseSettings] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [worldHealthDashboard, setWorldHealthDashboard] = useState(null);
  const [globalConditions, setGlobalConditions] = useState(null);
  const [stakeholders, setStakeholders] = useState({});
  const [dataExchanges, setDataExchanges] = useState(null);
  const [fhirResources, setFhirResources] = useState([]);
  const [consents, setConsents] = useState([]);
  const [gdprRequests, setGdprRequests] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [mlPredictions, setMlPredictions] = useState([]);
  const [dataQuality, setDataQuality] = useState([]);
  const [realtimeAnalytics, setRealtimeAnalytics] = useState(null);

  const isLoggedIn = useMemo(() => Boolean(token), [token]);

  const rolePlaceholders = {
    admin: { email: "admin@healthapp.local", password: "admin123" },
    doctor: { email: "doctor@healthapp.local", password: "doctor123" },
    assistant: { email: "assistant@healthapp.local", password: "assistant123" }
  };

  function onRoleChange(newRole) {
    setRole(newRole);
    setEmail(rolePlaceholders[newRole].email);
    setPassword(rolePlaceholders[newRole].password);
    setMessage("");
  }

  async function api(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers }
    });
    return res.json();
  }

  async function login(e) {
    e.preventDefault();
    setMessage("");
    const endpoints = { admin: "/api/admin/login", doctor: "/api/doctor/login", assistant: "/api/assistant/login" };
    const res = await fetch(`${API_URL}${endpoints[role]}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message || "Login failed");
      return;
    }
    setToken(data.token);
    setUser(data.user);
    setMessage(`Welcome ${data.user.name}`);
    if (role === "admin") {
      loadAdminDashboard(data.token);
      loadEnterpriseSettings(data.token);
    } else if (role === "doctor") {
      loadDoctorDashboard(data.token);
      loadDoctorProfile(data.token);
    } else if (role === "assistant") {
      loadAssistantDashboard(data.token);
      loadAssistantProfile(data.token);
    }
  }

  async function loadAdminDashboard(t = token) {
    const res = await fetch(`${API_URL}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setDashboard(data);
  }

  async function loadEnterpriseSettings(t = token) {
    const res = await fetch(`${API_URL}/api/admin/enterprise-settings`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setEnterpriseSettings(data.settings || {});
  }

  async function toggleEnterpriseSetting(key, currentVal) {
    const res = await fetch(`${API_URL}/api/admin/enterprise-settings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: !currentVal })
    });
    if (res.ok) loadEnterpriseSettings();
  }

  async function loadAppointments(t = token) {
    const data = await api("/api/appointments", { headers: { Authorization: `Bearer ${t}` } });
    if (data.appointments) setAppointments(data.appointments);
  }

  async function loadAuditLogs(t = token) {
    const data = await api("/api/admin/audit-logs", { headers: { Authorization: `Bearer ${t}` } });
    if (data.logs) setAuditLogs(data.logs);
  }

  async function loadAnalytics(t = token) {
    const data = await api("/api/admin/analytics", { headers: { Authorization: `Bearer ${t}` } });
    if (data) setAnalytics(data);
  }

  async function loadIntegrations(t = token) {
    const data = await api("/api/admin/integrations", { headers: { Authorization: `Bearer ${t}` } });
    if (data.integrations) setIntegrations(data.integrations);
  }

  async function loadOrganizations(t = token) {
    const data = await api("/api/admin/organizations", { headers: { Authorization: `Bearer ${t}` } });
    if (data.organizations) setOrganizations(data.organizations);
  }

  async function loadSystemStatus() {
    const res = await fetch(`${API_URL}/api/system/status`);
    const data = await res.json();
    setSystemStatus(data);
  }

  async function loadWorldHealthDashboard(t = token) {
    const res = await fetch(`${API_URL}/api/world-health/dashboard`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setWorldHealthDashboard(data);
  }

  async function loadGlobalConditions(t = token) {
    const res = await fetch(`${API_URL}/api/world-health/global-conditions`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setGlobalConditions(data);
  }

  async function loadStakeholders(t = token) {
    const res = await fetch(`${API_URL}/api/world-health/stakeholders`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setStakeholders(data.counts || {});
  }

  async function loadDataExchanges(t = token) {
    const res = await fetch(`${API_URL}/api/world-health/data-exchanges`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setDataExchanges(data);
  }

  async function loadFHIRResources(t = token) {
    try {
      const res = await fetch(`${API_URL}/fhir/Patient`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (data.entry) setFhirResources(data.entry);
    } catch (e) {
      console.error("Failed to load FHIR resources:", e);
    }
  }

  async function loadConsents(t = token) {
    try {
      const data = await api("/api/compliance/consents/all");
      if (data.consents) setConsents(data.consents);
    } catch (e) {
      console.error("Failed to load consents:", e);
    }
  }

  async function loadGDPRRequests(t = token) {
    try {
      const data = await api("/api/compliance/gdpr/requests");
      if (data.requests) setGdprRequests(data.requests);
    } catch (e) {
      console.error("Failed to load GDPR requests:", e);
    }
  }

  async function loadConnectors(t = token) {
    try {
      const data = await api("/api/integrations/connectors");
      if (data.connectors) setConnectors(data.connectors);
    } catch (e) {
      console.error("Failed to load connectors:", e);
    }
  }

  async function loadSyncLogs(t = token) {
    try {
      const data = await api("/api/integrations/sync-logs");
      if (data.logs) setSyncLogs(data.logs);
    } catch (e) {
      console.error("Failed to load sync logs:", e);
    }
  }

  async function loadEvents(t = token) {
    try {
      const data = await api("/api/advanced/events");
      if (data.events) setEvents(data.events);
    } catch (e) {
      console.error("Failed to load events:", e);
    }
  }

  async function loadRealtimeAnalytics(t = token) {
    try {
      const data = await api("/api/advanced/analytics/realtime");
      if (data) setRealtimeAnalytics(data);
    } catch (e) {
      console.error("Failed to load realtime analytics:", e);
    }
  }

  async function loadDataQuality(t = token) {
    try {
      const data = await api("/api/advanced/data-quality/results");
      if (data.results) setDataQuality(data.results);
    } catch (e) {
      console.error("Failed to load data quality:", e);
    }
  }

  async function loadDoctorDashboard(t = token) {
    const res = await fetch(`${API_URL}/api/doctor/dashboard`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setDashboard(data);
  }

  async function loadDoctorProfile(t = token) {
    const res = await fetch(`${API_URL}/api/doctor/profile`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setProfile(data);
  }

  async function loadAssistantDashboard(t = token) {
    const res = await fetch(`${API_URL}/api/assistant/dashboard`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setDashboard(data);
  }

  async function loadAssistantProfile(t = token) {
    const res = await fetch(`${API_URL}/api/assistant/profile`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (res.ok) setProfile(data);
  }

  async function toggleSetting(key, enabled) {
    const res = await fetch(`${API_URL}/api/admin/settings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: !enabled })
    });
    if (res.ok) loadAdminDashboard();
  }

  function logout() {
    setToken("");
    setUser(null);
    setDashboard(null);
    setProfile(null);
  }

  useEffect(() => {
    if (role === "admin" && token && activeSection === "whp-overview") loadWorldHealthDashboard();
    if (role === "admin" && token && activeSection === "whp-global-conditions") loadGlobalConditions();
    if (role === "admin" && token && activeSection === "whp-stakeholders") loadStakeholders();
    if (role === "admin" && token && activeSection === "whp-data-exchanges") loadDataExchanges();
    if (role === "admin" && token && activeSection === "phase1-fhir") loadFHIRResources();
    if (role === "admin" && token && activeSection === "phase2-compliance") {
      loadConsents();
      loadGDPRRequests();
    }
    if (role === "admin" && token && activeSection === "phase4-integrations") {
      loadConnectors();
      loadSyncLogs();
    }
    if (role === "admin" && token && activeSection === "phase5-advanced") {
      loadEvents();
      loadRealtimeAnalytics();
      loadDataQuality();
    }
    if (role === "admin" && token && activeSection === "2-scheduling") loadAppointments();
    if (role === "admin" && token && activeSection === "3-security") loadAuditLogs();
    if (role === "admin" && token && activeSection === "10-analytics") loadAnalytics();
    if (role === "admin" && token && activeSection === "11-integrations") loadIntegrations();
    if (role === "admin" && token && activeSection === "12-infrastructure") loadSystemStatus();
    if (role === "admin" && token && activeSection === "13-multitenancy") {
      loadEnterpriseSettings();
      loadOrganizations();
    }
  }, [role, token, activeSection]);

  if (!isLoggedIn) {
    return (
      <main className="centered">
        <form className="card login" onSubmit={login}>
          <h1>World Health Portal</h1>
          <p>Sign in as Admin, Doctor, or Assistant.</p>
          <div className="roleTabs">
            {["admin", "doctor", "assistant"].map((r) => (
              <button key={r} type="button" className={`roleTab ${role === r ? "active" : ""}`} onClick={() => onRoleChange(r)}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          <button type="submit">Login</button>
          {message && <p className="message">{message}</p>}
        </form>
      </main>
    );
  }

  // Doctor Dashboard (no sidebar)
  if (role === "doctor") {
    return (
      <main className="page">
        <header className="header">
          <h1>Doctor Dashboard</h1>
          <div className="headerActions">
            <span className="userName">Dr. {user?.name}</span>
            <button onClick={() => { loadDoctorDashboard(); loadDoctorProfile(); }}>Refresh</button>
            <button className="logoutBtn" onClick={logout}>Logout</button>
          </div>
        </header>
        {profile && (
          <section className="card profileCard">
            <h2>Profile</h2>
            <p><strong>Name:</strong> {profile.profile?.name}</p>
            <p><strong>Email:</strong> {profile.profile?.email}</p>
            <p><strong>Specialization:</strong> {profile.profile?.specialization || "—"}</p>
          </section>
        )}
        {dashboard && (
          <section className="grid">
            <div className="card"><h3>Total Patients</h3><p>{dashboard.cards?.totalPatients ?? 0}</p></div>
            <div className="card"><h3>My Assistants</h3><p>{dashboard.cards?.myAssistants ?? 0}</p></div>
            <div className="card"><h3>Consultations Today</h3><p>{dashboard.cards?.consultationsToday ?? 0}</p></div>
          </section>
        )}
      </main>
    );
  }

  // Assistant Dashboard (no sidebar)
  if (role === "assistant") {
    return (
      <main className="page">
        <header className="header">
          <h1>Assistant Dashboard</h1>
          <div className="headerActions">
            <span className="userName">{user?.name}</span>
            <button onClick={() => { loadAssistantDashboard(); loadAssistantProfile(); }}>Refresh</button>
            <button className="logoutBtn" onClick={logout}>Logout</button>
          </div>
        </header>
        {profile && (
          <section className="card profileCard">
            <h2>Profile</h2>
            <p><strong>Name:</strong> {profile.profile?.name}</p>
            <p><strong>Assigned to:</strong> {profile.profile?.doctorName}</p>
          </section>
        )}
        {dashboard && (
          <section className="grid">
            <div className="card"><h3>Total Patients</h3><p>{dashboard.cards?.totalPatients ?? 0}</p></div>
            <div className="card"><h3>Consultations Today</h3><p>{dashboard.cards?.consultationsToday ?? 0}</p></div>
            <div className="card"><h3>Pending Tasks</h3><p>{dashboard.cards?.pendingTasks ?? 0}</p></div>
          </section>
        )}
      </main>
    );
  }

  // Admin: full enterprise panel with sidebar
  return (
    <div className="adminLayout">
      <aside className="sidebar">
        <h2 className="sidebarTitle">World Health Portal</h2>
        <nav className="sidebarNav">
          {FEATURE_SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`sidebarLink ${activeSection === s.id ? "active" : ""}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="sidebarFooter">
          <span className="userName">{user?.name}</span>
          <button className="logoutBtn" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="mainContent">
        <header className="header">
          <h1>{FEATURE_SECTIONS.find((s) => s.id === activeSection)?.label || "Overview"}</h1>
          <button onClick={() => { loadAdminDashboard(); loadEnterpriseSettings(); }}>Refresh</button>
        </header>

        {activeSection === "whp-overview" && worldHealthDashboard && (
          <section className="card">
            <h2>World Health Portal — Global Dashboard</h2>
            <p className="sectionDesc">Connected stakeholders exchanging health data across hospitals, research, pharma, government, and more.</p>
            <div className="grid">
              <div className="card whpCard"><h3>Hospitals</h3><p>{worldHealthDashboard.stakeholders?.hospitals ?? 0}</p></div>
              <div className="card whpCard"><h3>Medical Services</h3><p>{worldHealthDashboard.stakeholders?.medical_services ?? 0}</p></div>
              <div className="card whpCard"><h3>Research Institutes</h3><p>{worldHealthDashboard.stakeholders?.research_institutes ?? 0}</p></div>
              <div className="card whpCard"><h3>Pharma Companies</h3><p>{worldHealthDashboard.stakeholders?.pharmaceutical_companies ?? 0}</p></div>
              <div className="card whpCard"><h3>Pharmacies</h3><p>{worldHealthDashboard.stakeholders?.pharmacies ?? 0}</p></div>
              <div className="card whpCard"><h3>Equipment Shops</h3><p>{worldHealthDashboard.stakeholders?.health_equipment_shops ?? 0}</p></div>
              <div className="card whpCard"><h3>Govt Agencies</h3><p>{worldHealthDashboard.stakeholders?.government_health_agencies ?? 0}</p></div>
              <div className="card whpCard"><h3>Health Ministries</h3><p>{worldHealthDashboard.stakeholders?.government_health_ministries ?? 0}</p></div>
            </div>
            <div className="grid" style={{ marginTop: 16 }}>
              <div className="card whpCard"><h3>Data Exchanges</h3><p>{worldHealthDashboard.totalDataExchanges ?? 0}</p></div>
              <div className="card whpCard"><h3>Health Data Points</h3><p>{worldHealthDashboard.totalHealthDataPoints ?? 0}</p></div>
            </div>
            <h3 style={{ marginTop: 16 }}>Recent Data Exchanges</h3>
            <ul className="dataList">
              {(worldHealthDashboard.recentExchanges || []).slice(0, 5).map((e) => (
                <li key={e.id}>{e.from_stakeholder_type} → {e.to_stakeholder_type} ({e.data_type})</li>
              ))}
              {(!worldHealthDashboard.recentExchanges || worldHealthDashboard.recentExchanges.length === 0) && <li>No exchanges yet.</li>}
            </ul>
          </section>
        )}

        {activeSection === "whp-global-conditions" && globalConditions && (
          <section className="card">
            <h2>Global Health Conditions</h2>
            <p className="sectionDesc">Aggregated health metrics by region and country. Disease trends, vaccination, outbreaks.</p>
            <div className="whpSummary">
              <span>Regions: {globalConditions.summary?.totalRegions ?? 0}</span>
              <span>Countries: {globalConditions.summary?.totalCountries ?? 0}</span>
              <span>Data Points: {globalConditions.summary?.totalDataPoints ?? 0}</span>
            </div>
            <ul className="dataList">
              {(globalConditions.conditions || []).map((c, i) => (
                <li key={i}>
                  <strong>{c.region} / {c.country}</strong> — {c.metrics?.map((m) => `${m.metric_name}: ${m.value} ${m.unit || ""}`).join(", ")}
                </li>
              ))}
              {(!globalConditions.conditions || globalConditions.conditions.length === 0) && <li>No health condition data yet.</li>}
            </ul>
          </section>
        )}

        {activeSection === "whp-stakeholders" && (
          <section className="card">
            <h2>Stakeholder Management</h2>
            <p className="sectionDesc">All connected stakeholders: hospitals, medical services, research institutes, pharmaceutical companies, pharmacies, equipment shops, government agencies, health ministries.</p>
            <div className="grid">
              <div className="card whpCard"><h3>Hospitals</h3><p>{stakeholders.hospitals ?? 0}</p></div>
              <div className="card whpCard"><h3>Medical Services</h3><p>{stakeholders.medical_services ?? 0}</p></div>
              <div className="card whpCard"><h3>Research Institutes</h3><p>{stakeholders.research_institutes ?? 0}</p></div>
              <div className="card whpCard"><h3>Pharma Companies</h3><p>{stakeholders.pharmaceutical_companies ?? 0}</p></div>
              <div className="card whpCard"><h3>Pharmacies</h3><p>{stakeholders.pharmacies ?? 0}</p></div>
              <div className="card whpCard"><h3>Equipment Shops</h3><p>{stakeholders.health_equipment_shops ?? 0}</p></div>
              <div className="card whpCard"><h3>Govt Agencies</h3><p>{stakeholders.government_health_agencies ?? 0}</p></div>
              <div className="card whpCard"><h3>Health Ministries</h3><p>{stakeholders.government_health_ministries ?? 0}</p></div>
            </div>
          </section>
        )}

        {activeSection === "whp-data-exchanges" && dataExchanges && (
          <section className="card">
            <h2>Health Data Exchanges</h2>
            <p className="sectionDesc">Data exchanges between stakeholders: clinical, lab, prescription, epidemiology, drug safety, research, regulatory.</p>
            <div className="whpSummary">
              <span>Total: {dataExchanges.summary?.totalExchanges ?? 0}</span>
              <span>Success: {dataExchanges.summary?.byStatus?.success ?? 0}</span>
              <span>Failed: {dataExchanges.summary?.byStatus?.failed ?? 0}</span>
            </div>
            <ul className="dataList">
              {(dataExchanges.exchanges || []).slice(0, 30).map((e) => (
                <li key={e.id}>
                  {e.from_stakeholder_type} #{e.from_stakeholder_id} → {e.to_stakeholder_type} #{e.to_stakeholder_id} ({e.data_type}) — {new Date(e.exchanged_at).toLocaleString()}
                </li>
              ))}
              {(!dataExchanges.exchanges || dataExchanges.exchanges.length === 0) && <li>No data exchanges yet.</li>}
            </ul>
          </section>
        )}

        {activeSection === "overview" && dashboard && (
          <>
            <section className="grid">
              <div className="card"><h3>Doctors</h3><p>{dashboard.cards?.totalDoctors ?? 0}</p></div>
              <div className="card"><h3>Patients</h3><p>{dashboard.cards?.totalPatients ?? 0}</p></div>
              <div className="card"><h3>Questions</h3><p>{dashboard.cards?.totalQueries ?? 0}</p></div>
            </section>
            <section className="card settings">
              <h2>App Settings</h2>
              {dashboard.settings && Object.entries(dashboard.settings).map(([key, enabled]) => (
                <label key={key} className="settingRow">
                  <span>{key.replaceAll("_", " ")}</span>
                  <input type="checkbox" checked={Boolean(enabled)} onChange={() => toggleSetting(key, Boolean(enabled))} />
                </label>
              ))}
            </section>
          </>
        )}

        {activeSection === "13-multitenancy" && (
          <section className="card settings">
            <h2>Multi-Tenancy Settings</h2>
            <p className="sectionDesc">Toggle multi-tenancy on/off. When enabled, you can manage multiple organizations.</p>
            <label className="settingRow highlight">
              <span><strong>Multitenancy Enabled</strong></span>
              <input
                type="checkbox"
                checked={Boolean(enterpriseSettings.multitenancy_enabled)}
                onChange={() => toggleEnterpriseSetting("multitenancy_enabled", enterpriseSettings.multitenancy_enabled)}
              />
            </label>
            {enterpriseSettings.multitenancy_enabled && (
              <div className="orgList">
                <h3>Organizations</h3>
                {organizations.map((o) => (
                  <div key={o.id} className="orgItem">{o.name} ({o.slug})</div>
                ))}
                {organizations.length === 0 && <p>No organizations yet. Create via API.</p>}
              </div>
            )}
          </section>
        )}

        {activeSection === "13-multitenancy" && (
          <section className="card settings" style={{ marginTop: 16 }}>
            <h2>All Enterprise Feature Toggles</h2>
            {ENTERPRISE_KEYS.filter((k) => k !== "multitenancy_enabled").map((key) => (
              <label key={key} className="settingRow">
                <span>{key.replaceAll("_", " ")}</span>
                <input
                  type="checkbox"
                  checked={Boolean(enterpriseSettings[key])}
                  onChange={() => toggleEnterpriseSetting(key, enterpriseSettings[key])}
                />
              </label>
            ))}
          </section>
        )}

        {activeSection === "1-video" && (
          <section className="card">
            <h2>Video Consultations</h2>
            <p>Status: {enterpriseSettings.video_enabled ? "Enabled" : "Disabled"}</p>
            <p>Toggle in Multi-Tenancy section or via enterprise settings API.</p>
          </section>
        )}

        {activeSection === "2-scheduling" && (
          <section className="card">
            <h2>Appointments</h2>
            <ul className="dataList">
              {appointments.slice(0, 20).map((a) => (
                <li key={a.id}>{a.patient_name} with {a.doctor_name} — {new Date(a.slot_start).toLocaleString()} ({a.status})</li>
              ))}
            </ul>
            {appointments.length === 0 && <p>No appointments yet.</p>}
          </section>
        )}

        {activeSection === "3-security" && (
          <section className="card">
            <h2>Audit Logs</h2>
            <ul className="dataList">
              {auditLogs.slice(0, 30).map((l) => (
                <li key={l.id}>{l.action} — {l.user_role} #{l.user_id} — {new Date(l.created_at).toLocaleString()}</li>
              ))}
            </ul>
            {auditLogs.length === 0 && <p>No audit logs yet.</p>}
          </section>
        )}

        {activeSection === "4-clinical" && (
          <section className="card">
            <h2>Clinical Records</h2>
            <p>Clinical notes, vitals, and allergies are managed per patient. Access via API or mobile app.</p>
          </section>
        )}

        {activeSection === "5-prescriptions" && (
          <section className="card">
            <h2>E-Prescribing</h2>
            <p>Status: {enterpriseSettings.eprescribing_enabled ? "Enabled" : "Disabled"}</p>
          </section>
        )}

        {activeSection === "6-payments" && (
          <section className="card">
            <h2>Payments & Billing</h2>
            <p>Status: {enterpriseSettings.payments_enabled ? "Enabled" : "Disabled"}</p>
          </section>
        )}

        {activeSection === "7-notifications" && (
          <section className="card">
            <h2>Notifications</h2>
            <p>Status: {enterpriseSettings.notifications_enabled ? "Enabled" : "Disabled"}</p>
          </section>
        )}

        {activeSection === "8-portal" && (
          <section className="card">
            <h2>Patient Portal</h2>
            <p>Intake forms: {enterpriseSettings.intake_forms_enabled ? "Enabled" : "Disabled"}</p>
          </section>
        )}

        {activeSection === "9-provider" && (
          <section className="card">
            <h2>Provider Tools</h2>
            <p>Doctor availability and queue management. Configure per doctor via API.</p>
          </section>
        )}

        {activeSection === "10-analytics" && analytics && (
          <section className="card">
            <h2>Analytics</h2>
            <div className="grid">
              <div className="card"><h3>Total Patients</h3><p>{analytics.totalPatients}</p></div>
              <div className="card"><h3>Total Doctors</h3><p>{analytics.totalDoctors}</p></div>
              <div className="card"><h3>Completed Consultations</h3><p>{analytics.completedConsultations}</p></div>
              <div className="card"><h3>Total Revenue (PKR)</h3><p>{analytics.totalRevenue}</p></div>
            </div>
          </section>
        )}

        {activeSection === "11-integrations" && (
          <section className="card">
            <h2>Integrations</h2>
            <ul className="dataList">
              {integrations.map((i) => (
                <li key={i.id}>{i.integration_type} — {i.enabled ? "Enabled" : "Disabled"}</li>
              ))}
            </ul>
            {integrations.length === 0 && <p>No integrations configured.</p>}
          </section>
        )}

        {activeSection === "12-infrastructure" && (
          <section className="card">
            <h2>System Status</h2>
            <p>Database: {systemStatus?.db ?? "—"}</p>
            <p>Status: {systemStatus?.status ?? "—"}</p>
          </section>
        )}

        {/* Phase 1: FHIR & Interoperability */}
        {activeSection === "phase1-fhir" && (
          <section className="card">
            <h2>HL7 FHIR & Interoperability</h2>
            <p className="sectionDesc">FHIR R4 resources, ICD-10/SNOMED CT code mappings, data transformations.</p>
            <div className="grid">
              <div className="card whpCard"><h3>FHIR Resources</h3><p>{fhirResources.length}</p></div>
              <div className="card whpCard"><h3>Code Mappings</h3><p>ICD-10 ↔ SNOMED CT</p></div>
            </div>
            <h3>Recent FHIR Resources</h3>
            <ul className="dataList">
              {fhirResources.slice(0, 10).map((entry, i) => (
                <li key={i}>{entry.resource.resourceType} — {entry.resource.id}</li>
              ))}
              {fhirResources.length === 0 && <li>No FHIR resources yet. Use /fhir/ API to create.</li>}
            </ul>
            <p style={{ marginTop: 16, fontSize: 14, color: "#666" }}>
              <strong>API Endpoints:</strong><br />
              GET /fhir/:resourceType — Search FHIR resources<br />
              GET /fhir/:resourceType/:id — Get specific resource<br />
              POST /fhir/:resourceType — Create/Update resource<br />
              POST /api/fhir/transform — Transform to FHIR<br />
              GET /api/fhir/code-mapping — Map medical codes
            </p>
          </section>
        )}

        {/* Phase 2: Compliance & Security */}
        {activeSection === "phase2-compliance" && (
          <>
            <section className="card">
              <h2>Compliance & Security</h2>
              <p className="sectionDesc">HIPAA/GDPR compliance, consent management, data anonymization, encryption.</p>
              <div className="grid">
                <div className="card whpCard"><h3>Active Consents</h3><p>{consents.filter(c => c.granted).length}</p></div>
                <div className="card whpCard"><h3>GDPR Requests</h3><p>{gdprRequests.length}</p></div>
                <div className="card whpCard"><h3>Pending Requests</h3><p>{gdprRequests.filter(r => r.status === "pending").length}</p></div>
              </div>
            </section>
            <section className="card" style={{ marginTop: 16 }}>
              <h3>Recent GDPR Requests</h3>
              <ul className="dataList">
                {gdprRequests.slice(0, 10).map((r) => (
                  <li key={r.id}>
                    Patient #{r.patient_id} — {r.request_type} — {r.status} — {new Date(r.requested_at).toLocaleString()}
                  </li>
                ))}
                {gdprRequests.length === 0 && <li>No GDPR requests yet.</li>}
              </ul>
            </section>
            <section className="card" style={{ marginTop: 16 }}>
              <h3>Consent Management</h3>
              <ul className="dataList">
                {consents.slice(0, 10).map((c) => (
                  <li key={c.id}>
                    Patient #{c.patient_id} — {c.consent_type} — {c.granted ? "Granted" : "Denied"} — {new Date(c.created_at).toLocaleString()}
                  </li>
                ))}
                {consents.length === 0 && <li>No consents recorded yet.</li>}
              </ul>
            </section>
          </>
        )}

        {/* Phase 3: Scalability */}
        {activeSection === "phase3-scalability" && (
          <section className="card">
            <h2>Scalability Infrastructure</h2>
            <p className="sectionDesc">Redis caching, rate limiting, compression, load balancing ready.</p>
            <div className="grid">
              <div className="card whpCard"><h3>Redis Cache</h3><p>{process.env.REDIS_URL ? "Configured" : "Not configured"}</p></div>
              <div className="card whpCard"><h3>Rate Limiting</h3><p>Active</p></div>
              <div className="card whpCard"><h3>Compression</h3><p>Gzip enabled</p></div>
            </div>
            <p style={{ marginTop: 16, fontSize: 14, color: "#666" }}>
              <strong>Features:</strong><br />
              • Redis-backed caching (fallback to DB if unavailable)<br />
              • Express rate limiting (100 req/15min default, 5 login attempts/15min)<br />
              • Helmet security headers<br />
              • Gzip compression<br />
              • Cache invalidation tracking
            </p>
          </section>
        )}

        {/* Phase 4: Real Integrations */}
        {activeSection === "phase4-integrations" && (
          <>
            <section className="card">
              <h2>Real Integration Connectors</h2>
              <p className="sectionDesc">Epic, Cerner, HL7, lab systems, pharmacy networks.</p>
              <div className="grid">
                <div className="card whpCard"><h3>Total Connectors</h3><p>{connectors.length}</p></div>
                <div className="card whpCard"><h3>Active</h3><p>{connectors.filter(c => c.status === "active").length}</p></div>
                <div className="card whpCard"><h3>Sync Logs</h3><p>{syncLogs.length}</p></div>
              </div>
            </section>
            <section className="card" style={{ marginTop: 16 }}>
              <h3>Connectors</h3>
              <ul className="dataList">
                {connectors.map((c) => (
                  <li key={c.id}>
                    <strong>{c.connector_name}</strong> ({c.connector_type}) — {c.status} — Last sync: {c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : "Never"}
                  </li>
                ))}
                {connectors.length === 0 && <li>No connectors configured yet.</li>}
              </ul>
            </section>
            <section className="card" style={{ marginTop: 16 }}>
              <h3>Recent Sync Logs</h3>
              <ul className="dataList">
                {syncLogs.slice(0, 10).map((l) => (
                  <li key={l.id}>
                    {l.connector_name} — {l.sync_type} — {l.status} — Records: {l.records_synced} — {new Date(l.started_at).toLocaleString()}
                  </li>
                ))}
                {syncLogs.length === 0 && <li>No sync logs yet.</li>}
              </ul>
            </section>
          </>
        )}

        {/* Phase 5: Advanced Features */}
        {activeSection === "phase5-advanced" && (
          <>
            <section className="card">
              <h2>Advanced Features</h2>
              <p className="sectionDesc">ML predictions, real-time event streaming, data quality checks, analytics.</p>
              {realtimeAnalytics && (
                <div className="grid">
                  <div className="card whpCard"><h3>Events (Last Hour)</h3><p>{realtimeAnalytics.events_last_hour}</p></div>
                  <div className="card whpCard"><h3>Data Exchanges (Last Hour)</h3><p>{realtimeAnalytics.data_exchanges_last_hour}</p></div>
                  <div className="card whpCard"><h3>Active Users (Last Hour)</h3><p>{realtimeAnalytics.active_users_last_hour}</p></div>
                </div>
              )}
            </section>
            <section className="card" style={{ marginTop: 16 }}>
              <h3>Recent Events</h3>
              <ul className="dataList">
                {events.slice(0, 10).map((e) => (
                  <li key={e.id}>
                    {e.event_type} — {e.entity_type} #{e.entity_id} — {new Date(e.created_at).toLocaleString()}
                  </li>
                ))}
                {events.length === 0 && <li>No events yet.</li>}
              </ul>
            </section>
            <section className="card" style={{ marginTop: 16 }}>
              <h3>Data Quality Checks</h3>
              <ul className="dataList">
                {dataQuality.slice(0, 10).map((q) => (
                  <li key={q.id}>
                    {q.check_type} — {q.entity_type} #{q.entity_id} — {q.check_result} — {new Date(q.checked_at).toLocaleString()}
                  </li>
                ))}
                {dataQuality.length === 0 && <li>No quality checks yet.</li>}
              </ul>
            </section>
            <section className="card" style={{ marginTop: 16 }}>
              <h3>ML & Analytics</h3>
              <p style={{ fontSize: 14, color: "#666" }}>
                <strong>Endpoints:</strong><br />
                POST /api/advanced/ml/predict — Generate ML prediction<br />
                GET /api/advanced/ml/predictions/:patientId — Get patient predictions<br />
                POST /api/advanced/data-quality/check — Run quality check<br />
                GET /api/advanced/analytics/realtime — Real-time analytics<br />
                GET /api/advanced/events — Event stream<br />
                GET /api/advanced/models — ML models
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
