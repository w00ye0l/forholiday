"use client";

import { useEffect, useState } from "react";
import { Device } from "@/types/device";
import DeviceManager from "@/components/device/DeviceManager";
import DeviceForm from "@/components/device/DeviceForm";
import { createClient } from "@/lib/supabase/client";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
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

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
  };

  const handleCancelEdit = () => {
    setEditingDevice(null);
  };

  const handleDeviceUpdated = () => {
    fetchDevices();
    setEditingDevice(null);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">기기 관리</h1>

      <div className="space-y-6">
        {/* 수정 모드일 때만 표시되는 수정 폼 */}
        {editingDevice && (
          // <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <DeviceForm
            device={editingDevice}
            onCreated={handleDeviceUpdated}
            onCancel={handleCancelEdit}
          />
        )}

        {/* 기기 추가 폼 - 수정 모드가 아닐 때만 표시 */}
        {!editingDevice && (
          // <div className="bg-white p-6 rounded-lg shadow ">
          <DeviceForm
            onCreated={fetchDevices}
            device={null}
            onCancel={undefined}
          />
          // </div>
        )}

        {/* 기기 목록 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">기기 목록</h2>
            <span className="text-sm text-gray-600">
              총 {devices.length}개의 기기
            </span>
          </div>
          <DeviceManager
            devices={devices}
            onDeviceUpdated={fetchDevices}
            onEditDevice={handleEditDevice}
          />
        </div>
      </div>
    </main>
  );
}
