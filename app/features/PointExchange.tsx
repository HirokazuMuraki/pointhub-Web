"use client";

import React, { useState, useEffect } from "react";

export const PointExchange = ({ client, userEmail, styles, services, setActiveTab }: any) => {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [fromCredId, setFromCredId] = useState("");
  const [toCredId, setToCredId] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const getSvcInfo = (serviceId: string) => {
    const svcMaster = services.find((s: any) => s.id === serviceId);
    const settings = JSON.parse(svcMaster?.connectionSettings || "{}");
    return { 
      type: svcMaster?.type,
      masterAuthKey: settings?.authKey,
      shopId: settings?.shopId 
    };
  };

  useEffect(() => {
    const sub = client.models.UserServiceCredential.observeQuery({ 
      filter: { userEmail: { eq: userEmail } } 
    }).subscribe({
      next: async ({ items }: any) => {
        setCredentials([...items]);

        // 画面表示時、外部サービスの最新残高を非同期で取得してDBを自動同期する
        for (const item of items) {
          if (!item.serviceName.includes("ダミー")) {
            try {
              const info = getSvcInfo(item.serviceId);
              const { data: balanceData } = await client.queries.getShopservePoints({
                accountId: item.loginId,
                shopId: info.shopId,
                authKey: info.masterAuthKey || item.password,
              });
              
              if (balanceData) {
                const currentBalance = JSON.parse(balanceData).point;
                // 現在のDB値と異なる場合のみ更新（無限ループ防止）
                if (item.dummyBalance !== currentBalance) {
                  await client.models.UserServiceCredential.update({
                    id: item.id,
                    dummyBalance: currentBalance
                  });
                }
              }
            } catch (e) {
              console.error("バックグラウンド残高同期エラー:", item.serviceName, e);
            }
          }
        }
      },
    });
    return () => sub.unsubscribe();
  }, [userEmail, client, services]);

  const handleExchange = async () => {
    const exchangeAmount = parseInt(amount);
    const fromCred = credentials.find(c => c.id === fromCredId);
    const toCred = credentials.find(c => c.id === toCredId);

    if (!exchangeAmount || exchangeAmount <= 0) return alert("金額を入力してください");
    if (!fromCred || !toCred || fromCredId === toCredId) return alert("サービスを正しく選択してください");

    if ((fromCred.dummyBalance || 0) < exchangeAmount) {
      return alert(`残高が不足しています（現在の残高: ${fromCred.dummyBalance || 0}pt）`);
    }

    if (!confirm(`${fromCred.serviceName} から ${toCred.serviceName} へ\n${exchangeAmount}ポイントを交換します。よろしいですか？`)) return;
    
    setIsProcessing(true);

    try {
      // 1. 減算処理
      let newFromBalance = (fromCred.dummyBalance || 0) - exchangeAmount;
      if (!fromCred.serviceName.includes("ダミー")) {
        const info = getSvcInfo(fromCred.serviceId);
        const { errors } = await client.mutations.operateShopservePoints({
          accountId: fromCred.loginId,
          shopId: info.shopId,
          authKey: info.masterAuthKey || fromCred.password,
          amount: -exchangeAmount,
          note: "PointHub: 出庫"
        });
        if (errors) throw new Error(errors[0].message);
      }
      await client.models.UserServiceCredential.update({
        id: fromCred.id,
        dummyBalance: newFromBalance
      });

      // 2. 加算処理
      let newToBalance = (toCred.dummyBalance || 0) + exchangeAmount;
      if (!toCred.serviceName.includes("ダミー")) {
        const info = getSvcInfo(toCred.serviceId);
        const { errors } = await client.mutations.operateShopservePoints({
          accountId: toCred.loginId,
          shopId: info.shopId,
          authKey: info.masterAuthKey || toCred.password,
          amount: exchangeAmount,
          note: "PointHub: 入庫"
        });
        if (errors) throw new Error(errors[0].message);
      }
      await client.models.UserServiceCredential.update({
        id: toCred.id,
        dummyBalance: newToBalance
      });

      // 3. 取引履歴の作成
      await client.models.ExchangeTransaction.create({
        userEmail,
        fromServiceName: fromCred.serviceName,
        toServiceName: toCred.serviceName,
        amount: exchangeAmount,
        status: "COMPLETED"
      });

      alert("ポイント交換が完了しました！");
      setAmount("");
      setFromCredId("");
      setToCredId("");
      if (setActiveTab) setActiveTab("history");
      
    } catch (err: any) {
      console.error(err);
      alert("交換処理中にエラーが発生しました: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h3 className={`${styles.sectionTitle} mb-4`}>🔄 ポイント交換実行</h3>
      
      <div className="bg-slate-50 p-6 lg:p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-4 relative overflow-hidden shadow-inner">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl">🔄</div>

        <div>
          <label className={`${styles.label} mb-1.5`}>交換元 (FROM)</label>
          <select 
            value={fromCredId} 
            onChange={(e) => {
              const val = e.target.value;
              setFromCredId(val);
              if (val === toCredId) setToCredId("");
            }} 
            className={`${styles.input} bg-white py-3`}
          >
            <option value="">サービスを選択してください</option>
            {credentials.map(c => (
              <option key={c.id} value={c.id}>
                {c.serviceName} {c.dummyBalance !== null ? `(${c.dummyBalance} pt)` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center -my-2 relative z-10">
          <div className="bg-white w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center shadow-md transition-transform hover:scale-110">
            <span className="text-orange-500 text-xl font-black rotate-90">➜</span>
          </div>
        </div>

        <div>
          <label className={`${styles.label} mb-1.5`}>交換先 (TO)</label>
          <select 
            value={toCredId} 
            onChange={(e) => setToCredId(e.target.value)} 
            className={`${styles.input} bg-white py-3`}
          >
            <option value="">サービスを選択してください</option>
            {credentials.map(c => (
              <option 
                key={c.id} 
                value={c.id}
                disabled={c.id === fromCredId}
              >
                {c.serviceName} {c.id === fromCredId ? '(選択中)' : (c.dummyBalance !== null ? `(${c.dummyBalance} pt)` : '')}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <label className={`${styles.label} mb-1.5`}>交換ポイント数</label>
          <div className="relative">
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              className={`${styles.input} bg-white pr-16 text-2xl font-black text-slate-900 py-3`}
              placeholder="0"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 italic">PTS</span>
          </div>
        </div>

        <div className="pt-2">
          <button 
            onClick={handleExchange} 
            disabled={isProcessing}
            className={`w-full py-4 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-3 ${
              isProcessing ? "bg-slate-400" : "bg-slate-900 hover:bg-orange-500 active:scale-95 shadow-orange-500/10"
            }`}
          >
            {isProcessing ? (
              <>
                <span className="animate-spin text-xl">⏳</span>
                <span>処理中...</span>
              </>
            ) : (
              <>
                <span className="text-xl">🚀</span>
                <span>交換を実行する</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
