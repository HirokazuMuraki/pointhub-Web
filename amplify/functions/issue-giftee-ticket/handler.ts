import type { Schema } from "../../data/resource";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";

export const handler: Schema["issueGifteeTicket"]["functionHandler"] = async (event) => {
  const { brandProductId, category, point } = event.arguments;
  
  const AUTH_HEADER = "Basic MjFhZDQ1NGQtODliOS00Y2E0LTg5OGUtMTljM2QwYWRjYzA5";
  const proxyUrl = "http://44.192.26.239:3128";
  const agent = new HttpsProxyAgent(proxyUrl);
  const issueIdentity = `order-${Date.now()}`;

  // 根本解決: フロントから届く category (DBのtype) が "giftee-box" なら Box モード
  const isBoxMode = (category === "giftee-box" || category === "box");
  
  let apiUrl = "";
  let requestBody: any = { issue_identity: issueIdentity };

  if (isBoxMode) {
    // --- Box用API ---
    apiUrl = "https://g4b.giftee.biz/api/giftee_boxes";
    requestBody["giftee_box_config_code"] = brandProductId;
    requestBody["initial_point"] = Number(point);
  } else {
    // --- Card用API ---
    apiUrl = "https://g4b.giftee.biz/api/gift_cards";
    requestBody["gift_card_config_code"] = brandProductId;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": AUTH_HEADER },
      body: JSON.stringify(requestBody),
      // @ts-ignore
      agent: agent
    });

    const data: any = await response.json();
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
