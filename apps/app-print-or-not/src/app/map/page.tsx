import { redirect } from "next/navigation";

// 旧 Article Map は記事を探す画面（トップ）に統合した。古いリンク用に転送だけ残す
export default function MapPage() {
  redirect("/");
}
