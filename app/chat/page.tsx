import { redirect } from "next/navigation";

/** 레거시 /chat → 검색(AI 허브) */
export default function ChatPage() {
  redirect("/search");
}
