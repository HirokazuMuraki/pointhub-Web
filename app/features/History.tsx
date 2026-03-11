"use client";

import { useState, useEffect, useMemo } from "react";

export const HistoryList = ({ client, userEmail, styles }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [inputFilter, setInputFilter] = useState({
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    fromService: "",
    toService: "",
  });

  const [appliedFilter, setAppliedFilter] = useState({ ...inputFilter });

  useEffect(() => {
    const fetchHistory = async () => {
      if (!client?.models?.ExchangeTransaction) { setLoading(false); return; }
      try {
        // ポイント交換とギフト交換を並列で取得
        const [txRes, orderRes] = await Promise.all([
          client.models.ExchangeTransaction.list({
            filter: { userEmail: { eq: userEmail } }
          }),
          client.models.GiftOrder.list({
            filter: { userEmail: { eq: userEmail } }
          })
        ]);

        const txData = txRes.data || [];
        const orderData = (orderRes.data || []).map((o: any) => ({
          ...o,
          fromServiceName: o.orderSourceName || "🎁 GIFT",
          toServiceName: o.giftName,
          amount: o.pointSpent,
          isGift: true
        }));

        setTransactions([...txData, ...orderData]);
      } catch (err) { 
        console.error("履歴取得エラー:", err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchHistory();
  }, [client, userEmail]);

  const handleSearch = () => {
    setAppliedFilter({ ...inputFilter });
  };

  const handleReset = () => {
    const empty = { dateFrom: "", dateTo: "", minAmount: "", maxAmount: "", fromService: "", toService: "" };
    setInputFilter(empty);
    setAppliedFilter(empty);
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const date = new Date(t.createdAt).getTime();
        const from = appliedFilter.dateFrom ? new Date(appliedFilter.dateFrom).getTime() : 0;
        const to = appliedFilter.dateTo ? new Date(appliedFilter.dateTo).setHours(23, 59, 59) : Infinity;
        const amount = Number(t.amount);
        const min = appliedFilter.minAmount ? Number(appliedFilter.minAmount) : 0;
        const max = appliedFilter.maxAmount ? Number(appliedFilter.maxAmount) : Infinity;

        return (
          date >= from &&
          date <= to &&
          amount >= min &&
          amount <= max &&
          (t.fromServiceName || "").toLowerCase().includes(appliedFilter.fromService.toLowerCase()) &&
          (t.toServiceName || "").toLowerCase().includes(appliedFilter.toService.toLowerCase())
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, appliedFilter]);

  // ステータス表示用のヘルパー関数
  const getStatusDisplay = (t: any) => {
    if (!t.isGift) return { label: "完了", class: "bg-slate-100 text-slate-500 border-slate-200" };
    
    switch (t.status) {
      case "PENDING":
        return { label: "配送準備", class: "bg-orange-100 text-orange-600 border-orange-200" };
      case "SHIPPED":
        return { label: "配送済", class: "bg-green-100 text-green-600 border-green-200" };
      default:
        return { label: "完了", class: "bg-slate-100 text-slate-500 border-slate-200" };
    }
  };

  const exportCSV = () => {
    const headers = ["日付,種類,交換元,交換先,ポイント,ステータス\n"];
    const rows = filteredTransactions.map(t => {
      const type = t.isGift ? "ギフト交換" : "ポイント交換";
      const statusInfo = getStatusDisplay(t);
      return `${new Date(t.createdAt).toLocaleString()},${type},${t.fromServiceName},${t.toServiceName},${t.amount},${statusInfo.label}`;
    });
    const blob = new Blob(["\uFEFF" + headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `my_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filterInputStyle = "w-full py-2 px-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-900 focus:border-orange-500 focus:outline-none transition-colors placeholder:text-slate-300";

  if (loading) return <div className="p-10 text-center italic text-slate-400 font-black tracking-widest text-2xl">LOADING...</div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className={`${styles.sectionTitle} mb-0.5`}>📋 交換履歴検索</h3>
          <p className="text-[10px] font-bold text-slate-400 ml-1 italic uppercase tracking-tighter">View your exchange & gift history</p>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black rounded-xl shadow-md transition-all flex items-center space-x-2">
          <span>📥</span> <span>CSV出力</span>
        </button>
      </div>

      {/* 検索パネル */}
      <div className="bg-slate-100 p-5 rounded-[1.5rem] lg:rounded-[2rem] mb-6 border border-slate-200 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">日付範囲</label>
            <div className="flex items-center space-x-2">
              <input type="date" className={filterInputStyle} value={inputFilter.dateFrom} onChange={e => setInputFilter({...inputFilter, dateFrom: e.target.value})} />
              <span className="text-slate-400 font-black text-xs">~</span>
              <input type="date" className={filterInputStyle} value={inputFilter.dateTo} onChange={e => setInputFilter({...inputFilter, dateTo: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">ポイント数</label>
            <div className="flex items-center space-x-2">
              <input type="number" placeholder="MIN" className={filterInputStyle} value={inputFilter.minAmount} onChange={e => setInputFilter({...inputFilter, minAmount: e.target.value})} />
              <span className="text-slate-400 font-black text-xs">~</span>
              <input type="number" placeholder="MAX" className={filterInputStyle} value={inputFilter.maxAmount} onChange={e => setInputFilter({...inputFilter, maxAmount: e.target.value})} />
            </div>
          </div>
          <div className="md:col-span-2 flex gap-4">
            <div className="flex-1">
              <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">交換元</label>
              <input type="text" placeholder="例: ダミー銀行" className={filterInputStyle} value={inputFilter.fromService} onChange={e => setInputFilter({...inputFilter, fromService: e.target.value})} />
            </div>
            <div className="flex-1">
              <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">交換先 / 商品名</label>
              <input type="text" placeholder="例: Amazon" className={filterInputStyle} value={inputFilter.toService} onChange={e => setInputFilter({...inputFilter, toService: e.target.value})} />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 border-t border-slate-200 pt-4">
          <button onClick={handleReset} className="px-5 py-2 bg-white text-slate-400 hover:text-slate-600 font-black text-[10px] rounded-xl border-2 border-slate-200 transition-all">リセット</button>
          <button onClick={handleSearch} className="px-8 py-2 bg-slate-900 hover:bg-orange-500 text-white font-black text-[10px] rounded-xl shadow-lg transition-all flex items-center space-x-2 group">
            <span className="italic">🔍</span> <span>検索実行</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t: any) => {
            const statusInfo = getStatusDisplay(t);
            return (
              <div key={t.id} className={`py-3 px-6 bg-white border-2 rounded-[1.2rem] lg:rounded-[1.5rem] flex justify-between items-center shadow-sm hover:shadow-orange-500/10 transition-all group ${t.isGift ? 'border-orange-50' : 'border-slate-50'}`}>
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter border ${statusInfo.class}`}>
                      {statusInfo.label}
                    </span>
                    <p className="text-[9px] font-bold text-slate-400 italic">{new Date(t.createdAt).toLocaleString('ja-JP')}</p>
                  </div>
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`font-black text-sm tracking-tight truncate ${t.isGift ? 'text-orange-600' : 'text-slate-700'}`}>
                      {t.fromServiceName}
                    </span>
                    <span className="text-orange-500 text-base font-black flex-shrink-0">→</span>
                    <span className="font-black text-slate-700 text-sm tracking-tight truncate">
                      {t.toServiceName}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="font-black text-xl text-orange-500 tracking-tight">
                    {t.amount.toLocaleString()}<span className="text-[10px] ml-1 italic text-slate-400 uppercase">pts</span>
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
            <p className="text-slate-300 italic font-black text-base">NO DATA FOUND</p>
          </div>
        )}
      </div>
    </div>
  );
};
