"use client";

import { useActionState } from "react";
import { solicitarEbookAction } from "./actions";
import { ESTADO_SOLICITUD_INICIAL } from "./types";

export default function FormularioLead() {
  const [estado, accion, pendiente] = useActionState(solicitarEbookAction, ESTADO_SOLICITUD_INICIAL);

  return (
    <form action={accion} style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
      <div>
        <label style={labelStyle}>Nombre completo</label>
        <input name="nombre" required style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>WhatsApp (con código de país)</label>
        <input name="telefono" type="tel" placeholder="+57 300 1234567" required style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Correo</label>
        <input name="email" type="email" required style={inputStyle} />
      </div>

      {estado.error && (
        <p style={{ color: "#f3d4c9", background: "rgba(0,0,0,0.15)", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, margin: 0 }}>
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={pendiente} className="btn-ebook" style={botonStyle(pendiente)}>
        {pendiente ? "Enviando..." : <>Quiero mi ebook gratis <span aria-hidden>→</span></>}
      </button>

      <p style={{ fontSize: 12, color: "#c9d6da", margin: "4px 0 0", lineHeight: 1.5 }}>
        Tus datos solo se usan para enviarte el ebook y acompañarte — nunca se comparten.
      </p>

      <style>{`
        .btn-ebook:not(:disabled):hover { transform: translateY(-2px) scale(1.015); box-shadow: 0 18px 36px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.5); }
        .btn-ebook span { display: inline-block; transition: transform 0.18s ease; }
        .btn-ebook:not(:disabled):hover span { transform: translateX(3px); }
      `}</style>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600, color: "#FBFAF6", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 16,
  border: "1px solid rgba(251,250,246,0.35)", borderRadius: 10,
  background: "rgba(251,250,246,0.08)", color: "#FBFAF6",
};

function botonStyle(pendiente: boolean): React.CSSProperties {
  return {
    padding: "16px 22px", borderRadius: 999, border: "none", cursor: pendiente ? "default" : "pointer",
    background: "linear-gradient(155deg, #bcd8e0, #5C8A9B)",
    color: "#22282B", fontWeight: 800, fontSize: 15.5, opacity: pendiente ? 0.7 : 1, marginTop: 6,
    boxShadow: "0 14px 30px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.5)",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
    transform: "translateY(0)",
  };
}
