"use client";

import { useState, useEffect } from "react";
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
  Device,
} from "@/types/device";
import { createClient } from "@/lib/supabase/client";

interface DeviceFormProps {
  onCreated?: () => void;
  device?: Device | null;
  onCancel?: () => void;
}

export default function DeviceForm({
  onCreated,
  device,
  onCancel,
}: DeviceFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tag_name: "",
    category: "GP13" as DeviceCategory,
    status: "available" as DeviceStatus,
  });
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const isEditMode = !!device;

  useEffect(() => {
    if (device) {
      setForm({
        tag_name: device.tag_name,
        category: device.category,
        status: device.status,
      });
    } else {
      setForm({
        tag_name: "",
        category: "GP13" as DeviceCategory,
        status: "available" as DeviceStatus,
      });
    }
  }, [device]);

  const handleToggleForm = () => {
    setShowForm((prev) => !prev);
  };

  const handleCancel = () => {
    if (isEditMode) {
      onCancel?.();
    } else {
      setShowForm(false);
      setForm({
        tag_name: "",
        category: "GP13" as DeviceCategory,
        status: "available" as DeviceStatus,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCategoryChange = (value: string) => {
    setForm((f) => ({ ...f, category: value as DeviceCategory }));
  };

  const handleStatusChange = (value: string) => {
    setForm((f) => ({ ...f, status: value as DeviceStatus }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditMode) {
        const { error } = await supabase
          .from("devices")
          .update({
            tag_name: form.tag_name,
            category: form.category,
            status: form.status,
          })
          .eq("id", device.id);

        if (error) {
          alert("기기 수정 실패: " + error.message);
        } else {
          onCreated?.();
          onCancel?.();
        }
      } else {
        const { error } = await supabase.from("devices").insert([
          {
            tag_name: form.tag_name,
            category: form.category,
            status: form.status,
          },
        ]);

        if (error) {
          alert("기기 추가 실패: " + error.message);
        } else {
          setForm({
            tag_name: "",
            category: "GP13" as DeviceCategory,
            status: "available" as DeviceStatus,
          });
          setShowForm(false);
          onCreated?.();
        }
      }
    } catch (error) {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const shouldShowForm = isEditMode || showForm;

  return (
    <div className="space-y-4">
      {!isEditMode && !showForm && (
        <div className="flex justify-end">
          <Button
            onClick={handleToggleForm}
            type="button"
            variant="default"
            size="sm"
          >
            기기 추가
          </Button>
        </div>
      )}

      {shouldShowForm && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">
              {isEditMode ? "기기 수정" : "새 기기 추가"}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select
                key={`category-${device?.id || "new"}-${form.category}`}
                value={form.category}
                defaultValue={form.category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
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
              />

              <Select
                key={`status-${device?.id || "new"}-${form.status}`}
                value={form.status}
                defaultValue={form.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEVICE_STATUS_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                size="sm"
              >
                취소
              </Button>
              <Button type="submit" disabled={loading} size="sm">
                {loading ? "저장중..." : isEditMode ? "수정" : "저장"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
