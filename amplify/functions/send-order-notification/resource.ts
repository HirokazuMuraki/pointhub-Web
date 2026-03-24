import { defineFunction } from "@aws-amplify/backend";

export const sendOrderNotification = defineFunction({
  name: "send-order-notification",
  entry: "./handler.ts",
});
