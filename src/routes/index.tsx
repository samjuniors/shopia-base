import { createFileRoute } from "@tanstack/react-router";
import SophiaApp from "@/components/sophia/SophiaApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <SophiaApp />;
}
