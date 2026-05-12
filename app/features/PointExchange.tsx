"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

export const PointExchange = ({ client, userEmail, styles, services, setActiveTab, generateTrackingNumber }: any) => {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [fromCredId, setFromCredId] = useState("");
  const [toCredId, setToCredId] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // カスタムドロップダウンの開閉状態
  const [isOpenFrom, setIsOpenFrom] = useState(false);
  const [isOpenTo, setIsOpenTo] = useState(false);

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

    if (!val || val < 1 || !fromCred || !toCred) {
      return alert("サービスを選択し、交換ポイント数を1以上で入力してください");
    }
    
    if ((fromCred.dummyBalance || 0) < val) {
      return alert(`残高不足です（現在: ${fromCred.dummyBalance || 0}pt）`);
    }

    if (!confirm("交換を実行しますか？")) return;
    setIsProcessing(true);

    try {
      const trackingNumber = generateTrackingNumber ? generateTrackingNumber() : `TX-${Date.now()}`;
      const fromBalanceAfter = (fromCred.dummyBalance || 0) - val;
      const toBalanceAfter = (toCred.dummyBalance || 0) + val;

      const targets = [
        { cred: fromCred, op: -val, newBal: fromBalanceAfter }, 
        { cred: toCred, op: val, newBal: toBalanceAfter }
      ];

      for (const t of targets) {
        if (!t.cred.serviceName.includes("ダミー")) {
          const info = getSvcInfo(t.cred.serviceId);
          await client.mutations.operateShopservePoints({
            accountId: t.cred.loginId,
            shopId: info?.shopId,
            authKey: info?.masterAuthKey || t.cred.password,
            amount: t.op,
            note: `PH-Exchange:${trackingNumber}`
          });
        }
        await client.models.UserServiceCredential.update({
          id: t.cred.id,
          dummyBalance: t.newBal
        });
      }

      await client.models.ExchangeTransaction.create({
        userEmail, 
        fromServiceName: fromCred.serviceName, 
        toServiceName: toCred.serviceName, 
        amount: val, 
        dummyBalance: fromBalanceAfter,
        status: "COMPLETED",
        trackingNumber
      });

      alert(`交換完了！\nお問い合わせ番号: ${trackingNumber}`);
      setAmount("");
      if (setActiveTab) setActiveTab("history");
    } catch (e: any) {
      alert("エラー: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // カスタムセレクトコンポーネント
  const CustomSelect = ({ value, onChange, placeholder, options, isOpen, setIsOpen, disabledId }: any) => {
    const selected = options.find((o: any) => o.id === value);
    return (
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`${styles.input} flex flex-col justify-center min-h-[60px] cursor-pointer bg-white relative pr-10`}
        >
          {selected ? (
            <>
              <div className="text-[11px] font-black text-slate-800">{selected.serviceName}</div>
              <div className="text-[10px] font-bold text-orange-500">{(selected.dummyBalance ?? 0).toLocaleString()} pts</div>
            </>
          ) : (
            <span className="text-slate-400 text-xs">{placeholder}</span>
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">▼</div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
            {options.map((c: any) => (
              <div 
                key={c.id}
                onClick={() => {
                  if (c.id !== disabledId) {
                    onChange(c.id);
                    setIsOpen(false);
                  }
                }}
                className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${c.id === disabledId ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-[11px] font-black text-slate-700">{c.serviceName}</div>
                <div className="text-[10px] font-bold text-slate-400">{(c.dummyBalance ?? 0).toLocaleString()} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h3 className={`${styles.sectionTitle} mb-4`}>🔄 ポイント交換実行</h3>
      <div className="bg-slate-50 p-6 lg:p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-4 shadow-inner">
        
        {/* 交換元 */}
        <div>
          <label className={styles.label}>交換元 (FROM)</label>
          <CustomSelect 
            value={fromCredId}
            onChange={setFromCredId}
            placeholder="サービスを選択"
            options={credentials}
            isOpen={isOpenFrom}
            setIsOpen={(val: boolean) => { setIsOpenFrom(val); setIsOpenTo(false); }}
          />
        </div>

        {/* 交換先 */}
        <div>
          <label className={styles.label}>交換先 (TO)</label>
          <CustomSelect 
            value={toCredId}
            onChange={setToCredId}
            placeholder="サービスを選択"
            options={credentials}
            isOpen={isOpenTo}
            setIsOpen={(val: boolean) => { setIsOpenTo(val); setIsOpenFrom(false); }}
            disabledId={fromCredId}
          />
        </div>

        <div className="pt-2 border-t">
          <label className={styles.label}>交換数</label>
          <input 
            type="number" 
            min="1" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            className={styles.input} 
            placeholder="1以上の数値を入力"
          />
        </div>

        <button 
          onClick={handleExchange} 
          disabled={isProcessing} 
          className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl transition-all hover:bg-orange-500 disabled:bg-slate-200"
        >
          {isProcessing ? "実行中..." : "交換を実行する"}
        </button>
      </div>
    </div>
  );
};
