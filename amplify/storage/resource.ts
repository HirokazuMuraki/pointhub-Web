import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'giftImages',
  access: (allow) => ({
    'public/*': [
      allow.authenticated.to(['read']),
      allow.groups(['Admins']).to(['read', 'write', 'delete'])
    ]
  })
});
