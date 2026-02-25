"use client";

import React, { useState, useEffect, useMemo } from "react";

export const AdminHistory = ({ client, styles }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [inputFilter, setInputFilter] = useState({
    userEmail: "",
    dateFrom: "", // datetime-local 用
    dateTo: "",   // datetime-local 用
    minAmount: "",
    maxAmount: "",
    fromService: "",
    toService: "",
  });

  const [appliedFilter, setAppliedFilter] = useState({ ...inputFilter });

  useEffect(() => {
    const fetchAllHistory = async () => {
      try {
        const { data } = await client.models.ExchangeTransaction.list();
        if (data) setTransactions(data);
      } catch (err) {
        console.error("全履歴取得エラー:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllHistory();
  }, [client]);

  const handleSearch = () => {
    setAppliedFilter({ ...inputFilter });
  };

  const handleReset = () => {
    const empty = { userEmail: "", dateFrom: "", dateTo: "", minAmount: "", maxAmount: "", fromService: "", toService: "" };
    setInputFilter(empty);
    setAppliedFilter(empty);
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const date = new Date(t.createdAt).getTime();
        // datetime-local の文字列からタイムスタンプを取得
        const from = appliedFilter.dateFrom ? new Date(appliedFilter.dateFrom).getTime() : 0;
        const to = appliedFilter.dateTo ? new Date(appliedFilter.dateTo).getTime() : Infinity;
        
        const amount = Number(t.amount);
        const min = appliedFilter.minAmount ? Number(appliedFilter.minAmount) : 0;
        const max = appliedFilter.maxAmount ? Number(appliedFilter.maxAmount) : Infinity;

        return (
          date >= from &&
          date <= to &&
          amount >= min &&
          amount <= max &&
          (t.userEmail || "").toLowerCase().includes(appliedFilter.userEmail.toLowerCase()) &&
          (t.fromServiceName || "").toLowerCase().includes(appliedFilter.fromService.toLowerCase()) &&
          (t.toServiceName || "").toLowerCase().includes(appliedFilter.toService.toLowerCase())
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, appliedFilter]);

  const exportCSV = () => {
    const headers = ["日付,ユーザー,交換元,交換先,ポイント,ステータス\n"];
    const rows = filteredTransactions.map(t => 
      `${new Date(t.createdAt).toLocaleString()},${t.userEmail},${t.fromServiceName},${t.toServiceName},${t.amount},${t.status || "完了"}`
    );
    const blob = new Blob(["\uFEFF" + headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `admin_history_all_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filterInputStyle = "w-full py-2 px-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-900 focus:border-orange-500 focus:outline-none transition-colors placeholder:text-slate-300";

  if (loading) return <div className="p-10 text-center italic text-slate-400 font-black tracking-widest text-2xl">LOADING...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className={`${styles.sectionTitle} mb-0.5`}>📋 全ユーザー交換履歴検索</h3>
          <p className="text-[10px] font-bold text-slate-400 ml-1 italic uppercase tracking-tighter">Admin Master Search & Export Mode</p>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black rounded-xl shadow-md transition-all flex items-center space-x-2">
          <span>📥</span> <span>CSV出力</span>
        </button>
      </div>

      <div className="bg-slate-100 p-5 rounded-[1.5rem] lg:rounded-[2rem] mb-6 border border-slate-200 shadow-inner">
        <div className="space-y-4 mb-4">
          
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">ユーザーメール</label>
              <input type="text" placeholder="example@mail.com" className={filterInputStyle} value={inputFilter.userEmail} onChange={e => setInputFilter({...inputFilter, userEmail: e.target.value})} />
            </div>
            <div className="w-full lg:max-w-2xl">
              <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">日時範囲 (24時間形式)</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="datetime-local" 
                  className={filterInputStyle} 
                  value={inputFilter.dateFrom} 
                  onChange={e => setInputFilter({...inputFilter, dateFrom: e.target.value})} 
                />
                <span className="text-slate-400 font-black text-xs">~</span>
                <input 
                  type="datetime-local" 
                  className={filterInputStyle} 
                  value={inputFilter.dateTo} 
                  onChange={e => setInputFilter({...inputFilter, dateTo: e.target.value})} 
                />
              </div>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <label className="block text-[9px] font-black text-slate-500 mb-1 ml-2 uppercase tracking-wider">ポイント数</label>
            <div className="flex items-center space-x-2">
              <input type="number" placeholder="MIN" className={filterInputStyle} value={inputFilter.minAmount} onChange={e => setInputFilter({...inputFilter, minAmount: e.target.value})} />
              <span className="text-slate-400 font-black text-xs">~</span>
              <input type="number" placeholder="MAX" className={filterInputStyle} value={inputFilter.maxAmount} onChange={e => setInputFilter({...inputFilter, maxAmount: e.target.value})} />
            </div>
          </div>

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

      <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
              <th className="p-6">User / Date</th>
              <th className="p-6">Route</th>
              <th className="p-6 text-right">Amount</th>
              <th className="p-6 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-6">
                  <div className="text-xs font-black text-slate-800">{t.userEmail}</div>
                  <div className="text-[10px] font-bold text-slate-400 italic">
                    {new Date(t.createdAt).toLocaleString('ja-JP', { 
                      year: 'numeric', month: '2-digit', day: '2-digit', 
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                      hour12: false 
                    })}
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex items-center space-x-2 text-[10px] font-black uppercase italic">
                    <span className="text-slate-600">{t.fromServiceName}</span>
                    <span className="text-orange-500">→</span>
                    <span className="text-slate-600">{t.toServiceName}</span>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <span className="text-lg font-black text-slate-900">{t.amount.toLocaleString()}</span>
                  <span className="text-[9px] font-black text-slate-300 ml-1 italic">PTS</span>
                </td>
                <td className="p-6 text-center">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${
                    t.status === 'COMPLETED' ? 'bg-green-50 text-green-500 border-green-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {t.status || "COMPLETED"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && (
          <div className="py-20 text-center text-slate-300 font-black italic tracking-widest uppercase">NO DATA FOUND</div>
        )}
      </div>
    </div>
  );
};
