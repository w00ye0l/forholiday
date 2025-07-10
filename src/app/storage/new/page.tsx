"use client";

import { useRouter } from "next/navigation";
import StorageForm from "@/components/storage/StorageForm";

export default function StorageNewPage() {
  const router = useRouter();

  const handleCreated = () => {
    router.push("/storage");
  };

  const handleCancel = () => {
    router.push("/storage");
  };

  return (
    <main className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">새 보관 예약</h1>
        <p className="text-gray-600 mt-2">
          고객의 짐 보관 예약을 등록해주세요.
        </p>
      </div>

      <StorageForm onCreated={handleCreated} onCancel={handleCancel} />
    </main>
  );
}
