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
    shippingTel,
    balanceBefore,
    balanceAfter,
    trackingNumber
  } = event.arguments;
  
  const SENDER_EMAIL = "ph-web@waq-up.com";

  if (!userEmail) {
    return { success: false, message: "User email is required." };
  }

  try {
    const subject = `【PointHub】ギフト交換申し込み受付のお知らせ（${giftName}）`;
    
    const bodyText = `${shippingName} 様

ギフトの交換申し込みを受け付けました！
商品の発送準備が整いましたら、改めてご連絡させていただきます。

■ お申し込み内容
・お問い合わせ番号：${trackingNumber || "---"}
・交換ギフト：${giftName}
・消費ポイント：${pointSpent?.toLocaleString()} ポイント

■ ポイント利用詳細:
・交換元ポイント：${balanceBefore?.toLocaleString() ?? "---"} ポイント
・　消費ポイント：${pointSpent?.toLocaleString() ?? "---"} ポイント
・　交換後の残高：${balanceAfter?.toLocaleString() ?? "---"} ポイント

■ お届け先情報
・お名前：${shippingName}
・郵便番号：${shippingZip}
・ご住所：${shippingAddress}
・電話番号：${shippingTel}

※お届け先情報に誤りがある場合は、速やかに事務局までご連絡ください。
※お問い合わせの際は、上記「お問い合わせ番号」をお伝えいただくとスムーズです。

--------------------------------------------------
本メールはシステムより自動送信されています。
ご利用ありがとうございました。
--------------------------------------------------`;

    await ses.send(new SendEmailCommand({
      Destination: { 
        ToAddresses: [userEmail],
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
