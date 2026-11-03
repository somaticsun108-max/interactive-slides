import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** The editor moved to /deck/[id]; / sends visitors where they belong. */
export default async function RootPage() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
