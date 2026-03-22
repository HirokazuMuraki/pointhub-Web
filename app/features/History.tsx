"use client";

import { useState, useEffect, useMemo } from "react";

export const HistoryList = ({ client, userEmail, styles }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialInput = { 
    dateFrom: "", dateTo: "", minAmt: "", maxAmt: "", srcName: "", dstName: "" 
  };
  const [input, setInput] = useState(initialInput);
  const [query, setQuery] = useState<any>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [txRes, orderRes, credRes] = await Promise.all([
          client.models.ExchangeTransaction.list({ filter: { userEmail: { eq: userEmail } } }),
          client.models.GiftOrder.list({ filter: { userEmail: { eq: userEmail } } }),
          client.models.UserServiceCredential.list({ filter: { userEmail: { eq: userEmail } } })
        ]);

        const creds = credRes.data || [];
        const getLatestBal = (svcName: string) => {
          const c = creds.find((i: any) => i.serviceName === svcName);
          return c ? c.dummyBalance : null;
        };

        const txData = (txRes.data || []).map((t: any) => {
          const latestToBal = getLatestBal(t.toServiceName);
          return {
            ...t, 
            rawSrc: t.fromServiceName || "", 
            rawDst: t.toServiceName || "",
            srcBalance: t.dummyBalance || 0,
            dstBalance: latestToBal !== null ? latestToBal : "-",
            displayFrom: `${t.fromServiceName} (残高:${(t.dummyBalance || 0).toLocaleString()}pts)`,
            displayTo: `${t.toServiceName}${latestToBal !== null ? ` (残高:${latestToBal.toLocaleString()}pts)` : ""}`,
          };
        });

        const orderData = (orderRes.data || []).map((o: any) => ({
          ...o, 
          rawSrc: o.orderSourceName || "", 
          rawDst: o.giftName || "",
          srcBalance: o.dummyBalance || 0,
          dstBalance: "", 
          displayFrom: `${o.orderSourceName || "ギフト元"} (残高:${(o.dummyBalance || 0).toLocaleString()}pts)`,
          displayTo: o.giftName, 
          amount: o.pointSpent,
        }));

        setTransactions([...txData, ...orderData]);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchHistory();
  }, [client, userEmail]);

  const filtered = useMemo(() => {
    const list = query ? transactions.filter(t => {
      const d = new Date(t.createdAt).getTime();
      const from = query.dateFrom ? new Date(query.dateFrom).getTime() : 0;
      const to = query.dateTo ? new Date(query.dateTo).setHours(23,59,59) : Infinity;
      const minP = query.minAmt ? t.amount >= parseInt(query.minAmt) : true;
      const maxP = query.maxAmt ? t.amount <= parseInt(query.maxAmt) : true;
      const srcM = !query.srcName || t.rawSrc.toLowerCase().includes(query.srcName.toLowerCase());
      const dstM = !query.dstName || t.rawDst.toLowerCase().includes(query.dstName.toLowerCase());
      return d >= from && d <= to && minP && maxP && srcM && dstM;
    }) : transactions;
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, query]);

  const downloadCSV = () => {
    const now = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const headers = "日時,交換元,交換ポイント,交換元残高,交換先/商品名,交換先残高\n";
    const rows = filtered.map(t => 
      `${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""},${t.rawSrc},${t.amount},${t.srcBalance},${t.rawDst},${t.dstBalance}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `history_${now}.csv`;
    link.click();
  };

  if (loading) return <div className="p-10 text-center font-black">LOADING...</div>;

  return (
    <div className="p-6">
      <div className="bg-slate-50 p-6 rounded-[2rem] mb-8 border-2 border-white shadow-inner space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "期間 (開始)", key: "dateFrom", type: "date" },
            { label: "期間 (終了)", key: "dateTo", type: "date" },
            { label: "交換元サービス名", key: "srcName", type: "text" },
            { label: "交換先/商品名", key: "dstName", type: "text" },
            { label: "最小ポイント", key: "minAmt", type: "number" },
            { label: "最大ポイント", key: "maxAmt", type: "number" }
          ].map(item => (
            <div key={item.key}>
              <label className="text-[11px] font-black text-black uppercase ml-1 block mb-1">{item.label}</label>
              <input type={item.type} className="w-full p-3 rounded-xl border-none text-xs outline-none shadow-sm" 
                value={(input as any)[item.key]} onChange={e=>setInput({...input, [item.key]:e.target.value})} />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setQuery({...input})} className="flex-1 py-3 bg-slate-900 text-white text-[11px] font-black rounded-xl hover:bg-orange-500 transition-all">検索開始</button>
          <button onClick={() => { setInput(initialInput); setQuery(null); }} className="px-6 py-3 bg-slate-200 text-slate-700 text-[11px] font-black rounded-xl hover:bg-slate-300 transition-all">条件クリア</button>
          <button onClick={downloadCSV} className="px-6 py-3 bg-white text-slate-900 border-2 border-slate-200 text-[11px] font-black rounded-xl hover:bg-slate-100 transition-all">CSV出力</button>
        </div>
      </div>
      <div className="space-y-3">
        {filtered.map((t: any) => (
          <div key={t.id} className="py-4 px-6 bg-white border-2 border-slate-50 rounded-[1.5rem] flex justify-between items-center shadow-sm">
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 mb-1">{new Date(t.createdAt).toLocaleString('ja-JP')}</p>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-700 text-sm">{t.displayFrom}</span>
                <span className="text-orange-500 font-black">→</span>
                <span className="font-bold text-slate-700 text-sm">{t.displayTo}</span>
              </div>
            </div>
            <p className="font-black text-xl text-orange-500 ml-4">{t.amount.toLocaleString()}pts</p>
          </div>
        ))}
      </div>
    </div>
  );
};
