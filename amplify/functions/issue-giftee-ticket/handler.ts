import type { Schema } from "../../data/resource";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { generateTrackingNumber } from "../utils/tracking";

const ses = new SESClient({ region: "ap-northeast-1" });

export const handler: Schema["issueGifteeTicket"]["functionHandler"] = async (event) => {
  const { 
    brandProductId, 
    category, 
    point, 
    userName, 
    userEmail,
    giftName,
    fromServiceName,
    balanceAfter
  } = event.arguments;
  
  const SENDER_EMAIL = "ph-web@waq-up.com";
  const displayName = userName ? `${userName} 様` : "お客様";
  const recipientEmail = userEmail;

  if (!recipientEmail) {
    return { success: false, message: "User email not identified.", url: "", orderId: "" };
  }

  const userId = (event.identity as any)?.sub || "anonymous";
  const WORKER_BASE_URL = "https://super-hat-1460.pointhub4giftee.workers.dev";
  const WORKER_TOKEN = "Exchange_Giftee_via_PointHub_2026";
  const issueIdentity = `order-${userId}-${Date.now()}`;
  
  // 【新規発行】問い合わせ番号を生成
  const trackingNumber = generateTrackingNumber();
  
  const isBoxMode = (category === "giftee-box" || category === "box");
  const apiPath = isBoxMode ? "/api/giftee_boxes" : "/api/gift_cards";

  try {
    const response = await fetch(`${WORKER_BASE_URL}${apiPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Pointhub-Token": WORKER_TOKEN },
      body: JSON.stringify({
        issue_identity: issueIdentity,
        [isBoxMode ? "giftee_box_config_code" : "gift_card_config_code"]: brandProductId,
        ...(isBoxMode && { initial_point: Number(point) })
      })
    });

    if (!response.ok) throw new Error(`Giftee API Error: ${response.status}`);
    const data: any = await response.json();
    const gifteeUrl = data.giftee_box?.url || data.gift_card?.url || "";

    try {
      const subject = "【PointHub】ギフトURL発行のお知らせ";
      const bodyText = `${displayName}

ギフトの交換が完了しました！以下のURLよりお受け取りください。

■ お問い合わせ番号: ${trackingNumber}

■ ギフト内容: ${giftName || brandProductId}

■ ギフト受取URL:
${gifteeUrl}

■ ポイント利用詳細:
・交換元ポイント：${fromServiceName || "不明"}
・　消費ポイント：${point?.toLocaleString()} ポイント
・　交換後の残高：${balanceAfter?.toLocaleString()} ポイント

ご利用ありがとうございました。`;

      await ses.send(new SendEmailCommand({
        Destination: { ToAddresses: [recipientEmail] },
        Message: {
          Body: { Text: { Data: bodyText } },
          Subject: { Data: subject },
        },
        Source: SENDER_EMAIL,
      }));
    } catch (mailError) {
      console.error("SES Mail Send Error:", mailError);
    }

    // フロントエンド側でこの trackingNumber を GiftOrder の作成（保存）に利用します
    return { 
      success: true, 
      url: gifteeUrl, 
      orderId: trackingNumber, // 戻り値の orderId も問い合わせ番号に合わせるか、別途 message 等で返す運用が可能です
      message: "Success" 
    };
  } catch (error: any) {
    console.error("Lambda Error:", error);
    return { success: false, message: error.message, url: "", orderId: issueIdentity };
  }
};
