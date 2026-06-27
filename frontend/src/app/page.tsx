import { redirect } from "next/navigation";

// Root page redirects to the main app shell (conversations list).
// Auth guard in the (main) layout will redirect unauthenticated users to /login.
export default function RootPage() {
  redirect("/login");
}
