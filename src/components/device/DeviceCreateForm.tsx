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
import { Label } from "@/components/ui/label";
import {
  DeviceCategory,
  DeviceStatus,
  DEVICE_CATEGORY_LABELS,
  Device,
} from "@/types/device";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_DEVICE_STATUS: DeviceStatus = "available";
const DEFAULT_DEVICE_CATEGORY: DeviceCategory = "GP13";

interface DeviceCreateFormProps {
  onCreated?: () => void;
}

export default function DeviceCreateForm({ onCreated }: DeviceCreateFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tag_name: "",
    category: DEFAULT_DEVICE_CATEGORY,
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleToggleForm = () => {
    setShowForm((prev) => !prev);
  };

  const handleCancel = () => {
    setShowForm(false);
    setForm({
      tag_name: "",
      category: DEFAULT_DEVICE_CATEGORY,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCategoryChange = (value: string) => {
    setForm((f) => ({ ...f, category: value as DeviceCategory }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("devices").insert([
        {
          tag_name: form.tag_name,
          category: form.category,
          status: DEFAULT_DEVICE_STATUS,
        },
      ]);

      if (error) {
        alert("기기 추가 실패: " + error.message);
      } else {
        setForm({
          tag_name: "",
          category: DEFAULT_DEVICE_CATEGORY,
        });
        setShowForm(false);
        onCreated?.();
      }
    } catch (error) {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!showForm && (
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

      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">새 기기 추가</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select
                  value={form.category as DeviceCategory}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="tag_name">태그번호</Label>
                <Input
                  id="tag_name"
                  name="tag_name"
                  value={form.tag_name}
                  onChange={handleChange}
                  placeholder="태그번호를 입력하세요"
                  required
                />
              </div>
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
                {loading ? "추가중..." : "추가"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}