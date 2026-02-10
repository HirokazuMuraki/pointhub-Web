import { Schema } from "../../data/resource";

export const handler: Schema["getShopservePoints"]["functionHandler"] = async (event) => {
  const { accountId, shopId, authKey } = event.arguments;

  // 1. Basic認証ヘッダーの作成
  const authHeader = Buffer.from(`${shopId}:${authKey}`).toString("base64");

  try {
    const url = `https://management.api.shopserve.jp/v2/client/members-account/point?account=${encodeURIComponent(accountId)}`;
    
    console.log("Requesting Shopserve API:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    console.log(`Shopserve Response [${response.status}]:`, responseText);

    if (!response.ok) {
      // ステータスコードに応じたエラーメッセージ
      if (response.status === 401) throw new Error("認証エラー: ショップIDまたは認証キーが間違っています");
      if (response.status === 404) throw new Error("会員が見つかりません: IDを確認してください");
      throw new Error(`Shopserve API Error (${response.status}): ${responseText}`);
    }

    const data = JSON.parse(responseText);
    return {
      points: data.point?.valid_point ?? 0,
      expire: data.point?.expire ?? "",
    };
  } catch (error: any) {
    console.error("Lambda Handler Error:", error.message);
    throw error;
  }
};
