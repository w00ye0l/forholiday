import { RentalReservation } from "@/types/rental";

interface DeviceScore {
  deviceTag: string;
  utilizationRate: number;
  maintenanceScore: number;
  totalScore: number;
}

export const findOptimalDevice = (
  reservation: RentalReservation,
  availableDevices: string[],
  deviceUsageHistory: Map<
    string,
    { pickup_date: string; return_date: string }[]
  >
): string | null => {
  const deviceScores: DeviceScore[] = availableDevices.map((deviceTag) => {
    const usage = deviceUsageHistory.get(deviceTag) || [];
    const utilizationRate = usage.length / 30; // 최근 30일 기준
    const lastUsed =
      usage.length > 0
        ? Math.max(...usage.map((u) => new Date(u.return_date).getTime()))
        : 0;
    const daysSinceLastUse = (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);
    const maintenanceScore = Math.min(daysSinceLastUse / 7, 1);
    const totalScore = utilizationRate * 0.7 + (1 - maintenanceScore) * 0.3;
    return { deviceTag, utilizationRate, maintenanceScore, totalScore };
  });

  deviceScores.sort((a, b) => a.totalScore - b.totalScore);
  return deviceScores.length > 0 ? deviceScores[0].deviceTag : null;
};
