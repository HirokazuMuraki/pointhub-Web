import { MailType } from './types';

// 共通で使える定型パーツ
const SYSTEM_FOOTER_TEXT = `
\n※お問い合わせの際は、上記「お問い合わせ番号」を
　お伝えいただくとスムーズです。
--------------------------------------------
本メールはシステムより自動送信されています。
ご利用ありがとうございました。
--------------------------------------------`;

const SYSTEM_FOOTER_HTML = `
<div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ccc; font-size: 12px; color: #666;">
  <p>※お問い合わせの際は、上記「お問い合わせ番号」をお伝えいただくとスムーズです。</p>
  <p>--------------------------------------------<br>
  本メールはシステムより自動送信されています。<br>
  ご利用ありがとうございました。<br>
  --------------------------------------------</p>
</div>`;

export const MAIL_TEMPLATES: Record<MailType, { subject: string; text: string; html: string }> = {
  GIFT_ORDER: {
    subject: "【重要】ギフト交換を承りました（問合せ番号: {{trackingNumber}}）",
    text: `{{userName}} 様\n\nギフト交換の申請ありがとうございます。\n以下の内容で承りました。\n\n■　問合せ番号：{{trackingNumber}}\n■　　　交換先：{{toService}}\n■消費ポイント：{{points}} pt\n■　　　交換元：{{fromService}}\n■ポイント残高：{{balance}} pt\n\n発送まで今しばらくお待ちください。` + SYSTEM_FOOTER_TEXT,
    html: `
      <div style="font-family: 'MS Gothic', sans-serif; color: #333; line-height: 1.6;">
        <p>{{userName}} 様</p>
        <p>ギフト交換の申請ありがとうございます。<br>以下の内容で承りました。</p>
        <div style="background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; font-family: monospace; white-space: pre;">
■　問合せ番号：<strong>{{trackingNumber}}</strong>
■　　　交換先：{{toService}}
■消費ポイント：{{points}} pt
■　　　交換元：{{fromService}}
■ポイント残高：{{balance}} pt
        </div>
        <p>発送まで今しばらくお待ちください。</p>
      </div>` + SYSTEM_FOOTER_HTML
  },
  GIFT_SHIPPED: {
    subject: "【配送案内】ギフトの発送が完了しました（問合せ番号: {{trackingNumber}}）",
    text: `{{userName}} 様\n\nお待たせいたしました。\n交換いただいたギフトを発送いたしました。\n\n■　問合せ番号：{{trackingNumber}}\n■　　配送業者：{{deliveryCarrier}}\n■　送り状番号：{{deliveryId}}\n\n到着まで楽しみにお待ちください。` + SYSTEM_FOOTER_TEXT,
    html: `
      <div style="font-family: 'MS Gothic', sans-serif; color: #333; line-height: 1.6;">
        <p>{{userName}} 様</p>
        <p>大変お待たせいたしました。<br>交換いただいたギフトを発送いたしました。</p>
        <div style="background: #f0f9ff; padding: 15px; border: 1px solid #bae6fd; font-family: monospace; white-space: pre;">
■　問合せ番号：<strong>{{trackingNumber}}</strong>
■　　配送業者：{{deliveryCarrier}}
■　送り状番号：{{deliveryId}}
        </div>
        <p>到着まで楽しみにお待ちください。</p>
      </div>` + SYSTEM_FOOTER_HTML
  },
  GIFTEE_EXCHANGE: {
    subject: "【Giftee】ポイント交換完了のお知らせ（問合せ番号: {{trackingNumber}}）",
    text: `{{userName}} 様\n\nポイント交換（Giftee）が完了しました。\n以下の内容で承りました。\n\n■　問合せ番号：{{trackingNumber}}\n■　　　交換先：{{toService}}\n■消費ポイント：{{points}} pt\n■　　　交換元：{{fromService}}\n■ポイント残高：{{balance}} pt\n\n詳細はマイページの履歴よりご確認ください。` + SYSTEM_FOOTER_TEXT,
    html: `
      <div style="font-family: 'MS Gothic', sans-serif; color: #333; line-height: 1.6;">
        <p>{{userName}} 様</p>
        <p>Gifteeへのポイント交換が完了いたしました。<br>以下の内容で承りました。</p>
        <div style="background: #f0fff4; padding: 15px; border: 1px solid #c6f6d5; font-family: monospace; white-space: pre;">
■　問合せ番号：<strong>{{trackingNumber}}</strong>
■　　　交換先：{{toService}}
■消費ポイント：{{points}} pt
■　　　交換元：{{fromService}}
■ポイント残高：{{balance}} pt
        </div>
        <p>詳細はマイページの履歴よりご確認ください。</p>
      </div>` + SYSTEM_FOOTER_HTML
  }
};
