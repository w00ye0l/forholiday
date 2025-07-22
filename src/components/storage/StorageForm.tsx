"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  RESERVATION_SITES,
  RESERVATION_SITE_LABELS,
  STORAGE_LOCATION_LABELS,
  type ReservationSite,
  type StorageReservation,
  type StorageLocation,
} from "@/types/storage";
import { Textarea } from "../ui/textarea";

const STORAGE_LOCATIONS: StorageLocation[] = ["T1", "T2", "office"];

const formSchema = z.object({
  items_description: z.string().optional(),
  quantity: z.number().optional(),
  customer_name: z.string().optional(),
  phone_number: z.string().optional(),
  tag_number: z.string().optional(),
  drop_off_date: z.date().optional(),
  drop_off_time: z.string().optional(),
  drop_off_location: z.enum(["T1", "T2", "office"] as const).optional(),
  pickup_date: z.date().optional(),
  pickup_time: z.string().optional(),
  pickup_location: z.enum(["T1", "T2", "office"] as const).optional(),
  notes: z.string().optional(),
  reservation_site: z.enum(RESERVATION_SITES).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface StorageFormProps {
  onCreated?: () => void;
  storage?: StorageReservation | null;
  onCancel?: () => void;
}

export default function StorageForm({
  onCreated,
  storage,
  onCancel,
}: StorageFormProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // 30분 단위 시간 옵션 생성
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items_description: "",
      quantity: 1,
      customer_name: "",
      phone_number: "",
      tag_number: "",
      drop_off_time: "",
      drop_off_location: "T1",
      pickup_time: "",
      pickup_location: "T1",
      notes: "",
      reservation_site: "현금",
    },
  });

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (storage) {
      form.reset({
        items_description: storage.items_description,
        quantity: storage.quantity,
        customer_name: storage.customer_name,
        phone_number: storage.phone_number,
        tag_number: storage.tag_number || "",
        drop_off_date: new Date(storage.drop_off_date),
        drop_off_time: storage.drop_off_time,
        drop_off_location: storage.drop_off_location || "T1",
        pickup_date: new Date(storage.pickup_date),
        pickup_time: storage.pickup_time,
        pickup_location: storage.pickup_location || "T1",
        notes: storage.notes || "",
        reservation_site: storage.reservation_site as ReservationSite,
      });
    }
  }, [storage, form]);

  const generateReservationId = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ST${dateStr}${randomStr}`;
  };

  const handleSubmit = async (data: FormValues) => {
    setLoading(true);

    try {
      const formattedData = {
        items_description: data.items_description || "",
        quantity: data.quantity || 1,
        customer_name: data.customer_name || "",
        phone_number: data.phone_number || "",
        tag_number: data.tag_number || null,
        drop_off_date: data.drop_off_date ? format(data.drop_off_date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        drop_off_time: data.drop_off_time || "00:00",
        drop_off_location: data.drop_off_location || "T1",
        pickup_date: data.pickup_date ? format(data.pickup_date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        pickup_time: data.pickup_time || "00:00",
        pickup_location: data.pickup_location || "T1",
        notes: data.notes || null,
        reservation_site: data.reservation_site || "현금",
      };

      if (storage) {
        // 수정 모드
        const { error } = await supabase
          .from("storage_reservations")
          .update({
            ...formattedData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", storage.id);

        if (error) {
          alert("예약 수정 실패: " + error.message);
        } else {
          alert("예약이 성공적으로 수정되었습니다!");
          onCreated?.();
        }
      } else {
        // 생성 모드
        const { error } = await supabase.from("storage_reservations").insert([
          {
            ...formattedData,
            reservation_id: generateReservationId(),
          },
        ]);

        if (error) {
          alert("예약 추가 실패: " + error.message);
        } else {
          alert("예약이 성공적으로 생성되었습니다!");
          form.reset();
          onCreated?.();
        }
      }
    } catch (error) {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">
          {storage ? "보관 예약 수정" : "새 보관 예약 추가"}
        </h3>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* 물품 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="items_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>물품 내용</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="보관할 물품 설명"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>보관 개수</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 1)
                        }
                        placeholder="개수"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tag_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>태그 번호</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="보관 태그 번호" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* 고객 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>고객 이름</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="고객 이름" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>연락처</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="연락처" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 맡기는 날짜, 시간 및 장소 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="drop_off_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>맡기는 날짜</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP", { locale: ko })
                          ) : (
                            <span>맡기는 날짜를 선택해주세요</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="drop_off_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>맡기는 시간</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="맡기는 시간을 선택해주세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`drop-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="drop_off_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>맡기는 곳</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="맡기는 곳을 선택해주세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STORAGE_LOCATIONS.map((location) => (
                        <SelectItem key={`drop-${location}`} value={location}>
                          {STORAGE_LOCATION_LABELS[location]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 찾아가는 날짜, 시간 및 장소 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="pickup_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>찾아가는 날짜</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP", { locale: ko })
                          ) : (
                            <span>찾아가는 날짜를 선택해주세요</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pickup_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>찾아가는 시간</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="찾아가는 시간을 선택해주세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`pickup-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pickup_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>찾아가는 곳</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="찾아가는 곳을 선택해주세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STORAGE_LOCATIONS.map((location) => (
                        <SelectItem key={`pickup-${location}`} value={location}>
                          {STORAGE_LOCATION_LABELS[location]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 예약 사이트 */}
          <FormField
            control={form.control}
            name="reservation_site"
            render={({ field }) => (
              <FormItem>
                <FormLabel>예약 사이트</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="예약 사이트를 선택해주세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RESERVATION_SITES.map((site) => (
                      <SelectItem key={site} value={site}>
                        {RESERVATION_SITE_LABELS[site]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 비고 */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비고</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="추가 메모나 특이사항"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                취소
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "처리중..." : storage ? "수정하기" : "추가하기"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
