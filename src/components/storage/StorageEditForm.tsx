"use client";

import { useRouter } from "next/navigation";
import StorageForm from "./StorageForm";
import { StorageReservation } from "@/types/storage";

interface StorageEditFormProps {
  storage: StorageReservation;
}

export default function StorageEditForm({ storage }: StorageEditFormProps) {
  const router = useRouter();

  const handleUpdated = () => {
    router.push("/storage");
    router.refresh();
    setTimeout(() => {
      window.location.href = "/storage";
    }, 100);
  };

  const handleCancel = () => {
    router.push("/storage");
  };

  return (
    <StorageForm
      storage={storage}
      onCreated={handleUpdated}
      onCancel={handleCancel}
    />
  );
}
