"use client";

import { useState, useEffect } from "react";
import { PointExchange } from "./PointExchange";

export const ExchangeWrapper = ({ client, userEmail, services, styles, setActiveTab }: any) => {
  const [exchangeTab, setExchangeTab] = useState("points");
  const [gifts, setGifts] = useState<any[]>([]);
  const [userCredentials, setUserCredentials] = useState<any[]>([]);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
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

  const fetchCredentials = async () => {
    try {
      const { data } = await client.models.UserServiceCredential.list({
        filter: { userEmail: { eq: userEmail } }
      });
      if (data) {
        setUserCredentials(data);
        if (data.length > 0) setSelectedServiceId(data[0].serviceId);
      }
    } catch (err) {
      console.error("認証情報取得失敗:", err);
    }
  };

  useEffect(() => {
    if (exchangeTab === "gifts") {
      fetchGifts();
      fetchCredentials();
    }
  }, [exchangeTab]);

  const handleGiftExchange = async () => {
    if (!selectedGift || !selectedServiceId) return;
    
    const cred = userCredentials.find(c => c.serviceId === selectedServiceId);
    if (!cred || (cred.dummyBalance || 0) < selectedGift.pointCost) {
      return alert("選択したサービスのポイント残高が不足しています。");
    }

    if (!confirm(`${selectedGift.name} (${selectedGift.pointCost} pts) と交換しますか？\n消費元: ${cred.serviceName}`)) return;

    setIsProcessing(true);
    try {
      const { errors } = await client.models.GiftOrder.create({
        userEmail: userEmail,
        giftId: selectedGift.id,
        giftName: selectedGift.name,
        pointSpent: selectedGift.pointCost,
        serviceId: selectedServiceId, // 追加したフィールドに保存
        status: "PENDING",
      });
      if (errors) throw new Error(errors[0].message);
      
      alert("交換を申し込みました！管理者の承認をお待ちください。");
      setSelectedGift(null);
      await fetchGifts();
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
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
                        onClick={() => setSelectedGift(gift)}
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

      {selectedGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">交換ポイントの選択</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">Select your point source</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-black text-slate-700">{selectedGift.name}</span>
                <span className="text-xs font-black text-orange-500">{selectedGift.pointCost} pts</span>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 mb-1.5 ml-1 uppercase">支払い元サービス</label>
                <select 
                  className="w-full p-3 bg-white rounded-xl border-2 border-slate-100 text-xs font-bold text-slate-700 focus:border-orange-500 outline-none transition-all"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                >
                  {userCredentials.map((c) => (
                    <option key={c.id} value={c.serviceId}>
                      {c.serviceName} ({c.dummyBalance} pts)
                    </option>
                  ))}
                </select>
                {userCredentials.length === 0 && (
                  <p className="text-[9px] text-red-400 mt-2 italic font-bold">※ 連携済みのサービスがありません</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedGift(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-400 font-black rounded-xl text-[10px] hover:bg-slate-200 transition-all"
              >
                キャンセル
              </button>
              <button 
                onClick={handleGiftExchange}
                disabled={isProcessing || userCredentials.length === 0}
                className="flex-1 py-3 bg-slate-900 text-white font-black rounded-xl text-[10px] hover:bg-orange-500 transition-all disabled:opacity-30"
              >
                {isProcessing ? "処理中..." : "確定する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
