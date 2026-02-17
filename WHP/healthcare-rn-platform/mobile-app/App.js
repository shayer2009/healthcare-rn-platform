import "react-native-gesture-handler";
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator, DrawerContentScrollView } from "@react-navigation/drawer";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const Drawer = createDrawerNavigator();
const PURPLE = "#5d3ea8";
const BG = "#f6f6f8";
const API_URL = Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

// ---------- Role Selector Screen ----------
function RoleSelectorScreen({ onSelectRole }) {
  return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar style="dark" />
      <View style={styles.roleSelectorCard}>
        <MaterialCommunityIcons name="medical-bag" size={48} color={PURPLE} />
        <Text style={styles.roleTitle}>World Health Portal</Text>
        <Text style={styles.roleSubTitle}>Continue as</Text>
        <TouchableOpacity style={styles.roleButton} onPress={() => onSelectRole("patient")}>
          <Ionicons name="person-outline" size={24} color="#fff" />
          <Text style={styles.roleButtonText}>Patient</Text>
          <Text style={styles.roleButtonHint}>Sign in or create account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roleButton} onPress={() => onSelectRole("doctor")}>
          <Ionicons name="medkit-outline" size={24} color="#fff" />
          <Text style={styles.roleButtonText}>Doctor</Text>
          <Text style={styles.roleButtonHint}>Staff login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roleButton} onPress={() => onSelectRole("assistant")}>
          <Ionicons name="people-outline" size={24} color="#fff" />
          <Text style={styles.roleButtonText}>Assistant</Text>
          <Text style={styles.roleButtonHint}>Doctor's assistant login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------- Patient Home Screen ----------
function HomeScreen({ navigation, profile }) {
  const { name = "User", wallet_balance = 0 } = profile || {};
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={24} color="#4f4f4f" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="medical-bag" size={28} color={PURPLE} />
          <View style={styles.topRightIcons}>
            <Ionicons name="share-social-outline" size={22} color="#666" />
            <View style={styles.flag}>
              <Text style={{ color: "white", fontWeight: "700" }}>PK</Text>
            </View>
          </View>
        </View>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.muted}>Good Morning</Text>
            <Text style={styles.bold}>{name}</Text>
          </View>
          <View style={styles.walletCard}>
            <Ionicons name="wallet-outline" size={18} color="#555" />
            <Text style={styles.walletText}>Rs. {wallet_balance}</Text>
          </View>
        </View>
        <View style={styles.tabs}>
          {["Home", "Wallet", "Articles", "Ask a Question"].map((tab, i) => (
            <Text key={tab} style={[styles.tabText, i === 0 && styles.activeTab]}>{tab}</Text>
          ))}
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput style={styles.searchInput} placeholder="What do you want to search?" />
          <Ionicons name="options-outline" size={20} color={PURPLE} />
        </View>
        <View style={styles.doubleCardRow}>
          <SmallCard icon="medical" title="Doctors Online Now" />
          <SmallCard icon="location-outline" title="Nearby Doctor" />
        </View>
        <View style={styles.iconRow}>
          {[
            ["file-tray-full-outline", "Consultation\nRecords"],
            ["calendar-outline", "My\nPrescriptions"],
            ["medkit-outline", "My Doctors"],
            ["car-outline", "Ambulance"],
            ["briefcase-outline", "My Medicine"]
          ].map(([icon, label]) => (
            <View key={label} style={styles.iconItem}>
              <View style={styles.iconCircle}>
                <Ionicons name={icon} size={24} color={PURPLE} />
              </View>
              <Text style={styles.iconLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        {[
          ["call-outline", "Support"],
          ["time-outline", "Reminder"],
          ["chatbox-ellipses-outline", "My Question"],
          ["document-text-outline", "Patient Profile"],
          ["person-circle-outline", "My Account"]
        ].map(([icon, label]) => (
          <View key={label} style={styles.bottomItem}>
            <Ionicons name={icon} size={22} color={PURPLE} />
            <Text style={styles.bottomLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ---------- Doctor Dashboard Screen ----------
function DoctorHomeScreen({ navigation, profile, dashboard }) {
  const { name = "Doctor", specialization = "—" } = profile || {};
  const cards = dashboard?.cards || {};
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={24} color="#4f4f4f" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="medical-bag" size={28} color={PURPLE} />
        </View>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.muted}>Doctor</Text>
            <Text style={styles.bold}>Dr. {name}</Text>
            <Text style={styles.specialization}>{specialization}</Text>
          </View>
        </View>
        <View style={styles.staffCardRow}>
          <View style={styles.staffCard}>
            <Ionicons name="people-outline" size={28} color={PURPLE} />
            <Text style={styles.staffCardValue}>{cards.totalPatients ?? 0}</Text>
            <Text style={styles.staffCardLabel}>Total Patients</Text>
          </View>
          <View style={styles.staffCard}>
            <Ionicons name="person-add-outline" size={28} color={PURPLE} />
            <Text style={styles.staffCardValue}>{cards.myAssistants ?? 0}</Text>
            <Text style={styles.staffCardLabel}>My Assistants</Text>
          </View>
          <View style={styles.staffCard}>
            <Ionicons name="calendar-outline" size={28} color={PURPLE} />
            <Text style={styles.staffCardValue}>{cards.consultationsToday ?? 0}</Text>
            <Text style={styles.staffCardLabel}>Today</Text>
          </View>
        </View>
        <View style={styles.iconRow}>
          {[
            ["people-outline", "My Patients"],
            ["calendar-outline", "Schedule"],
            ["document-text-outline", "Consultations"],
            ["chatbubbles-outline", "Messages"],
            ["settings-outline", "Settings"]
          ].map(([icon, label]) => (
            <View key={label} style={styles.iconItem}>
              <View style={styles.iconCircle}>
                <Ionicons name={icon} size={24} color={PURPLE} />
              </View>
              <Text style={styles.iconLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Assistant Dashboard Screen ----------
function AssistantHomeScreen({ navigation, profile, dashboard }) {
  const { name = "Assistant", doctorName = "—" } = profile || {};
  const cards = dashboard?.cards || {};
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={24} color="#4f4f4f" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="medical-bag" size={28} color={PURPLE} />
        </View>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.muted}>Assistant</Text>
            <Text style={styles.bold}>{name}</Text>
            <Text style={styles.specialization}>Assigned to: {doctorName}</Text>
          </View>
        </View>
        <View style={styles.staffCardRow}>
          <View style={styles.staffCard}>
            <Ionicons name="people-outline" size={28} color={PURPLE} />
            <Text style={styles.staffCardValue}>{cards.totalPatients ?? 0}</Text>
            <Text style={styles.staffCardLabel}>Patients</Text>
          </View>
          <View style={styles.staffCard}>
            <Ionicons name="calendar-outline" size={28} color={PURPLE} />
            <Text style={styles.staffCardValue}>{cards.consultationsToday ?? 0}</Text>
            <Text style={styles.staffCardLabel}>Today</Text>
          </View>
          <View style={styles.staffCard}>
            <Ionicons name="checkbox-outline" size={28} color={PURPLE} />
            <Text style={styles.staffCardValue}>{cards.pendingTasks ?? 0}</Text>
            <Text style={styles.staffCardLabel}>Pending Tasks</Text>
          </View>
        </View>
        <View style={styles.iconRow}>
          {[
            ["people-outline", "Patients"],
            ["calendar-outline", "Schedule"],
            ["create-outline", "Book Appointment"],
            ["chatbubbles-outline", "Messages"],
            ["settings-outline", "Settings"]
          ].map(([icon, label]) => (
            <View key={label} style={styles.iconItem}>
              <View style={styles.iconCircle}>
                <Ionicons name={icon} size={24} color={PURPLE} />
              </View>
              <Text style={styles.iconLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SmallCard({ icon, title }) {
  return (
    <View style={styles.smallCard}>
      <Ionicons name={icon} size={24} color="#666" />
      <Text style={styles.smallCardTitle}>{title}</Text>
      <View style={styles.onlineDot} />
    </View>
  );
}

const ENTERPRISE_FEATURES = [
  { id: "0", icon: "globe-outline", title: "World Health Portal" },
  { id: "1", icon: "videocam-outline", title: "Video Consultations" },
  { id: "2", icon: "calendar-outline", title: "Scheduling & Appointments" },
  { id: "3", icon: "shield-checkmark-outline", title: "Security & Compliance" },
  { id: "4", icon: "document-text-outline", title: "Clinical Records" },
  { id: "5", icon: "medical-outline", title: "E-Prescribing" },
  { id: "6", icon: "card-outline", title: "Payments & Billing" },
  { id: "7", icon: "notifications-outline", title: "Notifications" },
  { id: "8", icon: "person-outline", title: "Patient Portal" },
  { id: "9", icon: "medkit-outline", title: "Provider Tools" },
  { id: "10", icon: "stats-chart-outline", title: "Analytics" },
  { id: "11", icon: "git-branch-outline", title: "Integrations" },
  { id: "12", icon: "server-outline", title: "Infrastructure" },
  { id: "13", icon: "business-outline", title: "Multi-Tenancy" }
];

// ---------- Enterprise Features Hub Screen ----------
function FeaturesHubScreen({ navigation, token, role }) {
  const [selectedFeature, setSelectedFeature] = React.useState(null);
  const [appointments, setAppointments] = React.useState([]);
  const [prescriptions, setPrescriptions] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [notifications, setNotifications] = React.useState([]);

  React.useEffect(() => {
    if (!token) return;
    apiRequest("/api/appointments", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => setAppointments(d.appointments || []))
      .catch(() => {});
    apiRequest("/api/prescriptions", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => setPrescriptions(d.prescriptions || []))
      .catch(() => {});
    apiRequest("/api/invoices", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => setInvoices(d.invoices || []))
      .catch(() => {});
    apiRequest("/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {});
  }, [token]);

  if (selectedFeature) {
    const f = ENTERPRISE_FEATURES.find((x) => x.id === selectedFeature);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.featureHeader}>
          <TouchableOpacity onPress={() => setSelectedFeature(null)}>
            <Ionicons name="arrow-back" size={24} color={PURPLE} />
          </TouchableOpacity>
          <Text style={styles.featureTitle}>{f?.title || ""}</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
          {selectedFeature === "0" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>World Health Portal — Global health data exchange platform. Hospitals, medical services, doctors, research institutes, pharmaceutical companies, pharmacies, equipment shops, government health agencies, and health ministries all connected and exchanging health data.</Text>
              <Text style={[styles.featureDesc, { marginTop: 12 }]}>Connected stakeholders:</Text>
              <Text style={styles.muted}>• Hospitals{'\n'}• Medical Services (clinics, labs){'\n'}• Research Institutes{'\n'}• Pharmaceutical Companies{'\n'}• Pharmacies & Equipment Shops{'\n'}• Government Health Agencies{'\n'}• Health Ministries</Text>
              <Text style={[styles.featureDesc, { marginTop: 12 }]}>Admin panel shows global health conditions and data exchanges.</Text>
            </View>
          )}
          {selectedFeature === "1" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Join or start video consultations. Room links are generated per appointment.</Text>
              <TouchableOpacity style={styles.featureBtn} onPress={() => {}}>
                <Text style={styles.featureBtnText}>Start Video Call</Text>
              </TouchableOpacity>
            </View>
          )}
          {selectedFeature === "2" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Your appointments</Text>
              {appointments.map((a) => (
                <View key={a.id} style={styles.listItem}>
                  <Text>{a.patient_name || a.doctor_name} — {new Date(a.slot_start).toLocaleDateString()} ({a.status})</Text>
                </View>
              ))}
              {appointments.length === 0 && <Text style={styles.muted}>No appointments</Text>}
            </View>
          )}
          {selectedFeature === "3" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Security settings, MFA, and audit logs. Managed in admin panel.</Text>
            </View>
          )}
          {selectedFeature === "4" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Clinical notes, vitals, allergies. View and manage in profile.</Text>
            </View>
          )}
          {selectedFeature === "5" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Prescriptions</Text>
              {prescriptions.map((p) => (
                <View key={p.id} style={styles.listItem}>
                  <Text>{p.medication_name} — {p.dosage || "—"}</Text>
                </View>
              ))}
              {prescriptions.length === 0 && <Text style={styles.muted}>No prescriptions</Text>}
            </View>
          )}
          {selectedFeature === "6" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Invoices & payments</Text>
              {invoices.map((i) => (
                <View key={i.id} style={styles.listItem}>
                  <Text>Rs. {i.amount} — {i.status}</Text>
                </View>
              ))}
              {invoices.length === 0 && <Text style={styles.muted}>No invoices</Text>}
            </View>
          )}
          {selectedFeature === "7" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Notifications</Text>
              {notifications.slice(0, 10).map((n) => (
                <View key={n.id} style={styles.listItem}>
                  <Text>{n.title || n.body?.slice(0, 50)}</Text>
                </View>
              ))}
              {notifications.length === 0 && <Text style={styles.muted}>No notifications</Text>}
            </View>
          )}
          {selectedFeature === "8" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Pre-visit forms, intake, patient profile. Available in profile section.</Text>
            </View>
          )}
          {selectedFeature === "9" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Provider availability, queue, schedule. Configure in admin or doctor dashboard.</Text>
            </View>
          )}
          {selectedFeature === "10" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Analytics and reports. View in admin panel.</Text>
            </View>
          )}
          {selectedFeature === "11" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>EHR, labs, pharmacy integrations. Configure in admin panel.</Text>
            </View>
          )}
          {selectedFeature === "12" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>System health, rate limiting, HA. Monitored via /api/system/status.</Text>
            </View>
          )}
          {selectedFeature === "13" && (
            <View style={styles.featureCard}>
              <Text style={styles.featureDesc}>Multi-tenancy. Toggle on/off in admin panel under Multi-Tenancy section.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.featureHeader}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#4f4f4f" />
        </TouchableOpacity>
        <Text style={styles.featureTitle}>Enterprise Features</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.featureIntro}>World Health Portal + 13 telehealth features</Text>
        {ENTERPRISE_FEATURES.map((f) => (
          <TouchableOpacity key={f.id} style={styles.featureCard} onPress={() => setSelectedFeature(f.id)}>
            <Ionicons name={f.icon} size={28} color={PURPLE} />
            <Text style={styles.featureCardTitle}>{f.title}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function CustomDrawerContent(props) {
  const { settings, onToggleSetting, onLogout, savingKey, role, navigation } = props;
  const settingRows = [
    ["notification", "Notification"],
    ["sms", "SMS"],
    ["email", "E-mail"],
    ["dark_mode", "Dark Mode"],
    ["status", "Status"]
  ];

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerSection}>
        {role === "patient" && settingRows.map(([key, label]) => (
          <View key={key} style={styles.drawerToggleRow}>
            <Text style={styles.drawerText}>{label}</Text>
            <Switch
              value={Boolean(settings[key])}
              onValueChange={() => onToggleSetting(key, Boolean(settings[key]))}
              disabled={savingKey === key}
            />
          </View>
        ))}
        {role === "patient" && ["Email", "Phone", "Password", "Privacy Policy", "Terms of Service", "FAQ"].map((item) => (
          <View key={item} style={styles.drawerLinkRow}>
            <Text style={styles.drawerText}>{item}</Text>
            <Ionicons name="chevron-forward" size={18} color={PURPLE} />
          </View>
        ))}
        {(role === "doctor" || role === "assistant") && (
          <>
            <View style={styles.drawerLinkRow}>
              <Text style={styles.drawerText}>Profile</Text>
              <Ionicons name="chevron-forward" size={18} color={PURPLE} />
            </View>
            <View style={styles.drawerLinkRow}>
              <Text style={styles.drawerText}>Schedule</Text>
              <Ionicons name="chevron-forward" size={18} color={PURPLE} />
            </View>
            <View style={styles.drawerLinkRow}>
              <Text style={styles.drawerText}>Settings</Text>
              <Ionicons name="chevron-forward" size={18} color={PURPLE} />
            </View>
          </>
        )}
          <TouchableOpacity style={styles.drawerLinkRow} onPress={() => navigation?.navigate("Features")}>
            <Text style={[styles.drawerText, { fontWeight: "700", color: PURPLE }]}>World Health Portal + Features (14)</Text>
          <Ionicons name="grid-outline" size={20} color={PURPLE} />
        </TouchableOpacity>
        <View style={styles.drawerFooter}>
          <Text style={styles.drawerText}>API: {API_URL}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

export default function App() {
  const [userRole, setUserRole] = React.useState(null);
  const [authTab, setAuthTab] = React.useState("login");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [token, setToken] = React.useState("");
  const [profile, setProfile] = React.useState(null);
  const [dashboard, setDashboard] = React.useState(null);
  const [settings, setSettings] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [savingKey, setSavingKey] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");

  async function loadProfile(currentToken) {
    if (userRole === "patient") {
      const data = await apiRequest("/api/patient/profile", {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      setProfile(data.profile);
      setSettings(data.settings);
    } else if (userRole === "doctor") {
      const [profData, dashData] = await Promise.all([
        apiRequest("/api/doctor/profile", { headers: { Authorization: `Bearer ${currentToken}` } }),
        apiRequest("/api/doctor/dashboard", { headers: { Authorization: `Bearer ${currentToken}` } })
      ]);
      setProfile(profData.profile);
      setDashboard(dashData);
    } else if (userRole === "assistant") {
      const [profData, dashData] = await Promise.all([
        apiRequest("/api/assistant/profile", { headers: { Authorization: `Bearer ${currentToken}` } }),
        apiRequest("/api/assistant/dashboard", { headers: { Authorization: `Bearer ${currentToken}` } })
      ]);
      setProfile(profData.profile);
      setDashboard(dashData);
    }
  }

  async function handlePatientLogin() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await apiRequest("/api/patient/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      setToken(data.token);
      setProfile(data.user);
      await loadProfile(data.token);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePatientSignup() {
    try {
      setLoading(true);
      setErrorMessage("");
      if (!name.trim() || !email.trim() || !password) {
        setErrorMessage("Name, email and password are required");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters");
        return;
      }
      const data = await apiRequest("/api/patient/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined })
      });
      setToken(data.token);
      setProfile(data.user);
      await loadProfile(data.token);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDoctorLogin() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await apiRequest("/api/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      setToken(data.token);
      setProfile(data.user);
      await loadProfile(data.token);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssistantLogin() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await apiRequest("/api/assistant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      setToken(data.token);
      setProfile(data.user);
      await loadProfile(data.token);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function onToggleSetting(settingKey, currentValue) {
    try {
      setSavingKey(settingKey);
      await apiRequest(`/api/patient/settings/${settingKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: !currentValue })
      });
      setSettings((prev) => ({ ...prev, [settingKey]: !currentValue }));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSavingKey("");
    }
  }

  function logout() {
    setToken("");
    setProfile(null);
    setDashboard(null);
    setSettings({});
    setUserRole(null);
    setEmail("");
    setPassword("");
    setName("");
  }

  function selectRole(role) {
    setUserRole(role);
    setErrorMessage("");
    if (role === "doctor") {
      setEmail("doctor@healthapp.local");
      setPassword("doctor123");
    } else if (role === "assistant") {
      setEmail("assistant@healthapp.local");
      setPassword("assistant123");
    } else {
      setEmail("");
      setPassword("");
    }
  }

  // Role selector (no role chosen yet)
  if (userRole === null && !token) {
    return <RoleSelectorScreen onSelectRole={selectRole} />;
  }

  // Login screens (role chosen but not logged in)
  if (!token) {
    const isPatient = userRole === "patient";
    const isDoctor = userRole === "doctor";
    const isAssistant = userRole === "assistant";
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar style="dark" />
        <View style={styles.loginCard}>
          <TouchableOpacity style={styles.backRole} onPress={() => setUserRole(null)}>
            <Ionicons name="arrow-back" size={20} color={PURPLE} />
            <Text style={styles.backRoleText}>Change role</Text>
          </TouchableOpacity>
          <Text style={styles.loginTitle}>
            {isPatient && "Patient"}
            {isDoctor && "Doctor"}
            {isAssistant && "Assistant"}
          </Text>
          <Text style={styles.loginSubTitle}>
            {isPatient ? "Sign in or create account" : "Staff login"}
          </Text>
          {isPatient && (
            <View style={styles.authTabs}>
              <TouchableOpacity
                style={[styles.authTab, authTab === "login" && styles.authTabActive]}
                onPress={() => { setAuthTab("login"); setErrorMessage(""); }}
              >
                <Text style={[styles.authTabText, authTab === "login" && styles.authTabTextActive]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTab, authTab === "signup" && styles.authTabActive]}
                onPress={() => { setAuthTab("signup"); setErrorMessage(""); }}
              >
                <Text style={[styles.authTabText, authTab === "signup" && styles.authTabTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}
          {isPatient && authTab === "signup" && (
            <TextInput style={styles.loginInput} placeholder="Full Name" value={name} onChangeText={setName} />
          )}
          <TextInput
            style={styles.loginInput}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {isPatient && authTab === "signup" && (
            <TextInput style={styles.loginInput} placeholder="Phone (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          )}
          <TextInput
            style={styles.loginInput}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.loginButton}
            onPress={
              isPatient ? (authTab === "login" ? handlePatientLogin : handlePatientSignup) :
              isDoctor ? handleDoctorLogin : handleAssistantLogin
            }
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Login</Text>}
          </TouchableOpacity>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  // Patient main app
  if (userRole === "patient") {
    return (
      <NavigationContainer>
        <Drawer.Navigator
          screenOptions={{ headerShown: false, drawerType: "slide", drawerStyle: { width: 300 } }}
          drawerContent={(props) => (
            <CustomDrawerContent
              {...props}
              role="patient"
              settings={settings}
              onToggleSetting={onToggleSetting}
              onLogout={logout}
              savingKey={savingKey}
              navigation={props.navigation}
            />
          )}
          initialRouteName="Home"
        >
          <Drawer.Screen
            name="Home"
            listeners={{ focus: () => { if (token) loadProfile(token).catch(() => {}); } }}
          >
            {(p) => <HomeScreen {...p} profile={profile} />}
          </Drawer.Screen>
          <Drawer.Screen name="Features">
            {(p) => <FeaturesHubScreen {...p} token={token} role="patient" />}
          </Drawer.Screen>
        </Drawer.Navigator>
      </NavigationContainer>
    );
  }

  // Doctor main app
  if (userRole === "doctor") {
    return (
      <NavigationContainer>
        <Drawer.Navigator
          screenOptions={{ headerShown: false, drawerType: "slide", drawerStyle: { width: 300 } }}
          drawerContent={(props) => (
            <CustomDrawerContent {...props} role="doctor" onLogout={logout} navigation={props.navigation} />
          )}
          initialRouteName="DoctorHome"
        >
          <Drawer.Screen
            name="DoctorHome"
            listeners={{ focus: () => { if (token) loadProfile(token).catch(() => {}); } }}
          >
            {(p) => <DoctorHomeScreen {...p} profile={profile} dashboard={dashboard} />}
          </Drawer.Screen>
          <Drawer.Screen name="Features">
            {(p) => <FeaturesHubScreen {...p} token={token} role="doctor" />}
          </Drawer.Screen>
        </Drawer.Navigator>
      </NavigationContainer>
    );
  }

  // Assistant main app
  return (
    <NavigationContainer>
      <Drawer.Navigator
        screenOptions={{ headerShown: false, drawerType: "slide", drawerStyle: { width: 300 } }}
        drawerContent={(props) => (
          <CustomDrawerContent {...props} role="assistant" onLogout={logout} navigation={props.navigation} />
        )}
        initialRouteName="AssistantHome"
      >
          <Drawer.Screen
            name="AssistantHome"
          listeners={{ focus: () => { if (token) loadProfile(token).catch(() => {}); } }}
        >
          {(p) => <AssistantHomeScreen {...p} profile={profile} dashboard={dashboard} />}
          </Drawer.Screen>
          <Drawer.Screen name="Features">
            {(p) => <FeaturesHubScreen {...p} token={token} role="assistant" />}
          </Drawer.Screen>
        </Drawer.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: BG, justifyContent: "center", padding: 16 },
  roleSelectorCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e9e9ee",
    alignItems: "center"
  },
  roleTitle: { fontSize: 24, fontWeight: "700", color: "#333", marginTop: 12 },
  roleSubTitle: { fontSize: 16, color: "#6b6b6b", marginVertical: 20 },
  roleButton: {
    width: "100%",
    backgroundColor: PURPLE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  roleButtonText: { color: "#fff", fontWeight: "700", fontSize: 18, flex: 1 },
  roleButtonHint: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  backRole: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  backRoleText: { color: PURPLE, fontWeight: "600" },
  loginCard: { backgroundColor: "white", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e9e9ee" },
  loginTitle: { fontSize: 24, fontWeight: "700", color: "#333" },
  loginSubTitle: { marginTop: 6, marginBottom: 16, color: "#6b6b6b" },
  authTabs: { flexDirection: "row", marginBottom: 12, gap: 8 },
  authTab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", backgroundColor: "#eee" },
  authTabActive: { backgroundColor: PURPLE },
  authTabText: { fontWeight: "600", color: "#666" },
  authTabTextActive: { color: "#fff" },
  loginInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  loginButton: { backgroundColor: PURPLE, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  loginButtonText: { color: "white", fontWeight: "700" },
  errorText: { marginTop: 10, color: "#dc2626" },
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingBottom: 110 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  topRightIcons: { flexDirection: "row", alignItems: "center", gap: 12 },
  flag: { backgroundColor: "#006f3c", borderRadius: 4, paddingHorizontal: 7, paddingVertical: 4 },
  greetingRow: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muted: { color: "#8a8a8a", fontSize: 16 },
  bold: { color: "#2f2f2f", fontSize: 30, fontWeight: "700" },
  specialization: { color: "#6b6b6b", fontSize: 14, marginTop: 4 },
  walletCard: { flexDirection: "row", backgroundColor: "white", borderRadius: 25, paddingHorizontal: 16, paddingVertical: 11, alignItems: "center", gap: 8 },
  walletText: { color: "#5b5b5b", fontSize: 20, fontWeight: "600" },
  staffCardRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  staffCard: { flex: 1, backgroundColor: "white", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#ececf0" },
  staffCardValue: { fontSize: 22, fontWeight: "700", color: "#333", marginTop: 8 },
  staffCardLabel: { fontSize: 12, color: "#6b6b6b", marginTop: 4 },
  tabs: { marginTop: 16, flexDirection: "row", gap: 18 },
  tabText: { color: "#8f8f94", fontSize: 18, fontWeight: "600" },
  activeTab: { color: PURPLE, textDecorationLine: "underline" },
  searchWrap: { marginTop: 16, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ebebef" },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 16 },
  doubleCardRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  smallCard: { flex: 1, backgroundColor: "white", borderRadius: 12, padding: 14, minHeight: 95, borderWidth: 1, borderColor: "#ececf0" },
  smallCardTitle: { marginTop: 8, color: "#5f5f5f", fontSize: 17, fontWeight: "500" },
  onlineDot: { position: "absolute", right: 12, top: 44, width: 10, height: 10, borderRadius: 8, backgroundColor: "#16a34a" },
  iconRow: { marginTop: 16, flexDirection: "row", justifyContent: "space-between" },
  iconItem: { alignItems: "center", width: 72 },
  iconCircle: { width: 58, height: 58, borderRadius: 32, backgroundColor: "white", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ececf0" },
  iconLabel: { textAlign: "center", fontSize: 12, marginTop: 6, color: "#4f4f4f" },
  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-around",
    backgroundColor: "white", borderTopWidth: 1, borderColor: "#ececef", paddingVertical: 10
  },
  bottomItem: { alignItems: "center", width: 72 },
  bottomLabel: { fontSize: 12, color: PURPLE, marginTop: 4, textAlign: "center" },
  drawerSection: { paddingHorizontal: 12, gap: 8 },
  drawerToggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  drawerLinkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  drawerText: { fontSize: 18, color: "#444" },
  drawerFooter: { marginTop: 24, paddingBottom: 24 },
  logoutBtn: { marginTop: 12, backgroundColor: PURPLE, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  featureHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#eee" },
  featureTitle: { fontSize: 18, fontWeight: "700", marginLeft: 12 },
  featureIntro: { fontSize: 14, color: "#666", marginBottom: 16 },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee"
  },
  featureCardTitle: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: "600" },
  featureDesc: { marginBottom: 12, color: "#555" },
  featureBtn: { backgroundColor: PURPLE, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignSelf: "flex-start" },
  featureBtnText: { color: "#fff", fontWeight: "600" },
  listItem: { padding: 10, borderBottomWidth: 1, borderColor: "#eee" }
});
