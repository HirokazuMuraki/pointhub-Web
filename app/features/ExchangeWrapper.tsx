"use client";

import { useState, useEffect, useCallback } from "react";
import { PointExchange } from "./PointExchange";
import { getUrl } from "aws-amplify/storage";
import { useAlert } from "./AlertProvider";

// 問い合わせ番号生成ユーティリティ
const generateTrackingNumber = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${datePart}-${randomPart}`;
};

const GiftImage = ({ path }: { path: string }) => {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    if (!path) return;
    if (path.startsWith('http')) { setUrl(path); return; }
    getUrl({ path }).then(res => setUrl(res.url.toString()));
  }, [path]);
  if (!url) return <div className="w-full h-full bg-slate-50 animate-pulse" />;
  return <img src={url} className="w-full h-full object-cover" alt="gift" />;
};

export const ExchangeWrapper = ({ client, userEmail, services, styles, setActiveTab }: any) => {
  const { showAlert, showConfirm } = useAlert();
  const [exchangeTab, setExchangeTab] = useState("points");
  const [gifts, setGifts] = useState<any[]>([]);
  const [userCredentials, setUserCredentials] = useState<any[]>([]);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({ name: "", zip: "", address: "", tel: "" });
  const [showDescriptionGift, setShowDescriptionGift] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<any>(null);

  const getSvcInfo = useCallback((serviceId: string) => {
    const svcMaster = services.find((s: any) => s.id === serviceId);
    if (!svcMaster) return null;
    const settings = JSON.parse(svcMaster.connectionSettings || "{}");
    return { shopId: settings?.shopId, masterAuthKey: settings?.authKey };
  }, [services]);

  const fetchGifts = async () => {
    try {
      const [giftRes, gifteeRes] = await Promise.all([
        client.models.GiftMaster.list({ filter: { isActive: { eq: true } } }),
        client.models.GifteeMaster.list({ filter: { isActive: { eq: true } } })
      ]);
      const masterGifts = (giftRes.data || []).map((g: any) => ({ ...g, _type: 'master' }));
      const gifteeGifts = (gifteeRes.data || []).map((g: any) => ({ ...g, _type: 'giftee', stock: 999 }));
      setGifts([...masterGifts, ...gifteeGifts]);
    } catch (err) { console.error("ギフト取得失敗:", err); }
  };

  const fetchCredentials = async () => {
    try {
      const { data } = await client.models.UserServiceCredential.list({ filter: { userEmail: { eq: userEmail } } });
      if (data) {
        setUserCredentials(data);
        if (data.length > 0 && !selectedServiceId) setSelectedServiceId(data[0].id);
      }
    } catch (err) { console.error("認証情報取得失敗:", err); }
  };

  const fetchUserProfile = async () => {
    try {
      const { data } = await client.models.UserProfile.list({ filter: { email: { eq: userEmail } } });
      if (data && data[0]) {
        const profile = data[0];
        setShippingInfo({ name: profile.name || "", zip: profile.zipCode || "", address: profile.address || "", tel: profile.phoneNumber || "" });
      }
    } catch (err) { console.error("プロフィール取得失敗:", err); }
  };

  useEffect(() => {
    if (exchangeTab === "gifts") { fetchGifts(); fetchCredentials(); fetchUserProfile(); }
  }, [exchangeTab]);

  const fetchAddressFromZip = async (zip: string) => {
    const cleanZip = zip.replace(/-/g, "");
    if (cleanZip.length !== 7) return;
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`);
      const data = await res.json();
      if (data.results) {
        const result = data.results[0];
        const fullAddress = `${result.address1}${result.address2}${result.address3}`;
        setShippingInfo(prev => ({ ...prev, zip, address: fullAddress }));
      }
    } catch (err) { console.error("住所検索失敗:", err); }
  };

  const handleGiftExchange = async () => {
    if (!selectedGift || !selectedServiceId || isProcessing) return;
    const cred = userCredentials.find((c:any) => c.id === selectedServiceId);
    if (!cred) return;

    const ok = await showConfirm(`${selectedGift.name} と交換しますか？`);
    if (!ok) return;

    setIsProcessing(true);
    let isPointDeducted = false; // ロールバック判定用フラグ

    try {
      const modelName = selectedGift._type === 'master' ? 'GiftMaster' : 'GifteeMaster';
      const { data: latestGift } = await (client.models as any)[modelName].get({ id: selectedGift.id });
      if (!latestGift || (selectedGift._type === 'master' && latestGift.stock < 1)) throw new Error("在庫がありません。");

      const trackingNumber = generateTrackingNumber();
      const balanceBefore = cred.dummyBalance || 0;
      const balanceAfter = balanceBefore - latestGift.pointCost;

      if (balanceAfter < 0) throw new Error("ポイント残高が不足しています。");

      // 1. ポイント減算
      if (!cred.serviceName.includes("ダミー")) {
        const info = getSvcInfo(cred.serviceId);
        const { data: opResult } = await client.mutations.operateShopservePoints({
          accountId: cred.loginId,
          shopId: info?.shopId,
          authKey: info?.masterAuthKey || cred.password,
          amount: -latestGift.pointCost,
          note: `PointHub-Gift:${trackingNumber}`
        });
        if (!opResult?.success) throw new Error(opResult?.message || "ポイント減算に失敗しました。");
      }
      isPointDeducted = true;

      // 2. 残高更新
      await client.models.UserServiceCredential.update({ id: cred.id, dummyBalance: balanceAfter });

      let gifteeUrl = "";
      let gifteeOrderId = "";

      // 3. ギフト種別ごとの処理
      if (selectedGift._type === 'giftee') {
        const targetProductId = latestGift.giftCode || latestGift.brandProductId;
        const { data: gifteeResult } = await client.queries.issueGifteeTicket({
          brandProductId: targetProductId,
          category: latestGift.type || "card",
          point: latestGift.pointCost,
          userName: shippingInfo.name || userEmail,
          userEmail: userEmail,
          giftName: latestGift.name,
          fromServiceName: cred.serviceName,
          balanceAfter: balanceAfter
        });
        
        // Lambdaからエラーが返った、または正常終了なのにURLが取得出来なかった場合は処理を中断して例外を投げる
        if (gifteeResult?.success && gifteeResult.url) {
          gifteeUrl = gifteeResult.url;
          gifteeOrderId = gifteeResult.orderId || "";
        } else {
          const errMsg = gifteeResult?.message || "デジタルギフト券面の発行に必要なURLの取得に失敗しました。";
          throw new Error(errMsg);
        }
      } else {
        await client.models.GiftMaster.update({ id: latestGift.id, stock: latestGift.stock - 1 });
        
        await client.queries.sendEmail({
          to: userEmail,
          subject: "GIFT_ORDER",
          body: JSON.stringify({
            userName: shippingInfo.name,
            trackingNumber: trackingNumber,
            fromService: cred.serviceName,
            toService: latestGift.name,
            points: latestGift.pointCost,
            balance: balanceAfter,
            shippingZip: shippingInfo.zip,
            shippingAddress: shippingInfo.address,
            shippingTel: shippingInfo.tel
          })
        });
      }

      // 4. 履歴作成
      await client.models.GiftOrder.create({
        userEmail, giftId: latestGift.id, giftName: latestGift.name,
        pointSpent: latestGift.pointCost, dummyBalance: balanceAfter,
        orderSourceId: cred.serviceId, orderSourceName: cred.serviceName,
        status: selectedGift._type === 'giftee' ? "COMPLETED" : "PENDING",
        shippingName: shippingInfo.name || "giftee交換",
        shippingZip: shippingInfo.zip || "000-0000",
        shippingAddress: shippingInfo.address || "デジタル送付",
        shippingTel: shippingInfo.tel || "000-0000-0000",
        gifteeUrl, gifteeOrderId, trackingNumber
      });

      setShowSuccessModal({
        trackingNumber,
        giftName: latestGift.name,
        serviceName: cred.serviceName,
        pointCost: latestGift.pointCost,
        balanceAfter,
        gifteeUrl
      });

      setSelectedGift(null);
      await Promise.all([fetchGifts(), fetchCredentials()]);

    } catch (err: any) {
      // もしすでにポイントが減算された後にエラーが起きた場合、安全に元のポイントに払い戻し(相殺)を行う
      if (isPointDeducted && cred && selectedGift) {
        try {
          // ローカルの残高表示を元の状態に戻す
          const { data: currentCred } = await client.models.UserServiceCredential.get({ id: cred.id });
          if (currentCred) {
            const restoredBalance = (currentCred.dummyBalance || 0) + selectedGift.pointCost;
            await client.models.UserServiceCredential.update({ id: cred.id, dummyBalance: restoredBalance });
          }

          // Shopserveの実ポイントを加算して相殺する
          if (!cred.serviceName.includes("ダミー")) {
            const info = getSvcInfo(cred.serviceId);
            await client.mutations.operateShopservePoints({
              accountId: cred.loginId,
              shopId: info?.shopId,
              authKey: info?.masterAuthKey || cred.password,
              amount: selectedGift.pointCost, // プラス（加算）してロールバック
              note: `Rollback-Gift-Error`
            });
          }
        } catch (rollbackErr) {
          console.error("ポイントの払い戻し（ロールバック）処理自体に失敗しました:", rollbackErr);
        }
      }

      // 🔴 修正: エラー時に「交換内容の確認」ポップアップ（モーダル）を閉じる
      setSelectedGift(null);

      await showAlert(`交換エラー: ${err.message}`);
      fetchCredentials();
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
          <PointExchange 
            client={client} userEmail={userEmail} styles={styles} services={services} 
            setActiveTab={setActiveTab} generateTrackingNumber={generateTrackingNumber}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {gifts.map((gift) => (
              <div key={gift.id} className="bg-white rounded-[2rem] border-2 border-slate-50 p-5 flex flex-col relative overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className={`absolute top-4 right-4 z-20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${gift._type === 'giftee' ? 'bg-slate-900 text-orange-400' : 'bg-orange-500 text-white'}`}>
                  {gift._type === 'giftee' ? (gift.type === 'giftee-box' ? '🎟️ GifteeBox' : '🎟️ GifteeCard') : '🎁 Original'}
                </div>
                {gift._type === 'master' && gift.stock < 1 && (
                  <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center pointer-events-none">
                    <span className="bg-red-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg transform -rotate-12">OUT OF STOCK</span>
                  </div>
                )}
                <div className={`aspect-square w-full mb-5 rounded-[1.5rem] overflow-hidden border flex items-center justify-center transition-colors relative ${gift._type === 'giftee' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-50'}`}>
                  {gift.imageUrl ? <GiftImage path={gift.imageUrl} /> : <span className="text-[32px]">{gift._type === 'giftee' ? '🎟️' : '🎁'}</span>}
                  
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button 
                      onClick={() => setShowDescriptionGift(gift)}
                      className="bg-white text-slate-900 px-4 py-2 rounded-full text-[10px] font-black shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all hover:bg-orange-500 hover:text-white"
                    >
                      商品説明を見る
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-black text-slate-800 line-clamp-2 min-h-[2.5rem] leading-tight">{gift.name}</h4>
                <div className="flex justify-between items-end mt-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Cost</span>
                    <p className="text-[16px] text-orange-500 font-black leading-none">{gift.pointCost.toLocaleString()}<span className="text-[10px] ml-0.5">pts</span></p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl font-black text-[11px] ${gift._type === 'giftee' || gift.stock > 0 ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-400'}`}>
                    {gift._type === 'giftee' ? '即時発行' : `在庫: ${gift.stock}`}
                  </div>
                </div>
                <button onClick={() => setSelectedGift(gift)} disabled={gift._type === 'master' && gift.stock < 1} className={`w-full mt-5 py-3.5 rounded-2xl text-[11px] font-black transition-all ${gift._type === 'giftee' || gift.stock > 0 ? "bg-slate-900 hover:bg-orange-500 text-white shadow-lg active:scale-95" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}>
                  {gift._type === 'master' && gift.stock < 1 ? "在庫切れ" : "交換を申し込む"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDescriptionGift && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <button 
              onClick={() => setShowDescriptionGift(null)}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
            >
              ✕
            </button>
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border ${showDescriptionGift._type === 'giftee' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  {showDescriptionGift.imageUrl ? <GiftImage path={showDescriptionGift.imageUrl} /> : <span className="text-2xl">{showDescriptionGift._type === 'giftee' ? '🎟️' : '🎁'}</span>}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{showDescriptionGift.name}</h3>
                  <p className="text-orange-500 font-black text-sm mt-1">{showDescriptionGift.pointCost.toLocaleString()} pts</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-3xl p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Item Description</p>
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {showDescriptionGift.description || "商品説明はありません。"}
                </div>
              </div>
              <button 
                onClick={() => setShowDescriptionGift(null)}
                className="w-full py-4 rounded-2xl text-sm font-black transition-all bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">ギフト交換が完了しました。</h3>
              
              <div className="bg-slate-50 rounded-3xl p-6 text-left space-y-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">■ お申し込み内容</p>
                
                <div className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">・お問い合わせ番号</span>
                    <span className="text-xs text-slate-800 font-black tracking-wider pl-2">{showSuccessModal.trackingNumber}</span>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">・交換ギフト</span>
                    <span className="text-xs text-slate-800 font-black pl-2">{showSuccessModal.giftName}</span>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">・交換元サービス</span>
                    <span className="text-xs text-slate-800 font-black pl-2">{showSuccessModal.serviceName}</span>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">・消費ポイント</span>
                    <span className="text-xs text-orange-500 font-black pl-2">{showSuccessModal.pointCost.toLocaleString()} ポイント</span>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">・交換後の残高</span>
                    <span className="text-xs text-slate-800 font-black pl-2">{showSuccessModal.balanceAfter.toLocaleString()} ポイント</span>
                  </div>

                  {showSuccessModal.gifteeUrl && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold">・ギフト受取URL</span>
                      <a href={showSuccessModal.gifteeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 font-black hover:underline break-all pl-2">
                        {showSuccessModal.gifteeUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-[10px] text-slate-400 font-bold">ギフト交換結果はメールでもご確認頂けます。</p>
              
              <button 
                onClick={() => setShowSuccessModal(null)}
                className="w-full py-4 rounded-2xl text-sm font-black transition-all bg-slate-900 text-white hover:bg-orange-500 shadow-lg active:scale-95"
              >
                確認しました
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 my-auto space-y-6 animate-in zoom-in-95 duration-200 shadow-2xl">
            <h3 className="text-xl font-black text-center text-slate-900">交換内容の確認</h3>
            <div className="space-y-3">
              <div className={`${selectedGift._type === 'giftee' ? 'bg-slate-900 text-white' : 'bg-orange-50'} p-4 rounded-[1.5rem] border ${selectedGift._type === 'giftee' ? 'border-slate-800' : 'border-orange-100'}`}>
                <div className="flex items-center space-x-4 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border ${selectedGift._type === 'giftee' ? 'bg-slate-800 border-slate-700' : 'bg-white border-orange-100'}`}>
                    {selectedGift.imageUrl ? <GiftImage path={selectedGift.imageUrl} /> : <span className="text-xl">{selectedGift._type === 'giftee' ? '🎟️' : '🎁'}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[10px] font-black uppercase leading-none mb-1 text-orange-400`}>
                      {selectedGift._type === 'giftee' ? 'giftee Digital Item' : 'Original Gift'}
                    </p>
                    <p className={`text-xs font-black truncate ${selectedGift._type === 'giftee' ? 'text-white' : 'text-slate-800'}`}>{selectedGift.name}</p>
                  </div>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-xl ${selectedGift._type === 'giftee' ? 'bg-white/5' : 'bg-white/50'}`}>
                  <span className={`text-[10px] font-black uppercase text-slate-400`}>Total Cost</span>
                  <span className="text-lg text-orange-500 font-black">{selectedGift.pointCost.toLocaleString()} pts</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Source</label>
                <select className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 text-sm font-bold focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer" value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
                  {userCredentials.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.serviceName} (残高: {c.dummyBalance} pts)</option>
                  ))}
                </select>
              </div>
            </div>
            {selectedGift._type === 'master' ? (
              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Shipping Info</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 ml-1">お名前</label>
                    <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-orange-500 text-xs font-bold transition-all outline-none" value={shippingInfo.name} onChange={(e) => setShippingInfo({...shippingInfo, name: e.target.value})} placeholder="山田 太郎" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 ml-1">郵便番号</label>
                    <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-orange-500 text-xs font-bold transition-all outline-none" value={shippingInfo.zip} onChange={(e) => {
                      const val = e.target.value;
                      setShippingInfo({...shippingInfo, zip: val});
                      fetchAddressFromZip(val);
                    }} placeholder="123-4567" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 ml-1">お届け先住所</label>
                  <textarea className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-orange-500 text-xs font-bold transition-all outline-none resize-none" rows={2} value={shippingInfo.address} onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})} placeholder="都道府県・番地・マンション名" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 ml-1">電話番号</label>
                  <input type="tel" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-orange-500 text-xs font-bold transition-all outline-none" value={shippingInfo.tel} onChange={(e) => setShippingInfo({...shippingInfo, tel: e.target.value})} placeholder="090-0000-0000" />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-600 font-bold leading-relaxed">
                  ※giftee商品はデジタルギフトです。配送先の入力は不要です。確定後、履歴画面からギフトURLをすぐに確認できます。
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button onClick={() => setSelectedGift(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl text-xs hover:bg-slate-200 transition-colors">戻る</button>
              <button onClick={handleGiftExchange} disabled={isProcessing} className={`flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-xs shadow-xl shadow-slate-200 hover:bg-orange-600 transition-colors ${isProcessing ? 'opacity-50' : ''}`}>
                {isProcessing ? "処理中..." : "確定する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
