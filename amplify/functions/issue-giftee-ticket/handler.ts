import type { Schema } from "../../data/resource";

export const handler: Schema["issueGifteeTicket"]["functionHandler"] = async (event) => {
  const { brandProductId } = event.arguments;
  
  // 記録用
  const AUTH_HEADER = "Basic MjFhZDQ1NGQtODliOS00Y2E0LTg5OGUtMTljM2QwYWRjYzA5";
  const apiUrl = "https://g4b.giftee.biz/api/gift_cards";

  console.log("Giftee Dummy Mode Start. BrandID:", brandProductId);

  try {
    // 疎通確認済みのため、通信部分はコメントアウト
    /*
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": AUTH_HEADER
      },
      body: JSON.stringify({
        gift_card_config_code: brandProductId,
        issue_identity: `order-${Date.now()}`
      })
    });
    */

    // テスト用のダミーURLを生成
    const dummyUrl = `https://example.com/dummy-ticket?id=${brandProductId}&t=${Date.now()}`;
    const dummyOrderId = `dummy-giftee-${Date.now()}`;

    console.log("Returning Dummy Response:", dummyUrl);

    // 明示的に構造を返却
    const result = {
      success: true,
      url: dummyUrl,
      orderId: dummyOrderId,
      message: "Success (Dummy Mode Enabled)"
    };

    return result;

  } catch (error: any) {
    console.error("Lambda Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal Lambda Error",
      url: "",
      orderId: ""
    };
  }
};
