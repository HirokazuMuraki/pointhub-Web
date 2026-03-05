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
      // 修正された新しいフィールド名で送信
      const { errors } = await client.models.GiftOrder.create({
        userEmail: userEmail,
        giftId: selectedGift.id,
        giftName: selectedGift.name,
        pointSpent: selectedGift.pointCost,
        orderSourceId: cred.serviceId,
        orderSourceName: cred.serviceName,
        status: "PENDING",
      });

      if (errors) throw new Error(errors[0].message);
      
      alert("交換を申し込みました！");
      setSelectedGift(null);
      await fetchGifts();
    } catch (err: any) {
      alert(`エラーが発生しました: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full max-w-xs mx-auto shadow-inner">
        <button onClick={() => setExchangeTab("points")} className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-[10px] font-black transition-all ${exchangeTab === "points" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>ポイント交換</button>
        <button onClick={() => setExchangeTab("gifts")} className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-[10px] font-black transition-all ${exchangeTab === "gifts" ? "bg-orange-500 text-white shadow-sm" : "text-slate-400"}`}>ギフト交換</button>
      </div>

      <div className="animate-in fade-in duration-500">
        {exchangeTab === "points" ? (
          <PointExchange client={client} userEmail={userEmail} styles={styles} services={services} setActiveTab={setActiveTab} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gifts.map((gift) => (
              <div key={gift.id} className="bg-white rounded-[1.5rem] border border-slate-100 p-4 flex flex-col">
                {/* 画像表示エリアを追加 */}
                <div className="aspect-square w-full mb-4 bg-slate-50 rounded-[1.2rem] overflow-hidden border border-slate-50 flex items-center justify-center">
                  {gift.imageUrl ? (
                    <img src={gift.imageUrl} alt={gift.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[24px]">🎁</span>
                  )}
                </div>
                
                <h4 className="text-xs font-black text-slate-800 line-clamp-1">{gift.name}</h4>
                <p className="text-[10px] text-orange-500 mt-1 font-black">{gift.pointCost.toLocaleString()} pts</p>
                <button 
                  onClick={() => setSelectedGift(gift)} 
                  className="w-full mt-4 bg-slate-900 hover:bg-orange-500 text-white py-2.5 rounded-xl text-[9px] font-black transition-colors"
                >
                  交換する
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 space-y-6">
            <h3 className="text-lg font-black text-center text-slate-900">支払い元選択</h3>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center border border-slate-100">
                  {selectedGift.imageUrl ? <img src={selectedGift.imageUrl} className="w-8 h-8 object-contain" /> : "🎁"}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">{selectedGift.name}</p>
                  <p className="text-[10px] text-orange-500 font-bold">{selectedGift.pointCost.toLocaleString()} pts</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 mb-1.5 ml-1 uppercase">消費するサービスを選択</label>
              <select className="w-full p-3 bg-white rounded-xl border-2 border-slate-100 text-xs font-bold focus:border-orange-500 outline-none transition-all" value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
                {userCredentials.map((c) => (
                  <option key={c.id} value={c.serviceId}>{c.serviceName} (残高: {c.dummyBalance} pts)</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setSelectedGift(null)} className="flex-1 py-3 bg-slate-100 text-slate-400 font-black rounded-xl text-[10px] hover:bg-slate-200 transition-colors">戻る</button>
              <button 
                onClick={handleGiftExchange} 
                disabled={isProcessing}
                className={`flex-1 py-3 bg-slate-900 text-white font-black rounded-xl text-[10px] shadow-lg shadow-slate-200 hover:bg-orange-600 transition-colors ${isProcessing ? 'opacity-50' : ''}`}
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
