export const DEVICE_BRANDS = [
  "Apple",
  "ASUS",
  "Google",
  "HONOR",
  "Huawei",
  "Infinix",
  "iQOO",
  "Lava",
  "Motorola",
  "Nokia",
  "Nothing",
  "OnePlus",
  "OPPO",
  "POCO",
  "realme",
  "Samsung",
  "Sony",
  "Tecno",
  "vivo",
  "Xiaomi",
] as const;

export type DeviceBrand = (typeof DEVICE_BRANDS)[number];
