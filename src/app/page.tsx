import { redirect } from "next/navigation";

// The proxy sends signed-in users to their role's home; this only runs if it didn't.
export default function Home() {
  redirect("/login");
}
