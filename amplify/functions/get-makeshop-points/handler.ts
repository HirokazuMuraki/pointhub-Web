import { Schema } from "../../data/resource";

export const handler: Schema["getMakeshopPoints"]["functionHandler"] = async (event) => {
  const { mailaddress, memberId } = event.arguments;

  console.log("MakeShop GetPoints Start:", { mailaddress, memberId });

  const targetId = memberId || mailaddress;
  if (!targetId) {
    return { success: false, points: 0, message: "会員IDまたはメールアドレスが指定されていません。" };
  }

  // 認証キー（まずは動作テスト用に直接定義。後ほどDB管理へ統合可能）
  const accessToken = "PAT.dd32a5a83f8e679e50b6cc81f1fe1c62d89cd661928c63ee397869cb1f4c76a8";
  const apiKey = "5cdb498ce522ba02ac4bb81ce248f30571026d539a57b42508436145975e1b7e";
  const url = "https://stg-app-api.makeshop.jp/v1/graphql";

  const timestamp = Math.floor(Date.now() / 1000).toString();

  const queryText = `
    query searchMember($input: SearchMemberRequest!) {
      searchMember(input: $input) {
        members {
          memberId
          name
          email
          shopPoint
        }
      }
    }
  `;

  // 会員ID検索またはメールアドレス検索の条件設定
  const inputVariables = memberId 
    ? { memberId: memberId, page: 1, limit: 10 }
    : { email: mailaddress, page: 1, limit: 10 };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${accessToken}`,
        "content-type": "application/json",
        "x-api-key": apiKey,
        "x-timestamp": timestamp
      },
      body: JSON.stringify({
        query: queryText,
        variables: { input: inputVariables },
        operationName: "searchMember"
      })
    });

    const responseData = await response.json();
    console.log("MakeShop API Response Status:", response.status, "Body:", JSON.stringify(responseData));

    if (!response.ok || responseData.errors) {
      const errMsg = responseData.errors ? responseData.errors[0]?.message : `HTTP Error ${response.status}`;
      return { success: false, points: 0, message: `MakeShop APIエラー: ${errMsg}` };
    }

    const members = responseData.data?.searchMember?.members;
    if (!members || members.length === 0) {
      return { success: false, points: 0, message: "該当の会員が見つかりませんでした。" };
    }

    const targetMember = members[0];

    return {
      success: true,
      points: targetMember.shopPoint || 0,
      message: "会員情報の取得に成功しました"
    };

  } catch (error: any) {
    console.error("MakeShop Connection Error:", error.message);
    return { success: false, points: 0, message: `通信エラー: ${error.message}` };
  }
};
