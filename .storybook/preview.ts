import type { Preview } from "@storybook/react";
import { initialize, mswLoader } from "msw-storybook-addon";
import { handlers } from "../src/mocks/handlers";
import "../src/app/globals.css";

initialize({}, handlers);

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;