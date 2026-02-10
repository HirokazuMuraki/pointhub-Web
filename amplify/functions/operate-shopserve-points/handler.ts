import { Schema } from "../../data/resource";

export const handler: Schema["operateShopservePoints"]["functionHandler"] = async (event) => {
  const { accountId, shopId, authKey, amount, note } = event.arguments;
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
          note: note || "PointHub連携による操作"
        }),
      }
    );

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Shopserve Operation Error (${response.status}): ${responseText}`);
    }

    return { success: true, message: "ポイントを操作しました" };
  } catch (error: any) {
    console.error("Operation Error:", error.message);
    throw error;
  }
};
