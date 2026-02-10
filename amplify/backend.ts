import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { getShopservePoints } from './functions/get-shopserve-points/resource';
import { operateShopservePoints } from './functions/operate-shopserve-points/resource';

defineBackend({
  auth,
  data,
  getShopservePoints,
  operateShopservePoints,
});
