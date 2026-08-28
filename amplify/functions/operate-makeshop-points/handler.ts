import { Schema } from "../../data/resource";

export const handler: Schema["operateMakeshopPoints"]["functionHandler"] = async (event) => {
  const { mailaddress, memberId, amount, type, description } = event.arguments;

  console.log("MakeShop OperatePoints Start:", { mailaddress, memberId, amount, type, description });

  let targetMemberId = memberId;
  const inputMail = mailaddress;

  if (!targetMemberId && !inputMail) {
    return { success: false, message: "必須パラメータ（会員IDまたはメールアドレス）が不足しています。", totalValue: 0 };
  }

  if (amount === undefined || type === undefined) {
    return { success: false, message: "必須パラメータ（ポイント数, 操作区分）が不足しています。", totalValue: 0 };
  }

  const accessToken = "PAT.dd32a5a83f8e679e50b6cc81f1fe1c62d89cd661928c63ee397869cb1f4c76a8";
  const apiKey = "5cdb498ce522ba02ac4bb81ce248f30571026d539a57b42508436145975e1b7e";
  const url = "https://stg-app-api.makeshop.jp/v1/graphql";

  const getHeaders = () => {
    const timestampSec = Math.floor(Date.now() / 1000).toString();
    return {
      "authorization": `Bearer ${accessToken}`,
      "content-type": "application/json",
      "x-api-key": apiKey,
      "x-timestamp": timestampSec
    };
  };

  // 1. 現在のポイント残高取得（兼 メールアドレスからの memberId 補完）
  let currentShopPoint = 0;
  const isEmailFormat = (str?: string) => str && str.includes("@");

  const searchQuery = `
    query searchMember($input: SearchMemberRequest!) {
      searchMember(input: $input) {
        members {
          memberId
          email
          shopPoint
        }
      }
    }
  `;

  try {
    const searchInput: Record<string, any> = { page: 1, limit: 10 };
    if (targetMemberId && !isEmailFormat(targetMemberId)) {
      searchInput.memberId = targetMemberId;
    } else {
      searchInput.email = inputMail || targetMemberId;
    }

    console.log("Searching MakeShop member info with:", searchInput);

    const searchRes = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        query: searchQuery,
        variables: { input: searchInput },
        operationName: "searchMember"
      })
    });

    const searchData = await searchRes.json();
    const members = searchData.data?.searchMember?.members;

    if (!members || members.length === 0) {
      return { success: false, message: "該当する MakeShop 会員が見つかりませんでした。", totalValue: 0 };
    }

    targetMemberId = members[0].memberId;
    currentShopPoint = members[0].shopPoint ?? 0;
    console.log(`Resolved Member: ID=${targetMemberId}, CurrentPoint=${currentShopPoint}`);

  } catch (searchErr: any) {
    console.error("MakeShop Member Search Error:", searchErr.message);
    return { success: false, message: `会員情報取得エラー: ${searchErr.message}`, totalValue: 0 };
  }

  // 2. 加減算ロジックの計算
  // type が "ADD", "PLUS", 1 などの場合は加算、それ以外（"USE", "SUBTRACT", -1 など）は減算
  const isAdd = String(type).toUpperCase() === "ADD" || String(type).toUpperCase() === "PLUS" || type === 1;
  const pointDelta = Math.abs(Number(amount));
  
  let updatedPoint = isAdd ? currentShopPoint + pointDelta : currentShopPoint - pointDelta;

  // 残高不足チェック（マイナス残高を許可しない場合）
  if (updatedPoint < 0) {
    return {
      success: false,
      message: `ポイント残高が不足しています。（現在残高: ${currentShopPoint}pt, 利用要求: ${pointDelta}pt）`,
      totalValue: currentShopPoint
    };
  }

  // 3. ポイントの上書き更新 (UpdateMemberShopPoint)
  const updateMutation = `
    mutation UpdateMemberShopPoint($input: UpdateMemberShopPointRequest!) {
      updateMemberShopPoint(input: $input) {
        results {
          memberId
          message
        }
      }
    }
  `;

  try {
    console.log(`Updating MakeShop Point: Member=${targetMemberId}, NewPoint=${updatedPoint}`);

    const updateRes = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        query: updateMutation,
        variables: {
          input: {
            shopPoints: [
              {
                memberId: targetMemberId,
                point: updatedPoint,
                comment: description || (isAdd ? "ポイント付与" : "ポイント利用")
              }
            ]
          }
        },
        operationName: "UpdateMemberShopPoint"
      })
    });

    const updateData = await updateRes.json();

    if (updateData.errors && updateData.errors.length > 0) {
      console.error("MakeShop Point Update GraphQL Errors:", updateData.errors);
      return {
        success: false,
        message: `ポイント更新エラー: ${updateData.errors[0].message}`,
        totalValue: currentShopPoint
      };
    }

    const result = updateData.data?.updateMemberShopPoint?.results?.[0];

    return {
      success: true,
      message: `MakeShop ポイント更新成功（変更後残高: ${updatedPoint}pt）`,
      totalValue: updatedPoint
    };

  } catch (updateErr: any) {
    console.error("MakeShop Point Update Exception:", updateErr.message);
    return { success: false, message: `ポイント更新処理例外: ${updateErr.message}`, totalValue: currentShopPoint };
  }
};
