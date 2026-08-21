"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Settings,
  Palette,
  Bell,
  Shield,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "nexgen_settings_";

const loadSettings = (key: string, fallback: any) => {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}${key}`);
    return stored !== null ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const saveSettings = (key: string, value: any) => {
  localStorage.setItem(`${STORAGE_KEY}${key}`, JSON.stringify(value));
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    leaveUpdates: true,
    payrollAlerts: false,
  });
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [company, setCompany] = useState({
    name: "",
    fiscalYearStart: "1",
    currency: "PKR",
  });

  useEffect(() => {
    const storedTheme = loadSettings("theme", "system") as
      | "light"
      | "dark"
      | "system";
    setTheme(storedTheme);
    applyTheme(storedTheme);

    setNotifications(loadSettings("notifications", notifications));
    setSessionTimeout(loadSettings("sessionTimeout", "30"));
    setCompany(loadSettings("company", company));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsAdmin(data.role === "admin" || data.isAdmin === true);
          }
        } catch {}
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const applyTheme = (t: "light" | "dark" | "system") => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (t === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.remove("dark", "light");
    }
  };

  const handleThemeChange = (t: "light" | "dark" | "system") => {
    setTheme(t);
    applyTheme(t);
    saveSettings("theme", t);
    toast.success("Theme updated");
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotifications = () => {
    saveSettings("notifications", notifications);
    toast.success("Notification settings saved");
  };

  const handleSaveSecurity = () => {
    saveSettings("sessionTimeout", sessionTimeout);
    toast.success("Security settings saved");
  };

  const handleSaveCompany = async () => {
    saveSettings("company", company);
    if (userId && isAdmin) {
      try {
        await updateDoc(doc(db, "settings", "company"), {
          name: company.name,
          fiscalYearStart: company.fiscalYearStart,
          currency: company.currency,
        });
      } catch {}
    }
    toast.success("Company settings saved");
  };

  const Toggle = ({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 ${
        checked
          ? "bg-primary"
          : "bg-[var(--muted-foreground)] opacity-50"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted-foreground)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8" style={{ color: "var(--foreground)" }} />
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
            Settings
          </h1>
          <p style={{ color: "var(--muted-foreground)" }}>
            Manage your application preferences
          </p>
        </div>
      </div>

      <Card style={{ backgroundColor: "var(--card)", color: "var(--card-foreground)", borderColor: "var(--border)" }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
            <CardTitle>Theme</CardTitle>
          </div>
          <CardDescription>Select your preferred theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                  theme === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-[var(--border)] hover:bg-[var(--muted-foreground)]/10"
                }`}
                style={
                  theme !== t
                    ? { color: "var(--foreground)", borderColor: "var(--border)" }
                    : undefined
                }
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card style={{ backgroundColor: "var(--card)", color: "var(--card-foreground)", borderColor: "var(--border)" }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Manage notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["email", "Email Notifications"],
              ["push", "Push Notifications"],
              ["leaveUpdates", "Leave Updates"],
              ["payrollAlerts", "Payroll Alerts"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--foreground)" }}>
                {label}
              </span>
              <Toggle
                checked={notifications[key]}
                onChange={() => handleNotificationChange(key)}
              />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveNotifications}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
        </CardContent>
      </Card>

      <Card style={{ backgroundColor: "var(--card)", color: "var(--card-foreground)", borderColor: "var(--border)" }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Manage security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--foreground)" }}>
              Session Timeout
            </span>
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border bg-transparent"
              style={{ color: "var(--foreground)", borderColor: "var(--border)" }}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--foreground)" }}>
              Two-Factor Authentication
            </span>
            <span
              className="px-3 py-1 text-xs font-medium rounded-full"
              style={{
                backgroundColor: "var(--muted-foreground)",
                color: "var(--card)",
                opacity: 0.6,
              }}
            >
              Coming Soon
            </span>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveSecurity}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card style={{ backgroundColor: "var(--card)", color: "var(--card-foreground)", borderColor: "var(--border)" }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
              <CardTitle>Company Settings</CardTitle>
            </div>
            <CardDescription>Manage company-wide configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Company Name
              </label>
              <input
                type="text"
                value={company.name}
                onChange={(e) =>
                  setCompany((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter company name"
                className="w-full px-3 py-2 text-sm rounded-md border bg-transparent"
                style={{ color: "var(--foreground)", borderColor: "var(--border)" }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Fiscal Year Start Month
              </label>
              <select
                value={company.fiscalYearStart}
                onChange={(e) =>
                  setCompany((prev) => ({
                    ...prev,
                    fiscalYearStart: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border bg-transparent"
                style={{ color: "var(--foreground)", borderColor: "var(--border)" }}
              >
                {[
                  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
                ].map((m) => (
                  <option key={m} value={m}>
                    {new Date(0, parseInt(m) - 1).toLocaleString("default", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                Default Currency
              </label>
              <select
                value={company.currency}
                onChange={(e) =>
                  setCompany((prev) => ({ ...prev, currency: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border bg-transparent"
                style={{ color: "var(--foreground)", borderColor: "var(--border)" }}
              >
                <option value="PKR">PKR - Pakistani Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveCompany}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
