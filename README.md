# QR-Based Indoor Navigation System

Mini Project (24SJMCA245) — St. Joseph's College of Engineering and Technology, Palai
Department of Computer Applications.

An indoor campus navigation system: printed QR codes act as localisation anchors on a
routable graph of buildings, floors, corridors and classrooms. Scanning one tells the app
where the user is; the server computes the shortest route to a chosen classroom; the app
renders the floor plan and gives turn-by-turn guidance.

## Stack

| Component | Technology |
|---|---|
| Mobile app | Flutter (Dart) — scanning, search, map rendering, guidance |
| API | Node.js + Express + TypeScript — JWT auth, pathfinding, QR generation |
| Admin | React + Vite + TypeScript — graph editor, map upload, QR export, dashboard |
| Database | MySQL 8 via Prisma |

## Status

| Stage | State |
|---|---|
| Project analysis | ✅ [`PROJECT_ANALYSIS.md`](PROJECT_ANALYSIS.md) |
| GSD workflow init | In progress |
| Phase 0 — monorepo scaffold + schema + seed | Not started |

## Documents

- [`PROJECT_ANALYSIS.md`](PROJECT_ANALYSIS.md) — full analysis of the synopsis, architecture
  decisions, tech-stack triage, data model, and the proposed phase breakdown.
- [`docs/synopsis.pdf`](docs/synopsis.pdf) — original project synopsis (9 pp).
- [`docs/QR code based app.pdf`](docs/QR%20code%20based%20app.pdf) — original abstract report (4 pp).

## Workflow

This project uses [GSD Core](https://github.com/open-gsd/gsd-core) — a spec-driven
development framework for AI coding agents. Planning artefacts live in `.planning/`.
