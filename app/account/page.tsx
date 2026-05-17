import { redirect } from "next/navigation";

export const metadata = {
  title: "Account · Nook",
};

export default function AccountPage() {
  redirect("/account/profile");
}
