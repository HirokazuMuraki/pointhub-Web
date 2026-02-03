import React, { useState } from "react";

export const ExchangeForm = ({ services, client, userEmail, onSuccess, styles }: any) => {
  const [fromService, setFromService] = useState("");
  const [toService, setToService] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const isSameService = fromService !== "" && toService !== "" && fromService === toService;

  const handleExchange = async () => {
    if (!fromService || !toService || isSameService || amount <= 0) return;
    
    try {
      await client.models.ExchangeTransaction.create({
        userEmail,
        fromServiceName: services.find((s: any) => s.id === fromService)?.name,
        toServiceName: services.find((s: any) => s.id === toService)?.name,
        amount,
        status: "SUCCESS"
      });
      onSuccess();
    } catch (err) {
      alert("交換処理に失敗しました");
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
      <h2 className={styles.sectionTitle}>🔄 ポイント交換</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={styles.label}>交換元</label>
          <select value={fromService} onChange={(e) => setFromService(e.target.value)} className={styles.input}>
            <option value="">選択</option>
            {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={styles.label}>交換先</label>
          <select 
            value={toService} 
            onChange={(e) => setToService(e.target.value)} 
            className={`${styles.input} ${isSameService ? "border-red-500 ring-4 ring-red-500/10" : ""}`}
          >
            <option value="">選択</option>
            {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      
      {isSameService && (
        <p className="mt-2 text-red-500 text-sm font-black animate-bounce">
          ⚠️ 同じサービスは選択できません。
        </p>
      )}

      <div className="mt-6">
        <label className={styles.label}>金額</label>
        <input 
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(Number(e.target.value))} 
          className={styles.input + " text-3xl font-black h-16"} 
        />
      </div>

      <button 
        disabled={!fromService || !toService || isSameService || amount <= 0} 
        onClick={handleExchange}
        className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl mt-6 shadow-xl shadow-blue-100 active:scale-95 disabled:bg-slate-200 transition-all"
      >
        交換を確定する
      </button>
    </div>
  );
};
