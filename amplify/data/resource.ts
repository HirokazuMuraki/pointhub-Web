import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { getShopservePoints } from "../functions/get-shopserve-points/resource";
import { operateShopservePoints } from "../functions/operate-shopserve-points/resource";
import { issueGifteeTicket } from "../functions/issue-giftee-ticket/resource";
import { sendOrderNotification } from "../functions/send-order-notification/resource";
import { sendShipmentNotification } from "../functions/send-shipment-notification/resource";

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
    trackingNumber: a.string(), 
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

  GifteeMaster: a.model({
    type: a.string().required(),
    name: a.string().required(),
    pointCost: a.integer().required(),
    giftCode: a.string().required(),
    imageUrl: a.string(),
    isActive: a.boolean().default(true),
    brandProductId: a.string(),
    category: a.string(),
  }).authorization((allow) => [
    allow.authenticated().to(['read']),
    allow.group("Admins")
  ]),

  GiftOrder: a.model({
    userEmail: a.string().required(),
    giftId: a.id().required(),
    giftName: a.string().required(),
    pointSpent: a.integer().required(),
    dummyBalance: a.integer().default(300),
    orderSourceId: a.string(), 
    orderSourceName: a.string(),
    status: a.enum(['PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
    shippingName: a.string(),
    shippingZip: a.string(),
    shippingAddress: a.string(),
    shippingTel: a.string(),
    gifteeUrl: a.string(),
    gifteeOrderId: a.string(),
    trackingNumber: a.string(), 
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

  issueGifteeTicket: a
    .query()
    .arguments({
      brandProductId: a.string().required(),
      category: a.string(),
      point: a.integer(),
      userName: a.string(),
      userEmail: a.string().required(),
      giftName: a.string(),
      fromServiceName: a.string(),
      balanceAfter: a.integer(),
    })
    .returns(a.customType({
      success: a.boolean(),
      url: a.string(),
      orderId: a.string(),
      message: a.string(),
    }))
    .handler(a.handler.function(issueGifteeTicket))
    .authorization(allow => [allow.authenticated()]),

  sendOrderNotification: a
    .mutation()
    .arguments({
      userEmail: a.string().required(),
      giftName: a.string().required(),
      pointSpent: a.integer().required(),
      shippingName: a.string().required(),
      shippingZip: a.string().required(),
      shippingAddress: a.string().required(),
      shippingTel: a.string().required(),
      balanceBefore: a.integer(),
      balanceAfter: a.integer(),
      trackingNumber: a.string(),
      orderSourceName: a.string(), // 追加：引数として受け取れるように
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),
    }))
    .handler(a.handler.function(sendOrderNotification))
    .authorization(allow => [allow.authenticated()]),

  sendShipmentNotification: a
    .mutation()
    .arguments({
      userEmail: a.string().required(),
      giftName: a.string().required(),
      shippingName: a.string().required(),
      shippingZip: a.string(),
      shippingAddress: a.string(),
      shippingTel: a.string(),
      trackingNumber: a.string(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),
    }))
    .handler(a.handler.function(sendShipmentNotification))
    .authorization(allow => [allow.authenticated()]),

  // 追加：共通メール送信クエリ (テンプレート方式用)
  sendEmail: a
    .query()
    .arguments({
      to: a.string().required(),
      subject: a.string().required(),
      body: a.string().required(),
    })
    .returns(a.customType({
      success: a.boolean(),
      message: a.string(),
    }))
    .handler(a.handler.function(sendOrderNotification)) // 既存の送信関数を再利用
    .authorization(allow => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: { 
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: { expiresInDays: 30 } 
  },
});
