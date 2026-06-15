import { redirect } from "next/navigation";

export default function ArchivePage() {
  redirect("/?filter=archive");
}
