# AssetLifecycle (PST_PD_025)

This is our Month-1 OJT project. We are building a web app to help IT heads track company hardware (like laptops and monitors) and software licenses in one place, instead of using multiple messy spreadsheets.

**Team (G441):**
- Divyansh Gupta
- Aradkar Nishk Devdatta

**Mentor:** Madhushri Tangali

## What We Are Building (Features)

1. **Two User Views (Role Switch):**
   - **IT Department Head:** Can add new assets, assign them to employees, update their stage, and manage licenses.
   - **Auditor:** Read-only view to verify assets and mark them as `Verified`, `Missing`, or `Mismatch`.

2. **Asset Register & Lifecycle Tracking:**
   - Add hardware with asset tag, serial number, purchase date, and warranty end date.
   - Move assets through stages: `In Stock` -> `Assigned` -> `In Repair` -> `Retired` -> `Disposed`.
   - Keep a simple history log whenever an asset's owner or stage changes.

3. **License Compliance Tracker:**
   - Track how many seats were bought vs how many are actually in use.
   - Show status labels like `Compliant`, `Over-deployed`, `Expiring Soon` (if less than 30 days left), or `Expired`.

4. **Audit Checklist & CSV Export:**
   - Auditors can check assets one by one, add notes, see compliance gaps, and download the table as a CSV file.

## Tech Stack

- **HTML5:** Semantic structure, accessible forms, and screen containers
- **CSS3 & Bootstrap 5:** 12-column grid layout, responsiveness for laptop & phone, and custom brand styling
- **JavaScript (ES6):** DOM manipulation, role switching, stage change rules, and form validation
- **Storage:** Browser `localStorage` to save assets and audit logs without a backend
- **Version Control:** Git & GitHub for collaboration

## How the UI Will Look

We are making a clean dashboard layout that works on both laptop and phone screens:

- **Top Navbar:** Shows the app name (`AssetLifecycle`) and a dropdown on the right to switch between *IT Department Head* and *Auditor*.
- **Left Sidebar:** Simple menu buttons to switch between screens (*Dashboard*, *Asset Register*, *Licenses*, *Audit Checklist*, *Audit Findings*, and *About/Help*). On mobile, this will stack at the top.
- **Main Screen Area:**
  - **Dashboard:** Top summary cards showing total assets, warranty alerts, and license issues so the IT head can check everything in 30 seconds.
  - **Tables & Forms:** Clean tables with a search bar and stage filter on top, plus forms to add or update records.
- **Colors:** Teal (`#0F766E`) for the main header and active buttons, light grey (`#F8FAFC`) for the background, and red/yellow/green badges with text for alerts.

## Note
Since this is a frontend project for Sem 1, we are using sample data (around 30 assets, 10 employees, and 6 licenses) and saving everything in the browser's `localStorage` so data stays even after refreshing the page.