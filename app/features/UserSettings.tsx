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
    const svcMaster = services.find((s: any) => s.id === serviceId);
    const settings = JSON.parse(svcMaster?.connectionSettings || "{}");
    return { 
      settings, 
      type: svcMaster?.type,
      masterAuthKey: settings?.authKey,
      shopId: settings?.shopId 
    };
  };

  const fetchPoint = async (credential: any) => {
    if (credential.serviceName.includes("ダミー")) {
      setFetchedPoints(prev => ({ ...prev, [credential.id]: credential.dummyBalance ?? 0 }));
      return;
    }

    const info = getSvcInfo(credential.serviceId);
    setIsLoading(prev => ({ ...prev, [credential.id]: true }));
    try {
      const finalAuthKey = info.masterAuthKey || credential.password;
      const { data, errors } = await client.queries.getShopservePoints({
        accountId: credential.loginId,
        shopId: info.shopId,
        authKey: finalAuthKey
      });
      if (errors) throw new Error(errors[0].message);

      const res = typeof data === 'string' ? JSON.parse(data) : data;
      const latestBalance = res.point ?? res.points ?? 0;

      setFetchedPoints(prev => ({ ...prev, [credential.id]: latestBalance }));

      await client.models.UserServiceCredential.update({
        id: credential.id,
        dummyBalance: latestBalance
      });

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
    if (!targetLoginId || !targetPassword || (!isEditing && !selectedSvcId)) {
      return await showAlert("入力を確認してください");
    }

    if (!isEditing) {
      const isDuplicate = userCredentials.some(
        (c) => c.serviceId === selectedSvcId && c.loginId === targetLoginId
      );
      if (isDuplicate) return await showAlert("このIDは既に同じサービスで登録されています。");
    } else {
      const currentCred = userCredentials.find(c => c.id === isEditing);
      const isDuplicate = userCredentials.some(
        (c) => c.id !== isEditing && c.serviceId === currentCred?.serviceId && c.loginId === targetLoginId
      );
      if (isDuplicate) return await showAlert("このIDは既に同じサービスで登録されています。");
    }

    try {
      if (isEditing) {
        await client.models.UserServiceCredential.update({ id: isEditing, loginId: targetLoginId, password: targetPassword });
      } else {
        const svc = services.find((s: any) => s.id === selectedSvcId);
        await client.models.UserServiceCredential.create({ 
          userEmail, serviceId: selectedSvcId, serviceName: svc.name, 
          loginId: targetLoginId, password: targetPassword, dummyBalance: 300 
        });
      }
      resetForm();
    } catch (err) { 
      await showAlert("保存失敗"); 
    }
  };

  const resetForm = () => { setIsEditing(null); setSelectedSvcId(""); setTargetLoginId(""); setTargetPassword(""); };

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
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">ID: {c.loginId}</div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => fetchPoint(c)} className="text-slate-400 hover:text-slate-900 text-[10px] font-bold transition-colors">
                      {isLoading[c.id] ? "..." : "↻ 更新"}
                    </button>
                    <button onClick={() => {setIsEditing(c.id); setTargetLoginId(c.loginId);}} className="text-blue-500 hover:text-blue-700 text-[10px] font-bold">編集</button>
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
              placeholder="会員ID / ショップIDを入力" 
              autoComplete="one-time-code"
            />
            <input 
              type="password" 
              value={targetPassword} 
              onChange={(e) => setTargetPassword(e.target.value)} 
              className={`${styles.input} py-3 text-sm`} 
              placeholder="パスワード / API認証キーを入力" 
              autoComplete="new-password"
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
              placeholder="IDを修正" 
              autoComplete="off"
            />
            <input 
              type="password" 
              value={targetPassword} 
              onChange={(e) => setTargetPassword(e.target.value)} 
              className={`${styles.input} py-3 text-sm bg-white`} 
              placeholder="パスワードを修正" 
              autoComplete="new-password"
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
