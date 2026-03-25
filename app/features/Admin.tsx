"use client";

import { useState, useEffect } from "react";
import { AdminHistory } from "./AdminHistory";
import { uploadData, getUrl } from "aws-amplify/storage";

// 画像をパスからURLに変換するコンポーネント
const GiftImage = ({ path }: { path: string }) => {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (!path) return;
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }
    // 表示のたびに新しい署名付きURLを取得（デフォルト1時間有効）
    getUrl({ path }).then(res => setUrl(res.url.toString()));
  }, [path]);

  if (!url) return <div className="w-full h-full bg-slate-100 animate-pulse" />;
  return <img src={url} className="w-full h-full object-cover" alt="gift" />;
};

export const AdminPanel = ({ client, styles, services = [], onRefresh }: any) => {
  const [activeAdminTab, setActiveAdminTab] = useState("services");
  const [isProcessing, setIsProcessing] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  const [newServiceName, setNewServiceName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newShopId, setNewShopId] = useState("");
  const [newAuthKey, setNewAuthKey] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const [gifts, setGifts] = useState<any[]>([]);
  const [isEditingGift, setIsEditingGift] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  
  const [newGiftName, setNewGiftName] = useState("");
  const [giftDescription, setGiftDescription] = useState("");
  const [giftPoints, setGiftPoints] = useState("1");
  const [giftStock, setGiftStock] = useState("1");
  const [giftImageUrl, setGiftImageUrl] = useState(""); // ここには S3のパス（public/...）が入る

  const [gifteeItems, setGifteeItems] = useState<any[]>([]);
  const [gifteeType, setGifteeType] = useState("giftee-card");
  const [gifteeCode, setGifteeCode] = useState("");

  const fetchUsers = async () => {
    try {
      const { data } = await client.models.UserProfile.list();
      if (data) setAllProfiles(data);
    } catch (err) { console.error("ユーザー取得失敗:", err); }
  };

  const fetchGifts = async () => {
    try {
      const { data } = await client.models.GiftMaster.list({ filter: { isActive: { eq: true } } });
      if (data) setGifts(data);
    } catch (err) { console.error("ギフト取得失敗:", err); }
  };

  const fetchGifteeItems = async () => {
    try {
      const { data } = await client.models.GifteeMaster.list({ filter: { isActive: { eq: true } } });
      if (data) setGifteeItems(data);
    } catch (err) { console.error("giftee取得失敗:", err); }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await client.models.GiftOrder.list();
      if (data) setOrders(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) { console.error("注文取得失敗:", err); }
  };

  useEffect(() => {
    fetchUsers();
    fetchGifts();
    fetchGifteeItems();
    fetchOrders();
  }, [client]);

  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const safeFileName = file.name.replace(/\s+/g, '_');
      const key = `gift-${Date.now()}-${safeFileName}`;
      const fullPath = `public/${key}`;
      
      const uploadOperation = uploadData({
        path: fullPath,
        data: file,
        options: { contentType: file.type }
      });
      await uploadOperation.result;
      
      // URLではなく「パス（キー）」をステートに入れる
      setGiftImageUrl(fullPath);
      alert("画像を仮保存しました。登録ボタンを押すと確定します。");
      
    } catch (err: any) {
      console.error("アップロード詳細エラー:", err);
      alert(`アップロード失敗: ${err.message || "権限エラー"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const shipOrder = async (order: any) => {
    if (!confirm(`${order.giftName} の配送を完了としてマークしますか？\n配送先: ${order.shippingName} 様`)) return;
    setIsProcessing(true);
    try {
      // 1. ステータス更新
      await client.models.GiftOrder.update({ id: order.id, status: "SHIPPED" });
      
      // 2. 発送完了メール送信 (お届け先情報を追加)
      try {
        await client.mutations.sendShipmentNotification({
          userEmail: order.userEmail,
          giftName: order.giftName,
          shippingName: order.shippingName || "お客様",
          shippingZip: order.shippingZip || "---",
          shippingAddress: order.shippingAddress || "---",
          shippingTel: order.shippingTel || "---"
        });
      } catch (mailErr) {
        console.error("メール送信失敗（管理用）:", mailErr);
        // メール送信に失敗しても、ステータス更新は完了しているので警告のみ
        alert("配送ステータスは更新されましたが、通知メールの送信に失敗しました。");
      }

      alert(`配送完了として記録し、メールを送信しました。`);
      fetchOrders();
    } catch (err: any) {
      alert("エラー: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const addService = async () => {
    if (!newServiceName) return alert("サービス名を入力してください");
    setIsProcessing(true);
    try {
      const settings = JSON.stringify({ shopId: newShopId, authKey: newAuthKey });
      const payload = {
        name: newServiceName,
        type: newServiceName.includes("ダミー") ? "DUMMY" : "SHOPSERVE",
        endpointUrl: "https://api.shopserve.jp/v1",
        connectionSettings: settings,
        description: newDescription || "サービス説明",
        status: "ACTIVE",
        dummyBalance: 300
      };

      if (viewingId) {
        await client.models.ServiceMaster.update({ id: viewingId, ...payload });
        alert("サービス情報を更新しました");
      } else {
        await client.models.ServiceMaster.create(payload);
        alert("新規サービスを登録しました");
      }

      resetServiceForm();
      if (onRefresh) await onRefresh();
    } catch (err) { 
      alert("処理に失敗しました"); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const resetServiceForm = () => {
    setNewServiceName(""); setNewDescription(""); setNewShopId(""); setNewAuthKey("");
    setViewingId(null);
  };

  const handleGiftSubmit = async () => {
    if (!newGiftName) return alert("ギフト名を入力してください");
    const pointsNum = parseInt(giftPoints, 10);
    const stockNum = parseInt(giftStock, 10);
    if (isNaN(pointsNum) || pointsNum < 1) return alert("必要ポイント数は1以上で入力してください");
    setIsProcessing(true);
    try {
      const payload = { name: newGiftName, description: giftDescription, pointCost: pointsNum, stock: stockNum, imageUrl: giftImageUrl, isActive: true };
      if (isEditingGift && editingGiftId) await client.models.GiftMaster.update({ id: editingGiftId, ...payload });
      else await client.models.GiftMaster.create(payload);
      resetGiftForm();
      await fetchGifts();
      alert("完了しました");
    } catch (err) { alert("失敗しました"); } finally { setIsProcessing(false); }
  };

  const handleGifteeSubmit = async () => {
    if (!newGiftName) return alert("ギフト名称を入力してください");
    if (!gifteeCode) return alert("ギフトコードを入力してください");
    const pointsNum = parseInt(giftPoints, 10);
    setIsProcessing(true);
    try {
      const payload = {
        type: gifteeType,
        name: newGiftName,
        pointCost: pointsNum,
        giftCode: gifteeCode,
        imageUrl: giftImageUrl,
        isActive: true
      };
      if (isEditingGift && editingGiftId) await client.models.GifteeMaster.update({ id: editingGiftId, ...payload });
      else await client.models.GifteeMaster.create(payload);
      resetGiftForm();
      await fetchGifteeItems();
      alert("gifteeアイテムを保存しました");
    } catch (err) { alert("失敗しました"); } finally { setIsProcessing(false); }
  };

  const resetGiftForm = () => {
    setNewGiftName(""); setGiftDescription(""); setGiftPoints("1"); setGiftStock("1"); setGiftImageUrl("");
    setGifteeCode(""); setGifteeType("giftee-card");
    setIsEditingGift(false); setEditingGiftId(null);
  };

  const startEditGift = (gift: any) => {
    setIsEditingGift(true); setEditingGiftId(gift.id); setNewGiftName(gift.name);
    setGiftDescription(gift.description || ""); setGiftPoints(gift.pointCost.toString());
    setGiftStock(gift.stock?.toString() || "1"); setGiftImageUrl(gift.imageUrl || "");
    if (activeAdminTab === "giftee") {
      setGifteeType(gift.type || "giftee-card");
      setGifteeCode(gift.giftCode || "");
    }
    scrollToTop();
  };

  const startView = (service: any) => {
    setViewingId(service.id);
    setNewServiceName(service.name);
    setNewDescription(service.description || "");
    try {
      const settings = JSON.parse(service.connectionSettings || "{}");
      setNewShopId(settings.shopId || "");
      setNewAuthKey(settings.authKey || "");
    } catch (e) {
      setNewShopId(""); setNewAuthKey("");
    }
    scrollToTop();
  };

  const deleteService = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await client.models.ServiceMaster.delete({ id });
    if (onRefresh) onRefresh();
  };

  const deleteItem = async (id: string, modelName: "GiftMaster" | "GifteeMaster") => {
    if (!confirm("削除しますか？")) return;
    await (client.models as any)[modelName].update({ id, isActive: false });
    modelName === "GiftMaster" ? fetchGifts() : fetchGifteeItems();
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-wrap gap-2 mb-10 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {[
          { id: "services", label: "ポイント交換マスター", icon: "🪙" },
          { id: "gifts", label: "自社ギフト管理", icon: "🎁" },
          { id: "giftee", label: "giftee管理", icon: "🎟️" },
          { id: "orders", label: "注文管理", icon: "🚚" },
          { id: "users", label: "ユーザー一覧", icon: "👤" },
          { id: "history", label: "履歴検索", icon: "🔍" }
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveAdminTab(tab.id); resetGiftForm(); scrollToTop(); }}
            className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              activeAdminTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeAdminTab === "services" && (
          <div className="space-y-12">
            {/* サービス登録・編集セクション */}
            <section className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner space-y-6">
              <h3 className={styles.sectionTitle}>{viewingId ? "🔍 サービス詳細・編集" : "🪙 ポイント交換マスター登録"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={styles.label}>サービス名</label><input value={newServiceName} onChange={e=>setNewServiceName(e.target.value)} className={styles.input} /></div>
                <div><label className={styles.label}>サービス説明</label><input value={newDescription} onChange={e=>setNewDescription(e.target.value)} className={styles.input} /></div>
                <div><label className={styles.label}>ショップID</label><input value={newShopId} onChange={e=>setNewShopId(e.target.value)} className={styles.input} autoComplete="off" /></div>
                <div><label className={styles.label}>APIキー</label><input type="password" value={newAuthKey} onChange={e=>setNewAuthKey(e.target.value)} className={styles.input} autoComplete="new-password" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={addService} disabled={isProcessing} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-orange-500 transition-all shadow-xl">{viewingId ? "更新保存" : "登録"}</button>
                {viewingId && <button onClick={resetServiceForm} className="px-8 py-4 bg-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-300 transition-all">キャンセル</button>}
              </div>
            </section>
            <section className="space-y-4">
              <h3 className={styles.sectionTitle}>📋 サービス一覧</h3>
              {services.map((s: any) => (
                <div key={s.id} className="p-6 bg-white rounded-3xl border-2 border-slate-50 flex justify-between items-center shadow-sm">
                  <span className="font-black text-slate-800">{s.name}</span>
                  <div className="flex space-x-2">
                    <button onClick={() => startView(s)} className={`px-4 py-2 text-[10px] font-black border rounded-xl transition-all ${viewingId === s.id ? "bg-orange-500 text-white border-orange-500" : "text-slate-400 border-slate-100 hover:bg-slate-50"}`}>詳細</button>
                    <button onClick={() => deleteService(s.id)} className="px-4 py-2 text-[10px] font-black text-red-200 hover:text-red-500 transition-colors">削除</button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeAdminTab === "gifts" && (
          <div className="space-y-12">
            <section className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
              <h3 className={styles.sectionTitle}>{isEditingGift ? "✏️ 自社ギフト編集" : "🎁 自社ギフト登録"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><label className={styles.label}>ギフト名</label><input value={newGiftName} onChange={e=>setNewGiftName(e.target.value)} className={styles.input} /></div>
                <div><label className={styles.label}>ポイント</label><input type="number" value={giftPoints} onInput={(e: any) => setGiftPoints(e.target.value)} className={styles.input} /></div>
                <div><label className={styles.label}>在庫</label><input type="number" value={giftStock} onInput={(e: any) => setGiftStock(e.target.value)} className={styles.input} /></div>
                <div className="md:col-span-2">
                  <label className={styles.label}>ギフト画像</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-white border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                        <GiftImage path={giftImageUrl} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-900 file:text-white hover:file:bg-orange-500 file:transition-all" />
                      </div>
                    </div>
                    <input value={giftImageUrl} onChange={e=>setGiftImageUrl(e.target.value)} className={styles.input} placeholder="public/gift-..." />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleGiftSubmit} disabled={isProcessing} className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg hover:bg-slate-900 transition-all">{isEditingGift ? "保存" : "登録"}</button>
                {isEditingGift && <button onClick={resetGiftForm} className="px-8 py-4 bg-slate-100 rounded-2xl font-black text-slate-400">キャンセル</button>}
              </div>
            </section>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gifts.map((g) => (
                <div key={g.id} className="p-4 bg-white rounded-3xl border-2 border-slate-50 flex items-center shadow-sm">
                  <div className="w-12 h-12 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 mr-4 flex-shrink-0 flex items-center justify-center">
                    <GiftImage path={g.imageUrl} />
                  </div>
                  <div className="flex-1 min-w-0 mr-4">
                    <h4 className="font-black text-slate-800 truncate">{g.name}</h4>
                    <p className="text-[10px] text-orange-500 font-bold">{g.pointCost} pts / 在庫: {g.stock}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => startEditGift(g)} className="px-3 py-1.5 text-[10px] font-black text-slate-400 border border-slate-100 rounded-lg hover:bg-slate-50 transition-all">編集</button>
                    <button onClick={() => deleteItem(g.id, "GiftMaster")} className="text-red-300 hover:text-red-500 px-2 text-[10px] font-black">削除</button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* giftee管理 */}
        {activeAdminTab === "giftee" && (
          <div className="space-y-12">
            <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl space-y-6">
              <h3 className="text-xl font-black">{isEditingGift ? "✏️ gifteeアイテム編集" : "🎟️ gifteeアイテム登録"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">ギフト種別</label>
                  <div className="flex gap-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input type="radio" name="gifteeType" value="giftee-card" checked={gifteeType === "giftee-card"} onChange={e=>setGifteeType(e.target.value)} className="w-5 h-5 accent-orange-500" />
                      <span className={`text-sm font-black ${gifteeType === 'giftee-card' ? 'text-white' : 'text-slate-500'}`}>giftee-card</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input type="radio" name="gifteeType" value="giftee-box" checked={gifteeType === "giftee-box"} onChange={e=>setGifteeType(e.target.value)} className="w-5 h-5 accent-orange-500" />
                      <span className={`text-sm font-black ${gifteeType === 'giftee-box' ? 'text-white' : 'text-slate-500'}`}>giftee-box</span>
                    </label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">ギフト名称</label>
                  <input value={newGiftName} onChange={e=>setNewGiftName(e.target.value)} className="w-full bg-white/10 border-2 border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">交換ポイント数</label>
                  <input type="number" value={giftPoints} onChange={e=>setGiftPoints(e.target.value)} className="w-full bg-white/10 border-2 border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">ギフトコード</label>
                  <input value={gifteeCode} onChange={e=>setGifteeCode(e.target.value)} className="w-full bg-white/10 border-2 border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500 transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">画像指定</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border-2 border-dashed border-white/10">
                      <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                        <GiftImage path={giftImageUrl} />
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs font-bold text-slate-400" />
                    </div>
                    <input value={giftImageUrl} onChange={e=>setGiftImageUrl(e.target.value)} className="w-full bg-white/10 border-2 border-white/5 rounded-2xl px-6 py-4 text-white" placeholder="public/gift-..." />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleGifteeSubmit} disabled={isProcessing} className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all">{isEditingGift ? "更新保存" : "giftee登録"}</button>
                {isEditingGift && <button onClick={resetGiftForm} className="px-8 py-4 bg-white/10 rounded-2xl font-black text-white">キャンセル</button>}
              </div>
            </section>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gifteeItems.map((g) => (
                <div key={g.id} className="p-4 bg-slate-900 border border-white/10 rounded-3xl flex items-center">
                  <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden mr-4 flex-shrink-0 flex items-center justify-center">
                    <GiftImage path={g.imageUrl} />
                  </div>
                  <div className="flex-1 min-w-0 mr-4">
                    <span className="text-[8px] font-black px-2 py-0.5 bg-orange-500 text-white rounded-full uppercase tracking-tighter mb-1 inline-block">{g.type}</span>
                    <h4 className="font-black text-white truncate">{g.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold">{g.pointCost} pts / Code: {g.giftCode}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => startEditGift(g)} className="px-3 py-1.5 text-[10px] font-black text-slate-400 border border-white/10 rounded-lg hover:bg-white/10">編集</button>
                    <button onClick={() => deleteItem(g.id, "GifteeMaster")} className="text-red-400 hover:text-red-500 px-2 text-[10px] font-black">削除</button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeAdminTab === "orders" && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className={styles.sectionTitle}>🚚 ギフト注文管理</h3>
              <button onClick={fetchOrders} className="text-[10px] font-black text-slate-400 hover:text-orange-500 transition-colors">最新の情報に更新</button>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                  <tr><th className="p-6">注文日時</th><th className="p-6">配送先情報</th><th className="p-6">ギフト内容</th><th className="p-6">交換元ショップ</th><th className="p-6 text-center">ステータス</th><th className="p-6 text-right">アクション</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 text-[10px] font-bold text-slate-400">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="p-6">
                        <div className="flex flex-col space-y-1">
                          <span className="font-black text-slate-900">{o.shippingName || "---"} 様</span>
                          <span className="text-[10px] text-slate-500">〒{o.shippingZip} {o.shippingAddress}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="font-black text-slate-900">{o.giftName}</span><br/>
                        <span className="text-[10px] text-orange-500 font-bold">{o.pointSpent.toLocaleString()} pts</span>
                      </td>
                      <td className="p-6"><span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black">{o.orderSourceName || "---"}</span></td>
                      <td className="p-6 text-center"><span className={`px-3 py-1 rounded-full text-[9px] font-black ${o.status === 'SHIPPED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{o.status === 'PENDING' ? '配送準備' : o.status === 'SHIPPED' ? '配送済' : o.status}</span></td>
                      <td className="p-6 text-right">{o.status === 'PENDING' && <button onClick={() => shipOrder(o)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black hover:bg-orange-500">配送</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeAdminTab === "users" && (
          <section className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead><tr className="bg-slate-800 text-[10px] font-black uppercase"><th className="p-6">名前</th><th className="p-6">メール</th><th className="p-6 text-right">住所</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {allProfiles.map((u: any) => (
                  <tr key={u.id}><td className="p-6 font-black text-white">{u.name || "未設定"}</td><td className="p-6">{u.email}</td><td className="p-6 text-right text-[10px]">{u.address || "未設定"}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeAdminTab === "history" && <AdminHistory client={client} styles={styles} />}
      </div>
    </div>
  );
};
