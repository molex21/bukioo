import {
  Alert,
  createTheme,
  Drawer,
  Modal,
  PasswordInput,
  Select,
  type CSSVariablesResolver,
} from "@mantine/core";

export const bukiooCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-dimmed": "#64748b",
    "--mantine-color-placeholder": "#64748b",
  },
  dark: {},
});

export const bukiooTheme = createTheme({
  primaryColor: "bukioo",
  defaultRadius: "md",
  components: {
    PasswordInput: PasswordInput.extend({
      defaultProps: {
        visibilityToggleFocusable: true,
        visibilityToggleButtonProps: {
          "aria-label": "Mostrar u ocultar contraseña",
        },
      },
    }),
    Modal: Modal.extend({
      defaultProps: { closeButtonProps: { "aria-label": "Cerrar" } },
    }),
    Drawer: Drawer.extend({
      defaultProps: { closeButtonProps: { "aria-label": "Cerrar menú" } },
    }),
    Alert: Alert.extend({ defaultProps: { closeButtonLabel: "Cerrar aviso" } }),
    Select: Select.extend({
      defaultProps: {
        checkIconPosition: "right",
      },
    }),
  },
  fontFamily: "Inter, sans-serif",
  headings: {
    fontFamily: "Nunito, sans-serif",
    fontWeight: "700",
  },
  colors: {
    bukioo: [
      "#F1EEFF",
      "#E1DCFF",
      "#C7BEFF",
      "#AA9DFA",
      "#8D7CEF",
      "#6C5CE7",
      "#5B4BC4",
      "#4D3FAF",
      "#3F338F",
      "#322970",
    ],
  },
  shadows: {
    sm: "0 1px 3px rgb(15 23 42 / 10%)",
    md: "0 4px 10px rgb(15 23 42 / 10%)",
    lg: "0 12px 28px rgb(15 23 42 / 12%)",
    xl: "0 24px 55px rgb(15 23 42 / 18%)",
  },
});
