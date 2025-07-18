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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DeviceCategory,
  DeviceStatus,
  DEVICE_CATEGORY_LABELS,
  DEVICE_STATUS_MAP,
  Device,
  DEVICE_FEATURES,
} from "@/types/device";
import { createClient } from "@/lib/supabase/client";

interface DeviceEditModalProps {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export default function DeviceEditModal({
  device,
  open,
  onOpenChange,
  onUpdated,
}: DeviceEditModalProps) {
  const [form, setForm] = useState({
    tag_name: "",
    category: "GP13" as DeviceCategory,
    status: "available" as DeviceStatus,
    imei: "",
    imei2: "",
    serial_number: "",
    mac_address: "",
    eid: "",
    warranty_expiry: "",
    priority: 0,
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (device) {
      setForm({
        tag_name: device.tag_name ?? "",
        category: (device.category as DeviceCategory) ?? "GP13",
        status: (device.status as DeviceStatus) ?? "available",
        imei: device.imei ?? "",
        imei2: device.imei2 ?? "",
        serial_number: device.serial_number ?? "",
        mac_address: device.mac_address ?? "",
        eid: device.eid ?? "",
        warranty_expiry: device.warranty_expiry ?? "",
        priority: device.priority ?? 0,
      });
    }
  }, [device]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "priority" ? parseInt(value) || 0 : value,
    });
  };

  const handleCategoryChange = (value: string) => {
    setForm((f) => ({ ...f, category: value as DeviceCategory }));
  };

  const handleStatusChange = (value: string) => {
    setForm((f) => ({ ...f, status: value as DeviceStatus }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from("devices")
        .update({
          tag_name: form.tag_name,
          category: form.category,
          status: form.status,
          imei: form.imei || null,
          imei2: form.imei2 || null,
          serial_number: form.serial_number || null,
          mac_address: form.mac_address || null,
          eid: form.eid || null,
          warranty_expiry: form.warranty_expiry || null,
          priority: form.priority,
        })
        .eq("id", device.id);

      if (error) {
        alert("기기 수정 실패: " + error.message);
      } else {
        onUpdated?.();
        onOpenChange(false);
      }
    } catch (error) {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>기기 설정</DialogTitle>
          <DialogDescription>
            기기의 상세 정보를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 border-b pb-2">
              기본 정보
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select
                  value={form.category}
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

              <div className="space-y-2">
                <Label htmlFor="status">상태</Label>
                <Select value={form.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEVICE_STATUS_MAP).map(
                      ([value, statusInfo]) => (
                        <SelectItem key={value} value={value}>
                          {statusInfo.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 휴대폰 관련 정보 (S23, S24, S25 등) */}
          {DEVICE_FEATURES.PHONE_CATEGORIES.includes(
            form.category as DeviceCategory
          ) && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 border-b pb-2">
                휴대폰 정보
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imei">IMEI</Label>
                  <Input
                    id="imei"
                    name="imei"
                    value={form.imei}
                    onChange={handleChange}
                    placeholder="IMEI 번호를 입력하세요"
                    maxLength={15}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imei2">IMEI2</Label>
                  <Input
                    id="imei2"
                    name="imei2"
                    value={form.imei2}
                    onChange={handleChange}
                    placeholder="IMEI2 번호를 입력하세요"
                    maxLength={15}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mac_address">MAC 주소</Label>
                  <Input
                    id="mac_address"
                    name="mac_address"
                    value={form.mac_address}
                    onChange={handleChange}
                    placeholder="MAC 주소를 입력하세요"
                    maxLength={17}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eid">EID</Label>
                  <Input
                    id="eid"
                    name="eid"
                    value={form.eid}
                    onChange={handleChange}
                    placeholder="EID를 입력하세요"
                    maxLength={32}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 공통 정보 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 border-b pb-2">
              추가 정보
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serial_number">시리얼 번호</Label>
                <Input
                  id="serial_number"
                  name="serial_number"
                  value={form.serial_number}
                  onChange={handleChange}
                  placeholder="시리얼 번호를 입력하세요"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warranty_expiry">보증 만료일</Label>
                <Input
                  id="warranty_expiry"
                  name="warranty_expiry"
                  type="date"
                  value={form.warranty_expiry}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">우선순위</Label>
                <Input
                  id="priority"
                  name="priority"
                  type="number"
                  value={form.priority}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}