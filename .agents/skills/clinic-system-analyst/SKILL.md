---
name: clinic-system-analyst
description: Comprehensive deep analysis framework for Clinical Management & Healthcare SaaS systems. Analyzes domain integrity, data synchronization, clinical workflow accuracy, UX information architecture, and multi-persona compliance.
---

# Clinic System Analyst Skill 

This skill provides a systematic, multi-dimensional audit framework for enterprise healthcare SaaS platforms.

## Audit Dimensions

### 1.  Clinical & Business Domain Integrity
- **Appointment Lifecycle:** Is every appointment state transition (`upcoming` -> `completed` / `cancelled`) deterministic and reflected in revenue and patient dossier history?
- **Attendance & Revenue Calculations:** Are revenue metrics computed strictly from completed appointments? Are fees formatted consistently with currency units?
- **Holiday & Vacation Safety:** Are weekly off-days (e.g. Friday in Egypt) and doctor emergency blocks enforced across all interfaces (public booking, secretary booking, patient self-service portal)?

### 2.  Multi-Persona Boundary & Access Isolation
- **Doctor Persona:** Focuses on live examination queue, diagnostic notes, patient medical attachments, and practice performance.
- **Receptionist Persona:** Focuses on patient waiting room coordination, WhatsApp notifications, quick walk-in registration, and Excel reports.
- **Patient Persona:** High-speed self-service booking, zero login friction, instant booking reference codes, and self-service rescheduling.

### 3.  Information Architecture & Micro-Interactions
- **Visual Hierarchy & Zero Clutter:** Elimination of overlapping text, cramped pie slices, or wasted whitespace.
- **Arabic Typography & RTL Alignment:** Flawless RTL reading flow, native Cairo font rendering, and readable badges.
- **Keyboard & Mobile Accessibility:** Global Command Palette (`K`), touch targets >= 44px, native bottom navigation bar for handheld devices.

### 4.  Code Quality & Long-Term Sustainability
- **Zero Dead Code:** Clean imports, 0 oxlint warnings/errors.
- **Resilient Fallback:** Graceful fallback between Supabase cloud persistence and offline localStorage.
- **Fast Build & Lightweight Bundle:** Sub-2s production builds on Vite.
