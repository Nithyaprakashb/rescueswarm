/**
 * NIDAR RescueSwarm GCS - Mission Logger Service
 * 
 * Handles logging of mission events, survivor detections,
 * and telemetry data to local CSV/JSON files.
 */

import type { Survivor, DroneTelemetry } from '@/types';

export interface MissionEvent {
  timestamp: string;
  type: string;
  droneId?: string;
  details: string;
  data?: Record<string, unknown>;
}

class MissionLogger {
  private events: MissionEvent[] = [];
  private startTime: number | null = null;

  start() {
    this.startTime = Date.now();
    this.log('MISSION_START', 'Mission timer started');
  }

  stop() {
    this.log('MISSION_END', `Mission completed after ${this.getElapsedTime()}s`);
  }

  log(type: string, details: string, droneId?: string, data?: Record<string, unknown>) {
    const event: MissionEvent = {
      timestamp: new Date().toISOString(),
      type,
      droneId,
      details,
      data,
    };
    this.events.push(event);
    console.log(`[GCS LOG] ${event.timestamp} | ${type} | ${details}`);
  }

  logSurvivorDetection(survivor: Survivor) {
    this.log('SURVIVOR_DETECTED', 
      `${survivor.id} at (${survivor.lat.toFixed(6)}, ${survivor.lon.toFixed(6)}) confidence=${survivor.confidence.toFixed(1)}%`,
      'INS-01',
      { lat: survivor.lat, lon: survivor.lon, confidence: survivor.confidence }
    );
  }

  logSurvivorConfirmed(survivor: Survivor) {
    this.log('SURVIVOR_CONFIRMED',
      `${survivor.id} confirmed by operator`,
      undefined,
      { survivorId: survivor.id }
    );
  }

  logDeliveryDispatched(survivorId: string, droneId: string) {
    this.log('DELIVERY_DISPATCHED',
      `${droneId} dispatched to ${survivorId}`,
      droneId,
      { survivorId }
    );
  }

  logDeliveryCompleted(survivorId: string, droneId: string, accuracy: number, zone: string) {
    this.log('DELIVERY_COMPLETED',
      `${droneId} delivered to ${survivorId} | accuracy=${accuracy.toFixed(2)}m | zone=${zone}`,
      droneId,
      { survivorId, accuracy, zone }
    );
  }

  logEmergencyRTO(reason: string) {
    this.log('EMERGENCY_RTO', `RTO activated: ${reason}`);
  }

  logAlert(severity: string, message: string, droneId?: string) {
    this.log('ALERT', `[${severity.toUpperCase()}] ${message}`, droneId);
  }

  getElapsedTime(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getEvents(): MissionEvent[] {
    return [...this.events];
  }

  exportToCSV(): string {
    const headers = 'timestamp,type,droneId,details\n';
    const rows = this.events.map(e => 
      `"${e.timestamp}","${e.type}","${e.droneId || ''}","${e.details.replace(/"/g, '""')}"`
    ).join('\n');
    return headers + rows;
  }

  exportToJSON(): string {
    return JSON.stringify({
      missionStart: this.startTime ? new Date(this.startTime).toISOString() : null,
      totalEvents: this.events.length,
      elapsedSeconds: this.getElapsedTime(),
      events: this.events,
    }, null, 2);
  }

  clear() {
    this.events = [];
    this.startTime = null;
  }
}

// Singleton instance
export const missionLogger = new MissionLogger();
