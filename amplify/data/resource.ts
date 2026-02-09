import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  // 1. ユーザープロフィール
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
    allow.authenticated()
  ]),

  // 2. 外部サービス接続マスタ（管理者設定用）
  ServiceMaster: a.model({
    name: a.string().required(),      // 例: MakeShop本店
    type: a.string().required(),      // 例: MAKESHOP
    endpointUrl: a.url(),             // API接続先
    status: a.string(),               // ACTIVE, MAINTENANCEなど
    connectionSettings: a.string(),   // JSON形式で後から何でも入れられる袋
    description: a.string(),          // 備考
  }).authorization((allow) => [
    allow.authenticated()
  ]),

  // 3. ユーザーの接続資格情報（一般利用者用）
  UserServiceCredential: a.model({
    userEmail: a.string().required(),
    serviceId: a.string().required(),
    serviceName: a.string(),
    loginId: a.string().required(),
    password: a.string().required(),
    status: a.string(),
  }).authorization((allow) => [
    allow.owner(),
    allow.authenticated().to(['read'])
  ]),

  // 4. 交換履歴・トランザクション
  ExchangeTransaction: a.model({
    userEmail: a.string().required(),
    fromServiceName: a.string(),
    toServiceName: a.string(),
    amount: a.integer().required(),
    status: a.string(),
    errorMessage: a.string(),
  }).authorization((allow) => [
    allow.authenticated()
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
