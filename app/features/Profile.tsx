import React, { useState } from "react";
import { updatePassword } from "aws-amplify/auth";

export const ProfileSettings = ({ profile, client, styles }: any) => {
  const [name, setName] = useState(profile?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || "");
  const [zipCode, setZipCode] = useState(profile?.zipCode || "");
  const [address, setAddress] = useState(profile?.address || "");
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    try {
      await client.models.UserProfile.update({
        id: profile.id,
        name,
        phoneNumber,
        zipCode,
        address
      });
      alert("保存しました");
    } catch (err) {
      alert("保存失敗");
    }
  };

  const handlePasswordUpdate = async () => {
    if (!oldPassword || !newPassword) return alert("パスワードを入力してください");
    setIsChangingPassword(true);
    try {
      await updatePassword({ oldPassword, newPassword });
      alert("パスワードを更新しました");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      alert("更新失敗: " + err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className={styles.sectionTitle}>👤 プロフィール設定</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={styles.label}>メールアドレス（ログインID）</label>
            <input 
              value={profile?.email || ""} 
              disabled 
              className={styles.input + " bg-slate-50 text-slate-400 border-dashed cursor-not-allowed"} 
            />
            <p className="text-[10px] text-slate-400 ml-2 mt-1 font-bold uppercase tracking-tighter">
              ※ログイン用メールアドレスはシステム管理上、変更できません。
            </p>
          </div>
          
          <div><label className={styles.label}>お名前</label><input value={name} onChange={(e) => setName(e.target.value)} className={styles.input} /></div>
          <div><label className={styles.label}>電話番号</label><input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={styles.input} /></div>
          <div><label className={styles.label}>郵便番号</label><input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className={styles.input} /></div>
          <div><label className={styles.label}>住所</label><input value={address} onChange={(e) => setAddress(e.target.value)} className={styles.input} /></div>
        </div>
        <button onClick={handleUpdateProfile} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl mt-6">情報を保存</button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
        <h3 className={styles.sectionTitle}>🔒 パスワード変更</h3>
        <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="現在のパスワード" className={styles.input} />
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="新しいパスワード" className={styles.input} />
        <button 
          onClick={handlePasswordUpdate} 
          disabled={isChangingPassword} 
          className="w-full py-4 bg-slate-800 text-white font-black rounded-xl"
        >
          {isChangingPassword ? "更新中..." : "パスワードを安全に更新"}
        </button>
      </div>
    </div>
  );
};
