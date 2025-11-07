// src/components/Welcome/WelcomeEDM.tsx
// import * as React from "react";
import "./WelcomeEDM.css";

export default function WelcomeEDM() {
  return (
    <section className="we-hero">
      <div className="we-container">
        <h1 className="we-title">
          Sistema de <span className="we-brand">Gestión Documental</span> EDM
        </h1>
        <p className="we-subtitle">
          Centraliza, controla y gestiona tus documentos de forma segura y trazable.
        </p>

        <div className="we-actions">
          <button
            className="we-ghost"
            onClick={() => window.open("mailto:admingeneralgestiondocu@estudiodemoda.com", "_blank")}
          >
            ¿Necesitas ayuda?
          </button>
        </div>
      </div>
    </section>
  );
}
