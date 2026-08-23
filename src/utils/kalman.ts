import { GeoPoint } from '@/types';

/**
 * Lightweight Kalman filter for GPS points. Smooths position jitter so the
 * shuttle marker glides instead of jumping around on raw GPS noise.
 */
export class KalmanFilter {
  private q: number;
  private r: number;
  private p = 1;
  private x: GeoPoint | null = null;

  constructor(processNoise = 0.0005, measurementNoise = 4) {
    this.q = processNoise;
    this.r = measurementNoise;
  }

  update(point: GeoPoint): GeoPoint {
    if (!this.x) {
      this.x = point;
      return point;
    }

    const k = this.p / (this.p + this.r);
    const lat = this.x.lat + k * (point.lat - this.x.lat);
    const lng = this.x.lng + k * (point.lng - this.x.lng);
    this.p = (1 - k) * this.p + this.q;
    this.x = { lat, lng };
    return this.x;
  }

  reset(): void {
    this.x = null;
    this.p = 1;
  }
}
