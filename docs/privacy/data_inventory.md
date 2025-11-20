# IranConnect — Data Inventory & Processing Register (Stage 0)

_Last updated: 2025-10-16 • Owner: IranConnect (Controller)_

## 1) Overview
IranConnect aggregates publicly-available information about Iranian-run businesses (medical, legal, translation, etc.) in France (and later, other countries). Data is collected **manually** from public sources to help users discover services. Users can register to rate businesses (and later, post reviews).

- **Controller:** IranConnect (iranconnect.fr)
- **Primary audience:** Users in France/EU
- **Collection mode:** Manual (no automated crawling)
- **Contact for privacy:** support@iranconnect.fr (to be finalized)

## 2) Data Types, Sources, Purposes, Retention, Access

| Data Type | Examples / Fields | Source | Purpose (Legal Basis) | Retention | Access |
|---|---|---|---|---|---|
| Business profile | business_name, category/subcategory, phone, email, address, city/country, website | Public web (Google Maps, LinkedIn, Google Search, Doctolib for doctors) | Directory display & discovery (**Legitimate Interests**) | While listed as active; **deleted** entries purged after **3 months** | Admin only (panel), production DB |
| Ratings (users → businesses) | rating (1–5) | Users | Quality signal for directory (**Legitimate Interests** / Contract) | While business is active; or until user deletes account (then see user retention) | Admin + app logic |
| Reviews (future) | text review | Users | Same as above | To be finalized alongside the Reviews feature | Admin + app logic |
| Business images | Screenshot of Google Maps cover/photo (if used) | Public web | Visual identification of the place (**Legitimate Interests**) | While business is active; comply with takedown on request | Admin + app logic |
| Timestamps | created_at, updated_at | System | Audit & accuracy (**Legitimate Interests**) | Same as parent record | Admin + app logic |
| User account | email, name, password (hashed), rating_given count | Users | Account & authentication (**Contract**) | If account is deleted or inactive → purge after **3 months** | Admin + app logic |
| Contact form | name, email, message | Users | Support & correspondence (**Legitimate Interests**) | **12 months** unless legally required | Admin + support inbox |
| Future listings (user-submitted) | product/service/rental: images, price, description, address, phone, email, website | Users | Marketplace directory (**Contract**) | To be finalized; default: while listing is active + 3 months after deletion | Admin + app logic |
| Logs/telemetry (if analytics enabled) | IP (server logs), GA signals (if consented) | System / Google Analytics (opt-in) | Security/analytics (**Legitimate Interests** / **Consent** for analytics) | Server logs: **≤90 days**; Analytics: per vendor policy & until consent withdrawn | Admin; vendor as processor |

## 3) Collection Sources (Public)
- **Google Maps**, **LinkedIn**, **Google Search**  
- **Doctolib** (only for Iranian doctors in France)  
- Manual copy from publicly-available pages. No automated crawler.

## 4) Processing Purposes & Legal Bases
- Display a public directory of Iranian-run businesses to facilitate discovery by users (**Legitimate Interests**, Art. 6(1)(f)).  
- Provide user accounts to rate (and later review) businesses (**Contract**, Art. 6(1)(b)).  
- Handle data removal/rectification requests (**Legal obligation** / data subject rights handling).  
- Analytics (only with prior **Consent**, Art. 6(1)(a)).  
- Security & fraud prevention (**Legitimate Interests**).

## 5) Data Subjects
- Business owners (public business contact data)  
- Registered users (account + ratings; later reviews)  
- Site visitors (cookie/analytics – only if consented)

## 6) Vendors / Processors & Infrastructure
- **Hosting/CDN:** OVH Cloud (EU)  
- **Email:** Gmail (Google) – transactional/support  
- **Maps API:** Google Maps  
- **File Storage:** Google Cloud Storage (media assets)  
- **Backups:** Google Drive, GitHub (code only; no prod DB dumps in repo)  
- **Analytics (optional):** Google Analytics / Tag Manager (loaded only after consent)

> Note: Some vendors are non-EEA (e.g., Google LLC). Use appropriate transfer safeguards (e.g., SCCs) and document them in the Privacy Policy. Keep secrets in environment variables and never store prod DB dumps in GitHub.

## 7) Access Control
- Current admins: **single admin (founder)**  
- DB currently on **local** environment for development; production to be on OVH.  
- Principle of least privilege; admin panel protected.  
- Backups exist and are stored securely.

## 8) Retention & Deletion
- Active business records: retained while listed as active.  
- **Deleted business records:** purged after **3 months**.  
- **Inactive/deleted user accounts:** purged after **3 months**.  
- **Contact form messages:** retained **12 months**.  
- **Server logs:** ≤ **90 days** (target).  
- Analytics: per vendor policy; cease on consent withdrawal; provide opt-out.

## 9) Risks & Mitigations (DPIA-lite)
- **Accuracy risk (public data may be outdated):** provide clear “Update/Remove this listing” pathway; respond within SLA (e.g., 72h).  
- **Image/copyright concerns (screenshots):** prefer linking/embedding official images or business-provided media; remove upon request.  
- **Over-collection risk:** store only necessary fields for discovery; avoid sensitive categories.  
- **International transfers:** document vendors, enable SCCs/DPAs, EU hosting when possible.  
- **Analytics tracking:** disabled by default; load only after explicit consent.

## 10) Next Steps / Dependencies
- Stage 2: Draft **Privacy Policy / Terms / Cookies** pages (EN/FR) referencing this register.  
- Stage 3: Implement cookie consent (load GA/Tag Manager only after consent).  
- Stage 4/6: Build **Data Removal/Update** request flow & per-listing “Claim/Remove” links.  
- Stage 5: Implement **Business Claim/Owner Verification** via email code.  

