# Health-Tech Security Landscape — India & Developing Economies

Researched: 2026-11-06. Purpose: understand the problems first, then pick one for the health track. Complements the landscape in [02-blockchain-healthcare.md](./02-blockchain-healthcare.md).

**Evidence legend:** linked claims were checked against a source. ⚠️ = model knowledge, not independently verified.

---

## Why Health, Why Now

- **Healthcare is the costliest industry for breaches:** $7.42M average in IBM's 2025 report (down from $9.77M in 2024), and breaches take longest to resolve at 279 days ([TechTarget](https://www.techtarget.com/healthtechsecurity/news/366628031/Healthcare-remains-costliest-industry-for-breaches-at-742M), [HIPAA Journal](https://www.hipaajournal.com/average-cost-of-a-healthcare-data-breach-2025/)).
- **India is digitising faster than it secures:** 95.99 crore ABHA health IDs as of 31 Jul 2026 ([GKToday](https://www.gktoday.in/ayushman-bharat-digital-mission-crosses-93-95-crore-health-accounts/)). [03-healthcare-genome-records.md](./03-healthcare-genome-records.md) notes ~45–55% have zero linked records.
- **The law just changed:** DPDP Rules notified Nov 2025 (13 or 14 Nov per source) with an ~18-month phased timeline that may be shortened ([Tribune India](https://www.tribuneindia.com/news/business/government-notifies-dpdp-rules-to-empower-citizens-protect-privacy), [Uniqus](https://uniqus.com/digital-personal-data-protection-act-timelines/), [Storyboard18](https://www.storyboard18.com/how-it-works/govt-to-shorten-dpdp-rules-18-month-compliance-timeline-ib-minister-ashwini-vaishnaw-84323.htm)). A committee may restrict cross-border transfer of categories such as health data ([PW Only IAS](https://pwonlyias.com/current-affairs/dpdp-rules-2025/)).

---

## The 10 Problem Areas

### 1. Mass data breaches and leaks
| Incident | What happened | Source |
|----------|---------------|--------|
| AIIMS Delhi, Nov 2022 | NIC eHospital servers down from 23 Nov; OPD, labs, billing ran manually for over a week; primary and backup servers corrupted; two analysts suspended; ransom claims disputed | [Business Today](https://www.businesstoday.in/latest/story/aiims-delhis-server-down-since-morning-ransomware-attack-suspected-353964-2022-11-23), [Tribune](https://www.tribuneindia.com/news/delhi/major-cyber-attack-on-aiims-server-all-services-being-run-manually-probe-launched-453948), [Outlook](https://outlookindia.com/national/aiims-server-down-for-a-week-hospital-operating-on-manual-mode-terror-probe-on-news-240923) |
| CoWIN, Jun 2023 | Telegram bot returned phone, Aadhaar, DoB of vaccinated people. Government says it used a *previously breached* database, not live CoWIN; two arrests | [Business Today](https://businesstoday.in/technology/news/story/cowin-data-leak-on-telegram-aadhaar-pan-address-of-users-made-public-report-385210-2023-06-12), [The Wire](https://m.thewire.in/article/tech/personal-data-from-cowin-made-available-on-telegram-report), [Udayavani](https://www.udayavani.com/english-news/two-held-over-involvement-in-cowin-data-leak) |
| ICMR, Oct 2023 (alleged) | 81.5 crore records (Aadhaar, passport, addresses) offered on a dark-web forum for $80K; source disputed across ICMR/NIC/MoHFW; CBI probe | [The News Minute](https://www.thenewsminute.com/news/icmr-data-breach-exposes-details-of-815-crore-indians-what-you-need-to-know), [BOOM](https://www.boomlive.in/decode/data-breach-of-81-crore-indians-what-has-been-leaked-23492) |
| Star Health, 2024 | Customer data incl. medical reports exposed via Telegram chatbots; Reuters reported "millions" (a widely repeated **31M figure is unverified**) | [Claims Journal/Reuters](https://www.claimsjournal.com/news/national/2024/09/23/326405.htm), [Business Today](https://businesstoday.in/technology/news/story/stolen-star-health-customer-data-exposed-via-telegram-chatbots-raising-security-concerns-in-india-446756-2024-09-20) |
| Change Healthcare (US), Feb 2024 | BlackCat/ALPHV via Citrix without MFA; ~190M affected, revised to ~192.7M in a Jul 2025 HHS filing; $22M ransom paid | [Infosecurity](https://www.infosecurity-magazine.com/news/change-healthcare-breach-doubles/), [TEISS](https://www.teiss.co.uk/news/change-healthcare-data-breach-exposed-personal-information-of-over-192-million-people-16213) |

**Where trust breaks:** data is copied into many central databases; nobody can prove who accessed what.

### 2. Ransomware disrupting care
- **Synnovis (NHS pathology), Jun 2024:** Qilin; blood tests at ~10% of normal; >1,500 appointments and hundreds of operations delayed; ~394 GB leaked; 90,000+ patients' records exfiltrated ([Claims Journal](https://amp.claimsjournal.com/news/national/2024/06/18/324509.htm), [HIPAA Journal](https://www.hipaajournal.com/care-disrupted-at-london-hospitals-due-to-ransomware-attack-on-pathology-vendor/), [Infosecurity](https://www.infosecurity-magazine.com/news/synnovis-publish-nhs-patient-data), [TEISS](https://www.teiss.co.uk/news/london-pathology-firm-synnovis-begins-notifying-partners-following-2024-data-breach-16729)).
- AIIMS and Change Healthcare above.

**Where trust breaks:** single points of failure.

### 3. Consent and data sharing
- ABDM has a consent-manager design but weak downstream audit ⚠️; DPDP now requires provable consent and withdrawal (above).
- In developing economies "consent" is often a checkbox on a shared phone ⚠️.

### 4. Counterfeit and substandard medicines
- **WHO (2017):** ~1 in 10 medical products in LMICs is substandard or falsified (100+ studies, 88 countries, 48,000 samples, 10.5% failure rate) ([WHO](https://www.who.int/news/item/28-11-2017-1-in-10-medical-products-in-developinG-countries-is-substandard-or-falsified)).
- **Gambia (66 children) and Uzbekistan (18)** deaths linked to Indian-made syrups with DEG/EG ([Business Standard](https://www.business-standard.com/india-news/from-june-1-cough-syrups-must-be-tested-at-govt-labs-before-export-123052201228_1.html)).
- **Coldrif, MP, 2025:** at least 24 children died; one sample had **48.6% DEG vs a 0.1% limit** ([Tribune](https://www.tribuneindia.com/news/madhya-pradesh/mp-coldrif-cough-syrup-fatality-count-reaches-24-after-2-more-children-die), [ETV Bharat](https://www.etvbharat.com/en/bharat/madhya-pradesh-coldrif-cough-syrup-fatality-count-rises-after-many-children-die-enn25101506375)).
- Full analysis: [11-medicine-quality-ledger.md](./11-medicine-quality-ledger.md).

### 5. Insurance and scheme fraud
- **CAG audit of AB-PMJAY (Aug 2023):** 7,49,820 beneficiaries linked to the single mobile number 9999999999; 1.39 lakh to 8888888888; treatment recorded for patients shown as dead. The Health Ministry said mobile numbers don't determine eligibility (Aadhaar e-KYC does) ([Business Standard](https://business-standard.com/india-news/nearly-750-000-recipients-of-pmjay-linked-to-same-phone-number-cag-report-123080900450_1.html), [Business Today](https://www.businesstoday.in/latest/policy/story/ayushman-bharat-patients-shown-as-dead-getting-treatment-985-lakh-ab-pmjay-beneficiaries-linked-to-same-mobile-number-says-cag-report-393403-2023-08-09), [Medical Dialogues](https://medicaldialogues.in/amp/news/health/dead-patients-getting-treatment-cag-audit-report-flags-errors-in-pmjay-scheme-health-ministry-issues-clarification-115777)).

### 6. Fake credentials, prescriptions and certificates
- Unqualified practitioners, reused e-pharmacy prescriptions, diversion of codeine syrups and tramadol, fake certificates ⚠️.

### 7. Medical devices / IoMT
- **Contec CMS8000 (Jan 2025):** CISA and FDA warned of a hard-coded IP "backdoor" and plaintext patient-data transmission (CVE-2025-0626, CVE-2025-0683); CISA advised unplugging; intent disputed by some researchers ([The Hacker News](https://thehackernews.com/2025/01/cisa-and-fda-warn-of-critical-backdoor.html), [Security Affairs](https://securityaffairs.com/173694/uncategorized/cisa-fda-warned-hidden-backdoor-in-contec-cms8000.html)).

### 8. AI-era provenance
- Deepfake doctor endorsements, AI-generated fake lab reports and prescriptions, untraceable model decisions ⚠️.

### 9. Clinical-trial data integrity
- See [05-regulatory-pipeline.md](./05-regulatory-pipeline.md) for ICH GCP audit-trail requirements.

### 10. Genetic and highly sensitive data
- **23andMe:** credential-stuffing breach exposed 6.9M customers' data (2023); Chapter 11 filing on 23 Mar 2025 put ~15M people's genetic data up as an asset; California AG urged deletion ([Al Jazeera](https://www.aljazeera.com/economy/2025/3/24/genetic-testing-firm-23andme-files-for-bankruptcy-protection), [NPR](https://npr.org/2025/03/24/nx-s1-5338622/23andme-bankruptcy-genetic-data-privacy)). Directly relevant to the genome concept in [03](./03-healthcare-genome-records.md).

---

## Developing-Economy Amplifiers ⚠️

Shared phones and SIM churn (see 9999999999) · low digital literacy · patchy connectivity · fragmented private care · cash payments · migrant patients · under-resourced regulators.

---

## Where Blockchain Helps (and Doesn't)

| Helps | Doesn't help / hurts |
|-------|----------------------|
| Several mutually distrustful parties sharing a record | Storing patient data on-chain (immutability vs DPDP erasure) |
| Proving something happened and wasn't changed later | A single organisation's bad IT hygiene |
| Verifiable credentials checkable without calling the issuer | Garbage input — the chain faithfully stores a lie |
| Proving a fact without revealing data (ZK) | — |
| De-duplication (one claim / one prescription fill) | — |

Consistent with Guardtime's tamper-evidence model in [02-blockchain-healthcare.md](./02-blockchain-healthcare.md).

---

## Top-5 Ranking (Hackathon Perspective)

Rubric: Blockchain fit 25% · Feasibility 25% · Impact 20% · Demo 15% · Novelty 15%. These score the **problem area**, not a finished build.

| Rank | Problem area | BC fit | Feas. | Impact | Demo | Novelty | **Score** |
|------|--------------|-------:|------:|-------:|-----:|--------:|----------:|
| 1 | Counterfeit / substandard medicines | 9 | 8 | 10 | 9 | 5 | **8.4** |
| 2 | Fake credentials & prescriptions | 9 | 9 | 8 | 8 | 6 | **8.2** |
| 3 | Insurance & scheme fraud | 9 | 6 | 9 | 6 | 6 | **7.4** |
| 4 | Consent & data sharing | 8 | 7 | 8 | 6 | 7 | **7.3** |
| 5 | AI-era provenance | 6 | 8 | 7 | 8 | 8 | **7.3** |

**Cut:** breaches and ransomware (security hygiene, not blockchain) · devices (hardware) · clinical trials (niche demo) · genetic data (storage/governance).

---

## Conclusions

1. The strongest health-track problems combine **recent Indian harm**, **several distrustful parties**, and a **fact that can be proven without patient data**: counterfeit medicines (#1) and credentials/prescriptions (#2).
2. #1 and #2 meet at the **pharmacy counter** — one scan could check both "is this prescription valid and unused?" and "did this batch pass its quality test?".
3. This partially revises [02-blockchain-healthcare.md](./02-blockchain-healthcare.md)'s "de-prioritise healthcare" verdict: medicine quality is a *product* integrity problem, so it avoids patient-data and ABDM-integration blockers.
4. Selected for deep dive: **counterfeit/substandard medicines** → [11-medicine-quality-ledger.md](./11-medicine-quality-ledger.md).
