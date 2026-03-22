import { defineFunction } from '@aws-amplify/backend';

export const issueGifteeTicket = defineFunction({
  name: 'issue-giftee-ticket',
  entry: './handler.ts',
  timeoutSeconds: 30,
  runtime: 20, // Node.js 20を指定
});
