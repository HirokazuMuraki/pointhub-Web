/**
 * MakeShop API 連携用サービス (スタブ)
 * 実際にはブラウザから直接叩くとCORSエラーやセキュリティリスクがあるため、
 * 最終的には AWS Lambda に移行するロジックの雛形です。
 */

const MAKESHOP_DUMMY_CONFIG = {
  shopId: "DUMMY_SHOP_ID",
  apiKey: "DUMMY_API_KEY",
  endpoint: "https://api.makeshop.jp/v1/points/update" // ドキュメントに基づくエンドポイント
};

export const syncPointToMakeShop = async (targetUserEmail: string, amount: number) => {
  console.log(`[MakeShop連携開始] 対象: ${targetUserEmail}, 金額: ${amount}`);

  // --- 将来的に本物のAPIを叩くコード ---
  // const response = await fetch(MAKESHOP_DUMMY_CONFIG.endpoint, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-makeshop-shop-id': MAKESHOP_DUMMY_CONFIG.shopId,
  //     'Authorization': `Bearer ${MAKESHOP_DUMMY_CONFIG.apiKey}`
  //   },
  //   body: JSON.stringify({
  //     member_id: targetUserEmail, // MakeShop側の会員IDに合わせる
  //     point: amount,
  //     type: 'add' // 付与
  //   })
  // });
  // ----------------------------------

  // 現時点では1秒待って成功を返す疑似処理
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 成功シミュレーション
  return {
    success: true,
    message: "MakeShopポイント連携完了",
    refId: "MS-" + Math.random().toString(36).substr(2, 9).toUpperCase()
  };
};
