import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata = {
  title: "Profile · Nook",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/account/profile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, phone, country, university_id, gender_preference")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <header className="account-page-head">
        <h1>Profile</h1>
        <p className="account-page-sub">
          Your details. Email change requires verification — coming later.
        </p>
      </header>

      <ProfileForm
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
