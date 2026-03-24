import type { Schema } from "../../data/resource";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "ap-northeast-1" });

export const handler: Schema["sendOrderNotification"]["functionHandler"] = async (event) => {
  const { 
    userEmail,
    giftName,
    pointSpent,
    shippingName,
    shippingZip,
    shippingAddress,
    shippingTel 
  } = event.arguments;
  
  const SENDER_EMAIL = "ph-web@waq-up.com";
  // const ADMIN_EMAIL = "ph-web@waq-up.com"; // 管理者用アドレス（現在は未使用）

  if (!userEmail) {
    return { success: false, message: "User email is required." };
  }

  try {
    const subject = `【PointHub】ギフト交換申し込み受付のお知らせ（${giftName}）`;
    
    const bodyText = `${shippingName} 様

ギフトの交換申し込みを受け付けました！
商品の発送準備が整いましたら、改めてご連絡させていただきます。

■ お申し込み内容
・交換ギフト：${giftName}
・消費ポイント：${pointSpent?.toLocaleString()} ポイント

■ お届け先情報
・お名前：${shippingName}
・郵便番号：${shippingZip}
・ご住所：${shippingAddress}
・電話番号：${shippingTel}

※お届け先情報に誤りがある場合は、速やかに事務局までご連絡ください。

--------------------------------------------------
本メールはシステムより自動送信されています。
ご利用ありがとうございました。
--------------------------------------------------`;

    // ユーザーのみにメールを送信
    await ses.send(new SendEmailCommand({
      Destination: { 
        ToAddresses: [userEmail],
        // CcAddresses: [ADMIN_EMAIL] // 管理者への通知は現在無効化
      },
      Message: {
        Body: { 
          Text: { 
            Data: bodyText 
          } 
        },
        Subject: { 
          Data: subject 
        },
      },
      Source: SENDER_EMAIL,
    }));

    return { success: true, message: "Notification email sent successfully." };
  } catch (error: any) {
    console.error("SES Send Error:", error);
    return { success: false, message: error.message };
  }
};
