import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'giftStorage',
  access: (allow) => ({
    'public/*': [
      // 管理者はフルアクセス
      allow.groups(['Admins']).to(['read', 'write', 'delete']),
      // 一般ユーザー（ログイン済）は読み取り可能、自分のファイルは書き込み可能
      allow.authenticated.to(['read']),
      // 必要であれば、未ログインユーザーにも読み取りを許可（Webサイト等で表示する場合）
      allow.guest.to(['read'])
    ],
  })
});
