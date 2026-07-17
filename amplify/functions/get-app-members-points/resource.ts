import { defineFunction, secret } from "@aws-amplify/backend";

export const getAppMembersPoints = defineFunction({
  name: "get-app-members-points",
  entry: "./handler.ts",
  environment: {
    // SSM Parameter Store から安全に取得するためのシークレットバインド 
    API_KEY: secret("APP_MEMBERS_API_KEY")
  }
});
