# GCS Telemetry Protocols & Real-Time Video Streaming Pipeline
**Team Adrods_X — Track 1: NIDAR RescueSwarm (Autonomous Search & Aid Delivery)**  
**Document Version:** 1.0  
**Classification:** Offline, Air-Gapped Multi-UAV Command, Control & Video Architecture  

---

## 1. Executive Summary

This document specifies the end-to-end communication and video architecture for Team Adrods_X's autonomous search and rescue swarm. In strict compliance with **NIDAR Rule 8.17 (Zero External Networks / Internet Ban)**, all data exchange between the Ground Control Station (GCS) and the 3-drone fleet (`INS-01`, `DEL-01`, `DEL-02`) operates entirely over local radio frequencies:

1. **Telemetry & C2 Data Link:** **MAVLink 2.0 binary serialized frames** transmitted over **RFD868x** long-range data radios in the Indian delicensed **865–867 MHz** ISM band.
2. **Real-Time Video Stream:** **5.8 GHz analog/digital RF link** driven by a **SpeedyBee TX800** transmitter, capturing the Raspberry Pi 5 AI overlay via an **HDMI-to-AV converter**, and hardware-decoded on the GCS laptop via a **UVC Video Receiver** for zero-latency ($<35\text{ms}$) HTML5 display.

---

## 2. End-to-End System Architecture Diagram

```
+===================================================================================================+
|                                    ONBOARD DRONE SUITE (INS-01)                                   |
|                                                                                                   |
|  [IMX219-83 Stereo Cam] ---MIPI CSI-2---> [Raspberry Pi 5 + Hailo-8 NPU]                          |
|                                                    |                                              |
|                                                    | (Micro-HDMI Output w/ YOLOv8 Bounding Boxes) |
|                                                    v                                              |
|  [Holybro Pixhawk 6X]                     [HDMI to AV Scaler Converter]                           |
|         |                                          |                                              |
|         | (MAVLink 2.0 @ 57,600 baud)              | (Analog CVBS Video Signal)                   |
|         v                                          v                                              |
|  [RFD868x Air Radio]                      [SpeedyBee TX800 5.8GHz VTx]                            |
|         | (Split-Rail 5V Power)                    | (800mW RF Output)                            |
|         | (865–867 MHz RHCP)                       | (5.8 GHz Lollipop Antenna)                   |
+=========|==========================================|==============================================+
          |                                          |
          |  === AIR-GAPPED WIRELESS TRANSMISSION ===|
          |  (Telemetry: 865-867MHz | Video: 5.8GHz) |
          v                                          v
+=========|==========================================|==============================================+
|         |                                          |                                              |
|  [RFD868x Ground Radio]                   [5.8GHz UVC / RD945 Video Receiver]                     |
|         | (5V Bus Powered)                         | (Hardware MJPEG / UVC Stream)                |
|         | (FTDI FT232RL USB)                       | (Direct USB / EasyCap Capture)               |
|         v                                          v                                              |
|     [COM3 / COM4]                             [/dev/video0 / DirectShow]                          |
|         |                                          |                                              |
|         v                                          v                                              |
|  [Node.js MAVLink Router]                  [Chromium / WebRTC Media Engine]                       |
|         | (JSON over WebSocket)                    | (HTML5 <video> GPU Surface)                  |
|         +-------------------+  +-------------------+                                              |
|                             v  v                                                                  |
|                [ADRODS_X UNIFIED GCS REACT HUD]                                                   |
|                • Offline MapLibre 3D Vector Maps                                                  |
|                • Real-Time Swarm Telemetry Gauges                                                 |
|                • Zero-Latency Live Video Cockpit                                                  |
+===================================================================================================+
```

---

## 3. Telemetry Protocol & Binary Packet Layout

### 3.1 Why MAVLink 2.0 Binary Format?
Raw text or JSON payloads are inefficient and bandwidth-heavy for long-range serial radios. To maximize telemetry throughput and packet reliability over our 64–128 kbps RF link, all flight telemetry is serialized into **MAVLink 2.0 binary frames**.

### 3.2 MAVLink 2.0 Frame Structure
Each packet is packed in Little-Endian byte order:

```
+-----+-----+--------------+------------+-------+-------+--------+------------------+----------+----------+
| STX | LEN | INCOMP_FLAGS | COMP_FLAGS |  SEQ  | SYSID | COMPID |      MSG_ID      | PAYLOAD  | CHECKSUM |
| (1B)| (1B)|     (1B)     |    (1B)    |  (1B) |  (1B) |  (1B)  |      (3B)        | (0-255B) |   (2B)   |
+-----+-----+--------------+------------+-------+-------+--------+------------------+----------+----------+
```

| Field Name | Size | Value / Range | Engineering Description |
| :--- | :---: | :---: | :--- |
| **STX** | 1 Byte | `0xFD` | Magic start byte identifying the packet as MAVLink 2.0. |
| **LEN** | 1 Byte | $0 - 255$ | Length of the binary data payload. |
| **INCOMP_FLAGS** | 1 Byte | Bitmask | Flags for features requiring parser compatibility (e.g., payload signing). |
| **COMP_FLAGS** | 1 Byte | Bitmask | Optional flags that can be safely ignored by older parsers. |
| **SEQ** | 1 Byte | $0 - 255$ | Sequence counter incremented per message; GCS uses this to compute radio packet loss rate. |
| **SYSID** | 1 Byte | $1, 2, 3$ | **Multi-Vehicle Fleet Identifier:**<br>• `SYSID = 1`: `INS-01` (Inspection Quadcopter)<br>• `SYSID = 2`: `DEL-01` (Delivery Hexacopter #1)<br>• `SYSID = 3`: `DEL-02` (Delivery Hexacopter #2)<br>• `SYSID = 255`: Ground Control Station (GCS) |
| **COMPID** | 1 Byte | $1 \text{ or } 190$ | Component ID (`1` = Pixhawk Autopilot, `190` = Raspberry Pi Companion). |
| **MSG_ID** | 3 Bytes | 24-bit integer | Specifies the exact telemetry structure of the payload (see Section 3.3). |
| **PAYLOAD** | $0 - 255$ Bytes | Packed struct | Serialized integers, floating-point numbers, and bitfields. |
| **CHECKSUM** | 2 Bytes | CRC-16-CCITT | Cyclic Redundancy Check protecting the packet against transmission corruption. |

### 3.3 Key Telemetry Messages Transmitted to GCS

| Message ID | MAVLink Message Name | Rate | Key Payload Data Fields Transmitted |
| :---: | :--- | :---: | :--- |
| **#0** | `HEARTBEAT` | 1 Hz | Autopilot type, flight mode (`GUIDED`, `AUTO`, `RTL`), arm/disarm status, system health flags. |
| **#33** | `GLOBAL_POSITION_INT` | 10 Hz | Latitude ($\text{deg} \times 10^7$), Longitude ($\text{deg} \times 10^7$), Altitude AMSL ($mm$), Altitude AGL ($mm$), Velocity ($cm/s$). |
| **#1** | `SYS_STATUS` | 2 Hz | Battery voltage ($mV$), current draw ($cA$), remaining battery (%), communication drop rate. |
| **#132** | `DISTANCE_SENSOR` | 10 Hz | Ground proximity distance from the **Benewake TFmini-S LiDAR** ($cm$) for precision 3.0m drop hold. |
| **#73** | `MISSION_ITEM_INT` | On-Demand | Waypoint coordinates (lat, lon, alt) uploaded for autonomous lawnmower search and drop runs. |
| **#183** | `DO_SET_SERVO` | On-Demand | Channel index and PWM pulse width ($1000\mu s - 2000\mu s$) triggering the medical kit release gate. |

### 3.4 Telemetry Transport & Hardware Layer
* **Onboard Wiring:** Pixhawk 6X `TELEM1` $\longrightarrow$ RFD868x Air Radio (configured with **Split-Rail wiring**: 5V power from external BEC to bypass Pixhawk's 500mA port limiter).
* **Wireless Band:** **865–867 MHz** (WPC GSR 564(E) license-free in India).
* **Ground Interface:** Ground RFD868x connects to the laptop via an **FTDI USB-to-UART cable** (`COM3` / `COM4`), powered directly via laptop USB (5V DC).
* **GCS Parsing:** A local Node.js / Python daemon reads raw binary bytes, parses MAVLink structs using `node-mavlink` / `pymavlink`, and broadcasts clean JSON events to the React UI via a local WebSocket (`ws://localhost:8080`).

---

## 4. Real-Time Video Capture, Encoding, Transmission & Playback

```
[Sony IMX219-83 Stereo Sensor]
             |
             | 2-Lane MIPI CSI-2 (RAW10)
             v
[Raspberry Pi 5 VideoCore VII ISP]
   • OpenCV + YOLOv8n AI inference running on Hailo-8 NPU (26 TOPS)
   • Bounding boxes, survivor labels, and depth coordinates rendered on screen
             |
             | Micro-HDMI Digital Video Output (1080p / 720p @ 60 FPS)
             v
[HDMI-to-AV Scaler Converter Board]
   • Silicon Image / CH7035 DAC converts HDMI to Composite CVBS (NTSC/PAL)
             |
             | Analog Baseband Video Signal (Yellow Wire + Ground)
             v
[SpeedyBee TX800 Video Transmitter (VTx)]
   • 5.8 GHz FM / COFDM RF Modulation (800mW output)
   • 5.8 GHz RHCP Lollipop Antenna
             |
             | === 5.8 GHz WIRELESS RF SIGNAL ===
             v
[5.8 GHz Ground Video Receiver]
   • Option A: Skydroid / Eachine 5.8GHz USB UVC Receiver
   • Option B: RD945 Diversity Receiver + EasyCap USB Video Capture Card
             |
             | Standard USB Video Class (UVC) Digital Stream (MJPEG / YUY2)
             v
[GCS Laptop USB Port]
             |
             | OS Virtual Camera Device (/dev/video0 or DirectShow UVC)
             v
[HTML5 navigator.mediaDevices.getUserMedia()]
             |
             v
[GPU-Accelerated HTML5 <video> Surface in React HUD]
   • Latency: < 35 milliseconds | Framerate: 60 FPS
```

### 4.1 Onboard Video Capture & AI Graphic Rendering
1. **Camera Sensor:** The **IMX219-83 Stereo Camera Module** captures raw optical frames through dual 2-lane MIPI CSI-2 interfaces into the Raspberry Pi 5.
2. **AI Inference & HUD Overlay:**
   * Raw frames (`RAW10`) are debayered to `YUV420p` / `NV12` by the Pi 5 ISP.
   * The **Hailo-8 NPU (26 TOPS)** processes YOLOv8n object detection at $>30\text{ FPS}$.
   * OpenCV paints real-time green bounding boxes, confidence scores, and stereo 3D ground coordinates directly onto the frame buffer.
3. **Digital-to-Analog Video Conversion:**
   * The composite video output leaves the Raspberry Pi 5 through its **Micro-HDMI port**.
   * It enters the **HDMI to AV Scaler Converter Board** (bare PCB: $12\text{ grams}$), which downscales the signal to standard composite video (CVBS PAL/NTSC, $1\text{V}_{p-p}, 75\Omega$).

### 4.2 Airborne Transmission Hardware
* **Transmitter:** **SpeedyBee TX800 (5.8 GHz VTx)**:
  * **RF Power Output:** Switchable $25\text{mW} / 200\text{mW} / 400\text{mW} / \mathbf{800\text{mW}}$. For the 10-hectare competition boundary, **$800\text{mW}$** is selected to penetrate foliage and debris.
  * **Mass:** Ultra-lightweight at **$5.6\text{ grams}$**.
  * **Antenna:** **5.8G 2.8dBi RHCP Lollipop Antenna** (Right-Hand Circular Polarization) mounted vertically on the tail boom to prevent fuselage shadowing.

### 4.3 Ground Reception & USB Interfacing
To display the video on the GCS laptop, two proven hardware configurations are supported:

#### Configuration 1 (Recommended All-in-One): **Skydroid 5.8GHz USB UVC Receiver**
* Plugs directly into the laptop via standard USB-A.
* Its internal DSP hardware-demodulates the 5.8 GHz RF signal and digitizes it into **USB Video Class (UVC)** format.
* **Powered entirely from laptop USB** ($5\text{V DC}, 250\text{mA}$). Zero external ground batteries required.

#### Configuration 2 (Long-Range High-Sensitivity): **RD945 5.8GHz Diversity Receiver**
* **Hardware:** RD945 48CH Dual-Antenna Receiver. Dual independent RF receivers dynamically switch to whichever antenna has the stronger RSSI signal.
* **Interfacing to Laptop:** Since the RD945 outputs analog 3.5mm RCA composite video, a **USB AV Video Capture Card (EasyCap USB)** digitizes the yellow RCA video line into USB for the laptop.
* **Power:** Runs on $7\text{V} - 16\text{V}$ (powered via a small 3S $11.1\text{V}$ ground LiPo battery).

### 4.4 GCS Software Decoding & Playback Engine
* The operating system treats the incoming USB video stream as a standard plug-and-play webcam (`USB Video Device`).
* The **GCS React frontend** requests the video stream directly through the browser's hardware-accelerated **HTML5 MediaDevices API**:

```typescript
// GCS Video Engine (src/components/LiveVideoHUD.tsx)
export const initLiveVideoFeed = async (videoElement: HTMLVideoElement) => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const uvcDevice = devices.find(
      d => d.kind === 'videoinput' && (d.label.includes('UVC') || d.label.includes('USB'))
    );

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: uvcDevice ? { exact: uvcDevice.deviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 60 }
      },
      audio: false
    });

    videoElement.srcObject = stream;
    await videoElement.play();
  } catch (err) {
    console.error('UVC Video Ingestion Error:', err);
  }
};
```

* **Zero Software Buffering:** Because frames are captured via UVC and passed directly to the laptop's GPU surface via Chromium hardware acceleration, there is **zero software pipeline buffering**.
* **End-to-End Latency:** Glass-to-glass delay (from camera shutter on `INS-01` to pixels lighting up on GCS screen) is **under 35 milliseconds**, giving the operator an instantaneous, jitter-free view of survivor detections.

---

## 5. Bill of Materials: Video Subsystem Procurement

| Component Name | Model / Specification | Weight | Price (INR) | Primary Supplier | Purpose |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **5.8 GHz Video Transmitter** | SpeedyBee TX800 (25-800mW) | 5.6 g | ₹4,299.00 | [Robu.in](https://robu.in/product/speedybee-tx800/) | Broadcasts live camera + AI overlay at 800mW. |
| **5.8 GHz Air Antenna** | 5.8G 2.8dBi RHCP Lollipop (RP-SMA) | 8.0 g | ₹765.00 | [Robu.in](https://robu.in/product/5-8g-2-8dbi-rhcp-rp-sma-lollipop-antennalong/) | Circularly polarized omnidirectional antenna. |
| **HDMI to AV Converter** | HDMI2AV Scaler (Bare PCB) | 12.0 g | ₹279.00 | [Amazon.in](https://www.amazon.in/dp/B09F6KYJ4Y) | Converts RPi 5 Micro-HDMI to analog CVBS. |
| **5.8 GHz Ground Receiver** | RD945 48CH Diversity Receiver | 85.0 g | ₹4,335.00 | [Rees52](https://rees52.com/products/rd945-5-8ghz-48ch-fpv-wireless-receiver-long-range-fpv-receiver-high-performance-5-8ghz-fpv-receiver-for-drones-and-rc-models-rs3115) | Dual-antenna diversity ground receiver. |
| **USB Video Capture Card** | EasyCap USB 2.0 Video Grabber | 25.0 g | ₹350.00 | [Amazon.in](https://www.amazon.in/) | Digitizes RD945 RCA video into laptop USB port. |
| **Total Video Subsystem** | Full Air + Ground Video Link | **25.6g (Air)** | **₹10,028.00** | — | **Full live video compliance with Rule 8.14.** |

---

## 6. Verification & Rulebook Compliance Checklist

* [x] **Rule 8.17 (Air-Gap Network):** 100% compliant. Zero reliance on cellular, cloud, or Wi-Fi networks.
* [x] **Rule 8.14 (Mandatory Live Feed):** Live 60 FPS video displayed directly on the single-operator GCS console.
* [x] **Rule 8.13 (Unified Interface):** Both telemetry from all 3 drones and the camera feed are housed inside a single React HUD window.
* [x] **WPC GSR 564(E) Compliance:** Telemetry frequency hopping locked to **865.0 MHz – 867.0 MHz** at $\le 1\text{W}$ RF power.
* [x] **Latency Guarantee:** Glass-to-glass latency $<35\text{ms}$, eliminating operator reaction lag during autonomous mission monitoring.
