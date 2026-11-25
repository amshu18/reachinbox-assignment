
import { useEffect, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import {
  LayoutDashboard,
  Mail,
  Send,
  Clock,
  Plus,
  Search,
  Bell,
  Settings,
  Users,
  X,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  CalendarDays,
  Sparkles,
  Inbox,
  ArrowUpRight,
  FileText,
  Heart,
  ChevronRight,
} from "lucide-react";

const API = "http://localhost:5000/api";
const AUTH_API = "http://localhost:5000/auth";
const SENDER_ID = "e7958e2b-595a-4a6b-bfa8-9f260941dc38";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

interface Email {
  id: string;
  subject: string;
  body?: string;
  recipients?: string[];
  recipient?: string;
  status: string;
  created_at?: string;
  scheduled_at?: string;
  sent_at?: string;
  start_time?: string;
}

interface User {
  name?: string;
  email?: string;
  picture?: string;
  [key: string]: unknown;
}

type DeliveryMode = "now" | "scheduled";

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap');

:root {
  font-family: 'DM Sans', sans-serif;
  color: #302b3d;
  background: #faf8fc;
  font-synthesis: none;
}

* { box-sizing: border-box; }
body { margin: 0; background: #faf8fc; }
button, input, textarea { font: inherit; }
button { cursor: pointer; }

.app-shell {
  min-height: 100vh;
  display: flex;
  background: #faf8fc;
}

.sidebar {
  width: 250px;
  min-width: 250px;
  background: #fff;
  border-right: 1px solid #f0ebf4;
  padding: 27px 18px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 9px;
  margin-bottom: 35px;
}

.brand-icon {
  width: 39px;
  height: 39px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: white;
  background: linear-gradient(135deg, #a78bfa, #d6a5d8);
  box-shadow: 0 5px 13px #b79ce844;
}

.brand-name {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.7px;
}

.brand-name span { color: #a78bfa; }

.workspace {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #faf7fd;
  border: 1px solid #f0eaf6;
  border-radius: 15px;
  margin-bottom: 30px;
}

.workspace-avatar {
  width: 35px;
  height: 35px;
  border-radius: 11px;
  background: #eee5fb;
  color: #9273c8;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.workspace-info { min-width: 0; }
.workspace-info strong { display: block; font-size: 12px; }
.workspace-info small { color: #9991a5; font-size: 10px; }

.nav-label {
  color: #aaa2b4;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.3px;
  padding: 0 12px;
  margin-bottom: 12px;
}

.navigation { display: grid; gap: 6px; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  background: transparent;
  color: #81798d;
  padding: 12px 13px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  transition: .2s;
}

.nav-item:hover { background: #faf6ff; color: #9273c8; }
.nav-item.selected {
  color: #8969c3;
  background: #f1eafa;
}

.sidebar-bottom { margin-top: auto; }

.profile {
  border-top: 1px solid #f0ebf4;
  padding: 19px 5px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-avatar {
  width: 37px;
  height: 37px;
  border-radius: 50%;
  background: #eee5fb;
  object-fit: cover;
  display: grid;
  place-items: center;
  color: #9273c8;
  font-weight: 800;
}

.profile-info { flex: 1; min-width: 0; }
.profile-info strong {
  display: block;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-info small {
  color: #a49bab;
  font-size: 10px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-button {
  border: 0;
  background: transparent;
  color: #958ca1;
  padding: 7px;
  border-radius: 9px;
}
.icon-button:hover { background: #f5effb; color: #8969c3; }

.main-content { flex: 1; min-width: 0; }

.topbar {
  height: 75px;
  background: #fff;
  border-bottom: 1px solid #f0ebf4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 42px;
}

.breadcrumb { color: #a29aaa; font-size: 12px; }
.breadcrumb strong { color: #50465d; font-weight: 700; }

.topbar-actions { display: flex; align-items: center; gap: 17px; }
.top-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #eee5fb;
  object-fit: cover;
}

.page-content {
  max-width: 1250px;
  margin: auto;
  padding: 36px 42px 55px;
}

.welcome-card {
  position: relative;
  overflow: hidden;
  padding: 33px 37px;
  border-radius: 22px;
  background: linear-gradient(115deg, #f0e9fb 0%, #f9edf5 55%, #fff0eb 100%);
  margin-bottom: 29px;
}

.welcome-card::after {
  content: "✿";
  position: absolute;
  right: 65px;
  top: -40px;
  font-size: 180px;
  color: #ffffff55;
  transform: rotate(-15deg);
  pointer-events: none;
}

.welcome-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #9677c3;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
  margin-bottom: 11px;
}

.welcome-card h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(27px, 4vw, 38px);
  line-height: 1.2;
  margin: 0 0 10px;
  color: #443751;
  font-weight: 700;
}

.welcome-card h1 span { color: #a17bc7; }

.welcome-card p {
  color: #83768d;
  font-size: 13px;
  margin: 0;
  max-width: 460px;
  line-height: 1.7;
}

.welcome-decoration {
  position: absolute;
  right: 55px;
  bottom: 23px;
  color: #b18dc8;
  font-size: 24px;
  letter-spacing: 7px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin: 27px 0 19px;
}

.page-heading h2 {
  font-family: 'Playfair Display', serif;
  color: #443751;
  font-size: 23px;
  margin: 0 0 5px;
}

.subtitle { color: #a39aaa; font-size: 12px; margin: 0; }

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 0;
  border-radius: 12px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #a58bd4, #c19acb);
  color: white;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 5px 13px #b79bd533;
  transition: .2s;
}
.primary-button:hover { transform: translateY(-1px); box-shadow: 0 8px 17px #b79bd555; }
.primary-button:disabled { opacity: .6; cursor: not-allowed; transform: none; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 27px;
}

.stat-card {
  background: #fff;
  border: 1px solid #f0ebf4;
  border-radius: 17px;
  padding: 19px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 3px 12px #59406b06;
}

.stat-icon {
  width: 43px;
  height: 43px;
  border-radius: 14px;
  display: grid;
  place-items: center;
}
.stat-icon.purple { background: #f0eafb; color: #9677c9; }
.stat-icon.green { background: #e8f5ed; color: #6fae8a; }
.stat-icon.blue { background: #eaf0fc; color: #7c94ce; }

.stat-card small { display: block; color: #a49bab; font-size: 11px; margin-bottom: 5px; }
.stat-card strong { font-size: 23px; color: #463b50; }

.email-section {
  background: #fff;
  border: 1px solid #f0ebf4;
  border-radius: 19px;
  padding: 23px;
  box-shadow: 0 4px 15px #59406b05;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 19px;
}

.section-heading h3 { margin: 0 0 5px; font-size: 15px; color: #493f54; }
.section-heading p { margin: 0; font-size: 11px; color: #aaa1b1; }

.refresh-button {
  border: 1px solid #eee8f3;
  background: white;
  color: #94869f;
  border-radius: 10px;
  padding: 9px;
  display: flex;
}

.tabs {
  display: flex;
  gap: 7px;
  border-bottom: 1px solid #f0ebf4;
  margin-bottom: 17px;
}

.tab {
  border: 0;
  background: transparent;
  color: #a39aaa;
  font-size: 12px;
  font-weight: 700;
  padding: 11px 15px;
  border-bottom: 2px solid transparent;
}

.tab.active-tab { color: #9273c8; border-color: #a58bd4; }

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  background: #faf8fc;
  border: 1px solid #f0ebf4;
  border-radius: 10px;
  padding: 10px 12px;
  width: min(330px, 100%);
  color: #aaa1b1;
}

.search-box input {
  border: 0;
  outline: 0;
  background: transparent;
  width: 100%;
  color: #554b60;
  font-size: 12px;
}

.record-count { color: #aaa1b1; font-size: 11px; white-space: nowrap; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 570px; }
th {
  text-align: left;
  padding: 12px 13px;
  color: #aaa1b1;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  border-bottom: 1px solid #f2edf5;
}
td {
  padding: 15px 13px;
  border-bottom: 1px solid #f5f1f7;
  color: #6e6479;
  font-size: 11px;
}
tr:last-child td { border-bottom: 0; }

.recipient-cell { display: flex; align-items: center; gap: 9px; }
.recipient-avatar {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: #f0eafb;
  color: #9677c9;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
}
.recipient-text { color: #564b61; font-weight: 600; }
.subject-cell { color: #51465c; font-weight: 600; max-width: 180px; }

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  text-transform: capitalize;
  background: #f1eafb;
  color: #9273c8;
}
.status-pill.sent { background: #eaf5ed; color: #6b9e7b; }
.status-pill.failed { background: #fff0ef; color: #cf7771; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.empty-state {
  text-align: center;
  padding: 45px 15px;
  color: #aaa1b1;
}
.empty-icon {
  width: 55px;
  height: 55px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: #f5effb;
  color: #a58bd4;
  margin: 0 auto 13px;
}
.empty-state h3 { color: #61556e; font-size: 14px; margin: 0 0 6px; }
.empty-state p { font-size: 11px; margin: 0 0 17px; }

.alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 14px;
  border-radius: 11px;
  font-size: 12px;
  margin-bottom: 15px;
}
.error-alert { background: #fff0ef; color: #bd6a66; }
.success-alert { background: #edf7ef; color: #659875; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #30243e66;
  backdrop-filter: blur(5px);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}

.compose-modal {
  width: min(610px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 20px 70px #2f1e4530;
  padding: 27px;
  animation: appear .2s ease-out;
}

@keyframes appear {
  from { opacity: 0; transform: translateY(10px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 23px;
}
.modal-heading h2 {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  color: #443751;
  margin: 0 0 5px;
}
.modal-heading p { color: #a39aaa; font-size: 11px; margin: 0; }

.close-button {
  border: 0;
  background: #f7f3fa;
  color: #91869c;
  border-radius: 10px;
  padding: 8px;
  display: grid;
  place-items: center;
}

.field { margin-bottom: 17px; }
.field label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #675b73;
  margin-bottom: 8px;
}
.field input, .field textarea {
  width: 100%;
  border: 1px solid #eee8f3;
  background: #fdfcfe;
  border-radius: 11px;
  outline: 0;
  padding: 12px 13px;
  color: #50465b;
  font-size: 12px;
  transition: .2s;
}
.field input:focus, .field textarea:focus {
  border-color: #b69ad8;
  box-shadow: 0 0 0 3px #b69ad81c;
}
.field textarea { resize: vertical; min-height: 115px; line-height: 1.6; }
.field input::placeholder, .field textarea::placeholder { color: #c0b8c8; }

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #987ac5;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 9px;
}
.upload-label input { display: none; }

.delivery-title {
  font-size: 12px;
  font-weight: 800;
  color: #554a61;
  margin: 22px 0 11px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.delivery-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
  margin-bottom: 15px;
}

.delivery-option {
  border: 1px solid #eee8f3;
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  text-align: left;
  color: #766b81;
  transition: .2s;
}
.delivery-option:hover { border-color: #c6b0df; }
.delivery-option.chosen {
  border: 1.5px solid #a78bca;
  background: #f8f3fc;
  box-shadow: 0 0 0 3px #a78bca12;
}
.delivery-option-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #9879c4;
  background: #eee7f8;
  margin-bottom: 10px;
}
.delivery-option strong { display: block; color: #51465d; font-size: 12px; margin-bottom: 5px; }
.delivery-option small { display: block; color: #a39aaa; font-size: 10px; line-height: 1.5; }

.schedule-note {
  padding: 11px 13px;
  background: #faf7fd;
  border: 1px solid #f0eaf6;
  border-radius: 10px;
  color: #8d7d9c;
  font-size: 10px;
  line-height: 1.6;
  margin: 5px 0 17px;
  display: flex;
  gap: 8px;
}

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.recipient-count { color: #a39aaa; font-size: 10px; margin-top: 6px; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 15px;
  border-top: 1px solid #f2edf5;
}
.secondary-button {
  border: 1px solid #eee8f3;
  background: #fff;
  color: #84788e;
  border-radius: 11px;
  padding: 11px 17px;
  font-size: 11px;
  font-weight: 700;
}

.login-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #f2ebfb, #fff4f1);
  width: 100%;
}
.login-card {
  width: min(430px, 100%);
  background: white;
  border: 1px solid #f0eaf5;
  border-radius: 24px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 15px 50px #6e527a12;
}
.login-card .brand { justify-content: center; margin-bottom: 30px; }
.login-card h1 {
  font-family: 'Playfair Display', serif;
  color: #443751;
  font-size: 29px;
  margin: 0 0 9px;
}
.login-card p { color: #9c92a5; font-size: 12px; line-height: 1.7; margin-bottom: 27px; }
.google-wrap { display: flex; justify-content: center; }
.login-flower { color: #b18dc8; font-size: 25px; margin-top: 24px; }

@media (max-width: 900px) {
  .sidebar { width: 215px; min-width: 215px; }
  .page-content { padding: 28px 22px; }
  .topbar { padding: 0 22px; }
}
@media (max-width: 650px) {
  .sidebar { width: 65px; min-width: 65px; padding: 20px 8px; }
  .brand { padding: 0; justify-content: center; }
  .brand-name, .workspace-info, .workspace, .nav-label,
  .nav-item span, .profile-info, .sidebar-bottom .icon-button { display: none; }
  .navigation { margin-top: 20px; }
  .nav-item { justify-content: center; padding: 12px 0; }
  .profile { justify-content: center; padding: 15px 0 0; }
  .topbar { height: 62px; padding: 0 14px; }
  .page-content { padding: 20px 13px; }
  .welcome-card { padding: 25px 20px; }
  .welcome-card::after { right: 5px; font-size: 110px; }
  .welcome-decoration { display: none; }
  .stats-grid { gap: 8px; }
  .stat-card { padding: 12px 9px; gap: 8px; }
  .stat-icon { width: 32px; height: 32px; border-radius: 10px; }
  .stat-card strong { font-size: 18px; }
  .stat-card small { font-size: 9px; }
  .email-section { padding: 14px; }
  .page-heading { align-items: flex-start; }
  .primary-button { padding: 11px 12px; }
  .delivery-options { gap: 7px; }
  .compose-modal { padding: 20px; }
}
@media (max-width: 390px) {
  .stats-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; gap: 0; }
}
`;

function ReachInboxApp() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("reachinbox_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [emails, setEmails] = useState<Email[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [sentTotal, setSentTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Email[]>([]);
  const [searching, setSearching] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delay, setDelay] = useState("2");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("now");

  const parseEmailList = (value: string) =>
    Array.from(
      new Set(
        value
          .split(/[\s,;]+/)
          .map((email) => email.trim())
          .filter(Boolean)
      )
    );

  const loadEmails = async () => {
    setLoading(true);
    try {
      const [activeResponse, scheduledResponse, sentResponse] =
        await Promise.all([
          fetch(`${API}/emails?status=${activeTab}&limit=100`),
          fetch(`${API}/emails?status=scheduled&limit=100`),
          fetch(`${API}/emails?status=sent&limit=100`),
        ]);

      if (!activeResponse.ok || !scheduledResponse.ok || !sentResponse.ok) {
        throw new Error("Unable to load emails.");
      }

      const activeData = await activeResponse.json();
      const scheduledData = await scheduledResponse.json();
      const sentData = await sentResponse.json();

      const getList = (data: any): Email[] => {
        if (Array.isArray(data)) return data;
        return data.emails || data.results || data.data || [];
      };

      const scheduledList = getList(scheduledData);
      const sentList = getList(sentData);

      setEmails(getList(activeData));
      setScheduledTotal(
        scheduledData.total ?? scheduledData.count ?? scheduledList.length
      );
      setSentTotal(sentData.total ?? sentData.count ?? sentList.length);
    } catch (err) {
      console.error(err);
      setError("Could not load emails. Please check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `${API}/search?q=${encodeURIComponent(search.trim())}`
        );
        if (!response.ok) throw new Error("Search failed");
        const data = await response.json();
        setSearchResults(
          Array.isArray(data) ? data : data.results || data.emails || []
        );
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const handleGoogleLogin = async (credential: string) => {
    setLoginLoading(true);
    setError("");

    try {
      const response = await fetch(`${AUTH_API}/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Google login failed.");
      }

      const loggedInUser = data.user || data;
      setUser(loggedInUser);
      localStorage.setItem("reachinbox_user", JSON.stringify(loggedInUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("reachinbox_user");
    setUser(null);
    setEmails([]);
  };

  const resetComposer = () => {
    setRecipients("");
    setSubject("");
    setBody("");
    setStartTime("");
    setDelay("2");
    setDeliveryMode("now");
    setComposeOpen(false);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      const found = content.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      );

      if (found?.length) {
        setRecipients((previous) =>
          Array.from(new Set([...parseEmailList(previous), ...found])).join(", ")
        );
        setMessage(`${found.length} email address(es) imported successfully.`);
      } else {
        setError("No valid email addresses were found in that file.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const emailList = parseEmailList(recipients);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailList.length) {
      setError("Please enter at least one recipient email address.");
      return;
    }

    if (!emailList.every((email) => emailPattern.test(email))) {
      setError("Please check the recipient email addresses.");
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setError("Please enter both a subject and an email message.");
      return;
    }

    let effectiveStartTime: Date;

    if (deliveryMode === "now") {
      // Queue the email for near-immediate processing.
      effectiveStartTime = new Date(Date.now() + 5000);
    } else {
      if (!startTime) {
        setError("Please choose a date and time for your scheduled email.");
        return;
      }

      effectiveStartTime = new Date(startTime);

      if (effectiveStartTime.getTime() <= Date.now()) {
        setError("Please select a future date and time.");
        return;
      }
    }

    setSending(true);

    try {
      const response = await fetch(`${API}/emails/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: emailList,
          subject: subject.trim(),
          body: body.trim(),
          startTime: effectiveStartTime.toISOString(),
          delayBetweenEmails: Number(delay) * 1000,
          senderId: SENDER_ID,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Unable to queue your emails."
        );
      }

      const successMessage =
        deliveryMode === "now"
          ? `Your email${emailList.length > 1 ? "s are" : " is"} queued for immediate delivery!`
          : `Your email${emailList.length > 1 ? "s are" : " is"} scheduled successfully!`;

      setMessage(successMessage);
      resetComposer();
      await loadEmails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const displayEmails = search.trim() ? searchResults : emails;

  const getRecipient = (email: Email) => {
    if (Array.isArray(email.recipients)) return email.recipients.join(", ");
    return email.recipient || "Recipient";
  };

  const getEmailDate = (email: Email) =>
    email.sent_at || email.scheduled_at || email.start_time || email.created_at;

  if (!user) {
    return (
      <>
        <style>{styles}</style>
        <div className="login-screen">
          <div className="login-card">
            <div className="brand">
              <div className="brand-icon"><Mail size={21} /></div>
              <div className="brand-name">reach<span>inbox</span></div>
            </div>

            <div className="welcome-kicker">
              <Sparkles size={13} /> YOUR EMAIL SPACE
            </div>
            <h1>A little space for big conversations.</h1>
            <p>
              Sign in to plan, send and keep track of your emails.
              Your calmer email workflow starts here.
            </p>

            {error && <div className="alert error-alert"><AlertCircle size={16} />{error}</div>}

            <div className="google-wrap">
              {loginLoading ? (
                <Loader2 className="spin" />
              ) : (
                <GoogleLogin
                  onSuccess={(response) => {
                    if (response.credential) handleGoogleLogin(response.credential);
                  }}
                  onError={() => setError("Google sign-in was unsuccessful. Please try again.")}
                  theme="outline"
                  shape="pill"
                  text="signin_with"
                />
              )}
            </div>
            <div className="login-flower">✦ ✧ ✿</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon"><Mail size={21} /></div>
            <div className="brand-name">reach<span>inbox</span></div>
          </div>

          <div className="workspace">
            <div className="workspace-avatar"><Mail size={17} /></div>
            <div className="workspace-info">
              <strong>My workspace</strong>
              <small>Personal account</small>
            </div>
            <ChevronRight size={14} color="#aaa1b1" />
          </div>

          <div className="nav-label">WORKSPACE</div>
          <nav className="navigation">
            <button className="nav-item selected" onClick={() => setActiveTab("scheduled")}>
              <LayoutDashboard size={17} /><span>Overview</span>
            </button>
            <button className={`nav-item ${activeTab === "scheduled" ? "active" : ""}`} onClick={() => setActiveTab("scheduled")}>
              <Clock size={17} /><span>Scheduled emails</span>
            </button>
            <button className={`nav-item ${activeTab === "sent" ? "active" : ""}`} onClick={() => setActiveTab("sent")}>
              <Send size={17} /><span>Sent emails</span>
            </button>
            <button className="nav-item" onClick={() => setComposeOpen(true)}>
              <Plus size={17} /><span>Compose email</span>
            </button>
          </nav>

          <div className="sidebar-bottom">
            <div className="nav-label">PREFERENCES</div>
            <button className="nav-item" onClick={() => setMessage("You're all set! Your email workspace is ready.")}>
              <Settings size={17} /><span>Settings</span>
            </button>
            <button className="nav-item" onClick={() => setMessage("Your recipient lists are managed while composing an email.")}>
              <Users size={17} /><span>Recipients</span>
            </button>

            <div className="profile">
              {user.picture ? (
                <img className="profile-avatar" src={user.picture} alt="Profile" />
              ) : (
                <div className="profile-avatar">{(user.name || user.email || "U").charAt(0).toUpperCase()}</div>
              )}
              <div className="profile-info">
                <strong>{user.name || "My account"}</strong>
                <small>{user.email || "Signed in"}</small>
              </div>
              <button className="icon-button" title="Log out" onClick={logout}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div className="breadcrumb">Workspace <span> / </span> <strong>Overview</strong></div>
            <div className="topbar-actions">
              <button className="icon-button" title="Notifications" onClick={() => setMessage("You're all caught up! No new notifications.")}>
                <Bell size={18} />
              </button>
              {user.picture ? (
                <img className="top-avatar" src={user.picture} alt="Profile" />
              ) : (
                <div className="top-avatar" />
              )}
            </div>
          </header>

          <div className="page-content">
            <section className="welcome-card">
              <div className="welcome-kicker"><Sparkles size={13} /> YOUR EMAIL SPACE</div>
              <h1>Hello, {user.name?.split(" ")[0] || "there"} <span>✿</span></h1>
              <p>A calm little space to plan, send and keep track of your emails. One message at a time.</p>
              <div className="welcome-decoration">✦ ✧ ✿</div>
            </section>

            {error && (
              <div className="alert error-alert">
                <AlertCircle size={16} />{error}
                <button className="icon-button" onClick={() => setError("")}><X size={14} /></button>
              </div>
            )}
            {message && (
              <div className="alert success-alert">
                <CheckCircle2 size={16} />{message}
                <button className="icon-button" onClick={() => setMessage("")}><X size={14} /></button>
              </div>
            )}

            <div className="page-heading">
              <div>
                <h2>Your email overview</h2>
                <p className="subtitle">A little look at everything happening in your workspace.</p>
              </div>
              <button className="primary-button" onClick={() => setComposeOpen(true)}>
                <Plus size={16} /> Compose email
              </button>
            </div>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple"><Clock size={20} /></div>
                <div><small>Scheduled emails</small><strong>{scheduledTotal}</strong></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><Send size={20} /></div>
                <div><small>Sent emails</small><strong>{sentTotal}</strong></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><Inbox size={20} /></div>
                <div><small>Total emails</small><strong>{scheduledTotal + sentTotal}</strong></div>
              </div>
            </section>

            <section className="email-section">
              <div className="section-heading">
                <div>
                  <h3>Your email activity</h3>
                  <p>Keep an eye on your scheduled and sent messages.</p>
                </div>
                <button className="refresh-button" title="Refresh" onClick={loadEmails}>
                  <RefreshCw size={15} className={loading ? "spin" : ""} />
                </button>
              </div>

              <div className="tabs">
                <button className={`tab ${activeTab === "scheduled" ? "active-tab" : ""}`} onClick={() => setActiveTab("scheduled")}>
                  <Clock size={13} style={{ verticalAlign: "middle", marginRight: 5 }} /> Scheduled
                </button>
                <button className={`tab ${activeTab === "sent" ? "active-tab" : ""}`} onClick={() => setActiveTab("sent")}>
                  <Send size={13} style={{ verticalAlign: "middle", marginRight: 5 }} /> Sent
                </button>
              </div>

              <div className="table-toolbar">
                <div className="search-box">
                  {searching ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search emails, recipients or subjects..."
                  />
                  {search && <button className="icon-button" onClick={() => setSearch("")}><X size={13} /></button>}
                </div>
                <span className="record-count">{displayEmails.length} records</span>
              </div>

              {loading ? (
                <div className="empty-state">
                  <Loader2 className="spin" size={25} />
                  <p>Loading your emails...</p>
                </div>
              ) : displayEmails.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    {search ? <Search size={24} /> : activeTab === "sent" ? <Send size={24} /> : <CalendarDays size={24} />}
                  </div>
                  <h3>{search ? "No matching emails found" : activeTab === "sent" ? "Nothing sent just yet" : "Your schedule is looking clear"}</h3>
                  <p>{search ? "Try searching with another keyword." : activeTab === "sent" ? "Your sent emails will appear here." : "Your scheduled emails will find their home here."}</p>
                  {!search && (
                    <button className="primary-button" onClick={() => setComposeOpen(true)}>
                      <Plus size={15} /> Compose your first email
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>RECIPIENT</th>
                        <th>SUBJECT</th>
                        <th>STATUS</th>
                        <th>{activeTab === "sent" ? "SENT AT" : "SCHEDULED FOR"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayEmails.map((email, index) => {
                        const recipient = getRecipient(email);
                        const status = (email.status || activeTab).toLowerCase();
                        return (
                          <tr key={email.id || index}>
                            <td>
                              <div className="recipient-cell">
                                <div className="recipient-avatar">{recipient.charAt(0).toUpperCase()}</div>
                                <span className="recipient-text">{recipient}</span>
                              </div>
                            </td>
                            <td className="subject-cell">{email.subject || "(No subject)"}</td>
                            <td>
                              <span className={`status-pill ${status}`}>
                                <span className="status-dot" />{status}
                              </span>
                            </td>
                            <td>{formatDate(getEmailDate(email))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {composeOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !sending) resetComposer();
        }}>
          <div className="compose-modal">
            <div className="modal-heading">
              <div>
                <div className="welcome-kicker"><Sparkles size={12} /> A NEW MESSAGE</div>
                <h2>Compose an email <span style={{ color: "#b18dc8" }}>✿</span></h2>
                <p>Put your thoughts together. We'll take care of the timing.</p>
              </div>
              <button className="close-button" onClick={resetComposer} disabled={sending}>
                <X size={18} />
              </button>
            </div>

            {error && <div className="alert error-alert"><AlertCircle size={15} />{error}</div>}

            <form onSubmit={handleSend}>
              <div className="field">
                <label>TO · RECIPIENTS</label>
                <textarea
                  rows={2}
                  value={recipients}
                  onChange={(event) => setRecipients(event.target.value)}
                  placeholder="Enter email addresses separated by commas or new lines"
                  required
                />
                <div className="recipient-count">
                  {parseEmailList(recipients).length} recipient(s) added
                </div>
                <label className="upload-label">
                  <Upload size={14} /> Import recipients from a TXT or CSV file
                  <input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleFileUpload} />
                </label>
              </div>

              <div className="field">
                <label>SUBJECT</label>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Give your email a subject..."
                  required
                />
              </div>

              <div className="field">
                <label>YOUR MESSAGE</label>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Write your message here..."
                  required
                />
              </div>

              <div className="delivery-title">
                <CalendarDays size={15} /> When should we send it?
              </div>

              <div className="delivery-options">
                <button
                  type="button"
                  className={`delivery-option ${deliveryMode === "now" ? "chosen" : ""}`}
                  onClick={() => setDeliveryMode("now")}
                >
                  <div className="delivery-option-icon"><Send size={16} /></div>
                  <strong>Send now ✨</strong>
                  <small>Queue your email for delivery shortly.</small>
                </button>

                <button
                  type="button"
                  className={`delivery-option ${deliveryMode === "scheduled" ? "chosen" : ""}`}
                  onClick={() => setDeliveryMode("scheduled")}
                >
                  <div className="delivery-option-icon"><Clock size={16} /></div>
                  <strong>Schedule for later</strong>
                  <small>Choose the perfect date and time.</small>
                </button>
              </div>

              {deliveryMode === "now" ? (
                <div className="schedule-note">
                  <Sparkles size={15} />
                  Your emails will be added to the sending queue for near-immediate delivery.
                  Actual delivery may depend on the queue and sending limits.
                </div>
              ) : (
                <>
                  <div className="field">
                    <label>CHOOSE DATE & TIME</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                      onChange={(event) => setStartTime(event.target.value)}
                      required
                    />
                  </div>
                  <div className="schedule-note">
                    <Clock size={15} />
                    Your email will stay scheduled until the selected delivery time.
                  </div>
                </>
              )}

              <div className="field">
                <label>DELAY BETWEEN RECIPIENTS</label>
                <select
                  value={delay}
                  onChange={(event) => setDelay(event.target.value)}
                  style={{
                    width: "100%",
                    border: "1px solid #eee8f3",
                    background: "#fdfcfe",
                    borderRadius: 11,
                    padding: 12,
                    color: "#50465b",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option value="1">1 second</option>
                  <option value="2">2 seconds</option>
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={resetComposer} disabled={sending}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={sending}>
                  {sending ? (
                    <><Loader2 size={15} className="spin" /> Processing...</>
                  ) : deliveryMode === "now" ? (
                    <><Send size={15} /> Send now</>
                  ) : (
                    <><CalendarDays size={15} /> Schedule emails</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ReachInboxApp />
    </GoogleOAuthProvider>
  );
}
