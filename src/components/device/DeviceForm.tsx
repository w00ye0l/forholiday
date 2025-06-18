"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DeviceCategory,
  DeviceStatus,
  DEVICE_CATEGORY_LABELS,
  DEVICE_STATUS_LABELS,
} from "@/types/device";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface DeviceFormProps {
  onCreated?: () => void;
}

export default function DeviceForm({ onCreated }: DeviceFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tag_name: "",
    category: "GP13" as DeviceCategory,
    status: "available" as DeviceStatus,
  });
  const [loading, setLoading] = useState(false);

  const supabase = createClientComponentClient();

  function handleToggleForm() {
    setShowForm((prev) => !prev);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleCategoryChange(value: string) {
    setForm((f) => ({ ...f, category: value as DeviceCategory }));
  }

  function handleStatusChange(value: string) {
    setForm((f) => ({ ...f, status: value as DeviceStatus }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("devices").insert([
      {
        tag_name: form.tag_name,
        category: form.category,
        status: form.status,
      },
    ]);
    setLoading(false);
    if (!error) {
      setForm({
        tag_name: "",
        category: "GP13" as DeviceCategory,
        status: "available" as DeviceStatus,
      });
      setShowForm(false);
      onCreated?.();
    } else {
      alert("기기 추가 실패: " + error.message);
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-end">
        <Button
          onClick={handleToggleForm}
          type="button"
          variant={showForm ? "secondary" : "default"}
        >
          {showForm ? "취소" : "기기 추가"}
        </Button>
      </div>
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 bg-gray-50 rounded"
        >
          <div className="flex gap-2 border-2 border-gray-300 p-2 rounded-md">
            <Select value={form.category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEVICE_CATEGORY_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Input
              name="tag_name"
              value={form.tag_name}
              onChange={handleChange}
              placeholder="태그번호"
              required
              className="w-full"
            />
            <Select value={form.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEVICE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={loading}>
              {loading ? "저장중..." : "저장"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
