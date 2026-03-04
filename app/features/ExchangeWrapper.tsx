"use client";

import { useState, useEffect } from "react";
import { PointExchange } from "./PointExchange";

export const ExchangeWrapper = ({ client, userEmail, services, styles, setActiveTab }: any) => {
  const [exchangeTab, setExchangeTab] = useState("points");
  const [gifts, setGifts] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchGifts = async () => {
    try {
      const { data } = await client.models.GiftMaster.list({
        filter: { isActive: { eq: true } }
      });
      if (data) setGifts(data);
    } catch (err) {
      console.error("ギフト取得失敗:", err);
    }
  };

  useEffect(() => {
    if (exchangeTab === "gifts") {
      fetchGifts();
    }
  }, [exchangeTab]);

  const handleGiftExchange = async (gift: any) => {
    if (gift.stock <= 0) return alert("在庫がありません");
    if (!confirm(`${gift.name} (${gift.pointCost} pts) と交換しますか？`)) return;

    setIsProcessing(true);
    try {
      const { errors } = await client.models.GiftOrder.create({
        userEmail: userEmail,
        giftId: gift.id,
        giftName: gift.name,
        pointSpent: gift.pointCost,
        status: "PENDING",
      });
      if (errors) throw new Error(errors[0].message);
      
      alert("交換を申し込みました！管理者の承認をお待ちください。");
      await fetchGifts();
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* サブタブ切り替え */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full max-w-xs mx-auto shadow-inner">
        <button
          onClick={() => setExchangeTab("points")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
            exchangeTab === "points" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
          }`}
        >
          <span>🪙</span>
          <span>ポイント交換</span>
        </button>
        <button
          onClick={() => setExchangeTab("gifts")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${
            exchangeTab === "gifts" ? "bg-orange-500 text-white shadow-sm" : "text-slate-400"
          }`}
        >
          <span>🎁</span>
          <span>ギフト交換</span>
        </button>
      </div>

      <div className="animate-in fade-in duration-500">
        {exchangeTab === "points" ? (
          <PointExchange 
            client={client} 
            userEmail={userEmail} 
            styles={styles} 
            services={services} 
            setActiveTab={setActiveTab} 
          />
        ) : (
          /* 修正点：grid-cols-2 から md:grid-cols-3 に変更し、カードを小型化 */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gifts.length > 0 ? (
              gifts.map((gift) => (
                <div key={gift.id} className="bg-white rounded-[1.5rem] border border-slate-100 overflow-hidden hover:shadow-md transition-all group flex flex-col">
                  <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                    {gift.imageUrl ? (
                      <img src={gift.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-slate-200">🎁</div>
                    )}
                    <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur text-white px-2.5 py-1 rounded-lg font-black text-[10px]">
                      {gift.pointCost} pts
                    </div>
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <h4 className="text-xs font-black text-slate-800 line-clamp-1">{gift.name}</h4>
                    <p className="text-[9px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed h-[24px]">
                      {gift.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                      <span className="text-[8px] font-bold text-slate-300">在庫: {gift.stock}</span>
                      <button
                        onClick={() => handleGiftExchange(gift)}
                        disabled={isProcessing || gift.stock <= 0}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[9px] font-black hover:bg-orange-500 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-sm"
                      >
                        交換
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-300 text-xs font-black italic">No Gifts Available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
