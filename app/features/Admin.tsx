import React, { useState } from "react";

export const AdminPanel = ({ 
  services, 
  allUsers, 
  client, 
  styles,
  setViewingUser 
}: any) => {
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcType, setNewSvcType] = useState("POINT");

  const handleCreateService = async () => {
    if (!newSvcName) return;
    try {
      await client.models.ServiceMaster.create({
        name: newSvcName,
        type: newSvcType
      });
      setNewSvcName("");
    } catch (err) {
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
      
      {/* サービス登録と一覧 */}
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-orange-50 shadow-sm">
        <h3 className={styles.sectionTitle}>⚙️ サービス・マスター管理</h3>
        
        {/* 登録フォーム */}
        <div className="grid md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-orange-100">
          <div className="md:col-span-2">
            <label className={styles.label}>サービス名</label>
            <input value={newSvcName} onChange={(e) => setNewSvcName(e.target.value)} placeholder="例: LINEポイント" className={styles.input + " mb-0"} />
          </div>
          <div>
            <label className={styles.label}>種別</label>
            <select value={newSvcType} onChange={(e) => setNewSvcType(e.target.value)} className={styles.input + " mb-0"}>
              <option value="POINT">ポイント</option>
              <option value="GIFT">ギフト券</option>
            </select>
          </div>
          <button onClick={handleCreateService} className="md:col-span-3 py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-colors">
            ＋ 新規マスター登録
          </button>
        </div>

        {/* 登録済みリスト */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">登録済みサービス一覧</p>
          {services.length > 0 ? (
            services.map((s: any) => (
              <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-black text-slate-700">{s.name}</span>
                  <span className="ml-2 text-[10px] bg-slate-200 px-2 py-1 rounded-md font-bold text-slate-500">{s.type}</span>
                </div>
                <button 
                  onClick={() => handleDeleteService(s.id)}
                  className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors p-2"
                >
                  削除
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 italic text-center py-4">サービスが登録されていません</p>
          )}
        </div>
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
    </div>
  );
};
