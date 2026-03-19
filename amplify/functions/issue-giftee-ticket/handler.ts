import type { Schema } from "../../data/resource";

export const handler: Schema["issueGifteeTicket"]["functionHandler"] = async (event) => {
  const { brandProductId, category, point } = event.arguments;
  
  // 更新された Cloudflare Worker のエンドポイント
  const WORKER_BASE_URL = "https://super-hat-1460.pointhub4giftee.workers.dev";
  
  const issueIdentity = `order-${Date.now()}`;
  const isBoxMode = (category === "giftee-box" || category === "box");
  
  let apiPath = "";
  let requestBody: any = { issue_identity: issueIdentity };

  if (isBoxMode) {
    // --- Box用パス ---
    apiPath = "/api/giftee_boxes";
    requestBody["giftee_box_config_code"] = brandProductId;
    requestBody["initial_point"] = Number(point);
  } else {
    // --- Card用パス ---
    apiPath = "/api/gift_cards";
    requestBody["gift_card_config_code"] = brandProductId;
  }

  try {
    // Cloudflare Worker 経由で Giftee API を叩く
    const response = await fetch(`${WORKER_BASE_URL}${apiPath}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
        // Authorization は Worker 側で付与・上書きされる設定のためここでは省略可能
      },
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`API Response is not JSON: ${text}`);
    }

    if (!response.ok) throw new Error(`API Error: ${JSON.stringify(data)}`);

    return {
      success: true,
      url: data.giftee_box?.url || data.gift_card?.url || "",
      orderId: issueIdentity,
      message: "Success"
    };
  } catch (error: any) {
    console.error("Lambda Error:", error);
    return { success: false, message: error.message, url: "", orderId: "" };
  }
};
