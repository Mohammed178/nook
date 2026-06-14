import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin · Nook",
};

// Mirrors app/account/page.tsx, /admin lands on the queue (L-4a2.5).
export default function AdminPage() {
  redirect("/admin/agents");
}
