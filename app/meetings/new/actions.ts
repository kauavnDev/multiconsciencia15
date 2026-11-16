"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createMeeting(formData: FormData) {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();

  if (authError || !data.user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const agenda = String(formData.get("agenda") ?? "").trim();
  const participantMode = String(formData.get("participant_mode") ?? "director");
  const selectedParticipants = formData.getAll("participants").map(String).filter((slug) => /^[a-z0-9-]{2,50}$/.test(slug)).slice(0, 15);

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

  const { error: eventError } = await supabase.from("meeting_events").insert({
    meeting_id: meeting.id, owner_id: data.user.id, actor_type: "president",
    event_type: "participant_preferences",
    event_data: { mode: ["director","hybrid","manual"].includes(participantMode) ? participantMode : "director", selected_slugs: selectedParticipants },
  });
  if (eventError) redirect(`/meetings/${meeting.id}?warning=participants`);

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
