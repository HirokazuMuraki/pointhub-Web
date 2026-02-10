import { defineFunction } from "@aws-amplify/backend";

export const getShopservePoints = defineFunction({
  name: "get-shopserve-points",
  entry: "./handler.ts"
});
