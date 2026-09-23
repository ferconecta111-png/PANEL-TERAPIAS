"use client";

import { useTransition } from "react";
import { cambiarEstadoCasoAction } from "./actions";

const ESTADOS = [
  { valor: "abierto", etiqueta: "Abierto" },
  { valor: "en_proceso", etiqueta: "En proceso" },
  { valor: "cerrado", etiqueta: "Cerrado" },
] as const;

export default function EstadoCasoSelect({
  casoId,
  estado,
}: {
  casoId: string;
  estado: "abierto" | "en_proceso" | "cerrado";
}) {
  const [pendiente, startTransition] = useTransition();

  return (
    <select
      className="control w-auto"
      defaultValue={estado}
      disabled={pendiente}
      onChange={e => {
        const nuevo = e.target.value as "abierto" | "en_proceso" | "cerrado";
        startTransition(async () => {
          await cambiarEstadoCasoAction(casoId, nuevo);
        });
      }}
    >
      {ESTADOS.map(o => (
        <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
      ))}
    </select>
  );
}
