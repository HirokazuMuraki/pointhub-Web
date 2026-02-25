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
        const { data } = await client.models.ExchangeTransaction.list({
          filter: { userEmail: { eq: userEmail } }
        });
        if (data) setTransactions(data);
      } catch (err) { console.error("履歴取得エラー:", err); }
      finally { setLoading(false); }
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

  const exportCSV = () => {
    const headers = ["日付,交換元,交換先,ポイント,ステータス\n"];
    const rows = filteredTransactions.map(t => 
      `${new Date(t.createdAt).toLocaleString()},${t.fromServiceName},${t.toServiceName},${t.amount},${t.status || "完了"}`
    );
    const blob = new Blob(["\uFEFF" + headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filterInputStyle = "w-full py-2 px-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-900 focus:border-orange-500 focus:outline-none transition-colors placeholder:text-slate-300";

  if (loading) return <div className="p-10 text-center italic text-slate-400 font-black tracking-widest text-2xl">LOADING...</div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className={`${styles.sectionTitle} mb-0.5`}>📋 交換履歴検索</h3>
          <p className="text-[10px] font-bold text-slate-400 ml-1 italic uppercase tracking-tighter">Filter and export your transactions</p>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black rounded-xl shadow-md transition-all flex items-center space-x-2">
          <span>📥</span> <span>CSV出力</span>
        </button>
      </div>

      {/* 検索パネル */}
      <div className="bg-slate-100 p-5 rounded-[1.5rem] lg:rounded-[2rem] mb-6 border border-slate-200 shadow-inner">
        <div className="space-y-4 mb-4">
          
          {/* 1段目：日付範囲（1行） */}
          <div className="w-full lg:max-w-md">
            <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">日付範囲</label>
            <div className="flex items-center space-x-2">
              <input type="date" className={filterInputStyle} value={inputFilter.dateFrom} onChange={e => setInputFilter({...inputFilter, dateFrom: e.target.value})} />
              <span className="text-slate-400 font-black text-xs">~</span>
              <input type="date" className={filterInputStyle} value={inputFilter.dateTo} onChange={e => setInputFilter({...inputFilter, dateTo: e.target.value})} />
            </div>
          </div>

          {/* 2段目：ポイント数 */}
          <div className="w-full sm:w-64">
            <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">ポイント数</label>
            <div className="flex items-center space-x-2">
              <input type="number" placeholder="MIN" className={filterInputStyle} value={inputFilter.minAmount} onChange={e => setInputFilter({...inputFilter, minAmount: e.target.value})} />
              <span className="text-slate-400 font-black text-xs">~</span>
              <input type="number" placeholder="MAX" className={filterInputStyle} value={inputFilter.maxAmount} onChange={e => setInputFilter({...inputFilter, maxAmount: e.target.value})} />
            </div>
          </div>

          {/* 3段目：サービス名キーワード（横並び） */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">交換元 (キーワード)</label>
              <input type="text" placeholder="例: ダミー銀行" className={filterInputStyle} value={inputFilter.fromService} onChange={e => setInputFilter({...inputFilter, fromService: e.target.value})} />
            </div>
            <div className="flex-1">
              <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">交換先 (キーワード)</label>
              <input type="text" placeholder="例: ショップサーブ" className={filterInputStyle} value={inputFilter.toService} onChange={e => setInputFilter({...inputFilter, toService: e.target.value})} />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 border-t border-slate-200 pt-4">
          <button onClick={handleReset} className="px-5 py-2 bg-white text-slate-400 hover:text-slate-600 font-black text-[10px] rounded-xl border-2 border-slate-200 transition-all">
            リセット
          </button>
          <button onClick={handleSearch} className="px-8 py-2 bg-slate-900 hover:bg-orange-500 text-white font-black text-[10px] rounded-xl shadow-lg transition-all flex items-center space-x-2 group">
            <span className="italic">🔍</span> 
            <span>検索実行</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t: any) => (
            <div key={t.id} className="py-2.5 px-6 bg-white border-2 border-slate-50 rounded-[1.2rem] lg:rounded-[1.5rem] flex justify-between items-center shadow-sm hover:shadow-orange-500/10 transition-all group">
              <div className="flex flex-col justify-center">
                <div className="flex items-center space-x-3 mb-0.5">
                  <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase tracking-tighter">{t.status || "完了"}</span>
                  <p className="text-[9px] font-bold text-slate-400 italic">{new Date(t.createdAt).toLocaleString('ja-JP')}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-black text-slate-700 text-base tracking-tight">{t.fromServiceName}</span>
                  <span className="text-orange-500 text-lg font-black transition-transform group-hover:translate-x-0.5">→</span>
                  <span className="font-black text-slate-700 text-base tracking-tight">{t.toServiceName}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-2xl text-orange-500 tracking-tight">
                  {t.amount.toLocaleString()}<span className="text-[10px] ml-1 italic text-slate-400 uppercase">pts</span>
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
            <p className="text-slate-300 italic font-black text-base">NO DATA FOUND</p>
          </div>
        )}
      </div>
    </div>
  );
};
