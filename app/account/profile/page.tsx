import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/account/profile-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.profile };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/account/profile");
  }

  const [{ data: profile }, dict] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, email, phone, country, university_id, gender_preference")
      .eq("id", user.id)
      .maybeSingle(),
    getDictionary(),
  ]);
  const a = dict.account;

  return (
    <>
      <header className="account-page-head">
        <span className="account-page-kicker">{a.yourAccount}</span>
        <h1>{a.profileTitle}</h1>
        <p className="account-page-sub">{a.profileSub}</p>
      </header>

      <ProfileForm
        dict={dict}
        initial={{
          display_name: profile?.display_name ?? "",
          email: profile?.email ?? user.email ?? "",
          phone: profile?.phone ?? "",
          country: profile?.country ?? "",
          university_id: profile?.university_id ?? "",
          gender_preference: profile?.gender_preference ?? "",
        }}
      />
    </>
  );
}
