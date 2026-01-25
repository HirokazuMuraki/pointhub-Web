import { defineFunction } from '@aws-amplify/backend';
export const partnerApiHandler = defineFunction({ name: 'partner-api-handler', entry: './handler.ts' });
