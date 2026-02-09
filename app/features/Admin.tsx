import React, { useState } from "react";

export const AdminPanel = ({ 
  services, 
  allUsers, 
  client, 
  styles,
  setViewingUser 
}: any) => {
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcType, setNewSvcType] = useState("POINT"); // POINT or GIFT
  const [externalType, setExternalType] = useState("NONE"); // NONE, SHOPSERVE, MAKESHOP
  const [shopId, setShopId] = useState("");
  const [authKey, setAuthKey] = useState("");

  const handleCreateService = async () => {
    if (!newSvcName) return;
    try {
      // 外部接続がある場合のみJSONを作成、なければ空
      const settings = externalType !== "NONE" ? JSON.stringify({
        externalType: externalType,
        shopId: shopId,
        authKey: authKey
      }) : "";

      await client.models.ServiceMaster.create({
        name: newSvcName,
        type: newSvcType,
        status: "ACTIVE",
        connectionSettings: settings
      });

      setNewSvcName("");
      setShopId("");
      setAuthKey("");
      setExternalType("NONE");
      alert("サービスを登録しました");
    } catch (err) {
      console.error(err);
      alert("登録に失敗しました");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("このサービスを削除してもよろしいですか？")) return;
    try {
      await client.models.ServiceMaster.delete({ id });
    } catch (err) {
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-orange-600 uppercase italic">Admin Panel</h2>
      
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-orange-50 shadow-sm">
        <h3 className={styles.sectionTitle}>⚙️ サービス・マスター管理</h3>
        
        <div className="space-y-4 mb-6 pb-6 border-b border-orange-100">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={styles.label}>サービス名</label>
              <input value={newSvcName} onChange={(e) => setNewSvcName(e.target.value)} placeholder="例: Shopserveポイント" className={styles.input + " mb-0"} />
            </div>
            <div>
              <label className={styles.label}>種別</label>
              <select value={newSvcType} onChange={(e) => setNewSvcType(e.target.value)} className={styles.input + " mb-0"}>
                <option value="POINT">ポイント</option>
                <option value="GIFT">ギフト</option>
              </select>
            </div>
          </div>

          <div>
            <label className={styles.label}>外部API連携設定</label>
            <select value={externalType} onChange={(e) => setExternalType(e.target.value)} className={styles.input}>
              <option value="NONE">連携なし (手動管理)</option>
              <option value="SHOPSERVE">Shopserve API 連携</option>
              <option value="MAKESHOP">MakeShop API 連携</option>
            </select>
          </div>

          {externalType !== "NONE" && (
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
              <div>
                <label className={styles.label}>Shop ID</label>
                <input value={shopId} onChange={(e) => setShopId(e.target.value)} placeholder="IDを入力" className={styles.input + " mb-0"} />
              </div>
              <div>
                <label className={styles.label}>認証キー / APIキー</label>
                <input value={authKey} onChange={(e) => setAuthKey(e.target.value)} placeholder="キーを入力" className={styles.input + " mb-0"} type="password" />
              </div>
            </div>
          )}

          <button onClick={handleCreateService} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-colors">
            ＋ 新規マスター登録
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">登録済み一覧</p>
          {services.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="font-black text-slate-700">{s.name}</span>
                <span className={`ml-2 text-[10px] px-2 py-1 rounded-md font-bold ${s.type === 'POINT' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                  {s.type === 'POINT' ? 'ポイント' : 'ギフト'}
                </span>
              </div>
              <button onClick={() => handleDeleteService(s.id)} className="text-xs font-bold text-red-400 p-2">削除</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className={styles.sectionTitle}>👤 ユーザー管理 (全 {allUsers.length} 名)</h3>
        <div className="space-y-2">
          {allUsers.map((u: any) => (
            <div key={u.id} className="p-4 border rounded-2xl flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
              <div className="text-slate-900 font-bold">{u.name || "名前未設定"} <span className="text-slate-400 font-medium text-xs ml-2">[{u.email}]</span></div>
              <button onClick={() => setViewingUser({ email: u.email, name: u.name || u.email })} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs">履歴を表示</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
