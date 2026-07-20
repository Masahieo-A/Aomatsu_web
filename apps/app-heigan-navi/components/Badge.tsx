export function Badge({
  children,
  color = "zinc",
}: {
  children: React.ReactNode;
  color?: "zinc" | "green" | "yellow" | "red" | "blue" | "purple";
}) {
  const colorMap: Record<string, string> = {
    zinc: "bg-zinc-100 text-zinc-700 border-zinc-300",
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    red: "bg-red-100 text-red-800 border-red-300",
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    purple: "bg-purple-100 text-purple-800 border-purple-300",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${colorMap[color]}`}
    >
      {children}
    </span>
  );
}
