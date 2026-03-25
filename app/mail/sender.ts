import { buildMail } from './builder';
import { MailType, MailData } from './types';

interface SendMailOptions {
  client: any;        // Amplify client 等
  to: string;         // 送信先メールアドレス
  type: MailType;     // どのテンプレートを使うか
  data: MailData;     // 埋め込みデータ
}

/**
 * メール送信共通関数
 */
export const sendSystemMail = async ({ client, to, type, data }: SendMailOptions) => {
  try {
    // 1. テンプレートにデータを流し込む
    const { subject, text, html } = buildMail(type, data);

    console.log(`[MailSender] Sending ${type} to ${to}...`);

    // 2. 送信実行 (Amplify / SES 連携)
    // ※ プロジェクトの SES 設定に合わせて関数名を調整してください
    const result = await client.queries.sendEmail({
      to: [to],
      subject,
      body: {
        text,
        html
      }
    });

    return { success: true, result };
  } catch (error) {
    console.error(`[MailSender] Failed to send email (${type}):`, error);
    return { success: false, error };
  }
};
