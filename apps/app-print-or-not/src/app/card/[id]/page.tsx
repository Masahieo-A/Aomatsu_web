import { redirect } from "next/navigation";

// Evidence Card は廃止した。古いリンク用にトップへ転送だけ残す
export default function CardPage() {
  redirect("/");
}
