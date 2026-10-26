import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.famousmobiles.staff",
  appName: "Famous Mobiles",
  webDir: "out",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    Preferences: {
      group: "famous_mobiles_secure",
    },
  },
};

export default config;
