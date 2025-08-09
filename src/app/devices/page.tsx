"use client";

import { useEffect, useState } from "react";
import { Device, DEVICE_CATEGORY_LABELS, DeviceCategory } from "@/types/device";
import DeviceManager from "@/components/device/DeviceManager";
import DeviceCreateForm from "@/components/device/DeviceCreateForm";
import DeviceEditModal from "@/components/device/DeviceEditModal";
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const supabase = createClient();

  // 기기 목록 fetch 함수
  const fetchDevices = async () => {
    const { data } = await supabase
      .from("devices")
      .select("*")
      .order("tag_name", { ascending: true });
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
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  }, [devices, searchTerm, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingDevice(null);
  };

  const handleDeviceUpdated = () => {
    fetchDevices();
    setShowEditModal(false);
    setEditingDevice(null);
  };

  const handleReset = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setCurrentPage(1);
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

  // device.ts에서 정의된 카테고리 목록 사용
  const getAllCategories = (): DeviceCategory[] => {
    return Object.keys(DEVICE_CATEGORY_LABELS) as DeviceCategory[];
  };

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredDevices.length / pageSize);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 페이지네이션 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">기기 관리</h1>

      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devices">기기 관리</TabsTrigger>
          <TabsTrigger value="inventory">재고 현황</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-6">
          {/* 기기 추가 폼 */}
          <DeviceCreateForm onCreated={fetchDevices} />

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
                  <SelectItem value="all" className="whitespace-nowrap">
                    전체 카테고리
                  </SelectItem>
                  {getAllCategories().map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                      className="whitespace-nowrap"
                    >
                      {DEVICE_CATEGORY_LABELS[category]}
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
              devices={paginatedDevices}
              onDeviceUpdated={fetchDevices}
              onEditDevice={handleEditDevice}
            />

            {/* 페이지네이션 */}
            {filteredDevices.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>페이지 크기:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) =>
                      handlePageSizeChange(parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="ml-4">
                    {filteredDevices.length > 0
                      ? `${(currentPage - 1) * pageSize + 1}-${Math.min(
                          currentPage * pageSize,
                          filteredDevices.length
                        )} / ${filteredDevices.length}개`
                      : "0개"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    {"<<"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    {"<"}
                  </Button>

                  {/* 페이지 번호 */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const startPage = Math.max(1, currentPage - 2);
                      const endPage = Math.min(totalPages, currentPage + 2);
                      const pages = [];

                      if (startPage > 1) {
                        pages.push(
                          <Button
                            key={1}
                            variant={currentPage === 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(1)}
                            className="w-8 h-8"
                          >
                            1
                          </Button>
                        );
                        if (startPage > 2) {
                          pages.push(
                            <span key="ellipsis1" className="px-2">
                              ...
                            </span>
                          );
                        }
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(i)}
                            className="w-8 h-8"
                          >
                            {i}
                          </Button>
                        );
                      }

                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <span key="ellipsis2" className="px-2">
                              ...
                            </span>
                          );
                        }
                        pages.push(
                          <Button
                            key={totalPages}
                            variant={
                              currentPage === totalPages ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                            className="w-8 h-8"
                          >
                            {totalPages}
                          </Button>
                        );
                      }

                      return pages;
                    })()}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {">"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    {">>"}
                  </Button>
                </div>

                {totalPages <= 1 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>
                      페이지 {currentPage} / {totalPages}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryDashboard />
        </TabsContent>
      </Tabs>

      {/* 기기 수정 모달 */}
      <DeviceEditModal
        device={editingDevice}
        open={showEditModal}
        onOpenChange={handleCloseEditModal}
        onUpdated={handleDeviceUpdated}
      />
    </main>
  );
}
