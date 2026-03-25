/**
 * お問い合わせ番号生成: YYMMDD-ランダム英数字5文字
 * 例: 260324-A9B3X
 * * 読み間違いを防ぐため、混同しやすい文字 (0, 1, I, O) は除外しています。
 */
export const generateTrackingNumber = (): string => {
  const now = new Date();
  
  // YYMMDD 形式 (JST考慮が必要な場合はUTC+9に調整)
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const yy = String(jstNow.getUTCFullYear()).slice(-2);
  const mm = String(jstNow.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jstNow.getUTCDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;

  // ランダム5文字 (英数字) - 視認性の高い32文字を使用
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${datePart}-${randomPart}`;
};
