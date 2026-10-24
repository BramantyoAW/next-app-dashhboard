"use client";

import React, { useEffect, useState } from "react";
import { getActiveStoreId } from "@/lib/jwt";
import { getSettingsByStoreService } from "@/graphql/query/settings/getByStore";
import { upsertSettingService } from "@/graphql/mutation/settings/upsert";
import { toast } from "sonner";

export default function ConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const storeId = token ? getActiveStoreId(token) : null;
    
  // 🔄 Load settings by store
    useEffect(() => {
    if (!token || !storeId) return;

    async function load() {
        try {
        const mapped = await getSettingsByStoreService(token!, storeId!);

        console.log("settings:", mapped);

        setSettings(mapped);
        console.log("MAPPED SETTINGS >>>", mapped);
        console.log("STATE SETTINGS >>>", settings);
        } catch (e) {
        console.error(e);
        toast.error("Failed to load store settings");
        } finally {
        setLoading(false);
        }
    }

    load();
    }, [token, storeId]);


  const updateField = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!token || !storeId) return;

    setSaving(true);

    try {
      for (const key of Object.keys(settings)) {
        await upsertSettingService(token, storeId, key, settings[key]);
      }

      toast.success("Settings saved successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ds-caption">Loading settings...</div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">

      <div className="ds-page-head">
        <div>
          <h1 className="ds-display">Store Configuration</h1>
          <p className="ds-hint">Pengaturan default untuk toko aktif.</p>
        </div>
      </div>

      {/* Minimum Stock Threshold */}
      <div className="ds-card ds-card-pad">
        <h2 className="ds-h2">Stock Settings</h2>

        <label className="ds-label">Minimum Stock Notification</label>
        <input
          type="number"
          className="ds-input"
          value={settings.minimum_stock ?? ""}
          onChange={(e) => updateField("minimum_stock", Number(e.target.value))}
        />
      </div>

      {/* Order Prefix */}
      <div className="ds-card ds-card-pad">
        <h2 className="ds-h2">Order Settings</h2>

        <label className="ds-label">Default Order Prefix</label>
        <input
          type="text"
          className="ds-input"
          value={settings.order_prefix ?? ""}
          onChange={(e) => updateField("order_prefix", e.target.value)}
        />
      </div>

      {/* Report Schedule */}
      <div className="ds-card ds-card-pad">
        <h2 className="ds-h2">Report Schedule</h2>
        <p className="ds-hint">
          Note: Report will be sent 10 PM - 12 PM every selected schedule.
        </p>

        <label className="ds-label mt-3">Send Report Every</label>
        <select
          className="ds-select"
          value={settings.report_schedule ?? ""}
          onChange={(e) => updateField("report_schedule", e.target.value)}
        >
          <option value="">OFF</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="ds-btn"
        data-variant="primary"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
