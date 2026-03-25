export type MailType = 'GIFT_ORDER' | 'GIFT_SHIPPED' | 'GIFTEE_EXCHANGE';

export interface MailData {
  userName: string;
  trackingNumber: string; // 問合せ番号
  fromService: string;    // 交換元（例：○○ポイント）
  toService: string;      // 交換先（例：Amazonギフト、Giftee等）
  points: number;         // 消費ポイント
  balance: number;        // ポイント残高
  // 発送時のみ使用
  deliveryCarrier?: string; 
  deliveryId?: string;
}
