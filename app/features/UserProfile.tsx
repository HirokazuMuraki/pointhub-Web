"use client";
import { useState, useEffect } from "react";
import { useAlert } from "./AlertProvider";

export const UserProfile = ({ client, userEmail, styles }: any) => {
  const { showAlert } = useAlert();
  const [profile, setProfile] = useState({ 
    id: "", 
    name: "", 
    email: userEmail || "", 
    phone: "",
    zipCode: "", 
    address: ""
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingZip, setIsSearchingZip] = useState(false);

  const fetchProfile = async () => {
    if (!client?.models?.UserProfile) { setLoading(false); return; }
    try {
      const { data } = await client.models.UserProfile.list({
        filter: { email: { eq: userEmail } }
      });
      if (data && data.length > 0) {
        const p = data[0];
        setProfile({
          id: p.id,
          name: p.name || "",
          email: userEmail,
          phone: p.phoneNumber || "",
          zipCode: p.zipCode || "", 
          address: p.address || ""
        });
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [client, userEmail]);

  const fetchAddress = async (zip: string) => {
    const cleanZip = zip.replace("-", "");
    if (cleanZip.length !== 7) return;
    setIsSearchingZip(true);
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`);
      const data = await res.json();
      if (data.results) {
        const result = data.results[0];
        const fullAddress = `${result.address1}${result.address2}${result.address3}`;
        setProfile(prev => ({ ...prev, address: fullAddress }));
      }
    } catch (err) { console.error("Zip search error:", err); }
    finally { setIsSearchingZip(false); }
  };

  const handleSave = async () => {
    if (!client?.models?.UserProfile) return;
    setIsSaving(true);
    try {
      const payload = {
        email: userEmail,
        name: profile.name,
        phoneNumber: profile.phone,
        zipCode: profile.zipCode,
        address: profile.address,
        role: "user"
      };

      if (profile.id) {
        await client.models.UserProfile.update({ id: profile.id, ...payload });
      } else {
        const { data: newProfile } = await client.models.UserProfile.create(payload);
        if (newProfile) setProfile(prev => ({ ...prev, id: newProfile.id }));
      }
      
      await showAlert("プロフィールを保存しました");
      await fetchProfile(); 
    } catch (err) {
      console.error("Save error:", err);
      await showAlert("保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center italic text-slate-400 font-black">読み込み中...</div>;

  const rowStyle = "flex gap-4";
  const colHalfStyle = "flex-1";

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h3 className={`${styles.sectionTitle} mb-4`}>👤 プロフィール設定</h3>
      
      <div className="space-y-3">
        <div className={rowStyle}>
          <div className={colHalfStyle}>
            <label className={`${styles.label} mb-1 ml-1`}>お名前</label>
            <input 
              type="text" 
              value={profile.name} 
              onChange={(e) => setProfile({...profile, name: e.target.value})} 
              className={`${styles.input} py-2.5`} 
              placeholder="お名前"
            />
          </div>
          <div className={colHalfStyle}>
            <label className={`${styles.label} mb-1 ml-1`}>メールアドレス</label>
            <input 
              type="email" 
              value={profile.email} 
              readOnly 
              className={`${styles.input} py-2.5 bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200`} 
            />
          </div>
        </div>

        <div className={rowStyle}>
          <div className={colHalfStyle}>
            <label className={`${styles.label} mb-1 ml-1`}>郵便番号</label>
            <div className="relative">
              <input 
                type="text" 
                value={profile.zipCode} 
                onChange={(e) => {
                  const val = e.target.value;
                  setProfile({...profile, zipCode: val});
                  if(val.replace("-","").length === 7) fetchAddress(val);
                }}
                className={`${styles.input} py-2.5`} 
                placeholder="123-4567"
              />
              {isSearchingZip && <span className="absolute right-3 top-3 text-[10px] animate-pulse">⏳</span>}
            </div>
          </div>
          <div className={colHalfStyle}>
            <label className={`${styles.label} mb-1 ml-1`}>電話番号</label>
            <input 
              type="tel" 
              value={profile.phone} 
              onChange={(e) => setProfile({...profile, phone: e.target.value})} 
              className={`${styles.input} py-2.5`} 
              placeholder="03-0000-0000"
            />
          </div>
        </div>

        <div>
          <label className={`${styles.label} mb-1 ml-1`}>住所</label>
          <input 
            type="text" 
            value={profile.address} 
            onChange={(e) => setProfile({...profile, address: e.target.value})} 
            className={`${styles.input} py-2.5`} 
            placeholder="住所（都道府県・市区町村・番地・建物名）"
          />
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className={`w-full py-3.5 text-white font-black rounded-2xl transition-all shadow-lg text-sm uppercase tracking-widest ${
              isSaving ? "bg-slate-400" : "bg-slate-900 hover:bg-orange-500 active:scale-[0.98]"
            }`}
          >
            {isSaving ? "保存中..." : "設定を保存する"}
          </button>
        </div>
      </div>
    </div>
  );
};
