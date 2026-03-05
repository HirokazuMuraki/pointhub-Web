"use client";

import { useState, useEffect } from "react";
import { AdminHistory } from "./AdminHistory";

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
  const [giftImageUrl, setGiftImageUrl] = useState("");

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

  const fetchOrders = async () => {
    try {
      const { data } = await client.models.GiftOrder.list();
      if (data) setOrders(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) { console.error("注文取得失敗:", err); }
  };

  useEffect(() => {
    fetchUsers();
    fetchGifts();
    fetchOrders();
  }, [client]);

  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const approveOrder = async (order: any) => {
    const sourceName = order.orderSourceName || "不明なショップ";
    const sourceId = order.orderSourceId;

    if (!confirm(`${order.giftName} の交換を承認します。\n減算先: ${sourceName}\nよろしいですか？`)) return;
    
    setIsProcessing(true);
    try {
      const { data: gift } = await client.models.GiftMaster.get({ id: order.giftId });
      if (!gift || gift.stock < 1) throw new Error("在庫がありません");

      const { data: creds } = await client.models.UserServiceCredential.list({
        filter: { userEmail: { eq: order.userEmail } }
      });

      const targetCred = creds.find((c: any) => c.serviceId === sourceId);
      
      if (!targetCred) {
        throw new Error(`指定された支払い元の連携情報 (${sourceName}) が見つかりません。`);
      }

      if ((targetCred.dummyBalance || 0) < order.pointSpent) {
        throw new Error(`ポイント残高が不足しています (${targetCred.serviceName})`);
      }

      await client.models.GiftMaster.update({
        id: gift.id,
        stock: gift.stock - 1
      });

      await client.models.UserServiceCredential.update({
        id: targetCred.id,
        dummyBalance: (targetCred.dummyBalance || 0) - order.pointSpent
      });

      await client.models.GiftOrder.update({
        id: order.id,
        status: "COMPLETED"
      });

      alert(`承認完了しました。${targetCred.serviceName} からポイントを減算しました。`);
      fetchOrders();
      fetchGifts();
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

  const resetGiftForm = () => {
    setNewGiftName(""); setGiftDescription(""); setGiftPoints("1"); setGiftStock("1"); setGiftImageUrl("");
    setIsEditingGift(false); setEditingGiftId(null);
  };

  const startEditGift = (gift: any) => {
    setIsEditingGift(true); setEditingGiftId(gift.id); setNewGiftName(gift.name);
    setGiftDescription(gift.description || ""); setGiftPoints(gift.pointCost.toString());
    setGiftStock(gift.stock.toString()); setGiftImageUrl(gift.imageUrl || "");
    scrollToTop();
  };

  const deleteGift = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await client.models.GiftMaster.update({ id, isActive: false });
    fetchGifts();
  };

  const startView = (service: any) => {
    setViewingId(service.id); scrollToTop();
  };

  const deleteService = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await client.models.ServiceMaster.delete({ id });
    if (onRefresh) onRefresh();
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-wrap gap-2 mb-10 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {[
          { id: "services", label: "ポイント交換マスター", icon: "🪙" },
          { id: "gifts", label: "ギフト管理", icon: "🎁" },
          { id: "orders", label: "注文管理", icon: "🚚" },
          { id: "users", label: "ユーザー一覧", icon: "👤" },
          { id: "history", label: "履歴検索", icon: "🔍" }
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveAdminTab(tab.id); scrollToTop(); }}
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
            <section className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner space-y-6">
              <h3 className={styles.sectionTitle}>🪙 ポイント交換マスター登録</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={styles.label}>サービス名</label><input value={newServiceName} onChange={e=>setNewServiceName(e.target.value)} className={styles.input} /></div>
                <div><label className={styles.label}>サービス説明</label><input value={newDescription} onChange={e=>setNewDescription(e.target.value)} className={styles.input} /></div>
                <div><label className={styles.label}>ショップID</label><input value={newShopId} onChange={e=>setNewShopId(e.target.value)} className={styles.input} autoComplete="off" /></div>
                <div><label className={styles.label}>APIキー</label><input type="password" value={newAuthKey} onChange={e=>setNewAuthKey(e.target.value)} className={styles.input} autoComplete="new-password" /></div>
              </div>
              <button onClick={addService} disabled={isProcessing} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-orange-500 transition-all shadow-xl">登録</button>
            </section>
            <section className="space-y-4">
              <h3 className={styles.sectionTitle}>📋 サービス一覧</h3>
              {services.map((s: any) => (
                <div key={s.id} className="p-6 bg-white rounded-3xl border-2 border-slate-50 flex justify-between items-center shadow-sm">
                  <span className="font-black text-slate-800">{s.name}</span>
                  <div className="flex space-x-2">
                    <button onClick={() => startView(s)} className="px-4 py-2 text-[10px] font-black text-slate-400 border border-slate-100 rounded-xl">詳細</button>
                    <button onClick={() => deleteService(s.id)} className="px-4 py-2 text-[10px] font-black text-red-200">削除</button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeAdminTab === "gifts" && (
          <div className="space-y-12">
            <section className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
              <h3 className={styles.sectionTitle}>{isEditingGift ? "✏️ ギフト編集" : "🎁 ギフト登録"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><label className={styles.label}>ギフト名</label><input value={newGiftName} onChange={e=>setNewGiftName(e.target.value)} className={styles.input} /></div>
                <div><label className={styles.label}>ポイント</label><input type="number" value={giftPoints} onInput={(e: any) => setGiftPoints(e.target.value)} className={styles.input} /></div>
                <div><label className={styles.label}>在庫</label><input type="number" value={giftStock} onInput={(e: any) => setGiftStock(e.target.value)} className={styles.input} /></div>
                <div className="md:col-span-2">
                  <label className={styles.label}>画像URL (https://...)</label>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <input value={giftImageUrl} onChange={e=>setGiftImageUrl(e.target.value)} className={styles.input} placeholder="https://example.com/image.jpg" />
                    </div>
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                      {giftImageUrl ? <img src={giftImageUrl} className="w-full h-full object-cover" /> : <span className="text-xl">🖼️</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleGiftSubmit} className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg hover:bg-slate-900 transition-all">
                  {isEditingGift ? "保存" : "登録"}
                </button>
                {isEditingGift ? (
                  <button onClick={resetGiftForm} className="px-8 py-4 bg-slate-100 rounded-2xl font-black text-slate-400 hover:bg-slate-200 transition-all">キャンセル</button>
                ) : (
                  newGiftName && <button onClick={resetGiftForm} className="px-8 py-4 bg-slate-100 rounded-2xl font-black text-slate-400">リセット</button>
                )}
              </div>
            </section>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gifts.map((g) => (
                <div key={g.id} className="p-4 bg-white rounded-3xl border-2 border-slate-50 flex items-center shadow-sm">
                  <div className="w-12 h-12 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 mr-4 flex-shrink-0 flex items-center justify-center">
                    {g.imageUrl ? <img src={g.imageUrl} className="w-full h-full object-cover" /> : <span className="text-xl">🎁</span>}
                  </div>
                  <div className="flex-1 min-w-0 mr-4">
                    <h4 className="font-black text-slate-800 truncate">{g.name}</h4>
                    <p className="text-[10px] text-orange-500 font-bold">{g.pointCost} pts / 在庫: {g.stock}</p>
                  </div>
                  <button onClick={() => startEditGift(g)} className="px-3 py-1.5 text-[10px] font-black text-slate-400 border border-slate-100 rounded-lg hover:bg-slate-50 transition-all">編集</button>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeAdminTab === "orders" && (
          <section className="space-y-6">
            <h3 className={styles.sectionTitle}>🚚 ギフト注文管理</h3>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                  <tr>
                    <th className="p-6">注文日時</th>
                    <th className="p-6">ユーザー</th>
                    <th className="p-6">ギフト内容</th>
                    <th className="p-6">交換元ショップ</th>
                    <th className="p-6 text-center">ステータス</th>
                    <th className="p-6 text-right">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 text-[10px] font-bold text-slate-400">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="p-6 font-bold text-slate-600">{o.userEmail}</td>
                      <td className="p-6">
                        <span className="font-black text-slate-900">{o.giftName}</span><br/>
                        <span className="text-[10px] text-orange-500 font-bold">{o.pointSpent} pts</span>
                      </td>
                      <td className="p-6">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black">
                          {o.orderSourceName || "---"}
                        </span>
                      </td>
                      <td className="p-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${o.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                          {o.status === 'PENDING' ? '未承認' : '完了'}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        {o.status === 'PENDING' && (
                          <button onClick={() => approveOrder(o)} disabled={isProcessing} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-500 transition-all">承認する</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <div className="p-20 text-center text-slate-300 font-black italic">No Orders Found</div>}
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
