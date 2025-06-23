import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StorageEditForm from "@/components/storage/StorageEditForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getStorage(id: string) {
  const supabase = await createClient();
  const { data: storage, error } = await supabase
    .from("storage_reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !storage) {
    return null;
  }

  return storage;
}

// 캐싱 비활성화
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StorageEditPage({ params }: PageProps) {
  const { id } = await params;
  const storage = await getStorage(id);

  if (!storage) {
    notFound();
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

      <StorageEditForm storage={storage} />
    </main>
  );
}
