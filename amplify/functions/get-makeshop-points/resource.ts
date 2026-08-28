import { defineFunction } from "@aws-amplify/backend";

export const getMakeshopPoints = defineFunction({
  name: "get-makeshop-points",
  entry: "./handler.ts"
});
