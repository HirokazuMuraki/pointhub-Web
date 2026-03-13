import type { Schema } from "../../data/resource";

export const handler: Schema["issueGifteeTicket"]["functionHandler"] = async (event) => {
  const { brandProductId } = event.arguments;
  
  // 設定変更せず、記録として残す
  const AUTH_HEADER = "Basic MjFhZDQ1NGQtODliOS00Y2E0LTg5OGUtMTljM2QwYWRjYzA5";
  const apiUrl = "https://g4b.giftee.biz/api/gift_cards";

  console.log("Giftee Dummy Mode Start. BrandID:", brandProductId);

  try {
    /* // 疎通確認済みのため、通信部分はコメントアウト
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
    const resData: any = await response.json().catch(() => ({}));
    */

    // テスト用のダミーURLを生成（履歴画面でクリックして遷移を確認できます）
    const dummyUrl = `https://example.com/dummy-ticket?id=${brandProductId}&t=${Date.now()}`;
    const dummyOrderId = `dummy-giftee-${Date.now()}`;

    console.log("Returning Dummy Response:", dummyUrl);

    // スキーマの戻り値型に厳密に合わせる
    return {
      success: true,
      url: dummyUrl,
      orderId: dummyOrderId,
      message: "Success (Dummy Mode Enabled)"
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Lambda Runtime Error: ${error.message}`,
      url: "",
      orderId: ""
    };
  }
};
