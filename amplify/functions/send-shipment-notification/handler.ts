import { Schema } from "../../data/resource";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "ap-northeast-1" });

export const handler: Schema["sendShipmentNotification"]["functionHandler"] = async (event) => {
  const { userEmail, giftName, shippingName } = event.arguments;

  const body = `
${shippingName} 様

いつもご利用いただきありがとうございます。
交換お申し込みいただいたギフトの発送が完了いたしました。

■発送ギフト
${giftName}

商品の到着まで今しばらくお待ちください。
今後ともよろしくお願いいたします。
  `.trim();

  try {
    const command = new SendEmailCommand({
      Destination: { ToAddresses: [userEmail] },
      Message: {
        Body: { Text: { Data: body } },
        Subject: { Data: "【発送完了】ギフトをお送りしました" },
      },
      // ↓ ここをSESで検証済みのメールアドレスに必ず書き換えてください
      Source: "ph-web@waq-up.com", 
    });

    await ses.send(command);
    return { success: true, message: "発送完了メールを送信しました" };
  } catch (error: any) {
    console.error("Mail Send Error:", error);
    // クライアント側にエラーを投げる
    throw new Error(error.message || "メール送信に失敗しました");
  }
};
