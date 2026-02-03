import React, { useState } from "react";

export const ProfileSettings = ({ profile, client, styles, signOut }: any) => {
  const [name, setName] = useState(profile?.name || "");
  const [zipCode, setZipCode] = useState(profile?.zipCode || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || "");

  // 郵便番号から住所を自動取得
  const fetchAddress = async (zip: string) => {
    setZipCode(zip);
    if (zip.length === 7) {
      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
        const data = await res.json();
        if (data.results) {
          const { address1, address2, address3 } = data.results[0];
          setAddress(`${address1}${address2}${address3}`);
        }
      } catch (err) {
        console.error("住所取得失敗");
      }
    }
  };

  const handleUpdate = async () => {
    if (!profile?.id) return;
    try {
      await client.models.UserProfile.update({
        id: profile.id,
        name,
        zipCode,
        address,
        phoneNumber
      });
      alert("プロフィールを更新しました");
    } catch (err) {
      alert("更新に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className={styles.sectionTitle}>👤 プロフィール設定</h2>
      
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        {/* 基本情報エリア */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-50">
          <div>
            <label className={styles.label}>メールアドレス (変更不可)</label>
            <p className="p-3 bg-slate-50 rounded-xl text-slate-400 font-medium border border-slate-100 italic">
              {profile?.email}
            </p>
            <p className="text-[9px] text-red-400 mt-1 ml-2 font-bold">※ログインIDのため変更できません</p>
          </div>
          <div>
            <label className={styles.label}>アカウント権限</label>
            <div className="mt-2">
              <span className={`px-4 py-1 rounded-full text-xs font-black tracking-widest ${
                profile?.role === "ADMIN" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
              }`}>
                {profile?.role === "ADMIN" ? "管理者 / ADMIN" : "一般ユーザー / USER"}
              </span>
            </div>
          </div>
        </div>

        {/* 入力エリア */}
        <div className="space-y-4">
          <div>
            <label className={styles.label}>お名前</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 山田 太郎" className={styles.input} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={styles.label}>郵便番号 (7桁・自動入力)</label>
              <input 
                value={zipCode} 
                onChange={(e) => fetchAddress(e.target.value)} 
                placeholder="例: 1234567" 
                maxLength={7}
                className={styles.input} 
              />
            </div>
            <div>
              <label className={styles.label}>電話番号</label>
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="例: 09012345678" className={styles.input} />
            </div>
          </div>

          <div>
            <label className={styles.label}>住所</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="東京都..." className={styles.input} />
          </div>
        </div>

        <button 
          onClick={handleUpdate} 
          className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
        >
          <span>💾</span> 設定を保存する
        </button>
      </div>

      {/* スマホ専用ログアウト */}
      <div className="md:hidden mt-12 px-4 pb-10 text-center">
        <button
          onClick={signOut}
          className="w-full py-4 bg-red-50 text-red-600 font-black rounded-2xl border-2 border-red-100 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm"
        >
          <span className="text-xl">🚪</span> ログアウトする
        </button>
        <p className="text-[10px] text-slate-400 mt-6 font-bold tracking-widest uppercase italic">
          WaQUP Point Hub System v1.0
        </p>
      </div>
    </div>
  );
};
