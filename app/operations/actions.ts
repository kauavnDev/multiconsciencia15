"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createInitiative(formData: FormData) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const successCriteria = String(formData.get("success_criteria") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  if (!title || title.length > 160 || !goal || goal.length > 12000 || !["low","normal","high","critical"].includes(priority)) {
    redirect("/operations?error=invalid");
  }

  const { data: initiative, error } = await supabase.from("initiatives").insert({
    owner_id: auth.user.id,
    title,
    goal,
    success_criteria: successCriteria.slice(0, 4000),
    priority,
    status: "draft",
  }).select("id").single();

  if (error || !initiative) redirect("/operations?error=save");

  await supabase.from("mission_activity").insert({
    initiative_id: initiative.id,
    owner_id: auth.user.id,
    actor_type: "president",
    event_type: "mandate_created",
    summary: "A Presidência registrou um novo mandato.",
    event_data: { title, priority },
  });

  redirect("/operations?created=1");
}
