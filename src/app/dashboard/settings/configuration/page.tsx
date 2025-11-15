"use client";

import React, { useEffect, useState } from "react";
import { extractStoreId } from "@/lib/jwt";
import { getSettingsByStoreService } from "@/graphql/query/settings/getByStore";
import { upsertSettingService } from "@/graphql/mutation/settings/upsert";
import { toast } from "sonner";

export default function ConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const storeId = token ? extractStoreId(token) : null;
    
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
      <div className="p-6 animate-pulse text-gray-500">Loading settings...</div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">

      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        Store Configuration
      </h1>

      {/* Minimum Stock Threshold */}
      <div className="bg-white p-4 shadow-sm rounded border">
        <h2 className="font-semibold mb-2">Stock Settings</h2>

        <label className="block text-sm text-gray-600 mb-1">
          Minimum Stock Notification
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={settings.minimum_stock ?? ""}
          onChange={(e) => updateField("minimum_stock", Number(e.target.value))}
        />
      </div>

      {/* Order Prefix */}
      <div className="bg-white p-4 shadow-sm rounded border">
        <h2 className="font-semibold mb-2">Order Settings</h2>

        <label className="block text-sm text-gray-600 mb-1">
          Default Order Prefix
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={settings.order_prefix ?? ""}
          onChange={(e) => updateField("order_prefix", e.target.value)}
        />
      </div>

      {/* Report Schedule */}
      <div className="bg-white p-4 shadow-sm rounded border">
        <h2 className="font-semibold mb-2">Report Schedule</h2>

        <label className="block text-sm text-gray-600 mb-1">
          Send Report Every
        </label>
        <select
          className="select select-bordered w-full"
          value={settings.report_schedule ?? ""}
          onChange={(e) => updateField("report_schedule", e.target.value)}
        >
          <option value="">Choose</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
