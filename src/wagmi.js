import { createConfig, http, injected } from "@wagmi/core";
import { polygonAmoy } from "@wagmi/core/chains";

export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [injected()],
  transports: {
    [polygonAmoy.id]: http(),
  },
});
