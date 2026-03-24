import { Schema } from "../../data/resource";

export const handler: Schema["operateShopservePoints"]["functionHandler"] = async (event) => {
  const { accountId, shopId, authKey, amount, note } = event.arguments;

  console.log("ShopServe Operation Start:", { accountId, shopId, amount, note });

  if (!accountId || !shopId || !authKey || amount === undefined) {
    return { success: false, message: "必須パラメータ（ID, ShopID, Key, Amount）が不足しています。" };
  }

  const authHeader = Buffer.from(`${shopId}:${authKey}`).toString("base64");

  try {
    const response = await fetch(
      "https://management.api.shopserve.jp/v2/client/members-account/point/_operate",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account: accountId,
          operation_point: amount,
          note: note || "ギフト交換による減算"
        }),
      }
    );

    const responseText = await response.text();
    console.log("ShopServe API Response:", response.status, responseText);

    if (!response.ok) {
      return { 
        success: false, 
        message: `ShopServe APIエラー (${response.status}): ${responseText}` 
      };
    }

    return { success: true, message: "ShopServeポイント操作に成功しました" };
  } catch (error: any) {
    console.error("ShopServe Connection Error:", error.message);
    return { success: false, message: `通信エラー: ${error.message}` };
  }
};
