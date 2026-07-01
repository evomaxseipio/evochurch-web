import { redirect } from "next/navigation";

/** Redirección manejada en proxy; fallback por si la ruta se renderiza directamente. */
export default function Home() {
  redirect("/login");
}
