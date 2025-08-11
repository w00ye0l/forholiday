import {
  Device,
  DeviceCategory,
  DeviceStatus,
  DeviceAvailability,
  AvailabilityCheckParams,
  DeviceAllocation,
  InventoryStatus,
} from "@/types/device";
import { RentalReservation } from "@/types/rental";
import { createClient } from "@/lib/supabase/client";
import { findOptimalDeviceWithTagPriority } from "@/lib/algorithms/auto-assign";

export class InventoryManager {
  private supabase = createClient();

  /**
   * 특정 날짜 범위에서 기기 카테고리의 재고 가용성을 확인합니다.
   */
  async checkAvailability(
    params: AvailabilityCheckParams
  ): Promise<DeviceAvailability[]> {
    const { category, pickup_date, return_date, exclude_reservation_id } =
      params;

    // 해당 카테고리의 모든 기기 조회
    const { data: devices, error: devicesError } = await this.supabase
      .from("devices")
      .select("*")
      .eq("category", category);

    if (devicesError) {
      throw new Error(`기기 조회 실패: ${devicesError.message}`);
    }

    // 해당 날짜 범위에 겹치는 예약 조회
    let reservationsQuery = this.supabase
      .from("rental_reservations")
      .select("*")
      .eq("device_category", category)
      .neq("status", "returned")
      .or(`pickup_date.lte.${return_date},return_date.gte.${pickup_date}`);

    if (exclude_reservation_id) {
      reservationsQuery = reservationsQuery.neq("id", exclude_reservation_id);
    }

    const { data: reservations, error: reservationsError } =
      await reservationsQuery;

    if (reservationsError) {
      throw new Error(`예약 조회 실패: ${reservationsError.message}`);
    }

    // 각 기기의 가용성 계산
    return devices.map((device) => {
      const conflictingReservations = reservations
        .filter(
          (reservation) =>
            reservation.device_tag_name === device.tag_name ||
            (device.assigned_reservation_id &&
              reservation.id === device.assigned_reservation_id)
        )
        .map((r) => r.id);

      const isAvailable =
        device.status === "available" && conflictingReservations.length === 0;

      return {
        device_id: device.id,
        available_from: pickup_date,
        available_until: return_date,
        is_available: isAvailable,
        conflicting_reservations: conflictingReservations,
      };
    });
  }

  /**
   * 태그 우선 기기 할당 (새로운 알고리즘)
   */
  async allocateDeviceWithTagPriority(
    reservation: RentalReservation
  ): Promise<DeviceAllocation & { assignmentType?: string; reason?: string }> {
    try {
      // 해당 카테고리의 모든 기기 조회
      const { data: devices, error: devicesError } = await this.supabase
        .from("devices")
        .select("*")
        .eq("category", reservation.device_category)
        .eq("status", "available");

      if (devicesError) {
        return {
          success: false,
          error_message: `기기 조회 실패: ${devicesError.message}`,
        };
      }

      const availableDevices = devices?.map(d => d.tag_name) || [];

      // 기존 예약 이력 조회 (사용 이력 생성용)
      const { data: reservationHistory, error: historyError } = await this.supabase
        .from("rental_reservations")
        .select("device_tag_name, pickup_date, return_date")
        .neq("status", "returned")
        .not("device_tag_name", "is", null);

      if (historyError) {
        return {
          success: false,
          error_message: `예약 이력 조회 실패: ${historyError.message}`,
        };
      }

      // 디바이스 사용 이력 맵 생성
      const deviceUsageHistory = new Map();
      reservationHistory?.forEach((res) => {
        if (res.device_tag_name) {
          if (!deviceUsageHistory.has(res.device_tag_name)) {
            deviceUsageHistory.set(res.device_tag_name, []);
          }
          deviceUsageHistory.get(res.device_tag_name).push({
            pickup_date: res.pickup_date,
            return_date: res.return_date,
          });
        }
      });

      // 태그 우선 할당 알고리즘 실행
      const assignmentResult = findOptimalDeviceWithTagPriority(
        reservation,
        availableDevices,
        deviceUsageHistory
      );

      if (!assignmentResult.success || !assignmentResult.deviceTag) {
        return {
          success: false,
          error_message: assignmentResult.reason || "할당 가능한 기기가 없습니다.",
          assignmentType: assignmentResult.assignmentType,
          reason: assignmentResult.reason,
        };
      }

      const selectedDevice = devices.find(d => d.tag_name === assignmentResult.deviceTag);
      if (!selectedDevice) {
        return {
          success: false,
          error_message: "선택된 기기를 찾을 수 없습니다.",
        };
      }

      // 기기 상태를 'reserved'로 변경하고 예약 ID 할당
      const { error: updateError } = await this.supabase
        .from("devices")
        .update({
          status: "reserved",
          assigned_reservation_id: reservation.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedDevice.id);

      if (updateError) {
        return {
          success: false,
          error_message: `기기 할당 실패: ${updateError.message}`,
        };
      }

      // 예약에 기기 태그명 업데이트
      const { error: reservationUpdateError } = await this.supabase
        .from("rental_reservations")
        .update({
          device_tag_name: selectedDevice.tag_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservation.id);

      if (reservationUpdateError) {
        // 롤백: 기기 상태 원복
        await this.supabase
          .from("devices")
          .update({
            status: "available",
            assigned_reservation_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedDevice.id);

        return {
          success: false,
          error_message: `예약 업데이트 실패: ${reservationUpdateError.message}`,
        };
      }

      return {
        success: true,
        device_id: selectedDevice.id,
        device_tag_name: selectedDevice.tag_name,
        assignmentType: assignmentResult.assignmentType,
        reason: assignmentResult.reason,
      };
    } catch (error) {
      return {
        success: false,
        error_message:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 예약에 기기를 자동으로 할당합니다. (기존 방식)
   */
  async allocateDevice(
    reservationId: string,
    category: DeviceCategory,
    pickupDate: string,
    returnDate: string
  ): Promise<DeviceAllocation> {
    try {
      // 가용한 기기 확인
      const availability = await this.checkAvailability({
        category,
        pickup_date: pickupDate,
        return_date: returnDate,
      });

      const availableDevices = availability.filter((a) => a.is_available);

      if (availableDevices.length === 0) {
        return {
          success: false,
          error_message: "해당 날짜에 사용 가능한 기기가 없습니다.",
        };
      }

      // 우선순위가 높은 기기 선택 (priority 값이 낮을수록 높은 우선순위)
      const { data: devices } = await this.supabase
        .from("devices")
        .select("*")
        .in(
          "id",
          availableDevices.map((a) => a.device_id)
        )
        .order("priority", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(1);

      if (!devices || devices.length === 0) {
        return {
          success: false,
          error_message: "기기 할당 중 오류가 발생했습니다.",
        };
      }

      const selectedDevice = devices[0];

      // 기기 상태를 'reserved'로 변경하고 예약 ID 할당
      const { error: updateError } = await this.supabase
        .from("devices")
        .update({
          status: "reserved",
          assigned_reservation_id: reservationId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedDevice.id);

      if (updateError) {
        return {
          success: false,
          error_message: `기기 할당 실패: ${updateError.message}`,
        };
      }

      // 예약에 기기 태그명 업데이트
      const { error: reservationUpdateError } = await this.supabase
        .from("rental_reservations")
        .update({
          device_tag_name: selectedDevice.tag_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservationId);

      if (reservationUpdateError) {
        // 롤백: 기기 상태 원복
        await this.supabase
          .from("devices")
          .update({
            status: "available",
            assigned_reservation_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedDevice.id);

        return {
          success: false,
          error_message: `예약 업데이트 실패: ${reservationUpdateError.message}`,
        };
      }

      return {
        success: true,
        device_id: selectedDevice.id,
        device_tag_name: selectedDevice.tag_name,
      };
    } catch (error) {
      return {
        success: false,
        error_message:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 예약 취소 시 기기 할당을 해제합니다.
   */
  async releaseDevice(reservationId: string): Promise<boolean> {
    try {
      // 할당된 기기 조회
      const { data: devices } = await this.supabase
        .from("devices")
        .select("*")
        .eq("assigned_reservation_id", reservationId);

      if (!devices || devices.length === 0) {
        return true; // 할당된 기기가 없으면 성공으로 처리
      }

      // 기기 상태를 'available'로 변경하고 예약 ID 해제
      const { error } = await this.supabase
        .from("devices")
        .update({
          status: "available",
          assigned_reservation_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("assigned_reservation_id", reservationId);

      return !error;
    } catch (error) {
      console.error("기기 할당 해제 실패:", error);
      return false;
    }
  }

  /**
   * 반납 완료 시 기기 상태를 업데이트합니다.
   */
  async completeReturn(deviceTagName: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("devices")
        .update({
          status: "available",
          assigned_reservation_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("tag_name", deviceTagName);

      return !error;
    } catch (error) {
      console.error("반납 완료 처리 실패:", error);
      return false;
    }
  }

  /**
   * 재고 현황 통계를 가져옵니다.
   */
  async getInventoryStatus(
    category?: DeviceCategory
  ): Promise<InventoryStatus[]> {
    try {
      let query = this.supabase.from("devices").select("category, status");

      if (category) {
        query = query.eq("category", category);
      }

      const { data: devices, error } = await query;

      if (error) {
        throw new Error(`재고 현황 조회 실패: ${error.message}`);
      }

      // 카테고리별로 그룹화하여 통계 계산
      const statusByCategory = devices.reduce((acc, device) => {
        if (!acc[device.category]) {
          acc[device.category] = {
            total: 0,
            available: 0,
            rented: 0,
            maintenance: 0,
          };
        }

        acc[device.category].total++;

        switch (device.status) {
          case "available":
            acc[device.category].available++;
            break;
          case "rented":
          case "reserved":
          case "in_use":
          case "pending_return":
            acc[device.category].rented++;
            break;
          case "maintenance":
          case "under_inspection":
          case "under_repair":
            acc[device.category].maintenance++;
            break;
        }

        return acc;
      }, {} as Record<string, any>);

      return Object.entries(statusByCategory).map(([cat, stats]) => ({
        category: cat as DeviceCategory,
        total_devices: stats.total,
        available_devices: stats.available,
        rented_devices: stats.rented,
        maintenance_devices: stats.maintenance,
        utilization_rate:
          stats.total > 0 ? (stats.rented / stats.total) * 100 : 0,
      }));
    } catch (error) {
      console.error("재고 현황 조회 실패:", error);
      return [];
    }
  }

  /**
   * 반납 지연 알림이 필요한 예약들을 조회합니다.
   */
  async getOverdueReservations(): Promise<RentalReservation[]> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await this.supabase
        .from("overdue_reservations")
        .select("*");

      if (error) {
        throw new Error(`연체 예약 조회 실패: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("연체 예약 조회 실패:", error);
      return [];
    }
  }
}

// 싱글톤 인스턴스 생성
export const inventoryManager = new InventoryManager();
