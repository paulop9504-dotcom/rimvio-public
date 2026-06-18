import { redirect } from "next/navigation";

/** Legacy /calendar route — calendar lives on search tab header. */
export default function CalendarPage() {
  redirect("/search?calendar=full");
}
