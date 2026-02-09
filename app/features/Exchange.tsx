import React, { useState } from "react";

export const ExchangeForm = ({ 
  services, 
  client, 
  userEmail, 
  onSuccess, 
  styles 
}: any) => {
  const [fromService, setFromService] = useState("");
  const [toService, setToService] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 交換元と交換先が同じにならないように、交換先の選択肢をフィルタリング
  const availableToServices = services.filter((s: any) => s.name !== fromService);

  const handleExchange = async () => {
    if (!fromService || !toService || !amount) {
      alert("すべての項目を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      await client.models.ExchangeTransaction.create({
        userEmail: userEmail,
        fromServiceName: fromService,
        toServiceName: toService,
        amount: parseInt(amount),
        status: "PENDING",
      });
      alert("交換申請を受け付けました。");
      setAmount("");
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("交換申請に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
      
      <h3 className={styles.sectionTitle}>
        <span className="bg-blue-600 text-white p-2 rounded-lg text-sm">STEP 1</span>
        ポイントを交換する
      </h3>

      <div className="space-y-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-6">
          {/* 交換元サービス */}
          <div>
            <label className={styles.label}>交換元サービス</label>
            <select 
              value={fromService} 
              onChange={(e) => {
                setFromService(e.target.value);
                if (e.target.value === toService) setToService(""); // 重複回避
              }}
              className={styles.input}
            >
              <option value="">選択してください</option>
              {services.map((s: any) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 交換先サービス */}
          <div>
            <label className={styles.label}>交換先サービス</label>
            <select 
              value={toService} 
              onChange={(e) => setToService(e.target.value)}
              className={styles.input}
              disabled={!fromService}
            >
              <option value="">選択してください</option>
              {availableToServices.map((s: any) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            {!fromService && <p className="text-[10px] text-blue-400 ml-2">※先に交換元を選択してください</p>}
          </div>
        </div>

        <div>
          <label className={styles.label}>交換ポイント数</label>
          <div className="relative">
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0" 
              className={styles.input + " pl-12 text-2xl font-black"} 
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">pt</span>
          </div>
        </div>

        <button 
          onClick={handleExchange}
          disabled={isSubmitting || !fromService || !toService || !amount}
          className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all disabled:bg-slate-200 disabled:shadow-none disabled:translate-y-0"
        >
          {isSubmitting ? "処理中..." : "交換を確定する →"}
        </button>
      </div>
    </div>
  );
};
