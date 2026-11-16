"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createMeeting(formData: FormData) {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();

  if (authError || !data.user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const agenda = String(formData.get("agenda") ?? "").trim();

  if (!title || title.length > 160 || agenda.length > 12000) {
    redirect("/meetings/new?error=invalid");
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      owner_id: data.user.id,
      title,
      agenda,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !meeting) redirect("/meetings/new?error=save");

  if (agenda) {
    const { error: messageError } = await supabase.from("meeting_messages").insert({
      meeting_id: meeting.id,
      owner_id: data.user.id,
      speaker_type: "president",
      content: agenda,
      round_number: 0,
    });

    if (messageError) redirect(`/meetings/${meeting.id}?warning=message`);
  }

  redirect(`/meetings/${meeting.id}`);
}
