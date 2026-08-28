import { defineFunction } from "@aws-amplify/backend";

export const operateMakeshopPoints = defineFunction({
  name: "operate-makeshop-points",
  entry: "./handler.ts"
});
