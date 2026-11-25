import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vaanamai.weather",
  appName: "VAANAM AI",
  webDir: "out",
  android: {
    allowMixedContent: true,
    backgroundColor: "#040914",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
