import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: '【POINTHUB】アカウント登録の確認コード',
      verificationEmailBody: (code: () => string) => 
        `<html><body>` +
        `<p>POINTHUB へようこそ！</p>` +
        `<p>ご登録ありがとうございます。<br/>` +
        `以下の確認コードを入力して、アカウント作成を完了してください。</p>` +
        `<p><strong>確認コード: ${code()}</strong></p>` +
        `<br/>` +
        `<p><small>※このメールに心当たりがない場合は、無視していただいて問題ありません。</small></p>` +
        `</body></html>`,
    },
  },
  groups: ["Admins"],
});
