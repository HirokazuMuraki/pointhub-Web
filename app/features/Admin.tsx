import React, { useState } from "react";

export const AdminPanel = ({ 
  services, 
  allUsers, 
  transactions, 
  client, 
  styles,
  setViewingUser 
}: any) => {
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcType, setNewSvcType] = useState("POINT");

  const handleCreateService = async () => {
    if (!newSvcName) return;
    await client.models.ServiceMaster.create({
      name: newSvcName,
      type: newSvcType
    });
    setNewSvcName("");
  };

  // メールアドレスからユーザー名を取得するヘルパー
  const getUserDisplayName = (email: string) => {
    const user = allUsers.find((u: any) => u.email === email);
    return user?.name ? `${user.name} (${email})` : email;
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-orange-600 uppercase italic">Admin Panel</h2>
      
      {/* サービス登録 */}
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-orange-50 shadow-sm">
        <h3 className={styles.sectionTitle}>⚙️ サービス・マスター登録</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className={styles.label}>サービス名</label>
            <input value={newSvcName} onChange={(e) => setNewSvcName(e.target.value)} className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>種別</label>
            <select value={newSvcType} onChange={(e) => setNewSvcType(e.target.value)} className={styles.input}>
              <option value="POINT">ポイント</option>
              <option value="GIFT">ギフト券</option>
            </select>
          </div>
        </div>
        <button onClick={handleCreateService} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl">マスター登録</button>
      </div>

      {/* ユーザー管理 */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className={styles.sectionTitle}>👤 ユーザー管理 (全 {allUsers.length} 名)</h3>
        <div className="space-y-2">
          {allUsers.map((u: any) => (
            <div key={u.id} className="p-4 border rounded-2xl flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
              <div className="text-slate-900 font-bold">
                {u.name || "名前未設定"} 
                <span className="text-slate-400 font-medium text-xs ml-2">[{u.email}]</span>
              </div>
              <button 
                onClick={() => setViewingUser({ email: u.email, name: u.name || u.email })} 
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs shadow-md"
              >
                履歴を表示
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 全体取引ログ (簡易表示) */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className={styles.sectionTitle}>📜 最新の全取引ログ</h3>
        <div className="space-y-3">
          {transactions.slice(0, 10).map((t: any) => (
            <div key={t.id} className="text-xs p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
              <div>
                <p className="font-black text-blue-600">{getUserDisplayName(t.userEmail)}</p>
                <p className="text-slate-500">{t.fromServiceName} ➔ {t.toServiceName}</p>
              </div>
              <p className="font-bold">{t.amount.toLocaleString()}pt</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
