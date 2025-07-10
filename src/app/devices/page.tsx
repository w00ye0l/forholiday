"use client";

import { useEffect, useState } from "react";
import { Device, DEVICE_CATEGORY_LABELS, DeviceCategory } from "@/types/device";
import DeviceManager from "@/components/device/DeviceManager";
import DeviceForm from "@/components/device/DeviceForm";
import { InventoryDashboard } from "@/components/device/InventoryDashboard";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon, RefreshCwIcon } from "lucide-react";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const supabase = createClient();

  // 기기 목록 fetch 함수
  const fetchDevices = async () => {
    const { data } = await supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false });
    setDevices(data || []);
    setFilteredDevices(data || []);
  };

  // 검색 및 필터링 로직
  useEffect(() => {
    let filtered = [...devices];

    // 검색 필터링 (태그명으로 검색)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((device) =>
        device.tag_name?.toLowerCase().includes(searchLower)
      );
    }

    // 카테고리 필터링
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (device) => device.category === selectedCategory
      );
    }

    // 상태 필터링
    if (selectedStatus !== "all") {
      filtered = filtered.filter((device) => device.status === selectedStatus);
    }

    setFilteredDevices(filtered);
  }, [devices, searchTerm, selectedCategory, selectedStatus]);

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

  const handleReset = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedStatus("all");
  };

  // 상태별 개수 계산
  const getStatusCounts = () => {
    let filtered = [...devices];

    // 검색 필터링
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((device) =>
        device.tag_name?.toLowerCase().includes(searchLower)
      );
    }

    // 카테고리 필터링
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (device) => device.category === selectedCategory
      );
    }

    return {
      all: filtered.length,
      available: filtered.filter((d) => d.status === "available").length,
      maintenance: filtered.filter((d) => d.status === "maintenance").length,
      lost: filtered.filter((d) => d.status === "lost").length,
      in_use: filtered.filter((d) => d.status === "in_use").length,
      rented: filtered.filter((d) => d.status === "rented").length,
    };
  };

  const statusCounts = getStatusCounts();

  // 고유한 카테고리 목록 추출
  const getUniqueCategories = () => {
    const categories = devices
      .map((device) => device.category)
      .filter((category) => category)
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .sort();
    return categories;
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">기기 관리</h1>

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory">재고 현황</TabsTrigger>
          <TabsTrigger value="devices">기기 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryDashboard />
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          {/* 수정 모드일 때만 표시되는 수정 폼 */}
          {editingDevice && (
            <DeviceForm
              device={editingDevice}
              onCreated={handleDeviceUpdated}
              onCancel={handleCancelEdit}
            />
          )}

          {/* 기기 추가 폼 - 수정 모드가 아닐 때만 표시 */}
          {!editingDevice && (
            <DeviceForm
              onCreated={fetchDevices}
              device={null}
              onCancel={undefined}
            />
          )}

          {/* 검색 및 필터 */}
          <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* 태그명 검색 */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="태그명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm pl-9"
                />
              </div>

              {/* 카테고리 필터 */}
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  {getUniqueCategories().map((category) => (
                    <SelectItem key={category} value={category}>
                      {DEVICE_CATEGORY_LABELS[category as DeviceCategory] ||
                        category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 초기화 버튼 */}
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className="w-4 h-4" />
                초기화
              </Button>
            </div>

            {/* 상태별 필터 버튼 그룹 */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStatus("all")}
                className={`h-6 px-2 py-1 text-xs ${
                  selectedStatus === "all"
                    ? "bg-gray-200 text-gray-900 border-2 border-gray-400"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                전체: {statusCounts.all}개
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStatus("available")}
                className={`h-6 px-2 py-1 text-xs ${
                  selectedStatus === "available"
                    ? "bg-green-200 border-2 border-green-400 text-green-800"
                    : "bg-green-100 hover:bg-green-200 text-green-800"
                }`}
              >
                사용가능: {statusCounts.available}개
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStatus("maintenance")}
                className={`h-6 px-2 py-1 text-xs ${
                  selectedStatus === "maintenance"
                    ? "bg-gray-200 border-2 border-gray-400 text-gray-800"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                }`}
              >
                점검중: {statusCounts.maintenance}개
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStatus("lost")}
                className={`h-6 px-2 py-1 text-xs ${
                  selectedStatus === "lost"
                    ? "bg-red-200 border-2 border-red-400 text-red-800"
                    : "bg-red-100 hover:bg-red-200 text-red-800"
                }`}
              >
                분실: {statusCounts.lost}개
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStatus("rented")}
                className={`h-6 px-2 py-1 text-xs ${
                  selectedStatus === "rented"
                    ? "bg-blue-200 border-2 border-blue-400 text-blue-800"
                    : "bg-blue-100 hover:bg-blue-200 text-blue-800"
                }`}
              >
                대여중: {statusCounts.rented}개
              </Button>
            </div>

            {/* 필터 결과 표시 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
              <div>
                <span className="font-medium text-blue-600">
                  총 {filteredDevices.length}개의 기기
                </span>
                {filteredDevices.length !== devices.length && (
                  <span className="text-gray-400 ml-2">
                    (전체 {devices.length}개 중)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 기기 목록 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">기기 목록</h2>
              <span className="text-sm text-gray-600">
                {filteredDevices.length}개의 기기
              </span>
            </div>
            <DeviceManager
              devices={filteredDevices}
              onDeviceUpdated={fetchDevices}
              onEditDevice={handleEditDevice}
            />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
