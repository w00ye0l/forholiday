// 성능 최적화를 위한 캐시 유틸리티
import { useCallback, useRef, useMemo } from 'react';

// 인메모리 캐시 인터페이스
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// 글로벌 캐시 스토리지
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear(prefix?: string): void {
    if (prefix) {
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
  
  size(): number {
    return this.cache.size;
  }
}

export const globalCache = new MemoryCache();

// React Hook: 캐시된 데이터 페칭
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000
) {
  const fetchRef = useRef<Promise<T> | null>(null);
  
  const getCachedData = useCallback(async (): Promise<T> => {
    const cached = globalCache.get<T>(key);
    if (cached) {
      return cached;
    }
    
    // 동시 요청 방지
    if (fetchRef.current) {
      return fetchRef.current;
    }
    
    fetchRef.current = fetchFn();
    try {
      const data = await fetchRef.current;
      globalCache.set(key, data, ttlMs);
      return data;
    } finally {
      fetchRef.current = null;
    }
  }, [key, fetchFn, ttlMs]);
  
  return getCachedData;
}

// React Hook: 메모이제이션된 계산
export function useMemoizedCalculation<T, P extends any[]>(
  calculation: (...args: P) => T,
  deps: React.DependencyList
): (...args: P) => T {
  const memoizedFn = useMemo(() => {
    const cache = new Map<string, T>();
    
    return (...args: P): T => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      const result = calculation(...args);
      cache.set(key, result);
      return result;
    };
  }, deps);
  
  return memoizedFn;
}

// 디바운스 유틸리티
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }, [fn, delay]);
  
  return debouncedFn as T;
}

// 쓰로틀 유틸리티
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);
  
  const throttledFn = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      fn(...args);
      lastRun.current = now;
    }
  }, [fn, delay]);
  
  return throttledFn as T;
}

// 성능 모니터링
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();
  
  static startMeasurement(name: string): string {
    const measurementId = `${name}-${Date.now()}-${Math.random()}`;
    performance.mark(`${measurementId}-start`);
    return measurementId;
  }
  
  static endMeasurement(measurementId: string): number {
    const endMark = `${measurementId}-end`;
    const startMark = `${measurementId}-start`;
    
    performance.mark(endMark);
    performance.measure(measurementId, startMark, endMark);
    
    const measure = performance.getEntriesByName(measurementId)[0];
    const duration = measure.duration;
    
    // 성능 데이터 저장
    const baseName = measurementId.split('-')[0];
    if (!this.measurements.has(baseName)) {
      this.measurements.set(baseName, []);
    }
    this.measurements.get(baseName)!.push(duration);
    
    // 성능 마크 정리
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measurementId);
    
    return duration;
  }
  
  static getAverageTime(name: string): number {
    const times = this.measurements.get(name);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
  
  static getPerformanceReport(): Record<string, { count: number; average: number; total: number }> {
    const report: Record<string, { count: number; average: number; total: number }> = {};
    
    this.measurements.forEach((times, name) => {
      const total = times.reduce((sum: number, time: number) => sum + time, 0);
      report[name] = {
        count: times.length,
        average: total / times.length,
        total
      };
    });
    
    return report;
  }
}

// React Hook: 성능 측정
export function usePerformanceMeasurement(name: string) {
  const measurementRef = useRef<string | null>(null);
  
  const startMeasurement = useCallback(() => {
    measurementRef.current = PerformanceMonitor.startMeasurement(name);
  }, [name]);
  
  const endMeasurement = useCallback(() => {
    if (measurementRef.current) {
      const duration = PerformanceMonitor.endMeasurement(measurementRef.current);
      measurementRef.current = null;
      return duration;
    }
    return 0;
  }, []);
  
  return { startMeasurement, endMeasurement };
}