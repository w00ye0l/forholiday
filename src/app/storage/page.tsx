"use client";

import { useEffect, useState } from "react";
import { StorageReservation } from "@/types/storage";
import StorageList from "@/components/storage/StorageList";
import { createClient } from "@/lib/supabase/client";

export default function StoragePage() {
  const [storages, setStorages] = useState<StorageReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchStorages = async () => {
    setLoading(true);
    try {
      // 캐시를 피하기 위해 현재 시간을 쿼리에 추가
      const { data } = await supabase
        .from("storage_reservations")
        .select("*")
        .order("created_at", { ascending: false });
      setStorages(data || []);
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorages();

    // 페이지 포커스 시 데이터 새로고침
    const handleFocus = () => {
      fetchStorages();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">짐 보관 관리</h1>
      </div>

      <div className="space-y-6">
        {/* 보관 예약 목록 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">보관 예약 목록</h2>
            <span className="text-sm text-gray-600">
              총 {storages.length}개의 예약
            </span>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
            <StorageList storages={storages} onStorageUpdated={fetchStorages} />
          )}
        </div>
      </div>
    </main>
  );
}
