import type { Schema } from "../../data/resource";

export const handler: Schema["issueGifteeTicket"]["functionHandler"] = async (event) => {
  const { brandProductId, category, point } = event.arguments;
  
  // 認証情報の型ガード: Cognito認証の場合のみ sub (ユーザーID) を取得
  let userId = "anonymous";
  if (event.identity && "sub" in event.identity) {
    userId = (event.identity as any).sub;
  }
  
  const WORKER_BASE_URL = "https://super-hat-1460.pointhub4giftee.workers.dev";
  
  // ① 重複発行防止：ユーザーIDとタイムスタンプを組み合わせる
  const issueIdentity = `order-${userId}-${Date.now()}`;
  
  const isBoxMode = (category === "giftee-box" || category === "box");
  
  let apiPath = "";
  let requestBody: any = { issue_identity: issueIdentity };

  if (isBoxMode) {
    apiPath = "/api/giftee_boxes";
    requestBody["giftee_box_config_code"] = brandProductId;
    requestBody["initial_point"] = Number(point);
  } else {
    apiPath = "/api/gift_cards";
    requestBody["gift_card_config_code"] = brandProductId;
  }

  try {
    const response = await fetch(`${WORKER_BASE_URL}${apiPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    
    // ② エラー時の詳細ログ出力
    if (!response.ok) {
      console.error("Giftee API Error Detail:", {
        status: response.status,
        statusText: response.statusText,
        responseBody: text,
        issueIdentity
      });
      throw new Error(`Giftee API Error: ${response.status} ${text}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`API Response is not JSON: ${text}`);
    }

    return {
      success: true,
      url: data.giftee_box?.url || data.gift_card?.url || "",
      orderId: issueIdentity,
      message: "Success"
    };
  } catch (error: any) {
    console.error("Lambda Error:", error);
    return { 
      success: false, 
      message: error.message, 
      url: "", 
      orderId: issueIdentity 
    };
  }
};
