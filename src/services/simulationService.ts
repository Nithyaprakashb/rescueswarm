/**
 * Adrods_X RescueSwarm GCS - Telemetry Simulation Service
 * 
 * Provides simulated telemetry data for development and testing.
 * Mimics real drone behavior: flying patterns, battery drain,
 * survivor detection, delivery sequences, and scoring.
 */

import { useTelemetryStore } from '@/stores/telemetryStore';
import { useMissionStore } from '@/stores/missionStore';
import { useSurvivorStore } from '@/stores/survivorStore';
import type { DroneId, DroneTelemetry, FlightMode } from '@/types';

// Bangalore coordinates as demo center
const BASE_LAT = 12.9716;
const BASE_LON = 77.5946;

interface SimDroneState {
  angle: number;      // Current patrol angle (radians)
  radius: number;     // Patrol radius
  speed: number;      // Angular speed
  alt: number;        // Target altitude
  battery: number;    // Current battery %
  drainRate: number;  // Battery drain per tick
}

const simState: Record<DroneId, SimDroneState> = {
  'INS-01': { angle: 0, radius: 0.003, speed: 0.02, alt: 25, battery: 95, drainRate: 0.015 },
  'DEL-01': { angle: Math.PI * 0.6, radius: 0.001, speed: 0.005, alt: 0, battery: 90, drainRate: 0.008 },
  'DEL-02': { angle: Math.PI * 1.3, radius: 0.001, speed: 0.005, alt: 0, battery: 88, drainRate: 0.008 },
};

let simInterval: ReturnType<typeof setInterval> | null = null;
let tickCount = 0;
let survivorTimer = 0;
let deliveryTimer = 0;
let coverageProgress = 0;

function randomJitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * range;
}

function batteryToVoltage(pct: number): number {
  // 6S LiPo: 25.2V full → 21.0V cutoff
  return 21.0 + (pct / 100) * 4.2;
}

function generateTelemetry(): Record<string, Partial<DroneTelemetry>> {
  tickCount++;
  const result: Record<string, Partial<DroneTelemetry>> = {};

  for (const droneId of ['INS-01', 'DEL-01', 'DEL-02'] as DroneId[]) {
    const state = simState[droneId];
    const isINS = droneId === 'INS-01';

    // Update simulation state
    state.angle += state.speed;
    state.battery = Math.max(5, state.battery - state.drainRate);

    // Lawnmower pattern for INS-01, loiter for DEL drones
    let lat: number, lon: number;
    if (isINS) {
      // Lawnmower: zigzag across search area
      const lawnX = Math.sin(state.angle * 0.5) * state.radius;
      const lawnY = (state.angle * 0.0005) % (state.radius * 2) - state.radius;
      lat = BASE_LAT + lawnY + randomJitter(0, 0.00005);
      lon = BASE_LON + lawnX + randomJitter(0, 0.00005);
    } else {
      // Delivery drones: loiter near base unless assigned
      lat = BASE_LAT + Math.sin(state.angle) * state.radius * 0.3 + randomJitter(0, 0.0001);
      lon = BASE_LON + Math.cos(state.angle) * state.radius * 0.3 + (droneId === 'DEL-02' ? 0.002 : -0.002);
    }

    const heading = ((state.angle * 180 / Math.PI) % 360 + 360) % 360;
    const voltage = batteryToVoltage(state.battery);

    // Determine payload status from survivor store
    const survivors = useSurvivorStore.getState().survivors;
    const assignedSurvivors = survivors.filter(s => s.assignedDrone === droneId);
    const dispatched = assignedSurvivors.find(s => s.status === 'dispatched');
    let payload: 'loaded' | 'releasing' | 'released' | 'empty' | undefined = undefined;
    if (!isINS) {
      payload = dispatched ? 'loaded' : assignedSurvivors.some(s => s.status === 'delivered') ? 'released' : 'empty';
    }

    result[droneId] = {
      droneId,
      droneType: isINS ? 'inspection' : 'delivery',
      status: state.battery > 10 ? 'flying' : 'returning',
      mode: 'AUTO' as FlightMode,
      position: {
        lat,
        lon,
        alt: isINS ? randomJitter(state.alt, 1) : randomJitter(3, 0.5),
        heading,
        groundspeed: isINS ? randomJitter(8, 0.5) : randomJitter(2, 0.5),
        airspeed: isINS ? randomJitter(8.5, 0.5) : randomJitter(2.5, 0.5),
      },
      battery: {
        voltage,
        percentage: state.battery,
        current: isINS ? randomJitter(15, 3) : randomJitter(8, 2),
      },
      gps: {
        satellites: Math.max(6, Math.floor(randomJitter(14, 4))),
        hdop: randomJitter(0.8, 0.3),
        fix: 3,
      },
      signal: {
        rssi: Math.floor(randomJitter(-55, 15)),
        remRssi: Math.floor(randomJitter(-60, 15)),
        noise: Math.floor(randomJitter(-100, 5)),
        remNoise: Math.floor(randomJitter(-100, 5)),
      },
      attitude: {
        roll: randomJitter(0, 5),
        pitch: randomJitter(-2, 3),
        yaw: heading,
      },
      lastHeartbeat: Date.now(),
      armed: true,
      payload,
    };
  }

  return result;
}

export function startSimulation() {
  if (simInterval) return;

  const { updateAllTelemetry, updateSerial } = useTelemetryStore.getState();
  const { addAlert } = useMissionStore.getState();

  // Simulate serial connection
  updateSerial({
    status: 'connected',
    port: 'COM3',
    baudRate: 57600,
    packetsReceived: 0,
  });

  addAlert({
    type: 'system',
    severity: 'info',
    title: 'Simulation Mode Active',
    message: 'Running with simulated telemetry data. Connect RFD900x for live data.',
  });

  // Keep phase in pre-flight so the checklist & Import KML screen is shown on startup

  simInterval = setInterval(() => {
    const telemetry = generateTelemetry();
    const state = useTelemetryStore.getState();
    const missionState = useMissionStore.getState();

    // Don't run survivor/delivery sim if mission not active
    const missionActive = missionState.mission.phase === 'searching' || missionState.mission.phase === 'active';

    updateAllTelemetry(telemetry as Record<string, DroneTelemetry>);

    // Update packet counter
    updateSerial({
      packetsReceived: state.serial.packetsReceived + 3,
    });

    if (missionActive) {
      // Update search coverage
      coverageProgress = Math.min(100, coverageProgress + 0.08);
      missionState.updateSearchCoverage(coverageProgress);

      // Simulate survivor detection every ~30 seconds
      survivorTimer++;
      if (survivorTimer >= 600 && Math.random() > 0.95) {
        survivorTimer = 0;
        const survivors = useSurvivorStore.getState().survivors;
        if (survivors.length < 10) {
          const survLat = BASE_LAT + (Math.random() - 0.5) * 0.005;
          const survLon = BASE_LON + (Math.random() - 0.5) * 0.005;
          const confidence = 85 + Math.random() * 14;

          useSurvivorStore.getState().addSurvivor({ lat: survLat, lon: survLon, confidence });
          missionState.incrementSurvivorsFound();

          missionState.addAlert({
            type: 'survivor',
            severity: 'warning',
            title: 'Survivor Detected!',
            message: `AI vision detected survivor at ${survLat.toFixed(6)}, ${survLon.toFixed(6)} (${confidence.toFixed(0)}% confidence)`,
            droneId: 'INS-01',
          });

          // Play alert tone
          try {
            const audio = new AudioContext();
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.connect(gain);
            gain.connect(audio.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(audio.currentTime + 0.2);
          } catch {
            // Audio not supported
          }
        }
      }

      // Simulate auto-delivery for dispatched survivors (~10 seconds after dispatch)
      deliveryTimer++;
      if (deliveryTimer >= 200) { // Every 10s at 20Hz
        deliveryTimer = 0;
        const { survivors, markDelivered } = useSurvivorStore.getState();
        const { incrementDeliveriesCompleted, addScore, addAlert: alert2 } = useMissionStore.getState();
        const dispatched = survivors.filter(s => s.status === 'dispatched');
        
        for (const s of dispatched) {
          const dropAccuracy = Math.random() * 3.5; // 0–3.5m
          markDelivered(s.id, dropAccuracy);
          incrementDeliveriesCompleted();

          let points = 0;
          if (dropAccuracy <= 1) points = 20;
          else if (dropAccuracy <= 2) points = 14;
          else if (dropAccuracy <= 3) points = 8;
          addScore(points);

          const zone = dropAccuracy <= 1 ? 'A' : dropAccuracy <= 2 ? 'B' : dropAccuracy <= 3 ? 'C' : 'Miss';
          alert2({
            type: 'system',
            severity: 'info',
            title: `Delivery Complete: ${s.id}`,
            message: `Drop accuracy: ${dropAccuracy.toFixed(2)}m (Zone ${zone}, +${points} pts)`,
            droneId: s.assignedDrone,
          });
          break;
        }
      }
    }
  }, 50); // 20 Hz update rate
}

export function stopSimulation() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
  tickCount = 0;
  survivorTimer = 0;
  deliveryTimer = 0;
  coverageProgress = 0;
}

export function isSimulationRunning(): boolean {
  return simInterval !== null;
}
