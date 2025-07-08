"use client";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, RefreshCwIcon } from "lucide-react";
import { DEVICE_CATEGORY_LABELS, DeviceCategory } from "@/types/device";
import { useInventoryStore } from "@/lib/inventory-state";

export function DeviceFilter() {
  const {
    searchTerm,
    selectedCategories,
    setSearchTerm,
    setSelectedCategories,
  } = useInventoryStore();

  const allCategories = Object.keys(DEVICE_CATEGORY_LABELS) as DeviceCategory[];

  const handleCategoryChange = (category: DeviceCategory) => {
    setSelectedCategories(
      selectedCategories.includes(category)
        ? selectedCategories.filter((c: any) => c !== category)
        : [...selectedCategories, category]
    );
  };

  const handleSelectAll = () => {
    setSelectedCategories([...allCategories]);
  };

  const handleUnselectAll = () => {
    setSelectedCategories([]);
  };

  const handleReset = () => {
    setSearchTerm("");
    setSelectedCategories([...allCategories]);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* 검색 */}
        <div className="space-y-2">
          <Label>기기 검색</Label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="기기명 또는 태그 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>카테고리</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 text-xs"
            >
              <RefreshCwIcon className="w-3 h-3 mr-1" />
              초기화
            </Button>
          </div>
          <div className="space-y-1">
            {/* 전체 선택/해제 */}
            <div className="flex gap-4 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex-1 h-7 text-xs"
              >
                전체 선택
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnselectAll}
                className="flex-1 h-7 text-xs"
              >
                전체 해제
              </Button>
            </div>

            {/* 카테고리 목록 */}
            <div className="space-y-2">
              {(
                Object.entries(DEVICE_CATEGORY_LABELS) as [
                  DeviceCategory,
                  string
                ][]
              ).map(([key, label]) => {
                const categoryKey = key as DeviceCategory;
                return (
                  <div
                    key={categoryKey}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={categoryKey}
                      checked={selectedCategories.includes(categoryKey)}
                      onCheckedChange={() => handleCategoryChange(categoryKey)}
                    />
                    <Label
                      htmlFor={categoryKey}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
