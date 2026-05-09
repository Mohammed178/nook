"use server";

import { redirect } from "next/navigation";
import { createActionClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  redirect("/");
}
