import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { getShopservePoints } from "../functions/get-shopserve-points/resource";
import { operateShopservePoints } from "../functions/operate-shopserve-points/resource";

const schema = a.schema({
  UserProfile: a.model({
    email: a.string().required(),
    name: a.string(),
    role: a.string(),
    phoneNumber: a.string(),
    zipCode: a.string(),
    address: a.string(),
    lineId: a.string(),
    isDisabled: a.boolean().default(false),
  }).authorization((allow) => [
    allow.owner(),
    allow.authenticated()
  ]),

  ServiceMaster: a.model({
    name: a.string().required(),
    type: a.string().required(),
    endpointUrl: a.url(),
    status: a.string(),
    dummyBalance: a.integer().default(300),
    connectionSettings: a.string(),
    description: a.string(),
  }).authorization((allow) => [allow.authenticated()]),

  UserServiceCredential: a.model({
    userEmail: a.string().required(),
    serviceId: a.string().required(),
    serviceName: a.string(),
    loginId: a.string().required(),
    password: a.string().required(),
    status: a.string(),
    dummyBalance: a.integer().default(300),
  }).authorization((allow) => [allow.owner(), allow.authenticated().to(['read'])]),

  ExchangeTransaction: a.model({
    userEmail: a.string().required(),
    fromServiceName: a.string(),
    toServiceName: a.string(),
    amount: a.integer().required(),
    status: a.string(),
    dummyBalance: a.integer().default(300),
    errorMessage: a.string(),
  }).authorization((allow) => [allow.authenticated()]),

  GiftMaster: a.model({
    name: a.string().required(),
    description: a.string(),
    pointCost: a.integer().required(),
    stock: a.integer().required(),
    imageUrl: a.string(),
    isActive: a.boolean().default(true),
  }).authorization((allow) => [
    allow.authenticated().to(['read']),
    allow.group("Admins")
  ]),

  GiftOrder: a.model({
    userEmail: a.string().required(),
    giftId: a.id().required(),
    giftName: a.string().required(),
    pointSpent: a.integer().required(),
    // 名前を変更して強制同期させる
    orderSourceId: a.string(), 
    orderSourceName: a.string(),
    status: a.enum(['PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
  }).authorization((allow) => [
    allow.owner(),
    allow.group("Admins")
  ]),

  getShopservePoints: a
    .query()
    .arguments({
      accountId: a.string().required(),
      shopId: a.string().required(),
      authKey: a.string().required(),
    })
    .returns(a.customType({
      points: a.integer(),
      expire: a.string(),
    }))
    .handler(a.handler.function(getShopservePoints))
    .authorization(allow => [allow.authenticated()]),

  operateShopservePoints: a
    .mutation()
    .arguments({
      accountId: a.string().required(),
      shopId: a.string().required(),
      authKey: a.string().required(),
      amount: a.integer().required(),
      note: a.string(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),
    }))
    .handler(a.handler.function(operateShopservePoints))
    .authorization(allow => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});
