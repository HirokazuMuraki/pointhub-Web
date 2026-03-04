"use client";

import { useState, useEffect } from "react";
import { AdminHistory } from "./AdminHistory";

export const AdminPanel = ({ client, styles, services = [], onRefresh }: any) => {
  const [activeAdminTab, setActiveAdminTab] = useState("services");
  const [isProcessing, setIsProcessing] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  
  // --- サービス管理用ステート ---
  const [newServiceName, setNewServiceName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newShopId, setNewShopId] = useState("");
  const [newAuthKey, setNewAuthKey] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<any>(null);

  // --- ギフト管理用ステート ---
  const [gifts, setGifts] = useState<any[]>([]);
  const [newGiftName, setNewGiftName] = useState("");
  const [giftDescription, setGiftDescription] = useState("");
  const [giftPoints, setGiftPoints] = useState("1");
  const [giftStock, setGiftStock] = useState("1");
  const [giftImageUrl, setGiftImageUrl] = useState("");

  const fetchUsers = async () => {
    try {
      const { data } = await client.models.UserProfile.list();
      if (data) setAllProfiles(data);
    } catch (err) { console.error("ユーザー取得失敗:", err); }
  };

  const fetchGifts = async () => {
    try {
      const { data } = await client.models.GiftMaster.list();
      if (data) setGifts(data);
    } catch (err) { console.error("ギフト取得失敗:", err); }
  };

  useEffect(() => {
    fetchUsers();
    fetchGifts();
  }, [client]);

  const addService = async () => {
    if (!newServiceName) return alert("サービス名を入力してください");
    setIsProcessing(true);
    try {
      const settings = JSON.stringify({ shopId: newShopId, authKey: newAuthKey });
      await client.models.ServiceMaster.create({
        name: newServiceName,
        type: newServiceName.includes("ダミー") ? "DUMMY" : "SHOPSERVE",
        endpointUrl: "https://api.shopserve.jp/v1",
        connectionSettings: settings,
        description: newDescription || "サービス説明",
        status: "ACTIVE",
        dummyBalance: 300
      });
      setNewServiceName(""); setNewDescription(""); setNewShopId(""); setNewAuthKey("");
      if (onRefresh) await onRefresh();
      alert("新規サービスを登録しました");
    } catch (err) { alert("サービス登録に失敗しました"); } finally { setIsProcessing(false); }
  };

  const addGift = async () => {
    if (!newGiftName) return alert("ギフト名を入力してください");
    
    const pointsNum = parseInt(giftPoints, 10);
    const stockNum = parseInt(giftStock, 10);

    if (isNaN(pointsNum) || pointsNum < 1) return alert("必要ポイント数は1以上で入力してください");
    if (isNaN(stockNum) || stockNum < 1) return alert("在庫数は1以上で入力してください");
    
    setIsProcessing(true);
    try {
      const { errors } = await client.models.GiftMaster.create({
        name: newGiftName,
        description: giftDescription,
        pointCost: pointsNum,
        stock: stockNum,
        imageUrl: giftImageUrl,
        isActive: true,
      });
      if (errors) throw new Error(errors[0].message);
      
      setNewGiftName(""); 
      setGiftDescription(""); 
      setGiftPoints("1"); 
      setGiftStock("1"); 
      setGiftImageUrl("");
      
      await fetchGifts();
      alert("ギフトを登録しました");
    } catch (err) { 
      console.error(err);
      alert("ギフト登録に失敗しました"); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const startView = (service: any) => {
    let settings = { shopId: "", authKey: "" };
    try { settings = JSON.parse(service.connectionSettings || "{}"); } catch(e) {}
    setViewingId(service.id);
    setViewData({ ...service, shopId: settings.shopId, authKey: settings.authKey });
  };

  const deleteService = async (id: string) => {
    if (!confirm("⚠️ このサービスを削除しますか？")) return;
    try {
      await client.models.ServiceMaster.delete({ id });
      if (onRefresh) await onRefresh();
      setViewingId(null);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-wrap gap-2 mb-10 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {[
          { id: "services", label: "ポイント交換", icon: "🪙" },
          { id: "gifts", label: "ギフト交換設定", icon: "🎁" },
          { id: "users", label: "ユーザー一覧", icon: "👤" },
          { id: "history", label: "履歴検索", icon: "🔍" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id)}
            className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              activeAdminTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeAdminTab === "services" && (
          <div className="space-y-12">
            <section className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner space-y-6">
              <h3 className={styles.sectionTitle}>🪙 ポイント交換マスター登録</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={styles.label}>サービス名</label><input value={newServiceName} onChange={e=>setNewServiceName(e.target.value)} className={styles.input} placeholder="ショップサーブ本店" /></div>
                <div><label className={styles.label}>サービス説明</label><input value={newDescription} onChange={e=>setNewDescription(e.target.value)} className={styles.input} /></div>
                
                {/* ショップID: オートコンプリート無効化 */}
                <div>
                  <label className={styles.label}>ショップID</label>
                  <input 
                    value={newShopId} 
                    onChange={e=>setNewShopId(e.target.value)} 
                    className={styles.input} 
                    autoComplete="off"
                  />
                </div>
                
                {/* APIキー: パスワード補完を徹底防止 */}
                <div>
                  <label className={styles.label}>APIキー</label>
                  <input 
                    type="password" 
                    value={newAuthKey} 
                    onChange={e=>setNewAuthKey(e.target.value)} 
                    className={styles.input} 
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <button onClick={addService} disabled={isProcessing} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-orange-500 transition-all shadow-xl">
                {isProcessing ? "登録中..." : "新規サービスを登録"}
              </button>
            </section>
            <section className="space-y-4">
              <h3 className={styles.sectionTitle}>📋 稼働中サービス一覧</h3>
              {services.map((s: any) => (
                <div key={s.id} className="p-6 bg-white rounded-3xl border-2 border-slate-50 flex justify-between items-center shadow-sm">
                  <span className="font-black text-slate-800">{s.name}</span>
                  <div className="flex space-x-2">
                    <button onClick={() => startView(s)} className="px-4 py-2 text-[10px] font-black text-slate-400 border border-slate-100 rounded-xl">詳細</button>
                    <button onClick={() => deleteService(s.id)} className="px-4 py-2 text-[10px] font-black text-red-200 hover:text-red-500">削除</button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeAdminTab === "gifts" && (
          <div className="space-y-12">
            <section className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
              <h3 className={styles.sectionTitle}>🎁 新規ギフト登録</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><label className={styles.label}>ギフト名</label><input value={newGiftName} onChange={e=>setNewGiftName(e.target.value)} className={styles.input} /></div>
                <div className="md:col-span-2"><label className={styles.label}>商品説明文</label><textarea value={giftDescription} onChange={e=>setGiftDescription(e.target.value)} className={`${styles.input} h-24 py-3`} /></div>
                
                <div>
                  <label className={styles.label}>必要ポイント数</label>
                  <input 
                    type="number" 
                    min="1"
                    value={giftPoints} 
                    onInput={(e: any) => setGiftPoints(e.target.value)}
                    className={styles.input} 
                  />
                </div>
                <div>
                  <label className={styles.label}>在庫数</label>
                  <input 
                    type="number" 
                    min="1"
                    value={giftStock} 
                    onInput={(e: any) => setGiftStock(e.target.value)}
                    className={styles.input} 
                  />
                </div>
                
                <div className="md:col-span-2"><label className={styles.label}>画像URL</label><input value={giftImageUrl} onChange={e=>setGiftImageUrl(e.target.value)} className={styles.input} placeholder="https://..." /></div>
              </div>
              <button onClick={addGift} disabled={isProcessing} className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg hover:bg-slate-900 transition-all">ギフトを登録する</button>
            </section>
            
            <section className="space-y-4">
              <h3 className={styles.sectionTitle}>📋 登録済みギフト一覧</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gifts.map((g) => (
                  <div key={g.id} className="p-4 bg-white rounded-3xl border-2 border-slate-50 flex items-center space-x-4 shadow-sm">
                    <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">{g.imageUrl ? <img src={g.imageUrl} className="w-full h-full object-cover" /> : "🎁"}</div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-800">{g.name}</h4>
                      <p className="text-[10px] text-orange-500 font-bold">{g.pointCost} pts / 在庫: {g.stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
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
