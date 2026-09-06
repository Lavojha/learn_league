export function normalizeDeviceId(value: unknown) {
  const deviceId = String(value ?? "").trim();
  if (!deviceId || deviceId.length > 200) return null;
  return deviceId;
}
