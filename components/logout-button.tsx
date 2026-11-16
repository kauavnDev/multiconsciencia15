"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export default function LogoutButton(){const[busy,setBusy]=useState(false);const router=useRouter();async function logout(){setBusy(true);const supabase=createClient();await supabase.auth.signOut();router.replace("/login");router.refresh();}return <button className="logout-button" onClick={logout} disabled={busy} aria-label="Sair da conta"><LogOut size={16}/></button>;}