"use client";

import { useEffect, useState } from "react";
import { Device } from "@/types/device";
import DeviceManager from "@/components/device/DeviceManager";
import DeviceForm from "@/components/device/DeviceForm";
import { createClient } from "@/lib/supabase/client";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const supabase = createClient();

  // 기기 목록 fetch 함수
  const fetchDevices = async () => {
    const { data } = await supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false });
    setDevices(data || []);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">기기 관리</h1>

      <DeviceForm onCreated={fetchDevices} />

      <div className="bg-white p-6 rounded-lg shadow">
        <DeviceManager devices={devices} />
      </div>
    </main>
  );
}
