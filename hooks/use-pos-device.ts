import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const DEVICE_INSTANCE_ID_KEY = "jakobs.pos.device-instance-id";

export type POSDevicePlatform = "ipad" | "iphone" | "android";
export type POSDeviceRole = "register" | "tap_to_pay_companion";

function createDeviceInstanceId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getPOSDevicePlatform(): POSDevicePlatform {
  if (Platform.OS === "ios" && Platform.isPad) {
    return "ipad";
  }

  if (Platform.OS === "android") {
    return "android";
  }

  return "iphone";
}

function getDefaultDeviceName(platform: POSDevicePlatform) {
  switch (platform) {
    case "ipad":
      return "POS iPad";
    case "android":
      return "Tap to Pay Android";
    default:
      return "Tap to Pay iPhone";
  }
}

export function usePOSDeviceIdentity(role: POSDeviceRole) {
  const registerDevice = useMutation(api.pos_devices.registerDevice);
  const platform = useMemo(() => getPOSDevicePlatform(), []);
  const deviceName = useMemo(() => getDefaultDeviceName(platform), [platform]);
  const [deviceInstanceId, setDeviceInstanceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDeviceIdentity = async () => {
      try {
        let storedId = await SecureStore.getItemAsync(DEVICE_INSTANCE_ID_KEY);
        if (!storedId) {
          storedId = createDeviceInstanceId();
          await SecureStore.setItemAsync(DEVICE_INSTANCE_ID_KEY, storedId);
        }

        if (!isMounted) return;
        setDeviceInstanceId(storedId);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDeviceIdentity().catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!deviceInstanceId) return;

    registerDevice({
      deviceInstanceId,
      name: deviceName,
      platform,
      role,
    }).catch(console.error);
  }, [deviceInstanceId, deviceName, platform, registerDevice, role]);

  return {
    deviceInstanceId,
    deviceName,
    platform,
    isLoading,
  };
}
