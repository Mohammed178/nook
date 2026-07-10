import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { ComingSoon } from "@/components/nook/coming-soon";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { auth } = await getDictionary();
  return { title: auth.privacyPolicy };
}

export default async function PrivacyPage() {
  const dict = await getDictionary();
  return (
    <>
      <Navbar />
      <ComingSoon dict={dict} title={dict.auth.privacyPolicy} />
    </>
  );
}
