import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import "dayjs/locale/es";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthProvider";
import "./index.css";
import App from "./App.tsx";
import { bukiooTheme } from "./theme";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={bukiooTheme}>
      <DatesProvider settings={{ firstDayOfWeek: 1, locale: "es" }}>
        <Notifications autoClose={15000} position="top-right" />
        <AuthProvider><App /></AuthProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
