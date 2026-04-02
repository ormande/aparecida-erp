import { Font } from "@react-pdf/renderer";

Font.register({
  family: "DM Sans",
  fonts: [
    { src: "/fonts/DMSans-Regular.ttf" },
    { src: "/fonts/DMSans-Bold.ttf", fontWeight: "bold" },
    { src: "/fonts/DMSans-Italic.ttf", fontStyle: "italic" },
  ],
});
