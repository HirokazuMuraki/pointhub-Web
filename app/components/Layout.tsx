import React from "react";

export const Sidebar = ({ activeTab, setActiveTab, name, email, signOut, isAdmin }: any) => {
  const menuItems = [
    { id: "home", label: "ポイント交換", icon: "💎" },
    { id: "history", label: "履歴一覧", icon: "📋" },
    { id: "userSettings", label: "連携先設定", icon: "🔑" },
    { id: "profile", label: "プロフィール", icon: "👤" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 h-screen sticky top-0 overflow-hidden">
      <div className="p-8 pb-4">
        <h1 className="text-3xl font-black text-blue-600 italic tracking-tighter">POINT HUB</h1>
      </div>

      <div className="px-8 pb-6 mb-4 border-b border-slate-50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated</p>
        <p className="font-black text-slate-800 truncate text-base leading-tight">
          ようこそ、<br/>{name || "User"} 様
        </p>
        <p className="text-[10px] text-slate-400 truncate font-medium mt-1">{email}</p>
      </div>

      <div className="flex-grow overflow-y-auto px-4 space-y-2 pb-4 scrollbar-hide">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${
              activeTab === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all mt-4 ${
              activeTab === "admin" ? "bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105" : "text-orange-400 hover:bg-orange-50"
            }`}
          >
            <span className="text-xl">⚙️</span>
            管理設定
          </button>
        )}
      </div>

      <div className="p-4 bg-slate-50/50">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-red-400 hover:bg-red-100/50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
        >
          <span className="text-xl">🚪</span>
          ログアウト
        </button>
      </div>
    </aside>
  );
};

export const Footer = ({ setPolicyContent }: any) => (
  <footer className="mt-20 py-10 border-t border-slate-100 flex flex-wrap gap-x-8 gap-y-4 justify-center">
    <button onClick={() => setPolicyContent({ title: "プライバシーポリシー" })} className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors">プライバシーポリシー</button>
    <button onClick={() => setPolicyContent({ title: "セキュリティポリシー" })} className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors">セキュリティポリシー</button>
    <button onClick={() => setPolicyContent({ title: "特定商取引法に基づく表記" })} className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors">特定商取引法に基づく表記</button>
    <div className="w-full text-center mt-6">
      <span className="text-xs text-slate-900 font-bold tracking-tight">
        © 2026 <a 
          href="https://www.waqup.co.jp/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:text-blue-800 underline decoration-blue-400 decoration-2 underline-offset-4 transition-all"
        >WaQUP</a>,Inc.
      </span>
    </div>
  </footer>
);

export const MobileNav = ({ activeTab, setActiveTab, isAdmin }: any) => {
  const navItems = [
    { id: "home", icon: "💎" },
    { id: "history", icon: "📋" },
    { id: "userSettings", icon: "🔑" },
    { id: "profile", icon: "👤" },
  ];
  if (isAdmin) navItems.push({ id: "admin", icon: "⚙️" });

  return (
    <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] p-4 flex justify-around items-center shadow-2xl z-[200]">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl text-2xl transition-all ${
            activeTab === item.id ? "bg-blue-600 text-white scale-125 shadow-lg shadow-blue-500/50" : "text-slate-400"
          }`}
        >
          {item.icon}
        </button>
      ))}
    </nav>
  );
};
