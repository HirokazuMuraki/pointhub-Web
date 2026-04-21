"use client";

import { useState, useEffect, useMemo } from "react";

export const HistoryList = ({ client, userEmail, styles }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialInput = { 
    dateFrom: "", dateTo: "", minAmt: "", maxAmt: "", srcName: "", dstName: "", trackingNumber: "" 
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
            icon: "🪙",
            rawSrc: t.fromServiceName || "", 
            rawDst: t.toServiceName || "",
            srcBalance: t.dummyBalance || 0,
            dstBalance: latestToBal !== null ? latestToBal : "-",
            displayFrom: `${t.fromServiceName} (残高:${(t.dummyBalance || 0).toLocaleString()}pts)`,
            displayTo: `${t.toServiceName}${latestToBal !== null ? ` (残高:${latestToBal.toLocaleString()}pts)` : ""}`,
            trackingNumber: t.trackingNumber || ""
          };
        });

        const orderData = (orderRes.data || []).map((o: any) => ({
          ...o, 
          icon: "🎁",
          rawSrc: o.orderSourceName || "", 
          rawDst: o.giftName || "",
          srcBalance: o.dummyBalance || 0,
          dstBalance: "", 
          displayFrom: `${o.orderSourceName || "ギフト元"} (残高:${(o.dummyBalance || 0).toLocaleString()}pts)`,
          displayTo: o.giftName, 
          amount: o.pointSpent,
          trackingNumber: o.trackingNumber || ""
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
      const trkM = !query.trackingNumber || t.trackingNumber.toLowerCase().includes(query.trackingNumber.toLowerCase());
      return d >= from && d <= to && minP && maxP && srcM && dstM && trkM;
    }) : transactions;
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, query]);

  const downloadCSV = () => {
    const now = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const headers = "日時,お問い合わせ番号,交換元,交換ポイント,交換元残高,交換先/商品名,交換先残高\n";
    const rows = filtered.map(t => 
      `${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""},${t.trackingNumber},${t.rawSrc},${t.amount},${t.srcBalance},${t.rawDst},${t.dstBalance}`
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
      <div className="bg-white p-6 rounded-[2rem] mb-8 border-2 border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "期間 (開始)", key: "dateFrom", type: "date" },
            { label: "期間 (終了)", key: "dateTo", type: "date" },
            { label: "お問い合わせ番号", key: "trackingNumber", type: "text" },
            { label: "交換元", key: "srcName", type: "text" },
            { label: "交換先 / 商品名", key: "dstName", type: "text" },
            { label: "最小ポイント", key: "minAmt", type: "number" },
            { label: "最大ポイント", key: "maxAmt", type: "number" }
          ].map(item => (
            <div key={item.key}>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">{item.label}</label>
              <input 
                type={item.type} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-orange-400 focus:bg-white transition-all font-bold text-slate-800" 
                value={(input as any)[item.key]} 
                onChange={e=>setInput({...input, [item.key]:e.target.value})} 
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setQuery({...input})} className="flex-1 py-3 bg-slate-900 text-white text-[11px] font-black rounded-xl hover:bg-orange-500 transition-all shadow-lg">検索開始</button>
          <button onClick={() => { setInput(initialInput); setQuery(null); }} className="px-6 py-3 bg-slate-100 text-slate-500 text-[11px] font-black rounded-xl hover:bg-slate-200 transition-all">リセット</button>
          <button onClick={downloadCSV} className="px-6 py-3 bg-white text-slate-900 border-2 border-slate-200 text-[11px] font-black rounded-xl hover:bg-slate-100 transition-all">CSV</button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-sm">
        <div className="hidden sm:block">
          <div className="grid grid-cols-12 bg-slate-50 p-4 border-b-2 border-slate-200 text-[10px] font-black text-slate-500 uppercase">
            <div className="col-span-3 px-2">日時 / お問い合わせ番号</div>
            <div className="col-span-6 text-center px-2">交換の詳細</div>
            <div className="col-span-3 text-right px-4">獲得・使用ポイント</div>
          </div>
        </div>
        <div className="divide-y-2 divide-slate-100">
          {filtered.map((t: any) => (
            <div key={t.id} className="p-6 hover:bg-slate-50/50 transition-colors">
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                <div className="sm:col-span-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <div className="text-[11px] font-bold text-slate-700 leading-tight">{new Date(t.createdAt).toLocaleString('ja-JP')}</div>
                  </div>
                  {t.trackingNumber && (
                    <div className="inline-block bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded tracking-wider shadow-sm">ID: {t.trackingNumber}</div>
                  )}
                </div>
                <div className="sm:col-span-6 flex flex-col items-start sm:items-center">
                  <div className="inline-flex flex-col items-center space-y-1 w-full max-w-md">
                    <div className="bg-slate-100 px-3 py-1 rounded-lg text-[11px] font-bold text-slate-700 border border-slate-200">{t.displayFrom}</div>
                    <div className="text-orange-500 font-black text-lg leading-none py-0.5">↓</div>
                    <div className="bg-orange-50 px-3 py-1 rounded-lg text-[11px] font-bold text-slate-800 border border-orange-200">{t.displayTo}</div>
                    
                    {/* 追加: gifteeUrlが存在する場合のみURLを表示 */}
                    {t.gifteeUrl && (
                      <div className="mt-2 w-full flex flex-col items-center">
                        <div className="text-[9px] font-black text-orange-400 uppercase tracking-tighter mb-0.5">Gift Receipt URL</div>
                        <a 
                          href={t.gifteeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-blue-500 font-bold hover:underline break-all bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 text-center"
                        >
                          {t.gifteeUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-3 text-left sm:text-right">
                  <div className="font-black text-orange-500 text-2xl tracking-tighter leading-none">{t.amount.toLocaleString()}<span className="text-[10px] ml-1">pts</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
