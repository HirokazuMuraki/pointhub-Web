import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  UserProfile: a
    .model({
      email: a.string().required(),
      name: a.string(),
      phoneNumber: a.string(),
      zipCode: a.string(),
      address: a.string(),
      pointBalance: a.integer().default(1000),
      role: a.string(),
      lineId: a.string(),
    })
    .authorization((allow) => [allow.owner()]), // guest() を一旦削除

  PointServiceMaster: a
    .model({
      companyName: a.string().required(),
      serviceName: a.string().required(),
      serviceType: a.enum(["POINT", "PRODUCT"]),
      isSelectable: a.boolean(),
      isActive: a.boolean(),
      logoUrl: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]), // publicApiKey() を authenticated() に変更
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
