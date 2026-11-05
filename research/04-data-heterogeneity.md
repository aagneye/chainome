# Data Heterogeneity in Health Records

Researched: 2026-11-06.

---

## Three Types

### Semantic Heterogeneity
Same condition, drug, or test called different things across hospitals and systems.
- "Myocardial infarction" vs "heart attack" vs "MI" vs "acute MI" — all the same thing
- Clinicians in most Indian hospitals still dictate free text; structured coding is not universal
- Drug names: brand vs generic vary by hospital formulary

### Structural Heterogeneity
What patients actually hold — almost entirely unstructured:

| What patient has | Format | Parseable? |
|-----------------|--------|-----------|
| Printed bills | Paper / scanned PDF | OCR needed |
| Paper prescriptions | Handwritten or printed | OCR + NLP |
| PDF scan reports (radiology) | PDF with text or image | PDF parser / OCR |
| DICOM CDs (X-ray, MRI, CT) | Binary DICOM files | DICOM library |
| Lab reports | Printed PDF | OCR + structured extraction |
| Doctor notes | Unstructured text | NLP |
| FHIR/HL7 records | Structured XML/JSON | Direct parse — but patient NEVER sees this layer |

**Key insight:** FHIR R4 and HL7 are what institutions exchange. Patients never see that layer. The raw material is paper, photos of paper, and PDFs.

### Statistical Heterogeneity
- Inconsistent units: hemoglobin in g/dL vs mmol/L depending on lab
- Date formats: DD/MM/YYYY vs MM/DD/YYYY vs YYYY-MM-DD
- Reference ranges differ by lab machine calibration
- No standard for "normal" values across Indian hospital networks

---

## Standards (What Exists on Paper)

India's official EHR Standards (MoHFW 2016, updated via ABDM):

| Standard | Purpose | Reality |
|----------|---------|---------|
| **FHIR R4** | Modern exchange format between institutions | Required by ABDM; most small/mid clinics don't emit it |
| HL7 v2/v3 | Older, still dominant in Indian hospital HIS | Legacy systems, partially deployed |
| **SNOMED CT** | Clinical terminology (conditions, procedures) | Mandated; adoption thin outside large hospitals |
| **LOINC** | Lab/test observations | Mandated; adoption thin |
| ICD-10 / ICD-11 | Diagnosis coding | ICD-10 dominant; ICD-11 transition ongoing (check ABDM Implementation Guide) |
| **DICOM** | Medical imaging | Dominant standard for imaging; most radiology systems use it |

Sources: [MoHFW EHR Standards via Vikaspedia](https://mai.vikaspedia.in/health/nrhm/national-health-policies/electronic-health-record-standards-for-india) · [FHIR in Indian healthcare dev article](https://dev.to/hgvanpariya/fhir-in-indian-healthcare-it-what-every-developer-building-hmis-software-needs-to-know-3lp7)

**Reality gap:** Standards exist on paper; enforcement is thin. What patients bring to a new provider is a stack of physical papers or JPG photos of reports. **OCR, not FHIR parsing, is the real technical problem.**

---

## Solutions Applicable to This Project

### Input Layer (Patient uploads)
1. **OCR** — Tesseract (open source) or Google Vision API / AWS Textract for Indian language support
2. **Document classification** — classify into bill / prescription / lab report / radiology report / discharge summary
3. **NLP extraction** — extract: date, doctor name, hospital, diagnosis, medications, test values, test names

### Normalization Layer
1. Map extracted terms → SNOMED CT / LOINC codes (can use a local lookup table for common Indian hospital terms)
2. Normalize units (all hemoglobin → g/dL, all dates → ISO 8601)
3. Link to patient FHIR profile (ABHA integration where available)

### Storage Layer
- Encrypted off-chain: IPFS+Filecoin or Arweave
- On-chain: content hash + access control pointers only
- Crypto-shredding for DPDP/GDPR Right to Be Forgotten compliance

### Summary Layer
- LLM (GPT-4o / Claude) generates patient-readable summary from structured record
- Timeline view: sorted by date, grouped by health episode/condition
- "What to tell the next doctor" export

---

## Hackathon Demo Path (48h)

Realistic scope:
1. Patient uploads PDF bill + scan report photo
2. OCR extracts text
3. NLP structures into date / hospital / diagnosis / medications
4. Encrypts, uploads to IPFS, stores hash on-chain with patient wallet as access key
5. LLM generates 3-sentence summary
6. Timeline view shows all records sorted by date

What to skip: Full SNOMED/LOINC normalization (too broad), DICOM handling (too large), multi-language OCR (scope creep).
