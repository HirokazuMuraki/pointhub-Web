import React from "react";
import { POLICIES } from "../constants";

export const Sidebar = ({ activeTab, setActiveTab, name, email, signOut, isAdmin }: any) => (
  <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 sticky top-0 h-screen z-20">
    <h1 className="text-2xl font-black text-blue-600 italic mb-4">POINT HUB</h1>
    <div className="mb-8 p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-100">
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Authenticated</p>
      <p className="font-black text-slate-800 truncate text-base">ようこそ、<br/>{name || email} 様</p>
    </div>
    <nav className="flex flex-col gap-2 flex-grow">
      {[
        { id: "home", label: "🔄 交換実行" },
        { id: "history", label: "📋 履歴一覧" },
        { id: "userSettings", label: "🔑 交換先設定" },
        { id: "profile", label: "👤 プロフィール" },
      ].map((tab) => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`p-4 rounded-xl font-bold text-left transition-all ${activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:bg-slate-50"}`}>
          {tab.label}
        </button>
      ))}
      {isAdmin && (
        <button onClick={() => setActiveTab("admin")} className={`p-4 rounded-xl font-bold text-left mt-6 ${activeTab === "admin" ? "bg-orange-600 text-white shadow-lg shadow-orange-200" : "text-orange-600 bg-orange-50 hover:bg-orange-100"}`}>
          ⚙️ 管理設定
        </button>
      )}
    </nav>
    <button onClick={signOut} className="mt-4 p-4 text-red-500 font-bold border border-red-100 rounded-xl hover:bg-red-50 transition-colors">ログアウト</button>
  </aside>
);

export const Footer = ({ setPolicyContent }: any) => (
  <div className="mt-20 py-12 border-t border-slate-300 text-center">
    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-black text-slate-600 uppercase tracking-widest">
      <button onClick={() => setPolicyContent(POLICIES.privacy)} className="hover:text-blue-600 transition-colors border-b-2 border-transparent hover:border-blue-600">プライバシーポリシー</button>
      <button onClick={() => setPolicyContent(POLICIES.security)} className="hover:text-blue-600 transition-colors border-b-2 border-transparent hover:border-blue-600">セキュリティポリシー</button>
      <button onClick={() => setPolicyContent(POLICIES.tokusho)} className="hover:text-blue-600 transition-colors border-b-2 border-transparent hover:border-blue-600">特定商取引法に基づく表記</button>
    </div>
    <p className="mt-8 text-sm font-bold text-slate-500 tracking-tight">
      © 2026 <a href="https://www.waqup.co.jp/" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-blue-600 underline underline-offset-4 decoration-2 transition-colors">WaQUP,Inc.</a>
    </p>
  </div>
);

export const MobileNav = ({ activeTab, setActiveTab, isAdmin }: any) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around items-center z-[100] px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
    <button onClick={() => setActiveTab("home")} className={`flex-1 flex flex-col items-center gap-1 ${activeTab === "home" ? "text-blue-600" : "text-slate-300"}`}><span className="text-2xl">🔄</span><span className="text-[10px] font-black uppercase">Home</span></button>
    <button onClick={() => setActiveTab("history")} className={`flex-1 flex flex-col items-center gap-1 ${activeTab === "history" ? "text-blue-600" : "text-slate-300"}`}><span className="text-2xl">📋</span><span className="text-[10px] font-black uppercase">History</span></button>
    <button onClick={() => setActiveTab("userSettings")} className={`flex-1 flex flex-col items-center gap-1 ${activeTab === "userSettings" ? "text-blue-600" : "text-slate-300"}`}><span className="text-2xl">🔑</span><span className="text-[10px] font-black uppercase">Keys</span></button>
    <button onClick={() => setActiveTab("profile")} className={`flex-1 flex flex-col items-center gap-1 ${activeTab === "profile" ? "text-blue-600" : "text-slate-300"}`}><span className="text-2xl">👤</span><span className="text-[10px] font-black uppercase">Profile</span></button>
    {isAdmin && <button onClick={() => setActiveTab("admin")} className={`flex-1 flex flex-col items-center gap-1 ${activeTab === "admin" ? "text-orange-600" : "text-slate-300"}`}><span className="text-2xl">⚙️</span><span className="text-[10px] font-black uppercase">Admin</span></button>}
  </nav>
);
