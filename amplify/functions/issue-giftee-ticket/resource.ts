import { defineFunction } from "@aws-amplify/backend";

export const issueGifteeTicket = defineFunction({
  name: "issue-giftee-ticket",
  entry: "./handler.ts",
  timeoutSeconds: 30, // 明示的にタイムアウトを設定して再更新を促す
});
