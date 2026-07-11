# SPTrans Real-Time Bunching Monitor

<div align="center">
  <img src="https://img.shields.io/badge/Status-Operational-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/Backend-Node.js-339933" alt="Backend">
  <img src="https://img.shields.io/badge/Database-Redis-DC382D" alt="Database">
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB" alt="Frontend">
</div>

## 📌 O Projeto
Sistema de telemetria em tempo real projetado para identificar **bunching** (comboios) no sistema de transporte público de São Paulo. O motor processa milhares de posições de ônibus simultaneamente, utilizando indexação geoespacial para detectar sobreposições espaciais e emitir alertas imediatos via WebSockets.

---

## 🛠️ Arquitetura Técnica
*   **Ingestão:** Worker de alta performance que consome a API SPTrans (Olho Vivo) com gerenciamento inteligente de sessões e rate limiting.
*   **Persistência:** Redis com extensão **GeoSpatial** para buscas radiais de $O(\log N)$ em tempo real.
*   **Motor de Detecção:** Algoritmo baseado em *Registry Pattern* que identifica agrupamentos em um raio definido (300m) e gerencia o ciclo de vida dos incidentes.
*   **Comunicação:** WebSockets para atualização bidirecional sem latência entre o motor e o painel de controle.

---
