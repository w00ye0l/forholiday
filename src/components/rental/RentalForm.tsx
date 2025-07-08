"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, uploadContactImage, compressImage } from "@/lib/utils";
import {
  CreateRentalReservationDto,
  PICKUP_METHOD_LABELS,
  RETURN_METHOD_LABELS,
  RESERVATION_SITE_LABELS,
} from "@/types/rental";
import { DEVICE_FEATURES, DEVICE_CATEGORY_LABELS } from "@/types/device";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * 예약 폼 스키마
 * 수령 날짜
 * 수령 시간
 * 반납 날짜
 * 반납 시간
 * 기기 선택 (수령 날짜 기준 사용 가능한 기기 목록)
 * 대여자 이름
 * 연락처
 * 데이터 전송(기기가 핸드폰 기종일 경우만 활성)
 * SD 카드 옵션(기기가 카메라 기종일 경우만 활성)
 * 주소
 * 비고
 * 수령 방법
 * 반납 방법
 * 예약 사이트
 */

const formSchema = z.object({
  device_category: z.enum([
    "GP13",
    "GP12",
    "GP11",
    "GP8",
    "POCKET3",
    "ACTION5",
    "S23",
    "S24",
    "PS5",
    "GLAMPAM",
    "AIRWRAP",
    "AIRSTRAIGHT",
    "INSTA360",
    "STROLLER",
    "WAGON",
    "MINIEVO",
    "ETC",
  ] as const),
  pickup_date: z.date(),
  pickup_time: z.string(),
  return_date: z.date(),
  return_time: z.string(),
  pickup_method: z.enum(["T1", "T2", "delivery", "office", "hotel"] as const),
  return_method: z.enum(["T1", "T2", "delivery", "office", "hotel"] as const),
  renter_name: z.string(),
  contact_input_type: z.enum(["text", "image"] as const).default("text"),
  contact_image_url: z.string().optional(),
  renter_phone: z.string().optional(),
  renter_email: z.string().optional(),
  renter_address: z.string(),
  data_transmission: z.boolean().default(false),
  sd_option: z.enum(["대여", "구매", "구매+대여"] as const).optional(),
  reservation_site: z.enum([
    "naver",
    "forholiday",
    "creatrip",
    "klook",
    "seoulpass",
    "trip_com",
    "rakuten",
    "triple",
    "forholidayg",
    "myrealtrip",
    "waug",
    "hanatour",
  ] as const),
  order_number: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RentalFormProps {
  onSubmit: (data: CreateRentalReservationDto) => Promise<void>;
  isSubmitting?: boolean;
}

// 모든 라벨 매핑은 이제 @/types/rental에서 import됨

export function RentalForm({ onSubmit, isSubmitting }: RentalFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const router = useRouter();
  const [contactImage, setContactImage] = useState<File | null>(null);

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

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      device_category: undefined,
      pickup_time: "",
      return_time: "",
      pickup_method: undefined,
      return_method: undefined,
      renter_name: "",
      renter_phone: "",
      renter_address: "",
      data_transmission: false,
      sd_option: undefined,
      reservation_site: undefined,
      contact_input_type: "text" as const,
      contact_image_url: "",
      order_number: "",
      renter_email: "",
      description: "",
    },
  });

  const watchedDeviceCategory = form.watch("device_category");

  // 선택된 카테고리 확인
  const isPhoneDevice =
    watchedDeviceCategory &&
    DEVICE_FEATURES.PHONE_CATEGORIES.includes(watchedDeviceCategory);
  const isCameraDevice =
    watchedDeviceCategory &&
    DEVICE_FEATURES.CAMERA_CATEGORIES.includes(watchedDeviceCategory);

  const handleSubmit = async (data: FormValues) => {
    console.log("click");
    try {
      setIsLoading(true);

      console.log({ data });

      // 이미지 업로드가 필요한 경우
      if (data.contact_input_type === "image" && contactImage) {
        try {
          setUploadingImage(true);
          // 이미지 압축 (최대 너비 800px, 품질 80%)
          const compressedImage = await compressImage(contactImage);
          const imageUrl = await uploadContactImage(compressedImage);
          data.contact_image_url = imageUrl;
        } catch (error) {
          console.error("이미지 업로드 실패:", error);
          alert("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // Date 객체를 문자열로 변환
      const formattedData: CreateRentalReservationDto = {
        ...data,
        pickup_date: format(data.pickup_date, "yyyy-MM-dd"),
        return_date: format(data.return_date, "yyyy-MM-dd"),
      };

      await onSubmit(formattedData);
      form.reset();
      setContactImage(null);
      router.push("/rentals");
      router.refresh();
    } catch (error) {
      console.error("예약 생성 중 오류 발생:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* 1. 예약 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {Object.entries(RESERVATION_SITE_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="order_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>주문 번호</FormLabel>
                <FormControl>
                  <Input placeholder="주문 번호를 입력해주세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 2. 대여 정보 */}
        {/* 기기 선택 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="device_category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>기기 선택</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="기기를 선택해주세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(DEVICE_CATEGORY_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 수령 날짜/시간 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pickup_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>수령 날짜</FormLabel>
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
                          <span>수령 날짜를 선택해주세요</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
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
                <FormLabel>수령 시간</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="수령 시간을 선택해주세요" />
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
        </div>

        {/* 반납 날짜/시간 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="return_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>반납 날짜</FormLabel>
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
                          <span>반납 날짜를 선택해주세요</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="return_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>반납 시간</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="반납 시간을 선택해주세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`return-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 수령/반납 방법 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pickup_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>수령 방법</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="수령 방법을 선택해주세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(PICKUP_METHOD_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="return_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>반납 방법</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="반납 방법을 선택해주세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(RETURN_METHOD_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 3. 대여자 정보 */}
        {/* 대여자 이름 */}
        <FormField
          control={form.control}
          name="renter_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>대여자 이름</FormLabel>
              <FormControl>
                <Input placeholder="대여자 이름을 입력해주세요" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 연락처 입력 방식 선택 */}
          <FormField
            control={form.control}
            name="contact_input_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>연락처 입력 방식</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value === "text") {
                      form.setValue("contact_image_url", "");
                      setContactImage(null);
                    } else {
                      form.setValue("renter_phone", "");
                    }
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="연락처 입력 방식을 선택해주세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="text">전화번호</SelectItem>
                    <SelectItem value="image">
                      이미지 업로드 (외국인 QR코드)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("contact_input_type") === "text" ? (
            <FormField
              control={form.control}
              name="renter_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>연락처</FormLabel>
                  <FormControl>
                    <Input placeholder="연락처를 입력해주세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="contact_image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>연락처 QR코드</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressedFile = await compressImage(file);
                              setContactImage(compressedFile);
                            } catch (error) {
                              console.error("이미지 압축 실패:", error);
                              alert("이미지 처리 중 오류가 발생했습니다.");
                            }
                          }
                        }}
                        disabled={isLoading}
                      />
                      {contactImage && (
                        <img
                          src={URL.createObjectURL(contactImage)}
                          alt="QR코드"
                          className="w-20 h-20 object-contain"
                        />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* 이메일 */}
        <FormField
          control={form.control}
          name="renter_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="이메일을 입력해주세요"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 주소 */}
        <FormField
          control={form.control}
          name="renter_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>주소</FormLabel>
              <FormControl>
                <Input placeholder="주소를 입력해주세요" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 4. 추가 옵션 (기기별 특수 옵션) */}
        {/* 데이터 전송 옵션 (핸드폰 기종일 경우) */}
        {isPhoneDevice && (
          <FormField
            control={form.control}
            name="data_transmission"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>데이터 전송 필요</FormLabel>
                </div>
              </FormItem>
            )}
          />
        )}

        {/* SD 카드 옵션 (카메라 기종일 경우) */}
        {isCameraDevice && (
          <FormField
            control={form.control}
            name="sd_option"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SD 카드 옵션</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="SD 카드 옵션을 선택해주세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="대여">대여</SelectItem>
                    <SelectItem value="구매">구매</SelectItem>
                    <SelectItem value="구매+대여">구매+대여</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 5. 기타 정보 */}
        {/* 비고 */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비고</FormLabel>
              <FormControl>
                <Input placeholder="비고 사항을 입력해주세요" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" asChild className="flex-1">
            <Link href="/rentals">취소</Link>
          </Button>

          <Button
            type="submit"
            className="flex-1"
            disabled={isLoading || isSubmitting}
          >
            {isLoading || isSubmitting ? "처리중..." : "예약 생성"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
