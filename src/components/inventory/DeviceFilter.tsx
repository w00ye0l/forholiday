"use client";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { DEVICE_CATEGORY_LABELS, DeviceCategory } from "@/types/device";
import { useInventoryStore } from "@/lib/inventory-state";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function DeviceFilter() {
  const { selectedCategories, setSelectedCategories } = useInventoryStore();

  const [isOpen, setIsOpen] = useState(false);
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
    setSelectedCategories([...allCategories]);
  };

  const removeCategory = (category: DeviceCategory) => {
    setSelectedCategories(selectedCategories.filter((c) => c !== category));
  };

  return (
    <Card className="p-3">
      <div className="space-y-3">
        {/* 카테고리 선택 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">카테고리</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 px-2 text-xs"
            >
              <RefreshCwIcon className="w-3 h-3" />
            </Button>
          </div>

            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isOpen}
                  className="w-full justify-between h-9"
                >
                  {selectedCategories.length === 0 ? (
                    <span className="text-muted-foreground text-sm">
                      카테고리 선택
                    </span>
                  ) : selectedCategories.length === allCategories.length ? (
                    <span className="text-sm">
                      전체 선택됨 ({allCategories.length}개)
                    </span>
                  ) : (
                    <span className="text-sm">
                      {selectedCategories.length}개 선택됨
                    </span>
                  )}
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="p-2 border-b">
                  <div className="flex gap-2">
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
                </div>
                <div className="max-h-60 overflow-y-auto p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      Object.entries(DEVICE_CATEGORY_LABELS) as [
                        DeviceCategory,
                        string,
                      ][]
                    ).map(([key, label]) => {
                      const categoryKey = key as DeviceCategory;
                      const isChecked =
                        selectedCategories.includes(categoryKey);
                      return (
                        <div
                          key={categoryKey}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => handleCategoryChange(categoryKey)}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() =>
                              handleCategoryChange(categoryKey)
                            }
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
        </div>

        {/* 선택된 카테고리 배지 - 전체 너비 사용 */}
        {selectedCategories.length > 0 &&
          selectedCategories.length < allCategories.length && (
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {selectedCategories.slice(0, 8).map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="text-xs px-2 py-0.5 h-6"
                >
                  {DEVICE_CATEGORY_LABELS[category]}
                  <XIcon
                    className="ml-1 h-3 w-3 cursor-pointer hover:bg-gray-300 rounded-full"
                    onClick={() => removeCategory(category)}
                  />
                </Badge>
              ))}
              {selectedCategories.length > 8 && (
                <Badge variant="outline" className="text-xs h-6">
                  +{selectedCategories.length - 8}개 더
                </Badge>
              )}
            </div>
          )}
      </div>
    </Card>
  );
}
