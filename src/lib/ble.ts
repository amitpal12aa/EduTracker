import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
import { BleManager, Device } from 'react-native-ble-plx';
// react-native-ble-advertiser has an inconsistent API across forks/versions
// (some expose broadcast(uid, payload, options), others advertise(...)).
// This import + the calls in startAdvertising() below match the most
// common current version as of this writing — VERIFY against the README
// of whatever version `npm install` actually resolves, since I can't
// reach npm or a real device from this sandbox to confirm at build time.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BLEAdvertiser = require('react-native-ble-advertiser');

import { EDUTRACK_BLE_SERVICE_UUID } from './attendanceCode';

export type BlePermissionResult = { granted: boolean; message?: string };
export type BleRole = 'advertiser' | 'scanner';

export async function requestBlePermissions(role: BleRole = 'scanner'): Promise<BlePermissionResult> {
  if (Platform.OS !== 'android') return { granted: false, message: 'BLE attendance is Android-only in this app.' };

  const sdkInt = Platform.Version as number;
  const perms: string[] = [];

  if (sdkInt >= 31) {
    // Android 12+ splits scan/advertise/connect into separate runtime
    // permissions — request only the ones this role actually needs.
    if (role === 'advertiser') {
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    } else {
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    }
  } else {
    // Android <12 requires location permission for BLE scanning (needed
    // for the scanner role only — a pre-12 advertiser needs no runtime
    // permission at all beyond the manifest-declared BLUETOOTH_ADMIN).
    if (role === 'scanner') perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  }

  if (perms.length === 0) return { granted: true };
  const results = await PermissionsAndroid.requestMultiple(perms as any);
  const allGranted = Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  if (!allGranted) {
    return { granted: false, message: 'Bluetooth permission was denied — attendance cannot use BLE without it. Try QR instead.' };
  }
  return { granted: true };
}

// ---- Student side: central / scanner ----------------------------------

let manager: BleManager | null = null;
function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

export async function isBluetoothOn(): Promise<boolean> {
  const state = await getManager().state();
  return state === 'PoweredOn';
}

export function scanForEduTrackSignal(
  onFound: (payload: string, device: Device) => void,
  onError: (message: string) => void
): () => void {
  const mgr = getManager();
  mgr.startDeviceScan([EDUTRACK_BLE_SERVICE_UUID], { allowDuplicates: true }, (error, device) => {
    if (error) {
      onError(error.message ?? 'BLE scan failed');
      return;
    }
    if (!device?.manufacturerData) return;
    try {
      const bytes = Buffer.from(device.manufacturerData, 'base64');
      // First 2 bytes are the BLE "Company ID" field required by the
      // advertisement spec; our payload starts after that.
      const payload = bytes.slice(2).toString('ascii');
      onFound(payload, device);
    } catch {
      // Not our payload shape — ignore, some other BLE device.
    }
  });

  return () => mgr.stopDeviceScan();
}

// ---- Teacher side: peripheral / advertiser -----------------------------
// EduTrack's own manufacturer/company id used only to tag our packets —
// NOT a registered Bluetooth SIG company id, fine for a closed system
// where both advertiser and scanner are this same app.
const EDUTRACK_COMPANY_ID = 0x02e5;

export async function startAdvertising(payload: string): Promise<void> {
  BLEAdvertiser.setCompanyId(EDUTRACK_COMPANY_ID);
  const bytes = Array.from(Buffer.from(payload, 'ascii'));
  await BLEAdvertiser.broadcast(EDUTRACK_BLE_SERVICE_UUID, bytes, {
    advertiseMode: BLEAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
    txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_MEDIUM,
    connectable: false,
    includeDeviceName: false,
  });
}

export async function stopAdvertising(): Promise<void> {
  try {
    await BLEAdvertiser.stopBroadcast();
  } catch {
    // Already stopped — not an error condition worth surfacing.
  }
}
