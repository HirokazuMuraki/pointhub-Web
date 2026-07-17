import { Schema } from "../../data/resource";

export const handler: Schema["getAppMembersPoints"]["functionHandler"] = async (event) => {
  const { mailaddress } = event.arguments;

  console.log("TEST-RUN: AppMembers GetPoints Start:", { mailaddress });

  if (!mailaddress) {
    return { success: false, points: 0, message: "メールアドレスが指定されていません。" };
  }

  // シークレットや環境変数を一切使用せず、動作確認のためにキーを直接ハードコードします
  const apiKey = "Twb01zqjqnp4g4b";

  try {
    const url = `https://api.apv.jp/api/Customer.php?id=${apiKey}&type=1&method=get&key=1&mailaddress=${encodeURIComponent(mailaddress)}`;
    console.log("TEST-RUN: Request URL created successfully.");

    const response = await fetch(url, { method: "GET" });
    const responseText = await response.text();
    
    console.log("TEST-RUN: API Response status:", response.status, "Body:", responseText);

    if (!response.ok) {
      return {
        success: false,
        points: 0,
        message: `アプリメンバーズ API接続エラー (${response.status})`
      };
    }

    if (!responseText || responseText.trim() === "") {
      return {
        success: false,
        points: 0,
        message: "APIからの応答が空です。APIキー、またはエンドポイントに問題があります。"
      };
    }

    const data = JSON.parse(responseText);

    if (data.result !== 1) {
      return {
        success: false,
        points: 0,
        message: data.failReason || "該当の会員が見つかりませんでした。"
      };
    }

    return {
      success: true,
      points: data.point || 0,
      message: "会員情報の取得に成功しました"
    };

  } catch (error: any) {
    console.error("TEST-RUN: Connection Error:", error.message);
    return { success: false, points: 0, message: `通信エラー: ${error.message}` };
  }
};
