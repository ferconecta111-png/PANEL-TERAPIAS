"use client";

import { useActionState, useState } from "react";
import { crearCasoAction } from "./actions";
import { ESTADO_INICIAL_CASO } from "./types";

interface Opcion {
  id: string;
  nombre: string;
}

export default function NuevoCasoForm({
  terapeutas,
  pacientes,
  mostrarSelectorTerapeuta,
}: {
  terapeutas: Opcion[];
  pacientes: (Opcion & { terapeutaId: string })[];
  /** false = el usuario es terapeuta y el caso es siempre suyo, sin elegir. */
  mostrarSelectorTerapeuta: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(crearCasoAction, ESTADO_INICIAL_CASO);
  const [abierto, setAbierto] = useState(false);
  const [terapeutaId, setTerapeutaId] = useState("");

  const pacientesFiltrados = terapeutaId
    ? pacientes.filter(p => p.terapeutaId === terapeutaId)
    : pacientes;

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="btn-accent">
        Nuevo caso
      </button>
    );
  }

  if (estado.ok) {
    return (
      <p role="status" className="card p-4 text-base font-medium text-[var(--ok)]">
        Caso creado.{" "}
        <button type="button" className="underline" onClick={() => setAbierto(false)}>
          Cerrar
        </button>
      </p>
    );
  }

  return (
    <form action={accion} className="card flex flex-col gap-3 p-5">
      <p className="t-subtitle">Nuevo caso de soporte</p>

      {mostrarSelectorTerapeuta && (
        <div>
          <label htmlFor="terapeutaId" className="t-micro mb-1 block">Terapeuta</label>
          <select
            id="terapeutaId"
            name="terapeutaId"
            required
            value={terapeutaId}
            onChange={e => setTerapeutaId(e.target.value)}
            className="control"
          >
            <option value="">Elegir…</option>
            {terapeutas.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="pacienteId" className="t-micro mb-1 block">Paciente (opcional)</label>
        <select id="pacienteId" name="pacienteId" className="control" defaultValue="">
          <option value="">Ninguno / general</option>
          {pacientesFiltrados.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="titulo" className="t-micro mb-1 block">Título</label>
        <input id="titulo" name="titulo" required className="control" placeholder="¿Qué está pasando?" />
      </div>

      <div>
        <label htmlFor="descripcion" className="t-micro mb-1 block">Descripción</label>
        <textarea id="descripcion" name="descripcion" rows={3} className="control resize-none" />
      </div>

      {estado.error && (
        <p role="alert" className="text-sm font-medium text-[var(--danger)]">{estado.error}</p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendiente} className="btn btn-primario disabled:opacity-60">
          {pendiente ? "Guardando…" : "Crear caso"}
        </button>
        <button type="button" className="btn btn-fantasma" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
