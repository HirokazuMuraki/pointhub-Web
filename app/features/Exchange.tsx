import React, { useState } from "react";
import { syncPointToMakeShop } from "../services/MakeShopService";

export const ExchangeForm = ({ services, client, userEmail, onSuccess, styles }: any) => {
  const [fromSvc, setFromSvc] = useState("");
  const [toSvc, setToSvc] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExchange = async () => {
    if (!fromSvc || !toSvc || !amount) return alert("入力してください");
    
    setIsProcessing(true);
    try {
      // 1. MakeShop連携を実行 (外部API)
      const externalResult = await syncPointToMakeShop(userEmail, parseInt(amount));
      
      if (externalResult.success) {
        // 2. 外部連携が成功したら自社DBに記録
        await client.models.ExchangeTransaction.create({
          userEmail,
          fromServiceName: fromSvc,
          toServiceName: toSvc,
          amount: parseInt(amount),
          status: "COMPLETED",
          externalRefId: externalResult.refId // MakeShop側の受付IDを保存
        });

        alert(`交換成功！\nMakeShop伝票番号: ${externalResult.refId}`);
        setAmount("");
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
      <h2 className={styles.sectionTitle}>💎 ポイント交換</h2>
      <div className="space-y-4">
        <div>
          <label className={styles.label}>交換元サービス</label>
          <select value={fromSvc} onChange={(e) => setFromSvc(e.target.value)} className={styles.input}>
            <option value="">選択してください</option>
            {services.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={styles.label}>交換先サービス (MakeShop連携)</label>
          <select value={toSvc} onChange={(e) => setToSvc(e.target.value)} className={styles.input}>
            <option value="">選択してください</option>
            <option value="MakeShop">MakeShop ポイント</option>
          </select>
        </div>
        <div>
          <label className={styles.label}>交換ポイント数</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={styles.input} />
        </div>
        <button 
          onClick={handleExchange} 
          disabled={isProcessing}
          className={`w-full py-4 text-white font-black rounded-xl transition-all ${isProcessing ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isProcessing ? "外部サービス連携中..." : "交換を実行する"}
        </button>
      </div>
    </div>
  );
};
