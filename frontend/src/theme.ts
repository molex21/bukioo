import { createTheme, Select } from "@mantine/core";

export const bukiooTheme = createTheme({
  primaryColor: "bukioo",
  defaultRadius: "md",
  components: {
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
