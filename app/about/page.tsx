import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { ComingSoon } from "@/components/nook/coming-soon";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { footer } = await getDictionary();
  return { title: footer.about };
}

export default async function AboutPage() {
  const dict = await getDictionary();
  return (
    <>
      <Navbar />
      <ComingSoon dict={dict} title={dict.footer.about} />
    </>
  );
}
