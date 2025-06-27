"use client";

import { useState, useMemo } from "react";
import { format, subDays, isWithinInterval, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Package2,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { RentalReservation } from "@/types/rental";
import { DEVICE_CATEGORY_LABELS } from "@/types/device";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

interface RentalStatisticsProps {
  rentals: RentalReservation[];
}

type DateRange = "1day" | "1month" | "2months";

const DATE_RANGE_OPTIONS = [
  { value: "1day" as DateRange, label: "오늘", days: 1 },
  { value: "1month" as DateRange, label: "1개월", days: 30 },
  { value: "2months" as DateRange, label: "2개월", days: 60 },
];

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF6384",
  "#36A2EB",
  "#4BC0C0",
  "#9966FF",
  "#FF9F40",
  "#FFCD56",
  "#FF6633",
  "#3366E6",
  "#00B3E6",
  "#CCFF99",
];

export function RentalStatistics({ rentals }: RentalStatisticsProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>("1month");

  // 날짜 범위에 따른 필터링된 렌탈 데이터
  const filteredRentals = useMemo(() => {
    const now = new Date();
    const rangeOption = DATE_RANGE_OPTIONS.find(
      (option) => option.value === selectedRange
    );
    if (!rangeOption) return [];

    const startDate =
      selectedRange === "1day"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : subDays(now, rangeOption.days);

    const endDate = now;

    return rentals.filter((rental) => {
      try {
        const pickupDate = parseISO(rental.pickup_date);
        return isWithinInterval(pickupDate, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    });
  }, [rentals, selectedRange]);

  // 기기 카테고리별 통계 계산
  const categoryStats = useMemo(() => {
    const stats = new Map<string, number>();
    const totalCount = filteredRentals.length;

    filteredRentals.forEach((rental) => {
      const category = rental.device_category;
      stats.set(category, (stats.get(category) || 0) + 1);
    });

    return Array.from(stats.entries())
      .map(([category, count]) => ({
        category,
        categoryLabel:
          DEVICE_CATEGORY_LABELS[
            category as keyof typeof DEVICE_CATEGORY_LABELS
          ] || category,
        count,
        percentage:
          totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRentals]);

  // 날짜별 통계 계산 (차트용)
  const dailyStats = useMemo(() => {
    if (selectedRange === "1day") {
      return categoryStats.map((stat) => ({
        date: "오늘",
        count: stat.count,
      }));
    }

    const stats = new Map<string, number>();

    filteredRentals.forEach((rental) => {
      try {
        const date = format(parseISO(rental.pickup_date), "MM/dd", {
          locale: ko,
        });
        stats.set(date, (stats.get(date) || 0) + 1);
      } catch {
        // 날짜 파싱 실패 시 무시
      }
    });

    return Array.from(stats.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRentals, selectedRange, categoryStats]);

  const totalCount = filteredRentals.length;

  // 통계 데이터 계산
  const overallStats = useMemo(() => {
    const uniqueDeviceTypes = new Set(
      filteredRentals.map((rental) => rental.device_category)
    ).size;

    const rangeOption = DATE_RANGE_OPTIONS.find(
      (option) => option.value === selectedRange
    );
    const days = rangeOption?.days || 1;
    const averageDaily = totalCount / days;

    return {
      totalRentals: totalCount,
      deviceTypes: uniqueDeviceTypes,
      averageDaily,
    };
  }, [filteredRentals, totalCount, selectedRange]);

  const chartConfig = {
    count: {
      label: "출고 건수",
      color: "hsl(var(--chart-1))",
    },
  };

  const deviceChartConfig = categoryStats.reduce((config, item, index) => {
    config[item.category] = {
      label: item.categoryLabel,
      color: COLORS[index % COLORS.length],
    };
    return config;
  }, {} as any);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 헤더 및 날짜 범위 선택 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg md:text-xl font-semibold">출고 통계</h2>
        </div>

        <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg w-fit">
          {DATE_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={selectedRange === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedRange(option.value)}
              className="h-8 text-xs md:text-sm"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              총 출고 건수
            </CardTitle>
            <Package2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl md:text-2xl font-bold">
              {overallStats.totalRentals}건
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              기기 종류
            </CardTitle>
            <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl md:text-2xl font-bold">
              {overallStats.deviceTypes}종
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              일평균 출고
            </CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl md:text-2xl font-bold">
              {overallStats.averageDaily.toFixed(1)}건
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 및 테이블 탭 */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="daily" className="text-xs md:text-sm py-2">
            일별 현황
          </TabsTrigger>
          <TabsTrigger value="devices" className="text-xs md:text-sm py-2">
            기기별 통계
          </TabsTrigger>
          <TabsTrigger value="table" className="text-xs md:text-sm py-2">
            상세 통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">
                일별 출고 현황
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                기간별 출고 건수 추이
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <ChartContainer
                config={chartConfig}
                className="h-[250px] md:h-[350px] w-full"
              >
                <BarChart
                  data={dailyStats}
                  margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">
                기기별 출고 비율
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                기기 유형별 출고 분포
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <ChartContainer
                config={deviceChartConfig}
                className="h-[300px] md:h-[400px] w-full"
              >
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    dataKey="count"
                    nameKey="categoryLabel"
                    label={({ name, value }) => `${name} ${value}건`}
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [`${name} ${value}건`]}
                  />
                </PieChart>
              </ChartContainer>

              {/* 모바일용 범례 */}
              <div className="grid grid-cols-2 gap-2 mt-4 md:hidden">
                {categoryStats.map((device, index) => (
                  <div
                    key={device.category}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span className="truncate">{device.categoryLabel}</span>
                    <span className="text-muted-foreground">
                      ({device.count})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">
                기기별 상세 통계
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                기기 유형별 출고 건수 및 비율
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs md:text-sm">
                        기기명
                      </TableHead>
                      <TableHead className="text-right text-xs md:text-sm">
                        건수
                      </TableHead>
                      <TableHead className="text-right text-xs md:text-sm">
                        비율
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStats.map((device, index) => (
                      <TableRow key={device.category}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="text-xs md:text-sm truncate">
                              {device.categoryLabel}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs md:text-sm">
                          {device.count}건
                        </TableCell>
                        <TableCell className="text-right text-xs md:text-sm">
                          {device.percentage}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 총 건수 표시 */}
      {totalCount > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 md:p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {
                DATE_RANGE_OPTIONS.find(
                  (option) => option.value === selectedRange
                )?.label
              }
            </Badge>
            <span className="text-xs md:text-sm text-muted-foreground">
              총 {totalCount}건의 출고 기록
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
