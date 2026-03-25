"use client";

import React, { useState, useEffect, useMemo } from "react";

export const HistoryList = ({ client, userEmail }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [searchId, setSearchId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fromSvc, setFromSvc] = useState("");
  const [toSvc, setToSvc] = useState("");
  const [minPts, setMinPts] = useState("");
  const [maxPts, setMaxPts] = useState("");

  const inputClass = "w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl text-sm font-bold focus:border-orange-500 outline-none transition-all";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [exRes, giftRes] = await Promise.all([
          client.models.ExchangeTransaction.list({ filter: { userEmail: { eq: userEmail } } }),
          client.models.GiftOrder.list({ filter: { userEmail: { eq: userEmail } } })
        ]);
        
        const exData = (exRes.data || []).map((d: any) => ({
          ...d,
          type: "ポイント交換",
          icon: "🪙",
          date: d.createdAt,
          title: `${d.fromServiceName} → ${d.toServiceName}`,
          fromName: d.fromServiceName || "",
          toName: d.toServiceName || "",
          points: d.amount || 0,
          isNegative: false
        }));

        const giftData = (giftRes.data || []).map((d: any) => ({
          ...d,
          type: "ギフト交換",
          icon: "🎁",
          date: d.createdAt,
          title: d.giftName,
          fromName: d.orderSourceName || "",
          toName: "ギフト受取",
          points: d.pointSpent || 0,
          isNegative: true
        }));

        setHistory([...exData, ...giftData].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      } catch (e) { console.error(e); }
    };
    fetchHistory();
  }, [client, userEmail]);

  const filtered = useMemo(() => {
    return history.filter(h => {
      const d = new Date(h.date);
      if (searchId && !h.trackingNumber?.startsWith(searchId)) return false;
      if (startDate && d < new Date(startDate)) return false;
      if (endDate && d > new Date(endDate + "T23:59:59")) return false;
      // 文字列の部分一致検索に変更
      if (fromSvc && !h.fromName.toLowerCase().includes(fromSvc.toLowerCase())) return false;
      if (toSvc && !h.toName.toLowerCase().includes(toSvc.toLowerCase())) return false;
      if (minPts && h.points < parseInt(minPts)) return false;
      if (maxPts && h.points > parseInt(maxPts)) return false;
      return true;
    });
  }, [history, searchId, startDate, endDate, fromSvc, toSvc, minPts, maxPts]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="問合せ番号(前方一致)" className={inputClass} value={searchId} onChange={e => setSearchId(e.target.value)} />
          <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="交換元サービス名" className={inputClass} value={fromSvc} onChange={e => setFromSvc(e.target.value)} />
          <input type="text" placeholder="交換先サービス名" className={inputClass} value={toSvc} onChange={e => setToSvc(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="number" placeholder="最小pt" className={inputClass} value={minPts} onChange={e => setMinPts(e.target.value)} />
          <input type="number" placeholder="最大pt" className={inputClass} value={maxPts} onChange={e => setMaxPts(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item, idx) => (
          <div key={idx} className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm flex items-center gap-4">
            <div className="text-2xl w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase">{item.type}</span>
                <span className="text-[10px] font-bold text-slate-400">{new Date(item.date).toLocaleString()}</span>
              </div>
              <h4 className="font-black text-slate-800 truncate text-sm">{item.title}</h4>
              {item.trackingNumber && <span className="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-mono mt-1 inline-block">ID: {item.trackingNumber}</span>}
            </div>
            <div className="text-right">
              <p className={`font-black text-lg ${item.isNegative ? "text-red-500" : "text-orange-500"}`}>
                {item.isNegative ? "-" : "+"}{item.points.toLocaleString()}pt
              </p>
              <p className="text-[10px] font-bold text-slate-300">残: {item.dummyBalance?.toLocaleString()}pt</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
