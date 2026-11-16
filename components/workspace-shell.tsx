import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, BrainCircuit, BriefcaseBusiness, CalendarDays, Settings, Sparkles, Users } from "lucide-react";
import LogoutButton from "@/components/logout-button";

const items = [
  { href: "/dashboard", label: "Visão geral", icon: Activity, key: "dashboard" },
  { href: "/meetings", label: "Reuniões", icon: CalendarDays, key: "meetings" },
  { href: "/operations", label: "Operações", icon: BriefcaseBusiness, key: "operations" },
  { href: "/council", label: "Conselho", icon: Users, key: "council" },
  { href: "/office", label: "Escritório", icon: BriefcaseBusiness, key: "office" },
  { href: "/memory", label: "Memória", icon: Sparkles, key: "memory" },
  { href: "/settings", label: "Configurações", icon: Settings, key: "settings" },
];

export default function WorkspaceShell({ active, name, children }: { active: string; name: string; children: ReactNode }) {
  return <main className="workspace-shell">
    <aside className="workspace-sidebar">
      <Link className="brand side-brand" href="/dashboard"><span className="brand-mark"><BrainCircuit size={19}/></span><span>MULTI<span className="brand-light">CONSCIÊNCIA</span><span className="brand-count">15</span></span></Link>
      <div className="side-label">ESPAÇO DE TRABALHO</div>
      <nav className="workspace-links">{items.map(item => { const Icon=item.icon; return <Link key={item.key} className={active===item.key?"workspace-link active":"workspace-link"} href={item.href}><Icon size={17}/>{item.label}</Link>; })}</nav>
      <div className="workspace-account"><div className="secure-mini"><span className="live-dot"/> <span>Espaço privado<br/><small>Seus dados, suas regras</small></span></div><div className="user-mini"><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div className="user-data"><b>{name}</b><small>Presidente</small></div><LogoutButton/></div></div>
    </aside>
    <section className="workspace-main">{children}</section>
    <nav className="workspace-mobile-nav">{items.map(item=>{const Icon=item.icon;return <Link key={item.key} aria-label={item.label} title={item.label} className={active===item.key?"active":""} href={item.href}><Icon size={18}/><small>{item.label}</small></Link>;})}</nav>
  </main>;
}