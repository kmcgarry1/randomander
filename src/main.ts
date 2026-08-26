import { createApp } from "vue";
import { createPinia } from "pinia";
import "./style.css";
import App from "./App.vue";
import { shouldEnableAnalytics } from "./lib/privacy";

const privacyNavigator = navigator as Navigator & {
  globalPrivacyControl?: boolean;
  msDoNotTrack?: string | null;
};

if (
  import.meta.env.VITE_ENABLE_ANALYTICS === "true" &&
  shouldEnableAnalytics({
    production: import.meta.env.PROD,
    enabledFlag: import.meta.env.VITE_ENABLE_ANALYTICS,
    doNotTrack:
      privacyNavigator.doNotTrack ?? privacyNavigator.msDoNotTrack ?? null,
    globalPrivacyControl: privacyNavigator.globalPrivacyControl,
  })
) {
  import("@vercel/analytics").then(({ inject }) => inject());
}

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
