"use client";
import { useState, useEffect } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient<Schema>();

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [services, setServices] = useState<Schema["PointServiceMaster"]["type"][]>([]);
  const [profile, setProfile] = useState<Schema["UserProfile"]["type"] | null>(null);
  
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [lineId, setLineId] = useState("");

  const [newServiceName, setNewServiceName] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");

  const inputStyle = "w-full p-3 border rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2 border-gray-200";

  useEffect(() => {
    const subServices = client.models.PointServiceMaster.observeQuery().subscribe({
      next: ({ items }) => setServices([...items]),
    });
    fetchProfile();
    return () => subServices.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    const { data: profiles } = await client.models.UserProfile.list();
    if (profiles.length > 0) {
      const p = profiles[0];
      setProfile(p);
      setName(p.name || "");
      setPhoneNumber(p.phoneNumber || "");
      setZipCode(p.zipCode || "");
      setAddress(p.address || "");
      setLineId(p.lineId || "");
    }
  };

  const searchAddress = async (zip: string) => {
    const cleanZip = zip.replace("-", "");
    setZipCode(cleanZip);
    if (cleanZip.length === 7) {
      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`);
        const data = await res.json();
        if (data.results) {
          const item = data.results[0];
          setAddress(`${item.address1}${item.address2}${item.address3}`);
        }
      } catch (error) {
        console.error("住所検索に失敗しました", error);
      }
    }
  };

  const saveProfile = async (email: string) => {
    const payload = { email, name, phoneNumber, zipCode, address, lineId, role: "USER" };
    if (profile) {
      await client.models.UserProfile.update({ id: profile.id, ...payload });
    } else {
      await client.models.UserProfile.create(payload);
    }
    fetchProfile();
    alert("保存しました！");
  };

  const NavContent = () => (
    <>
      <button onClick={() => setActiveTab("home")} className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === "home" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>
        <span>🏠 ホーム</span>
      </button>
      <button onClick={() => setActiveTab("profile")} className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === "profile" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}>
        <span>👤 設定</span>
      </button>
    </>
  );

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-gray-900 font-sans">
          
          <aside className="hidden md:flex flex-col w-64 bg-white border-r p-6 sticky top-0 h-screen shadow-sm">
            <h1 className="text-2xl font-black text-blue-600 mb-10 px-3 italic tracking-tighter">Pointhub</h1>
            <nav className="flex flex-col gap-2 flex-grow"><NavContent /></nav>
            <button onClick={signOut} className="mt-auto text-left px-3 text-sm text-gray-400 hover:text-red-500 transition-colors">ログアウト</button>
          </aside>

          <header className="md:hidden bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-50">
            <h1 className="text-xl font-bold text-blue-600 italic">Pointhub</h1>
            <button onClick={signOut} className="text-xs text-gray-400">ログアウト</button>
          </header>

          <main className="flex-grow p-4 md:p-10 pb-24 md:pb-10 max-w-4xl mx-auto w-full">
            {activeTab === "home" && (
              <section className="animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-xl mb-10">
                  <p className="text-sm opacity-80 mb-1 font-medium">現在の総保有ポイント</p>
                  <h2 className="text-5xl font-black tracking-tight">{profile?.pointBalance || 0} <span className="text-xl font-light">pt</span></h2>
                </div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">✨ ポイント交換先</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {services.map((s) => (
                    <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all flex items-center justify-between group">
                      <div>
                        <p className="font-bold text-lg">{s.serviceName}</p>
                        <p className="text-xs text-gray-400 uppercase tracking-tighter">{s.companyName}</p>
                      </div>
                      <button className="bg-gray-50 hover:bg-blue-600 hover:text-white text-blue-600 px-5 py-2 rounded-full font-bold text-xs transition-all shadow-sm">交換</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "profile" && (
              <section className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <h3 className="text-2xl font-black mb-8">👤 プロフィール設定</h3>
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="md:col-span-1">
                      <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block uppercase">氏名</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} className={inputStyle} placeholder="山田 太郎" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block uppercase">電話番号</label>
                      <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={inputStyle} placeholder="09012345678" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs font-bold text-blue-600 ml-1 mb-1 block uppercase">郵便番号 (7桁入力で自動検索)</label>
                      <input value={zipCode} onChange={(e) => searchAddress(e.target.value)} className={inputStyle + " border-blue-100 bg-blue-50/30"} placeholder="1234567" maxLength={7} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block uppercase">LINE ID</label>
                      <input value={lineId} onChange={(e) => setLineId(e.target.value)} className={inputStyle} placeholder="@line_user" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block uppercase">住所</label>
                      <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputStyle} placeholder="東京都千代田区1-1-1..." />
                    </div>
                  </div>
                  <button onClick={() => saveProfile(user?.signInDetails?.loginId || "")} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold mt-8 shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all text-lg">
                    プロフィールを更新する
                  </button>
                </div>
              </section>
            )}
          </main>

          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t flex justify-around p-4 shadow-lg z-50">
            <NavContent />
          </nav>
        </div>
      )}
    </Authenticator>
  );
}
