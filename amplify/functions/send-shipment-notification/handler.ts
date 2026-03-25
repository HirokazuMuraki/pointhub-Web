import { Schema } from "../../data/resource";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "ap-northeast-1" });

export const handler: Schema["sendShipmentNotification"]["functionHandler"] = async (event) => {
  const { 
    userEmail, 
    giftName, 
    shippingName, 
    shippingZip, 
    shippingAddress, 
    shippingTel 
  } = event.arguments;

  const body = `
${shippingName} 様

いつもご利用いただきありがとうございます。
交換お申し込みいただいたギフトの発送が完了いたしました。

■ 発送ギフト
${giftName}

■ お届け先情報
・　お名前：${shippingName ?? "---"}
・郵便番号：${shippingZip ?? "---"}
・　ご住所：${shippingAddress ?? "---"}
・電話番号：${shippingTel ?? "---"}

商品の到着まで今しばらくお待ちください。
今後ともよろしくお願いいたします。

--------------------------------------------------
本メールはシステムより自動送信されています。
--------------------------------------------------
  `.trim();

  try {
    const command = new SendEmailCommand({
      Destination: { ToAddresses: [userEmail] },
      Message: {
        Body: { Text: { Data: body } },
        Subject: { Data: "【発送完了】ギフトをお送りしました" },
      },
      Source: "ph-web@waq-up.com", 
    });

    await ses.send(command);
    return { success: true, message: "発送完了メールを送信しました" };
  } catch (error: any) {
    console.error("Mail Send Error:", error);
    throw new Error(error.message || "メール送信に失敗しました");
  }
};
