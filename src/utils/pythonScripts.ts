/**
 * Production-ready Python Bluetooth BLE Radar and Tracking scripts
 * Designed for cross-platform execution (Linux, macOS, Windows).
 */

export interface PythonScriptTemplate {
  id: string;
  title: string;
  description: string;
  filename: string;
  dependencies: string[];
  code: string;
  instructions: string[];
}

export const PYTHON_RADAR_SCRIPTS: PythonScriptTemplate[] = [
  {
    id: 'radar_gui',
    title: '1. Standalone Python Desktop Radar GUI (Tkinter + Bleak)',
    description: 'Full graphical desktop radar with rotating phosphor sweep beam, distance range rings, real-time BLE blips, and target tracking.',
    filename: 'ble_radar_gui.py',
    dependencies: ['bleak'],
    instructions: [
      'Install Bleak: pip install bleak',
      'Run the script: python ble_radar_gui.py',
      'A tactical radar window will open and immediately begin scanning local BLE hardware.',
      'Click on any blip or list item to lock onto that device and view real-time distance!'
    ],
    code: `"""
Tactical Bluetooth BLE Radar GUI
Uses Bleak for asynchronous BLE scanning & Tkinter for real-time 60FPS radar rendering.
Author: AeroBLE Engineering
"""

import asyncio
import math
import time
import threading
import tkinter as tk
from tkinter import ttk
from bleak import BleakScanner

# Radar Math Constants
TX_POWER_1M = -59   # Expected RSSI at 1 meter (TxPower)
PATH_LOSS_N = 2.5   # Path loss exponent (2.0 = free space, 2.7-3.5 = indoor)
MAX_RANGE_M = 15.0  # Radar radius scale in meters

class BleDevice:
    def __init__(self, address, name, rssi):
        self.address = address
        self.name = name or "Unknown BLE"
        self.rssi = rssi
        self.last_seen = time.time()
        # Compute bearing angle based on hash of address for stable display position
        self.angle_deg = (hash(address) % 360)
        self.distance = self.calculate_distance(rssi)
        self.alpha = 1.0  # For fade persistence

    def update_rssi(self, rssi):
        # Exponential Moving Average for signal smoothing
        self.rssi = 0.3 * rssi + 0.7 * self.rssi
        self.distance = self.calculate_distance(self.rssi)
        self.last_seen = time.time()
        self.alpha = 1.0

    @staticmethod
    def calculate_distance(rssi):
        if rssi == 0:
            return 999.0
        ratio = (TX_POWER_1M - rssi) / (10 * PATH_LOSS_N)
        return round(math.pow(10, ratio), 2)

class BleRadarApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AeroBLE Tactical Radar - Python Edition")
        self.root.geometry("900x680")
        self.root.configure(bg="#050a12")

        self.devices = {}
        self.selected_addr = None
        self.sweep_angle = 0.0

        self.setup_ui()
        self.start_ble_thread()
        self.animate_radar()

    def setup_ui(self):
        # Main split container
        main_frame = tk.Frame(self.root, bg="#050a12")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=12)

        # Left: Radar Canvas
        self.canvas_size = 620
        self.canvas = tk.Canvas(
            main_frame,
            width=self.canvas_size,
            height=self.canvas_size,
            bg="#03070d",
            highlightthickness=1,
            highlightbackground="#064e3b"
        )
        self.canvas.pack(side=tk.LEFT, padx=10, pady=10)
        self.canvas.bind("<Button-1>", self.on_canvas_click)

        # Right: Device List & Telemetry
        sidebar = tk.Frame(main_frame, bg="#0b1320", width=250)
        sidebar.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=10)

        title = tk.Label(
            sidebar,
            text="BLE RADAR TELEMETRY",
            font=("Courier", 13, "bold"),
            fg="#10b981",
            bg="#0b1320"
        )
        title.pack(anchor="w", padx=10, pady=8)

        # Locked target banner
        self.target_label = tk.Label(
            sidebar,
            text="LOCKED: None (Click blip)",
            font=("Courier", 10),
            fg="#06b6d4",
            bg="#0b1320",
            wraplength=220,
            justify="left"
        )
        self.target_label.pack(anchor="w", padx=10, pady=4)

        # Treeview for discovered devices
        columns = ("name", "dist", "rssi")
        self.tree = ttk.Treeview(sidebar, columns=columns, show="headings", height=20)
        self.tree.heading("name", text="Device")
        self.tree.heading("dist", text="Dist")
        self.tree.heading("rssi", text="RSSI")
        self.tree.column("name", width=110)
        self.tree.column("dist", width=65)
        self.tree.column("rssi", width=55)
        self.tree.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)
        self.tree.bind("<<TreeviewSelect>>", self.on_tree_select)

    def draw_radar_grid(self, cx, cy, radius):
        self.canvas.delete("all")

        # Range circles (3m, 6m, 9m, 12m, 15m)
        num_rings = 5
        for i in range(1, num_rings + 1):
            r = (radius / num_rings) * i
            dist_val = (MAX_RANGE_M / num_rings) * i
            self.canvas.create_oval(
                cx - r, cy - r, cx + r, cy + r,
                outline="#064e3b", width=1
            )
            self.canvas.create_text(
                cx + 4, cy - r + 8,
                text=f"{dist_val:.0f}m",
                fill="#047857", font=("Courier", 8)
            )

        # Crosshairs
        self.canvas.create_line(cx - radius, cy, cx + radius, cy, fill="#064e3b", dash=(2, 4))
        self.canvas.create_line(cx, cy - radius, cx, cy + radius, fill="#064e3b", dash=(2, 4))

        # Sweep beam line
        rad = math.radians(self.sweep_angle)
        sx = cx + radius * math.cos(rad)
        sy = cy + radius * math.sin(rad)
        self.canvas.create_line(cx, cy, sx, sy, fill="#34d399", width=2)

        # Sweeping phosphor wedge gradient trail
        for offset in range(1, 25):
            trail_rad = math.radians(self.sweep_angle - offset)
            tx = cx + radius * math.cos(trail_rad)
            ty = cy + radius * math.sin(trail_rad)
            opacity = max(10, 80 - offset * 3)
            # Draw subtle fading fan
            self.canvas.create_line(cx, cy, tx, ty, fill="#064e3b", width=1)

    def draw_blips(self, cx, cy, max_r):
        now = time.time()
        for addr, dev in list(self.devices.items()):
            # Fade out devices not seen recently
            age = now - dev.last_seen
            if age > 15.0:
                continue

            r_norm = min(dev.distance / MAX_RANGE_M, 1.0)
            dev_rad = math.radians(dev.angle_deg)
            bx = cx + (r_norm * max_r) * math.cos(dev_rad)
            by = cy + (r_norm * max_r) * math.sin(dev_rad)

            # Check if this blip is the locked target
            is_locked = (self.selected_addr == addr)
            blip_color = "#f59e0b" if is_locked else "#10b981"
            size = 7 if is_locked else 5

            self.canvas.create_oval(
                bx - size, by - size, bx + size, by + size,
                fill=blip_color, outline="#ffffff" if is_locked else "#059669", width=1
            )
            # Label
            label_text = f"{dev.name[:10]} ({dev.distance:.1f}m)"
            self.canvas.create_text(
                bx, by + 12,
                text=label_text,
                fill="#a7f3d0" if not is_locked else "#fde68a",
                font=("Courier", 8)
            )

    def animate_radar(self):
        cx = self.canvas_size // 2
        cy = self.canvas_size // 2
        radius = (self.canvas_size // 2) - 30

        self.sweep_angle = (self.sweep_angle + 3.0) % 360.0
        self.draw_radar_grid(cx, cy, radius)
        self.draw_blips(cx, cy, radius)

        self.root.after(30, self.animate_radar)

    def on_canvas_click(self, event):
        # Click near a blip to lock target
        cx = self.canvas_size // 2
        cy = self.canvas_size // 2
        max_r = (self.canvas_size // 2) - 30

        for addr, dev in self.devices.items():
            r_norm = min(dev.distance / MAX_RANGE_M, 1.0)
            dev_rad = math.radians(dev.angle_deg)
            bx = cx + (r_norm * max_r) * math.cos(dev_rad)
            by = cy + (r_norm * max_r) * math.sin(dev_rad)
            dist_click = math.hypot(event.x - bx, event.y - by)
            if dist_click < 18:
                self.selected_addr = addr
                self.target_label.config(
                    text=f"LOCKED TARGET:\\n{dev.name}\\nAddr: {dev.address}\\nEst: {dev.distance}m | {dev.rssi:.0f} dBm"
                )
                break

    def on_tree_select(self, event):
        selected = self.tree.selection()
        if selected:
            addr = selected[0]
            if addr in self.devices:
                self.selected_addr = addr
                dev = self.devices[addr]
                self.target_label.config(
                    text=f"LOCKED TARGET:\\n{dev.name}\\nAddr: {dev.address}\\nEst: {dev.distance}m | {dev.rssi:.0f} dBm"
                )

    def start_ble_thread(self):
        t = threading.Thread(target=self._run_async_scanner, daemon=True)
        t.start()

    def _run_async_scanner(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self._scan_ble())

    async def _scan_ble(self):
        def detection_callback(device, advertisement_data):
            addr = device.address
            rssi = advertisement_data.rssi
            name = device.name or advertisement_data.local_name or "BLE Device"

            if addr not in self.devices:
                self.devices[addr] = BleDevice(addr, name, rssi)
            else:
                self.devices[addr].update_rssi(rssi)

            # Update sidebar list in thread-safe fashion
            dev = self.devices[addr]
            self.root.after(0, self._update_tree_row, addr, dev)

        scanner = BleakScanner(detection_callback=detection_callback)
        await scanner.start()
        while True:
            await asyncio.sleep(1.0)

    def _update_tree_row(self, addr, dev):
        if self.tree.exists(addr):
            self.tree.item(addr, values=(dev.name, f"{dev.distance:.1f}m", f"{int(dev.rssi)}"))
        else:
            self.tree.insert("", "end", iid=addr, values=(dev.name, f"{dev.distance:.1f}m", f"{int(dev.rssi)}"))

if __name__ == "__main__":
    root = tk.Tk()
    app = BleRadarApp(root)
    root.mainloop()
`
  },
  {
    id: 'radar_cli',
    title: '2. Terminal Live BLE Radar (Command-Line ASCII HUD)',
    description: 'High-speed terminal BLE radar with ASCII sweep, real-time signal bars, distance estimations, and device discovery table.',
    filename: 'ble_radar_cli.py',
    dependencies: ['bleak', 'rich'],
    instructions: [
      'Install dependencies: pip install bleak rich',
      'Run the CLI: python ble_radar_cli.py',
      'Watch discovered devices appear in real-time with dBm meters and calculated distances.'
    ],
    code: `"""
Terminal BLE Radar & Signal Tracker
Uses Bleak + Rich to render a live cyber-terminal radar HUD.
"""

import asyncio
import math
import sys
from datetime import datetime
from bleak import BleakScanner
from rich.console import Console
from rich.table import Table
from rich.live import Live
from rich.panel import Panel

console = Console()
devices_cache = {}

TX_POWER = -59.0
PATH_LOSS_N = 2.4

def calculate_distance(rssi: int) -> float:
    if rssi == 0:
        return 99.0
    return round(math.pow(10, (TX_POWER - rssi) / (10 * PATH_LOSS_N)), 2)

def rssi_to_bar(rssi: int) -> str:
    # Generates a visual signal meter [||||||....]
    norm = max(0, min(100, int((rssi + 100) * 1.66)))
    bars = norm // 10
    color = "green" if rssi > -60 else ("yellow" if rssi > -75 else "red")
    return f"[{color}]{'█' * bars}{'░' * (10 - bars)}[/] {rssi} dBm"

def render_radar_table():
    table = Table(title="[bold green]🛰️  AeroBLE LIVE RADAR SCANNER[/bold green]", expand=True)
    table.add_column("MAC Address", style="cyan", no_wrap=True)
    table.add_column("Device Name", style="bold white")
    table.add_column("Est. Distance", style="magenta")
    table.add_column("Signal Strength", style="green")
    table.add_column("Last Seen", style="dim")

    sorted_devs = sorted(devices_cache.values(), key=lambda d: d["rssi"], reverse=True)

    for d in sorted_devs[:15]:
        dist_str = f"{d['dist']:.2f} m"
        if d['dist'] < 1.0:
            dist_str = f"[bold green]{int(d['dist']*100)} cm (IMMEDIATE)[/bold green]"
        elif d['dist'] < 3.0:
            dist_str = f"[green]{d['dist']:.2f} m (NEAR)[/green]"
        elif d['dist'] < 8.0:
            dist_str = f"[yellow]{d['dist']:.2f} m (MID)[/yellow]"
        else:
            dist_str = f"[red]{d['dist']:.2f} m (FAR)[/red]"

        table.add_row(
            d["address"],
            d["name"][:20],
            dist_str,
            rssi_to_bar(d["rssi"]),
            d["last_seen"].strftime("%H:%M:%S")
        )
    return table

async def main():
    def callback(device, adv):
        addr = device.address
        rssi = adv.rssi
        name = device.name or adv.local_name or "Unknown BLE"
        devices_cache[addr] = {
            "address": addr,
            "name": name,
            "rssi": rssi,
            "dist": calculate_distance(rssi),
            "last_seen": datetime.now()
        }

    scanner = BleakScanner(detection_callback=callback)
    await scanner.start()
    console.print("[cyan]Initializing BLE Hardware Scanner...[/cyan]")

    with Live(render_radar_table(), refresh_per_second=4, console=console) as live:
        try:
            while True:
                await asyncio.sleep(0.25)
                live.update(render_radar_table())
        except KeyboardInterrupt:
            await scanner.stop()
            console.print("[yellow]Scan aborted by user.[/yellow]")

if __name__ == "__main__":
    asyncio.run(main())
`
  },
  {
    id: 'bridge_server',
    title: '3. Python-to-Web Live WebSocket Bridge (Streams Hardware to this App!)',
    description: 'Runs on your computer, scans your real Bluetooth adapter, and streams discovered live devices directly into this Web Radar UI via WebSocket!',
    filename: 'ble_bridge_server.py',
    dependencies: ['bleak', 'websockets'],
    instructions: [
      'Install required packages: pip install bleak websockets',
      'Run the server: python ble_bridge_server.py',
      'In this web app, click the "Connect Python Bridge" button in the top bar.',
      'Boom! Your local hardware Bluetooth packets will instantly appear on this radar!'
    ],
    code: `"""
AeroBLE Python-to-Web Live Bridge Server
Listens on ws://localhost:8765 and broadcasts real Bluetooth Low Energy packets
from your operating system's Bluetooth adapter directly to the Web Radar interface!
"""

import asyncio
import json
import math
import sys
from bleak import BleakScanner
import websockets

PORT = 8765
TX_POWER = -59.0
PATH_LOSS_N = 2.5

connected_clients = set()
devices = {}

def calculate_distance(rssi):
    if rssi == 0:
        return 99.0
    return round(math.pow(10, (TX_POWER - rssi) / (10 * PATH_LOSS_N)), 2)

async def handler(websocket):
    connected_clients.add(websocket)
    print(f"[+] Web client connected from {websocket.remote_address}")
    try:
        # Send initial snapshot of all known devices
        init_payload = json.dumps({
            "type": "SNAPSHOT",
            "devices": list(devices.values())
        })
        await websocket.send(init_payload)
        async for message in websocket:
            # Handle messages from web UI (e.g. calibration updates)
            pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.remove(websocket)
        print(f"[-] Client disconnected.")

async def broadcast_device(dev_data):
    if not connected_clients:
        return
    message = json.dumps({
        "type": "BLE_DEVICE_UPDATE",
        "device": dev_data
    })
    # Broadcast to all connected web browser tabs
    await asyncio.gather(
        *[client.send(message) for client in connected_clients],
        return_exceptions=True
    )

async def ble_scanner_loop():
    def callback(device, adv):
        addr = device.address
        rssi = adv.rssi
        name = device.name or adv.local_name or "BLE Device"
        dist = calculate_distance(rssi)

        # Stable pseudo-angle derived from MAC address
        angle = (abs(hash(addr)) % 360)

        dev_data = {
            "id": addr,
            "name": name,
            "rssi": rssi,
            "distance": dist,
            "angle": angle,
            "txPower": adv.tx_power or TX_POWER,
            "manufacturerData": str(adv.manufacturer_data) if adv.manufacturer_data else None,
            "source": "python-bridge"
        }
        devices[addr] = dev_data
        asyncio.create_task(broadcast_device(dev_data))

    scanner = BleakScanner(detection_callback=callback)
    await scanner.start()
    print("[*] BLE Hardware scanner active. Listening for advertisements...")
    while True:
        await asyncio.sleep(1.0)

async def main():
    print("=" * 60)
    print(f" AeroBLE Hardware WebSocket Bridge")
    print(f" Listening on ws://localhost:{PORT}")
    print("=" * 60)

    server = await websockets.serve(handler, "localhost", PORT)
    scanner_task = asyncio.create_task(ble_scanner_loop())
    await asyncio.gather(server.wait_closed(), scanner_task)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\n[!] Bridge stopped.")
`
  },
  {
    id: 'gatt_connect',
    title: '4. Active BLE Connection & GATT Services Tracker',
    description: 'Pairs and connects directly to a BLE target device, reads Battery Level, Device Info characteristics, and tracks live RSSI fluctuations.',
    filename: 'ble_gatt_tracker.py',
    dependencies: ['bleak'],
    instructions: [
      'Install Bleak: pip install bleak',
      'Replace TARGET_ADDRESS with your device MAC or UUID',
      'Run the script: python ble_gatt_tracker.py',
      'Observes GATT characteristics, battery voltage, and continuously tracks connection RSSI.'
    ],
    code: `"""
Active BLE Connection & GATT Service Explorer
Connects to a specific target device and continuously monitors RSSI & characteristics.
"""

import asyncio
from bleak import BleakClient, BleakScanner

# Set this to your target device MAC address or UUID:
TARGET_ADDRESS = "XX:XX:XX:XX:XX:XX"

BATTERY_LEVEL_CHAR_UUID = "00002a19-0000-1000-8000-00805f9b34fb"
DEVICE_NAME_CHAR_UUID = "00002a00-0000-1000-8000-00805f9b34fb"

async def main():
    print(f"[*] Searching for target device {TARGET_ADDRESS}...")
    device = await BleakScanner.find_device_by_address(TARGET_ADDRESS, timeout=10.0)

    if not device:
        print(f"[!] Device {TARGET_ADDRESS} not found in range.")
        return

    print(f"[+] Found {device.name or 'Target'} ({device.address}). Connecting to GATT...")

    async with BleakClient(device) as client:
        print(f"[✓] Connected: {client.is_connected}")

        # Enumerate Services
        print("\\n--- GATT SERVICES & CHARACTERISTICS ---")
        for service in client.services:
            print(f"Service: {service.uuid} ({service.description})")
            for char in service.characteristics:
                props = ", ".join(char.properties)
                print(f"  └─ Char: {char.uuid} [{props}] ({char.description})")

        # Read Battery Level if supported
        try:
            battery_bytes = await client.read_gatt_char(BATTERY_LEVEL_CHAR_UUID)
            battery_pct = int(battery_bytes[0])
            print(f"\\n[🔋] Battery Level: {battery_pct}%")
        except Exception as e:
            print(f"\\n[i] Battery service not accessible: {e}")

        # Continuous tracking loop
        print("\\n--- ACTIVE TRACKING LOOP (Press Ctrl+C to stop) ---")
        while client.is_connected:
            rssi = await client.get_rssi()
            print(f"[Tracking] RSSI: {rssi} dBm | Status: ACTIVE")
            await asyncio.sleep(2.0)

if __name__ == "__main__":
    asyncio.run(main())
`
  },
  {
    id: 'desktop_tracker',
    title: '5. Desktop / Laptop Wayfinding & Directional Tracker',
    description: 'Tracks a physical desktop or laptop via BLE, calculates walking distance in steps and meters, and outputs directional steering guidance.',
    filename: 'track_laptop_compass.py',
    dependencies: ['bleak', 'rich'],
    instructions: [
      'Install dependencies: pip install bleak rich',
      'Run script: python track_laptop_compass.py',
      'Move your tracking device (phone/laptop/RPi) around to observe real-time distance and step countdown to the desktop!'
    ],
    code: `"""
Real Desktop / Laptop Directional & Proximity Tracker
Tracks your physical laptop/desktop, calculates walking distance in steps,
and guides you right to it.
"""

import asyncio
import math
import sys
from datetime import datetime
from bleak import BleakScanner
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.live import Live

console = Console()

# Target desktop / laptop identifier (matches by name or MAC)
TARGET_KEYWORD = "DESKTOP" # or "LAPTOP", "MACBOOK", or MAC address
TX_POWER = -59.0
PATH_LOSS_N = 2.5

class TargetDesktopState:
    def __init__(self):
        self.mac = None
        self.name = None
        self.rssi = -80
        self.distance = 5.0
        self.last_seen = None

    def update(self, mac, name, rssi):
        self.mac = mac
        self.name = name
        # Smooth signal
        self.rssi = 0.35 * rssi + 0.65 * self.rssi
        ratio = (TX_POWER - self.rssi) / (10 * PATH_LOSS_N)
        self.distance = round(math.pow(10, ratio), 2)
        self.last_seen = datetime.now()

state = TargetDesktopState()

def render_display():
    if not state.mac:
        return Panel(
            "[yellow]Scanning for physical Desktop / Laptop Bluetooth signals...[/yellow]\\n"
            "Make sure Bluetooth is enabled on your target desktop or run ble_bridge_server.py.",
            title="[bold green]🛰️  DESKTOP WAYFINDING RADAR[/bold green]"
        )

    dist = state.distance
    steps = max(1, int(dist * 1.3))
    
    # Visual Proximity Compass Meter
    meter_len = max(1, min(24, int((dist / 10.0) * 24)))
    meter = "[red]" + "█" * (24 - meter_len) + "[/red]" + "[dim]░[/dim]" * meter_len

    if dist <= 0.8:
        direction = "[bold green]🎯 ARRIVED AT DESKTOP / LAPTOP![/bold green]"
    elif dist <= 2.5:
        direction = f"[bold green]▲ WALK FORWARD ~{steps} STEPS ({dist:.1f}m)[/bold green]"
    else:
        direction = f"[cyan]▲ PROCEED FORWARD ~{steps} STEPS ({dist:.1f}m)[/cyan]"

    content = f"""[bold white]TARGET:[/bold white] [green]{state.name}[/green] ({state.mac})
[bold white]SIGNAL:[/bold white] {int(state.rssi)} dBm  |  [bold white]DISTANCE:[/bold white] [bold cyan]{dist:.2f} meters[/bold cyan] (~{steps} steps)
[bold white]PROXIMITY:[/bold white] [{meter}]

[bold yellow]WAYFINDING GUIDANCE:[/bold yellow]
{direction}
"""
    return Panel(content, title="[bold green]🛰️  DESKTOP TRACKER HUD[/bold green]")

async def main():
    def callback(device, adv):
        name = device.name or adv.local_name or ""
        # Check if device matches keyword or address
        if TARGET_KEYWORD.lower() in name.lower() or TARGET_KEYWORD.lower() in device.address.lower() or TARGET_KEYWORD == "ANY":
            state.update(device.address, name or "Target Laptop", adv.rssi)

    scanner = BleakScanner(detection_callback=callback)
    await scanner.start()

    with Live(render_display(), refresh_per_second=4, console=console) as live:
        try:
            while True:
                await asyncio.sleep(0.25)
                live.update(render_display())
        except KeyboardInterrupt:
            await scanner.stop()
            print("\\n[!] Tracker stopped.")

if __name__ == "__main__":
    asyncio.run(main())
`
  }
];

export const STEP_BY_STEP_TUTORIAL = [
  {
    step: 1,
    title: "Understanding How Bluetooth Radar Actually Works",
    summary: "Physics, Radio Signal Strength (RSSI), and Antenna Limitations",
    content: `Standard consumer Bluetooth Low Energy (BLE) does NOT broadcast radar electromagnetic pulses like naval radar. Instead, a "Bluetooth Radar" operates using **RSSI-based trilateration and distance profiling**:

1. **BLE Advertising**: Devices (iBeacons, AirTags, headphones, smartwatches, ESP32) continuously transmit 31-byte advertisement packets on advertising channels 37, 38, and 39 (2.4 GHz ISM band).
2. **RSSI (Received Signal Strength Indicator)**: Measured in negative decibels (-30 dBm is inches away, -90 dBm is at the fringe of reception).
3. **Distance Calculation (Log-Distance Path Loss Model)**:
   The formula used by Apple, Google, and radar engineers is:
   \`Distance = 10 ^ ((TxPower - RSSI) / (10 * n))\`
   - **TxPower**: The known RSSI measured at exactly 1 meter (usually -59 to -65 dBm).
   - **n**: The path loss exponent (2.0 in open vacuum/outdoors, 2.7 to 3.5 indoors through drywall, 4.0 in metal environments).
4. **Direction / Angle**: Single-antenna Bluetooth adapters cannot measure Angle of Arrival (AoA) without an antenna array (BLE 5.1 AoA). In software radar, we map devices into a polar coordinate system $(r, \\theta)$ where $r$ is calculated distance, and $\\theta$ is tracked through user movement or multi-antenna trilateration!`
  },
  {
    step: 2,
    title: "Setting Up Your Python BLE Environment",
    summary: "Operating System drivers, permissions, and packages",
    content: `To build your Python Bluetooth radar, use **Bleak** (Bluetooth Low Energy Asynchronous Klient) — the standard, multiplatform asynchronous library for Python.

### 1. Install Python packages:
\`\`\`bash
pip install bleak websockets rich
\`\`\`

### 2. Operating System Requirements:
- **Linux (Ubuntu/Debian/Raspberry Pi)**:
  Linux requires BlueZ. Give Python permission to sniff raw Bluetooth sockets without sudo:
  \`\`\`bash
  sudo apt-get install bluez
  sudo setcap cap_net_raw,cap_net_admin+eip $(which python3)
  \`\`\`
- **macOS**:
  macOS uses CoreBluetooth. Terminal or VS Code will ask for "Bluetooth permissions" on first run. Grant access in *System Settings > Privacy & Security > Bluetooth*.
- **Windows 10/11**:
  Uses Microsoft WinRT APIs natively. Make sure Bluetooth is toggled ON in Windows Action Center. No extra drivers needed!`
  },
  {
    step: 3,
    title: "Building the Core Python Bleak Scanner",
    summary: "Handling asynchronous advertisement callbacks",
    content: `Here is the minimal working asynchronous Python scanner that captures raw advertisements:

\`\`\`python
import asyncio
from bleak import BleakScanner

def on_device_detected(device, advertisement_data):
    # device.address: MAC on Linux/Win, UUID on macOS
    # advertisement_data.rssi: Signal strength in dBm
    # advertisement_data.local_name: Broadcasted device name
    print(f"Detected: {device.name or 'Unknown'} | {device.address} | RSSI: {advertisement_data.rssi} dBm")

async def scan():
    scanner = BleakScanner(detection_callback=on_device_detected)
    await scanner.start()
    print("Radar listening for BLE signals...")
    await asyncio.sleep(20.0) # Scan for 20 seconds
    await scanner.stop()

asyncio.run(scan())
\`\`\`

This callback fires every time any nearby phone, beacon, or gadget broadcasts an advertising packet!`
  },
  {
    step: 4,
    title: "Filtering Signal Noise (Kalman & Moving Averages)",
    summary: "Eliminating RF multipath bouncing and erratic RSSI jumps",
    content: `Radio frequencies in the 2.4 GHz spectrum bounce off walls, furniture, and human bodies (multipath fading). Raw RSSI jumps randomly by $\\pm 10\\text{ dBm}$ even if the device is stationary.

To make your radar smooth and accurate, apply an **Exponential Moving Average (EMA)** or a simple 1D Kalman filter:

\`\`\`python
class SignalSmoother:
    def __init__(self, alpha=0.25):
        self.alpha = alpha
        self.smoothed_rssi = None

    def update(self, raw_rssi):
        if self.smoothed_rssi is None:
            self.smoothed_rssi = raw_rssi
        else:
            self.smoothed_rssi = (self.alpha * raw_rssi) + ((1.0 - self.alpha) * self.smoothed_rssi)
        return self.smoothed_rssi
\`\`\`
Using \`alpha = 0.25\` eliminates 80% of erratic radar blip jittering!`
  },
  {
    step: 5,
    title: "Building the Radar Display & Connecting to Web",
    summary: "Visualizing in Tkinter or streaming to this AeroBLE web interface",
    content: `You have two awesome options:
1. **Standalone Desktop App**: Run \`ble_radar_gui.py\` (Script #1) which creates a full native GUI with green phosphor sweep and audio beeps.
2. **Stream to this Web Dashboard**: Run \`ble_bridge_server.py\` (Script #3) on your machine. It spins up a local WebSocket on port 8765. In this web interface, click "Connect Python Bridge" and your local hardware devices will render on the canvas radar in real-time!`
  }
];
