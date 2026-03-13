import { defineFunction } from "@aws-amplify/backend";

export const issueGifteeTicket = defineFunction({
  name: "issue-giftee-ticket",
  entry: "./handler.ts",
});
