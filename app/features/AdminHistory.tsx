"use client";

import React, { useState, useEffect, useMemo } from "react";

export const AdminHistory = ({ client, styles }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialInput = {
    dtFrom: "", dtTo: "", uName: "", uEmail: "", src: "", dst: "", minP: "", maxP: "", trackingNumber: ""
  };
  const [input, setInput] = useState(initialInput);
  const [query, setQuery] = useState<any>(null);

  useEffect(() => {
    const fetchAllHistory = async () => {
      try {
        const [txRes, orderRes, profileRes, credRes] = await Promise.all([
          client.models.ExchangeTransaction.list(),
          client.models.GiftOrder.list(),
          client.models.UserProfile.list(),
          client.models.UserServiceCredential.list()
        ]);
        const nameMap = new Map((profileRes.data || []).map((p: any) => [p.email, p.name]));
        const creds = credRes.data || [];
        const getLatestBal = (email: string, svcName: string) => {
          const c = creds.find((i: any) => i.userEmail === email && i.serviceName === svcName);
          return c ? c.dummyBalance : null;
        };
        const txData = (txRes.data || []).map((t: any) => {
          const latestToBal = getLatestBal(t.userEmail, t.toServiceName);
          return {
            ...t, 
            uName: nameMap.get(t.userEmail) || "不明",
            rawSrc: t.fromServiceName || "", 
            rawDst: t.toServiceName || "",
            srcBalance: t.dummyBalance || 0,
            dstBalance: latestToBal !== null ? latestToBal : "-",
            displayFrom: `${t.fromServiceName} (残高:${(t.dummyBalance || 0).toLocaleString()}pts)`,
            displayTo: `${t.toServiceName}${latestToBal !== null ? ` (残高:${latestToBal.toLocaleString()}pts)` : ""}`,
            trackingNumber: t.trackingNumber || ""
          };
        });
        const orderData = (orderRes.data || []).map((o: any) => {
          return {
            ...o, 
            uName: nameMap.get(o.userEmail) || o.shippingName || "不明",
            rawSrc: o.orderSourceName || "", 
            rawDst: o.giftName || "",
            srcBalance: o.dummyBalance || 0,
            dstBalance: "", 
            displayFrom: `${o.orderSourceName || "ギフト元"} (残高:${(o.dummyBalance || 0).toLocaleString()}pts)`,
            displayTo: o.giftName, 
            amount: o.pointSpent,
            trackingNumber: o.trackingNumber || ""
          };
        });
        setTransactions([...txData, ...orderData].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchAllHistory();
  }, [client]);

  const filtered = useMemo(() => {
    if (!query) return transactions;
    return transactions.filter(t => {
      const d = new Date(t.createdAt).getTime();
      const from = query.dtFrom ? new Date(query.dtFrom).getTime() : 0;
      const to = query.dtTo ? new Date(query.dtTo).getTime() : Infinity;
      const uNM = !query.uName || t.uName.toLowerCase().includes(query.uName.toLowerCase());
      const uEM = !query.uEmail || t.userEmail.toLowerCase().includes(query.uEmail.toLowerCase());
      const srcM = !query.src || t.rawSrc.toLowerCase().includes(query.src.toLowerCase());
      const dstM = !query.dst || t.rawDst.toLowerCase().includes(query.dst.toLowerCase());
      const trkM = !query.trackingNumber || t.trackingNumber.toLowerCase().includes(query.trackingNumber.toLowerCase());
      const minM = query.minP ? t.amount >= parseInt(query.minP) : true;
      const maxM = query.maxP ? t.amount <= parseInt(query.maxP) : true;
      return d >= from && d <= to && uNM && uEM && srcM && dstM && trkM && minM && maxM;
    });
  }, [transactions, query]);

  const downloadCSV = () => {
    const now = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const headers = "お問い合わせ番号,ユーザー名,メールアドレス,日時,交換元,交換ポイント,交換元残高,交換先/商品名,交換先残高\n";
    const rows = filtered.map(t => 
      `${t.trackingNumber},${t.uName},${t.userEmail},${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""},${t.rawSrc},${t.amount},${t.srcBalance},${t.rawDst},${t.dstBalance}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `admin_history_${now}.csv`;
    link.click();
  };

  if (loading) return <div className="p-10 text-center font-black">LOADING...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {[
            { label: "お問い合わせ番号", key: "trackingNumber", type: "text" },
            { label: "開始日時", key: "dtFrom", type: "datetime-local", step: "1" },
            { label: "終了日時", key: "dtTo", type: "datetime-local", step: "1" },
            { label: "ユーザー名", key: "uName", type: "text" },
            { label: "メールアドレス", key: "uEmail", type: "text" },
            { label: "交換元サービス", key: "src", type: "text" },
            { label: "交換先 / 商品名", key: "dst", type: "text" },
            { label: "最小ポイント", key: "minP", type: "number" },
            { label: "最大ポイント", key: "maxP", type: "number" }
          ].map(item => (
            <div key={item.key} className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block">{item.label}</label>
              <input 
                type={item.type} 
                step={item.step} 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-orange-400 focus:bg-white transition-all font-bold text-slate-800" 
                value={(input as any)[item.key]} 
                onChange={e=>setInput({...input, [item.key]:e.target.value})} 
              />
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <button onClick={() => setQuery({...input})} className="flex-1 py-4 bg-slate-900 text-white text-[11px] font-black rounded-2xl hover:bg-orange-500 transition-all shadow-lg active:scale-95">検索開始</button>
          <button onClick={() => { setInput(initialInput); setQuery(null); }} className="px-8 py-4 bg-slate-100 text-slate-500 text-[11px] font-black rounded-2xl hover:bg-slate-200 transition-all">リセット</button>
          <button onClick={downloadCSV} className="px-10 py-4 bg-white text-slate-900 border-2 border-slate-200 text-[11px] font-black rounded-2xl hover:bg-slate-100 transition-all shadow-sm">CSV出力</button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border-2 border-slate-200 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b-2 border-slate-200">
                <th className="p-6 w-[280px]">User / Contact</th>
                <th className="p-6 text-center">Transaction Details</th>
                <th className="p-6 text-right w-[200px]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors border-b-2 border-slate-100 last:border-0">
                  <td className="p-6 align-top border-r border-slate-50">
                    <div className="text-sm font-black text-slate-900 mb-1 leading-tight">{t.uName}</div>
                    <div className="text-[11px] text-slate-700 font-bold mb-1">{t.userEmail}</div>
                    <div className="text-[11px] text-slate-500 font-medium mb-3">{new Date(t.createdAt).toLocaleString('ja-JP')}</div>
                    {t.trackingNumber && (
                      <div className="inline-block bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded tracking-wider shadow-sm">ID: {t.trackingNumber}</div>
                    )}
                  </td>
                  <td className="p-6 align-top text-center border-r border-slate-50">
                    <div className="inline-flex flex-col items-center space-y-1">
                      <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 border border-slate-200">{t.displayFrom}</div>
                      <div className="text-orange-500 font-black text-lg leading-none py-0.5">↓</div>
                      <div className="bg-orange-50 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 border border-orange-200">{t.displayTo}</div>
                    </div>
                  </td>
                  <td className="p-6 text-right align-top">
                    <div className="font-black text-orange-500 text-2xl tracking-tighter">
                      {t.amount.toLocaleString()}<span className="text-[10px] ml-1">pts</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
