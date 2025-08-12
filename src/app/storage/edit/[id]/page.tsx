"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StorageForm from "@/components/storage/StorageForm";
import { StorageReservation } from "@/types/storage";

export default function StorageEditPage() {
  const params = useParams();
  const router = useRouter();
  const [storage, setStorage] = useState<StorageReservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStorage = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("storage_reservations")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        router.push("/storage");
        return;
      }

      setStorage(data);
      setLoading(false);
    };

    fetchStorage();
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </main>
    );
  }

  if (!storage) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/storage" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            보관 관리로 돌아가기
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-bold">보관 예약 수정</h1>
          <p className="text-gray-600 mt-2">
            예약번호: {storage.reservation_id}
          </p>
        </div>
      </div>

      <StorageForm
        storage={storage}
        onCreated={() => {
          // 수정 완료 후 상세페이지로 이동
          router.back();
        }}
        onCancel={() => {
          // 취소 시 상세페이지로 이동
          router.back();
        }}
      />
    </main>
  );
}
