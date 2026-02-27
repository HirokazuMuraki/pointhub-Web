"use client";

import React, { useState, useEffect, useCallback } from "react";

export const PointExchange = ({ client, userEmail, styles, services, setActiveTab }: any) => {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [fromCredId, setFromCredId] = useState("");
  const [toCredId, setToCredId] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const getSvcInfo = useCallback((serviceId: string) => {
    const svcMaster = services.find((s: any) => s.id === serviceId);
    if (!svcMaster) return null;
    const settings = JSON.parse(svcMaster.connectionSettings || "{}");
    return { shopId: settings?.shopId, masterAuthKey: settings?.authKey };
  }, [services]);

  const syncToDB = useCallback(async (cred: any) => {
    if (!cred || cred.serviceName.includes("ダミー")) return;

    try {
      const info = getSvcInfo(cred.serviceId);
      if (!info?.shopId) return;

      const { data } = await client.queries.getShopservePoints({
        accountId: cred.loginId,
        shopId: info.shopId,
        authKey: info.masterAuthKey || cred.password,
      });

      if (data) {
        const res = typeof data === 'string' ? JSON.parse(data) : data;
        const latestBalance = res.point ?? res.points ?? 0;
        
        await client.models.UserServiceCredential.update({
          id: cred.id,
          dummyBalance: latestBalance
        });
        console.log(`${cred.serviceName} 同期完了: ${latestBalance}pt`);
      }
    } catch (e) {
      console.error("同期失敗:", e);
    }
  }, [client, getSvcInfo]);

  useEffect(() => {
    const sub = client.models.UserServiceCredential.observeQuery({ 
      filter: { userEmail: { eq: userEmail } } 
    }).subscribe({
      next: ({ items }: any) => {
        setCredentials([...items]);
        items.forEach((item: any) => {
          if (!item.serviceName.includes("ダミー")) syncToDB(item);
        });
      },
    });
    return () => sub.unsubscribe();
  }, [userEmail, client, syncToDB]);

  const handleExchange = async () => {
    const fromCred = credentials.find(c => c.id === fromCredId);
    const toCred = credentials.find(c => c.id === toCredId);
    const val = parseInt(amount);

    if (!val || val <= 0 || !fromCred || !toCred) return alert("入力内容を確認してください");
    if ((fromCred.dummyBalance || 0) < val) return alert(`残高不足です（現在: ${fromCred.dummyBalance || 0}pt）`);

    if (!confirm("交換を実行しますか？")) return;
    setIsProcessing(true);

    try {
      const targets = [{ cred: fromCred, op: -val }, { cred: toCred, op: val }];

      for (const t of targets) {
        if (!t.cred.serviceName.includes("ダミー")) {
          const info = getSvcInfo(t.cred.serviceId);
          await client.mutations.operateShopservePoints({
            accountId: t.cred.loginId,
            shopId: info?.shopId,
            authKey: info?.masterAuthKey || t.cred.password,
            amount: t.op,
            note: "PointHub"
          });
        }
        await client.models.UserServiceCredential.update({
          id: t.cred.id,
          dummyBalance: (t.cred.dummyBalance || 0) + t.op
        });
      }

      await client.models.ExchangeTransaction.create({
        userEmail, fromServiceName: fromCred.serviceName, toServiceName: toCred.serviceName, amount: val, status: "COMPLETED"
      });

      alert("交換完了！");
      setAmount("");
      if (setActiveTab) setActiveTab("history");
    } catch (e: any) {
      alert("エラー: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h3 className={`${styles.sectionTitle} mb-4`}>🔄 ポイント交換実行</h3>
      <div className="bg-slate-50 p-6 lg:p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-4 shadow-inner">
        <div>
          <label className={styles.label}>交換元 (FROM)</label>
          <select value={fromCredId} onChange={(e) => setFromCredId(e.target.value)} className={styles.input}>
            <option value="">サービスを選択</option>
            {credentials.map(c => (
              <option key={c.id} value={c.id}>{c.serviceName} ({c.dummyBalance ?? '---'} pt)</option>
            ))}
          </select>
        </div>
        <div>
          <label className={styles.label}>交換先 (TO)</label>
          <select value={toCredId} onChange={(e) => setToCredId(e.target.value)} className={styles.input}>
            <option value="">サービスを選択</option>
            {credentials.map(c => (
              <option key={c.id} value={c.id} disabled={c.id === fromCredId}>{c.serviceName} ({c.dummyBalance ?? '---'} pt)</option>
            ))}
          </select>
        </div>
        <div className="pt-2 border-t">
          <label className={styles.label}>交換数</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={styles.input} />
        </div>
        <button onClick={handleExchange} disabled={isProcessing} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl">
          {isProcessing ? "実行中..." : "交換を実行する"}
        </button>
      </div>
    </div>
  );
};
