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
import { BarChart3, Package, TrendingUp, Users } from "lucide-react";
import { StorageReservation, RESERVATION_SITE_LABELS } from "@/types/storage";
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

interface StorageStatisticsProps {
  storages: StorageReservation[];
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
];

export function StorageStatistics({ storages }: StorageStatisticsProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>("1month");

  // 날짜 범위에 따른 필터링된 보관 데이터
  const filteredStorages = useMemo(() => {
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

    return storages.filter((storage) => {
      try {
        const dropOffDate = parseISO(storage.drop_off_date);
        return isWithinInterval(dropOffDate, {
          start: startDate,
          end: endDate,
        });
      } catch {
        return false;
      }
    });
  }, [storages, selectedRange]);

  // 예약 사이트별 통계 계산
  const siteStats = useMemo(() => {
    const stats = new Map<string, { count: number; totalQuantity: number }>();
    const totalCount = filteredStorages.length;
    const totalQuantity = filteredStorages.reduce(
      (sum, storage) => sum + storage.quantity,
      0
    );

    filteredStorages.forEach((storage) => {
      const site = storage.reservation_site;
      const existing = stats.get(site) || { count: 0, totalQuantity: 0 };
      stats.set(site, {
        count: existing.count + 1,
        totalQuantity: existing.totalQuantity + storage.quantity,
      });
    });

    return Array.from(stats.entries())
      .map(([site, data]) => ({
        site,
        siteLabel:
          RESERVATION_SITE_LABELS[
            site as keyof typeof RESERVATION_SITE_LABELS
          ] || site,
        count: data.count,
        quantity: data.totalQuantity,
        countPercentage:
          totalCount > 0
            ? Number(((data.count / totalCount) * 100).toFixed(1))
            : 0,
        quantityPercentage:
          totalQuantity > 0
            ? Number(((data.totalQuantity / totalQuantity) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredStorages]);

  // 날짜별 통계 계산 (차트용)
  const dailyStats = useMemo(() => {
    if (selectedRange === "1day") {
      const todayCount = filteredStorages.length;
      const todayQuantity = filteredStorages.reduce(
        (sum, storage) => sum + storage.quantity,
        0
      );
      return [
        {
          date: "오늘",
          count: todayCount,
          quantity: todayQuantity,
        },
      ];
    }

    const stats = new Map<string, { count: number; quantity: number }>();

    filteredStorages.forEach((storage) => {
      try {
        const date = format(parseISO(storage.drop_off_date), "MM/dd", {
          locale: ko,
        });
        const existing = stats.get(date) || { count: 0, quantity: 0 };
        stats.set(date, {
          count: existing.count + 1,
          quantity: existing.quantity + storage.quantity,
        });
      } catch {
        // 날짜 파싱 실패 시 무시
      }
    });

    return Array.from(stats.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        quantity: data.quantity,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredStorages, selectedRange]);

  const totalCount = filteredStorages.length;
  const totalQuantity = filteredStorages.reduce(
    (sum, storage) => sum + storage.quantity,
    0
  );

  // 통계 데이터 계산
  const overallStats = useMemo(() => {
    const uniqueSites = new Set(
      filteredStorages.map((storage) => storage.reservation_site)
    ).size;

    const rangeOption = DATE_RANGE_OPTIONS.find(
      (option) => option.value === selectedRange
    );
    const days = rangeOption?.days || 1;
    const averageDaily = totalCount / days;
    const averageDailyQuantity = totalQuantity / days;

    return {
      totalReservations: totalCount,
      totalQuantity,
      uniqueSites,
      averageDaily,
      averageDailyQuantity,
    };
  }, [filteredStorages, totalCount, totalQuantity, selectedRange]);

  const chartConfig = {
    count: {
      label: "보관 건수",
      color: "hsl(var(--chart-1))",
    },
  };

  const siteChartConfig = siteStats.reduce((config, item, index) => {
    config[item.site] = {
      label: item.siteLabel,
      color: COLORS[index % COLORS.length],
    };
    return config;
  }, {} as any);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 헤더 및 날짜 범위 선택 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-green-600" />
          <h2 className="text-lg md:text-xl font-semibold">보관 통계</h2>
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              총 보관 건수
            </CardTitle>
            <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl md:text-2xl font-bold">
              {overallStats.totalReservations}건
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              예약 사이트
            </CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl md:text-2xl font-bold">
              {overallStats.uniqueSites}곳
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              일평균 보관
            </CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg md:text-xl font-bold">
              {overallStats.averageDaily.toFixed(1)}건
            </div>
            <div className="text-xs text-muted-foreground">
              {overallStats.averageDailyQuantity.toFixed(1)}개
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 및 테이블 탭 */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="daily" className="text-xs md:text-sm">
            일별 통계
          </TabsTrigger>
          <TabsTrigger value="sites" className="text-xs md:text-sm">
            사이트별 분포
          </TabsTrigger>
          <TabsTrigger value="table" className="text-xs md:text-sm">
            상세 테이블
          </TabsTrigger>
        </TabsList>

        {/* 일별 통계 차트 */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                일별 보관 통계
              </CardTitle>
              <CardDescription>
                {selectedRange === "1day"
                  ? "오늘 보관 현황"
                  : `최근 ${
                      DATE_RANGE_OPTIONS.find(
                        (opt) => opt.value === selectedRange
                      )?.label
                    } 일별 보관 현황`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="h-[200px] md:h-[250px] w-full"
              >
                <BarChart data={dailyStats} maxBarSize={60}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Bar
                    dataKey="count"
                    name="보관 건수"
                    fill="var(--color-count)"
                    radius={4}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 사이트별 분포 차트 */}
        <TabsContent value="sites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                예약 사이트별 보관 건수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={siteChartConfig}
                className="h-[250px] w-full"
              >
                <PieChart>
                  <Pie
                    data={siteStats.map((item) => ({
                      name: item.siteLabel,
                      value: item.count,
                      fill: siteChartConfig[item.site]?.color,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value, percent }) =>
                      `${name}: ${value}건 (${(percent * 100).toFixed(1)}%)`
                    }
                    labelLine={false}
                  >
                    {siteStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 상세 테이블 */}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                예약 사이트별 상세 통계
              </CardTitle>
              <CardDescription>
                건수와 개수 정보를 포함한 상세 통계
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>예약 사이트</TableHead>
                    <TableHead className="text-right">보관 건수</TableHead>
                    <TableHead className="text-right">건수 비율</TableHead>
                    <TableHead className="text-right">보관 개수</TableHead>
                    <TableHead className="text-right">개수 비율</TableHead>
                    <TableHead className="text-right">평균 개수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteStats.map((stat) => (
                    <TableRow key={stat.site}>
                      <TableCell className="font-medium">
                        {stat.siteLabel}
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.count}건
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {stat.countPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.quantity}개
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {stat.quantityPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.count > 0
                          ? (stat.quantity / stat.count).toFixed(1)
                          : 0}
                        개
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
