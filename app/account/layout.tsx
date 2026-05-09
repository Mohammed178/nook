import { Navbar } from "@/components/nook/navbar";
import { AccountSidebar } from "@/components/account/account-sidebar";

export const metadata = {
  title: "Account · Nook",
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="container account-shell">
        <AccountSidebar />
        <main className="account-content">{children}</main>
      </div>
    </>
  );
}
