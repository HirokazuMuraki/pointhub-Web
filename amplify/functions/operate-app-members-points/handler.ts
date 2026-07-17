import { Schema } from "../../data/resource";

export const handler: Schema["operateAppMembersPoints"]["functionHandler"] = async (event) => {
  const { mailaddress, amount, type, description } = event.arguments;

  console.log("TEST-RUN: AppMembers Operation Start:", { mailaddress, amount, type, description });

  if (!mailaddress || amount === undefined || !type) {
    return { success: false, message: "必須パラメータ（メールアドレス, 金額, 区分）が不足しています。", totalValue: 0 };
  }

  // シークレットや環境変数を一切使用せず、動作確認のためにキーを直接ハードコードします
  const apiKey = "Twb01zqjqnp4g4b";

  try {
    // 添付PDF「2_ポイント加算減算」の仕様に沿ってAPIにリクエスト
    const note = description || (type === 1 ? "POINTHUBからのポイント加算" : "POINTHUBへのポイント減算");
    const url = `https://api.apv.jp/api/Unit.php?id=${apiKey}&unit=1&type=${type}&method=get&key=1&mailaddress=${encodeURIComponent(mailaddress)}&value=${amount}&description=${encodeURIComponent(note)}`;
    console.log("TEST-RUN: Operation URL created successfully.");

    const response = await fetch(url, { method: "GET" });
    const responseText = await response.text();
    
    console.log("TEST-RUN: AppMembers Point API Response Status:", response.status, "Body:", responseText);

    if (!response.ok) {
      return {
        success: false,
        message: `アプリメンバーズ API接続エラー (${response.status})`,
        totalValue: 0
      };
    }

    if (!responseText || responseText.trim() === "") {
      return {
        success: false,
        message: "APIからの応答が空です。APIキー、またはエンドポイントに問題があります。",
        totalValue: 0
      };
    }

    const data = JSON.parse(responseText);

    // PDF仕様: result=1 (成功), totalValue=最新合計ポイント
    if (data.result !== 1) {
      return {
        success: false,
        message: data.failReason || "ポイントの更新処理に失敗しました。",
        totalValue: 0
      };
    }

    return {
      success: true,
      message: "ポイント更新に成功しました",
      totalValue: data.totalValue || 0
    };

  } catch (error: any) {
    console.error("TEST-RUN: AppMembers Operation Connection Error:", error.message);
    return { success: false, message: `通信エラー: ${error.message}`, totalValue: 0 };
  }
};
