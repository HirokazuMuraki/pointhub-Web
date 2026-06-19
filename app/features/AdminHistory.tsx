"use client";

import React, { useState, useEffect, useMemo } from "react";

export const AdminHistory = ({ client, styles }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ポップアップ（送付先）管理用の状態
  const [selectedShipping, setSelectedShipping] = useState<any | null>(null);
  
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
          const srcBefore = (t.dummyBalance || 0) + t.amount;
          const srcAfter = t.dummyBalance || 0;
          const dstAfter = latestToBal !== null ? latestToBal : null;
          const dstBefore = dstAfter !== null ? dstAfter - t.amount : null;

          return {
            ...t, 
            icon: "🪙",
            uName: nameMap.get(t.userEmail) || "不明",
            rawSrc: t.fromServiceName || "", 
            rawDst: t.toServiceName || "",
            srcBefore, srcAfter,
            dstBefore, dstAfter,
            trackingNumber: t.trackingNumber || ""
          };
        });

        const orderData = (orderRes.data || []).map((o: any) => {
          const srcBefore = (o.dummyBalance || 0) + (o.pointSpent || 0);
          const srcAfter = o.dummyBalance || 0;

          return {
            ...o, 
            icon: "🎁",
            uName: nameMap.get(o.userEmail) || o.shippingName || "不明",
            rawSrc: o.orderSourceName || "", 
            rawDst: o.giftName || "",
            srcBefore, srcAfter,
            dstBefore: null, dstAfter: null,
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
    const headers = "お問い合わせ番号,ユーザー名,メールアドレス,日時,交換元,交換ポイント,交換元残高,交換先/商品名,交換先残高,受取URL\n";
    const rows = filtered.map(t => 
      `${t.trackingNumber},${t.uName},${t.userEmail},${t.createdAt ? new Date(t.createdAt).toLocaleString() : ""},${t.rawSrc},${t.amount},${t.srcAfter},${t.rawDst},${t.dstAfter ?? ""},${t.gifteeUrl || ""}`
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
                <th className="p-6 w-[280px]">利用者 / 日時</th>
                <th className="p-6 text-center">交換の詳細</th>
                <th className="p-6 text-right w-[200px]">獲得・使用ポイント</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors border-b-2 border-slate-100 last:border-0">
                  <td className="p-6 align-top border-r border-slate-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{t.icon}</span>
                      <div className="text-sm font-black text-slate-900 leading-tight">{t.uName}</div>
                    </div>
                    <div className="text-[11px] text-slate-700 font-bold mb-1">{t.userEmail}</div>
                    <div className="text-[11px] text-slate-500 font-medium mb-3">{new Date(t.createdAt).toLocaleString('ja-JP')}</div>
                    {t.trackingNumber && (
                      <div className="inline-block bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded tracking-wider shadow-sm">ID: {t.trackingNumber}</div>
                    )}
                    {/* 自社ギフト(🎁)かつ、gifteeUrlが無い場合のみ送付先確認ボタンを表示 */}
                    {t.icon === "🎁" && !t.gifteeUrl && (
                      <div className="mt-2">
                        <button
                          onClick={() => setSelectedShipping({
                            name: t.shippingName,
                            zip: t.shippingZip,
                            address: t.shippingAddress,
                            tel: t.shippingTel,
                            giftName: t.rawDst,
                            uName: t.uName
                          })}
                          className="block text-[9px] font-black text-slate-500 bg-slate-100 hover:bg-orange-500 hover:text-white border border-slate-200 px-2 py-1 rounded transition-all shadow-sm"
                        >
                          📍 送付先確認
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-6 align-top text-center border-r border-slate-50">
                    <div className="inline-flex flex-col items-center space-y-2 w-full max-w-md">
                      {/* 交換元表示 */}
                      <div className="bg-slate-100 px-4 py-2 rounded-xl text-[11px] font-bold text-slate-700 border border-slate-200 w-full text-center">
                        <div className="mb-0.5">{t.rawSrc || "ギフト元"}</div>
                        <div className="text-[10px] text-slate-400 font-black">
                          {t.srcBefore.toLocaleString()}pts → {t.srcAfter.toLocaleString()}pts
                        </div>
                      </div>

                      <div className="text-orange-500 font-black text-2xl leading-none py-1">↓</div>
                      
                      {/* 交換先表示 */}
                      <div className="bg-orange-50 px-4 py-2 rounded-xl text-[11px] font-bold text-slate-800 border border-orange-200 w-full text-center">
                        <div className="mb-0.5">{t.rawDst}</div>
                        {t.dstAfter !== null && (
                          <div className="text-[10px] text-orange-400 font-black">
                            {t.dstBefore?.toLocaleString()}pts → {t.dstAfter.toLocaleString()}pts
                          </div>
                        )}
                      </div>
                      
                      {t.gifteeUrl && (
                        <div className="mt-3 flex flex-col items-center">
                          <div className="text-[9px] font-black text-orange-400 uppercase tracking-tighter mb-1">Giftee Receipt URL</div>
                          <a 
                            href={t.gifteeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-blue-500 font-bold hover:underline break-all bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 max-w-xs"
                          >
                            {t.gifteeUrl}
                          </a>
                        </div>
                      )}
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

      {/* 送付先確認ポップアップ(モーダル) */}
      {selectedShipping && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setSelectedShipping(null)}
        >
          <div 
            className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded uppercase tracking-wider">管理者用: 配送先情報</span>
                <h4 className="text-sm font-black text-slate-800 mt-1 truncate max-w-[280px]">{selectedShipping.giftName}</h4>
              </div>
              <button 
                onClick={() => setSelectedShipping(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3.5 py-1">
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-0.5">アカウント名 / 配送先宛名</label>
                <div className="text-xs font-black text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
                  {selectedShipping.uName}（宛名: {selectedShipping.name || "---"} 様）
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-0.5">郵便番号</label>
                <div className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
                  {selectedShipping.zip ? `〒${selectedShipping.zip}` : "---"}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-0.5">配送先住所</label>
                <div className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60 leading-relaxed break-all">
                  {selectedShipping.address || "---"}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-0.5">電話番号</label>
                <div className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
                  {selectedShipping.tel || "---"}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedShipping(null)}
              className="w-full py-3 bg-slate-900 text-white text-[11px] font-black rounded-xl hover:bg-orange-500 transition-all shadow-md"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
