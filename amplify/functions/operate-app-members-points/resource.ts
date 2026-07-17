import { defineFunction, secret } from "@aws-amplify/backend";

export const operateAppMembersPoints = defineFunction({
  name: "operate-app-members-points",
  entry: "./handler.ts",
  environment: {
    API_KEY: secret("APP_MEMBERS_API_KEY")
  }
});
