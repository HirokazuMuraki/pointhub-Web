import { defineFunction } from "@aws-amplify/backend";

export const operateShopservePoints = defineFunction({
  name: "operate-shopserve-points",
  entry: "./handler.ts"
});
