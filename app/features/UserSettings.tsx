"use client";

import React, { useState, useEffect } from "react";
import { useAlert } from "./AlertProvider";

export const UserSettings = ({ services, client, userEmail, styles }: any) => {
  const { showAlert, showConfirm } = useAlert();
  const [userCredentials, setUserCredentials] = useState<any[]>([]);
  const [fetchedPoints, setFetchedPoints] = useState<{ [key: string]: number | null }>({});
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  const [selectedSvcId, setSelectedSvcId] = useState("");
  const [targetLoginId, setTargetLoginId] = useState("");
  const [targetPassword, setTargetPassword] = useState("");

  useEffect(() => {
    const sub = client.models.UserServiceCredential.observeQuery({
      filter: { userEmail: { eq: userEmail } }
    }).subscribe({
      next: ({ items }: any) => setUserCredentials([...items]),
    });
    return () => sub.unsubscribe();
  }, [userEmail, client]);

  const getSvcInfo = (serviceId: string) => {
    const svcMaster = services.find((s: any) => String(s.id) === String(serviceId));
    const settings = JSON.parse(svcMaster?.connectionSettings || "{}");
    return { 
      settings, 
      type: svcMaster?.type,
      masterAuthKey: settings?.authKey,
      shopId: settings?.shopId 
    };
  };

  const isAppMembersService = (svcName: string) => {
    return svcName?.includes("アプリメンバーズ") === true;
  };

  // 安全にJSONをパースするヘルパー
  const safeJsonParse = (str: any) => {
    if (typeof str !== 'string') return str;
    if (!str || str.trim() === "") return null;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error("JSON parse error for value:", str, e);
      return null;
    }
  };

  const fetchPoint = async (credential: any) => {
    if (credential.serviceName.includes("ダミー")) {
      setFetchedPoints(prev => ({ ...prev, [credential.id]: credential.dummyBalance ?? 0 }));
      return;
    }

    setIsLoading(prev => ({ ...prev, [credential.id]: true }));
    try {
      if (isAppMembersService(credential.serviceName)) {
        const info = getSvcInfo(credential.serviceId);
        const { data, errors } = await client.queries.getAppMembersPoints({
          mailaddress: credential.loginId,
          shopId: info.shopId,
          authKey: info.masterAuthKey
        });
        if (errors) throw new Error(errors[0].message);

        console.log("アプリメンバーズ生レスポンスデータ:", data);

        const res = safeJsonParse(data);
        if (!res || (res.success !== undefined && !res.success)) {
          throw new Error(res?.message || "ポイント取得に失敗しました。レスポンスが空、または解析できません。");
        }

        const latestBalance = res.points ?? res.point ?? 0;
        setFetchedPoints(prev => ({ ...prev, [credential.id]: latestBalance }));

        await client.models.UserServiceCredential.update({
          id: credential.id,
          dummyBalance: latestBalance
        });
      } else {
        const info = getSvcInfo(credential.serviceId);
        const finalAuthKey = info.masterAuthKey || credential.password;
        const { data, errors } = await client.queries.getShopservePoints({
          accountId: credential.loginId,
          shopId: info.shopId,
          authKey: finalAuthKey
        });
        if (errors) throw new Error(errors[0].message);

        const res = safeJsonParse(data);
        if (!res) throw new Error("ショップサーブの認証レスポンスが解析できません。");
        
        const latestBalance = res.point ?? res.points ?? 0;

        setFetchedPoints(prev => ({ ...prev, [credential.id]: latestBalance }));

        await client.models.UserServiceCredential.update({
          id: credential.id,
          dummyBalance: latestBalance
        });
      }

    } catch (err: any) {
      console.error(err);
      await showAlert(`照会失敗: ${err.message}`);
    } finally {
      setIsLoading(prev => ({ ...prev, [credential.id]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm("この連携を解除しますか？");
    if (!ok) return;
    try {
      await client.models.UserServiceCredential.delete({ id });
      await showAlert("削除しました");
    } catch (err) { 
      await showAlert("削除失敗"); 
    }
  };

  const handleSaveCredential = async () => {
    const isAppMembers = isEditing 
      ? isAppMembersService(userCredentials.find(c => String(c.id) === String(isEditing))?.serviceName || "")
      : isAppMembersService(services.find((s: any) => String(s.id) === String(selectedSvcId))?.name || "");

    const passwordRequired = !isAppMembers;

    if (!targetLoginId || (passwordRequired && !targetPassword) || (!isEditing && !selectedSvcId)) {
      return await showAlert("入力を確認してください");
    }

    let svcIdToVerify = selectedSvcId;
    let svcNameToVerify = "";

    if (!isEditing) {
      const isDuplicate = userCredentials.some(
        (c) => String(c.serviceId) === String(selectedSvcId) && c.loginId === targetLoginId
      );
      if (isDuplicate) return await showAlert("このIDは既に同じサービスで登録されています。");
      
      const svc = services.find((s: any) => String(s.id) === String(selectedSvcId));
      svcNameToVerify = svc?.name || "";
    } else {
      const currentCred = userCredentials.find(c => String(c.id) === String(isEditing));
      const isDuplicate = userCredentials.some(
        (c) => String(c.id) !== String(isEditing) && String(c.serviceId) === String(currentCred?.serviceId) && c.loginId === targetLoginId
      );
      if (isDuplicate) return await showAlert("このIDは既に同じサービスで登録されています。");
      
      svcIdToVerify = currentCred?.serviceId || "";
      svcNameToVerify = currentCred?.serviceName || "";
    }

    let validatedInitialBalance = 300;

    if (!svcNameToVerify.includes("ダミー")) {
      try {
        if (isAppMembersService(svcNameToVerify)) {
          const info = getSvcInfo(svcIdToVerify);
          const { data, errors } = await client.queries.getAppMembersPoints({
            mailaddress: targetLoginId,
            shopId: info.shopId,
            authKey: info.masterAuthKey
          });

          if (errors && errors.length > 0) {
            throw new Error(errors[0].message);
          }

          console.log("アプリメンバーズ検証用生データ:", data);

          if (!data) {
            throw new Error("Amplify APIからの応答が空(null/undefined)です。AWS Lambda関数の実行エラーの可能性があります。");
          }

          const res = safeJsonParse(data);
          if (!res || (res.success !== undefined && !res.success)) {
            throw new Error(res?.message || "アプリメンバーズに登録されていないメールアドレスか、連携APIに異常があります。");
          }

          validatedInitialBalance = res.point ?? res.points ?? 0;
        } else {
          const info = getSvcInfo(svcIdToVerify);
          const finalAuthKey = info.masterAuthKey || targetPassword;
          const { data, errors } = await client.queries.getShopservePoints({
            accountId: targetLoginId,
            shopId: info.shopId,
            authKey: finalAuthKey
          });

          if (errors && errors.length > 0) {
            throw new Error(errors[0].message);
          }

          const res = safeJsonParse(data);
          if (!res || (res.success !== undefined && !res.success)) {
            throw new Error(res?.message || "認証レスポンスが不正です。");
          }

          validatedInitialBalance = res.point ?? res.points ?? 0;
        }
      } catch (authErr: any) {
        console.error("事前会員認証失敗詳細:", authErr);
        const errMsg = isAppMembersService(svcNameToVerify)
          ? `会員認証エラー: アプリメンバーズに登録されていないメールアドレスか、連携エラーが発生しました。\n(${authErr.message || "接続失敗"})`
          : `会員認証エラー: 会員IDまたはパスワードが正しくありません。\n(${authErr.message || "接続失敗"})`;
        return await showAlert(errMsg);
      }
    }

    try {
      if (isEditing) {
        const currentCred = userCredentials.find(c => String(c.id) === String(isEditing));
        const finalPassword = isAppMembers 
          ? "NO_PASSWORD_REQUIRED" 
          : (targetPassword || currentCred?.password || "");

        await client.models.UserServiceCredential.update({ 
          id: isEditing, 
          loginId: targetLoginId, 
          password: finalPassword,
          ...(!svcNameToVerify.includes("ダミー") ? { dummyBalance: validatedInitialBalance } : {})
        });
        
        if (!svcNameToVerify.includes("ダミー")) {
          setFetchedPoints(prev => ({ ...prev, [isEditing]: validatedInitialBalance }));
        }
      } else {
        const svc = services.find((s: any) => String(s.id) === String(selectedSvcId));
        const newCred = await client.models.UserServiceCredential.create({ 
          userEmail, 
          serviceId: selectedSvcId, 
          serviceName: svc.name, 
          loginId: targetLoginId, 
          password: isAppMembers ? "NO_PASSWORD_REQUIRED" : targetPassword, 
          dummyBalance: validatedInitialBalance 
        });

        if (newCred?.data?.id && !svc.name.includes("ダミー")) {
          setFetchedPoints(prev => ({ ...prev, [newCred.data.id]: validatedInitialBalance }));
        }
      }
      await showAlert("連携情報を保存しました。");
      resetForm();
    } catch (err) { 
      await showAlert("保存失敗"); 
    }
  };

  const resetForm = () => { setIsEditing(null); setSelectedSvcId(""); setTargetLoginId(""); setTargetPassword(""); };

  const activeSvcName = isEditing 
    ? (userCredentials.find(c => String(c.id) === String(isEditing))?.serviceName || "")
    : (services.find((s: any) => String(s.id) === String(selectedSvcId))?.name || "");

  const isAppMembersMode = isAppMembersService(activeSvcName);

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <h2 className={`${styles.sectionTitle} mb-4`}>🔗 連携済みサービス</h2>
        <div className="space-y-4">
          {userCredentials.map((c) => {
            let displayVal: any = "--";
            if (fetchedPoints[c.id] !== undefined) {
              displayVal = fetchedPoints[c.id];
            } else if (c.serviceName.includes("ダミー") || c.dummyBalance !== undefined) {
              displayVal = c.dummyBalance;
            }

            return (
              <div key={c.id} className="p-4 lg:p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="font-black text-slate-800 text-base">{c.serviceName}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                      {isAppMembersService(c.serviceName) ? "Mail" : "ID"}: {c.loginId}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => fetchPoint(c)} className="text-slate-400 hover:text-slate-900 text-[10px] font-bold transition-colors">
                      {isLoading[c.id] ? "..." : "↻ 更新"}
                    </button>
                    <button onClick={() => {setIsEditing(c.id); setTargetLoginId(c.loginId); setTargetPassword("");}} className="text-blue-500 hover:text-blue-700 text-[10px] font-bold">編集</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600 text-[10px] font-bold">削除</button>
                  </div>
                </div>
                
                <div className="bg-white py-3 px-5 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-orange-500">
                      {typeof displayVal === 'number' ? displayVal.toLocaleString() : displayVal}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 ml-1 italic">pt</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isEditing ? (
        <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h2 className={`${styles.sectionTitle} mb-4`}>➕ 新規連携を追加</h2>
          <div className="space-y-3">
            <select value={selectedSvcId} onChange={(e) => setSelectedSvcId(e.target.value)} className={`${styles.input} py-3 text-sm`}>
              <option value="">サービスを選択</option>
              {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input 
              value={targetLoginId} 
              onChange={(e) => setTargetLoginId(e.target.value)} 
              className={`${styles.input} py-3 text-sm`} 
              placeholder={isAppMembersMode ? "登録メールアドレスを入力" : "会員ID / ショップIDを入力"} 
              autoComplete="one-time-code"
            />
            <input 
              type="password" 
              value={isAppMembersMode ? "" : targetPassword} 
              onChange={(e) => setTargetPassword(e.target.value)} 
              className={`${styles.input} py-3 text-sm disabled:opacity-50`} 
              placeholder={isAppMembersMode ? "パスワード（不要・未入力可）" : "パスワード / API認証キーを入力"} 
              autoComplete="new-password"
              disabled={isAppMembersMode}
            />
            <button onClick={handleSaveCredential} className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl hover:bg-orange-500 transition-all text-xs uppercase tracking-widest">保存する</button>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 p-6 lg:p-8 rounded-[2rem] border border-blue-100 shadow-inner">
          <h2 className={`${styles.sectionTitle} mb-4`}>✎ 情報を修正</h2>
          <div className="space-y-3">
            <input 
              value={targetLoginId} 
              onChange={(e) => setTargetLoginId(e.target.value)} 
              className={`${styles.input} py-3 text-sm bg-white`} 
              placeholder={isAppMembersMode ? "登録メールアドレスを修正" : "IDを修正"} 
              autoComplete="off"
            />
            <input 
              type="password" 
              value={isAppMembersMode ? "" : targetPassword} 
              onChange={(e) => setTargetPassword(e.target.value)} 
              className={`${styles.input} py-3 text-sm bg-white disabled:opacity-50`} 
              placeholder={isAppMembersMode ? "パスワード（不要）" : "パスワードを修正"} 
              autoComplete="new-password"
              disabled={isAppMembersMode}
            />
            <div className="flex gap-2">
              <button onClick={handleSaveCredential} className="flex-1 py-3.5 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest">更新</button>
              <button onClick={resetForm} className="px-6 py-3.5 bg-white text-slate-400 font-black rounded-xl border border-slate-200 text-xs">戻る</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
