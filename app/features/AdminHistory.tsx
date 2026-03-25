"use client";

import React, { useState, useEffect, useMemo } from "react";

export const AdminHistory = ({ client }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [searchId, setSearchId] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [fromSvc, setFromSvc] = useState("");
  const [toSvc, setToSvc] = useState("");
  const [minPts, setMinPts] = useState("");
  const [maxPts, setMaxPts] = useState("");

  const inputClass = "w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all";

  const fetchAll = async () => {
    try {
      const [exRes, giftRes] = await Promise.all([
        client.models.ExchangeTransaction.list(),
        client.models.GiftOrder.list()
      ]);
      const exData = (exRes.data || []).map((d: any) => ({ ...d, category: "ポイント交換", icon: "🪙", displayTitle: `${d.fromServiceName} → ${d.toServiceName}`, fromName: d.fromServiceName || "", toName: d.toServiceName || "", points: d.amount || 0, user: d.userEmail }));
      const giftData = (giftRes.data || []).map((d: any) => ({ ...d, category: "ギフト交換", icon: "🎁", displayTitle: d.giftName, fromName: d.orderSourceName || "", toName: "ギフト受取", points: d.pointSpent || 0, user: d.userEmail }));
      setHistory([...exData, ...giftData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    return history.filter(h => {
      const d = new Date(h.createdAt);
      if (searchId && !h.trackingNumber?.startsWith(searchId)) return false;
      if (startDateTime && d < new Date(startDateTime)) return false;
      if (endDateTime && d > new Date(endDateTime)) return false;
      // 文字列の部分一致検索に変更
      if (fromSvc && !h.fromName.toLowerCase().includes(fromSvc.toLowerCase())) return false;
      if (toSvc && !h.toName.toLowerCase().includes(toSvc.toLowerCase())) return false;
      if (minPts && h.points < parseInt(minPts)) return false;
      if (maxPts && h.points > parseInt(maxPts)) return false;
      return true;
    });
  }, [history, searchId, startDateTime, endDateTime, fromSvc, toSvc, minPts, maxPts]);

  const downloadCSV = () => {
    const headers = ["区分", "日時", "ユーザー", "内容", "ポイント", "残高", "問い合わせ番号", "配送先名", "住所"];
    const rows = filtered.map(h => [h.category, new Date(h.createdAt).toLocaleString(), h.user, h.displayTitle, h.points, h.dummyBalance || 0, h.trackingNumber || "", h.shippingName || "", h.shippingAddress || ""]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `admin_history_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 p-4">
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" className={inputClass} value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="問合せ番号 (前方一致)" />
          <input type="datetime-local" className={inputClass} value={startDateTime} onChange={e => setStartDateTime(e.target.value)} />
          <input type="datetime-local" className={inputClass} value={endDateTime} onChange={e => setEndDateTime(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="交換元サービス名" className={inputClass} value={fromSvc} onChange={e => setFromSvc(e.target.value)} />
          <input type="text" placeholder="交換先サービス名" className={inputClass} value={toSvc} onChange={e => setToSvc(e.target.value)} />
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 grid grid-cols-2 gap-4 w-full">
            <input type="number" placeholder="最小pt" className={inputClass} value={minPts} onChange={e => setMinPts(e.target.value)} />
            <input type="number" placeholder="最大pt" className={inputClass} value={maxPts} onChange={e => setMaxPts(e.target.value)} />
          </div>
          <button onClick={downloadCSV} className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-orange-600 transition-all shadow-lg active:scale-95">CSV出力</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 overflow-x-auto shadow-sm">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr><th className="p-5 text-center w-24">区分</th><th className="p-5">日時/ユーザー</th><th className="p-5">内容/ID</th><th className="p-5 text-right">ポイント</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((h, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="p-5 text-center"><span className="text-2xl block">{h.icon}</span><span className="text-[8px] font-black text-slate-300">{h.category}</span></td>
                <td className="p-5"><p className="text-[10px] font-bold text-slate-400">{new Date(h.createdAt).toLocaleString()}</p><p className="text-xs font-black">{h.user}</p></td>
                <td className="p-5"><p className="text-sm font-black">{h.displayTitle}</p>{h.trackingNumber && <span className="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-mono uppercase">ID: {h.trackingNumber}</span>}</td>
                <td className="p-5 text-right font-black text-orange-500">{h.points.toLocaleString()}pt</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
