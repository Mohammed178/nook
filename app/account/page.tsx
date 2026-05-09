import { Navbar } from "@/components/nook/navbar";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Account · Nook",
};

export default async function AccountPage() {
  // Middleware already gates this; getCurrentUser is for the welcome line.
  const user = await getCurrentUser();

  return (
    <>
      <Navbar />
      <div className="container" style={{ padding: "var(--s-12) 0" }}>
        <h1 style={{ fontSize: "var(--t-2xl)", marginBottom: "var(--s-3)" }}>
          Welcome, {user?.displayName ?? "friend"}
        </h1>
        <p style={{ color: "var(--ink-500)" }}>
          Your account home. Saved searches, favourites, and recent views land here in
          Checkpoint C.
        </p>
      </div>
    </>
  );
}
