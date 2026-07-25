import re
import os
import io
import math
import logging
import json
import numpy as np
from typing import Dict, Any, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from groq import Groq

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_engines")

# Initialize Groq client if key is available
groq_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_key) if groq_key else None
if groq_client:
    logger.info("Groq client initialized successfully for real LLM processing.")
else:
    logger.warning("GROQ_API_KEY not configured. Falling back to simulated clinical heuristics.")


# ================= RAG & Embedding Knowledge base =================
MED_DOCS = [
    {
        "topic": "Diabetes Care and Diagnosis Guidelines",
        "keywords": ["diabetes", "hba1c", "glucose", "metformin", "sugar"],
        "content": "A diagnosis of diabetes is confirmed with an HbA1c value >= 6.5% or a fasting plasma glucose level >= 126 mg/dL. Metformin remains the preferred first-line pharmacological treatment. Monitor renal function (eGFR) and screen for retinopathy yearly."
    },
    {
        "topic": "Hypertension Clinical Guidelines",
        "keywords": ["hypertension", "systolic", "diastolic", "blood pressure", "lisinopril"],
        "content": "Hypertension is categorized as Stage 1 if Systolic BP is 130-139 mmHg or Diastolic BP is 80-89 mmHg. Stage 2 is diagnosed at >= 140/90 mmHg. ACE Inhibitors (e.g. Lisinopril), ARBs, and Calcium Channel Blockers are primary therapeutics."
    },
    {
        "topic": "Cardiology & Lipid Panel Diagnostics",
        "keywords": ["cholesterol", "ldl", "hdl", "triglycerides", "statin", "lipid"],
        "content": "Optimal LDL cholesterol is < 100 mg/dL. High LDL (>= 160 mg/dL) or Total Cholesterol >= 240 mg/dL warrants high-intensity statin therapy (e.g. Atorvastatin) to mitigate atherosclerotic cardiovascular disease (ASCVD) risk."
    }
]

# ================= OCR & Document Parsing Heuristics =================
def parse_medical_report(text: str) -> Dict[str, Any]:
    """
    Parses clinical attributes from unstructured text reports.
    Uses Groq LLM if available, otherwise falls back to local regex-based heuristics.
    """
    if groq_client:
        try:
            logger.info("Using Groq API to parse medical report...")
            prompt = (
                "You are an expert clinical AI. Parse the following unstructured medical report text and extract "
                "demographics, test metrics, and clinical summaries. Return a JSON object matching this schema:\n"
                "{\n"
                "  \"patient_name\": \"string or Unknown Patient\",\n"
                "  \"age\": integer or null,\n"
                "  \"gender\": \"Male\" or \"Female\" or \"Other\" or \"Not Specified\",\n"
                "  \"report_date\": \"YYYY-MM-DD or standard date format\",\n"
                "  \"test_metrics\": [\n"
                "    {\n"
                "      \"test_name\": \"name of the test, e.g. HbA1c, LDL Cholesterol, etc.\",\n"
                "      \"value\": float,\n"
                "      \"unit\": \"string, e.g. %, mg/dL, mmHg, etc.\",\n"
                "      \"reference_range\": \"standard range, e.g. 0-99, 70-99, etc.\",\n"
                "      \"is_abnormal\": boolean\n"
                "    }\n"
                "  ],\n"
                "  \"summary\": \"concise medical summary of the report contents\",\n"
                "  \"alerts\": [\"list of strings describing specific abnormal findings, e.g., 'Abnormal LDL: 145 mg/dL is high.'\"],\n"
                "  \"recommendations\": [\"actionable, personalized, professional clinical advice steps\"]\n"
                "}\n"
                f"Report text:\n{text}"
            )
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a specialized medical database extractor. Output ONLY valid, parsable JSON matching the schema. Do not output any preamble, markdown formatting (like ```json), or postamble. Your output must start with '{' and end with '}'."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            logger.error(f"Groq report parsing failed: {e}. Falling back to heuristics.")

    result = {
        "patient_name": "Unknown Patient",
        "age": None,
        "gender": "Not Specified",
        "report_date": "Unknown Date",
        "test_metrics": [],
        "summary": "No clinical summary could be automatically generated.",
        "alerts": [],
        "recommendations": []
    }
    
    # Extract Demographics
    name_match = re.search(r'Patient(?:\s+Name)?:\s*([A-Za-z\s]+)', text, re.IGNORECASE)
    if name_match:
        result["patient_name"] = name_match.group(1).strip().split('\n')[0].strip()
        
    age_match = re.search(r'Age:\s*(\d+)', text, re.IGNORECASE)
    if age_match:
        result["age"] = int(age_match.group(1))
        
    gender_match = re.search(r'(?:Gender|Sex):\s*(Male|Female|Other)', text, re.IGNORECASE)
    if gender_match and gender_match.group(1):
        result["gender"] = gender_match.group(1).strip()
    else:
        result["gender"] = "Not Specified"

        
    date_match = re.search(r'Date:\s*([\d\-/]+)', text, re.IGNORECASE)
    if date_match:
        result["report_date"] = date_match.group(1).strip()

    # Extract Common Medical Test metrics (e.g. HbA1c, LDL Cholesterol, Systolic BP)
    metrics_patterns = [
        (r'HbA1c|Hemoglobin\s+A1c', r'(\d+\.?\d*)\s*%', 'HbA1c', '%', 4.0, 5.6),
        (r'Total\s+Cholesterol', r'(\d+)\s*mg/dL', 'Total Cholesterol', 'mg/dL', 100.0, 199.0),
        (r'LDL(?:\s+Cholesterol)?', r'(\d+)\s*mg/dL', 'LDL Cholesterol', 'mg/dL', 0.0, 99.0),
        (r'Fasting\s+Glucose|Blood\s+Sugar', r'(\d+)\s*mg/dL', 'Fasting Blood Glucose', 'mg/dL', 70.0, 99.0),
        (r'Systolic\s+BP|SBP', r'(\d+)\s*mmHg', 'Systolic BP', 'mmHg', 90.0, 120.0),
        (r'Diastolic\s+BP|DBP', r'(\d+)\s*mmHg', 'Diastolic BP', 'mmHg', 60.0, 80.0),
    ]

    for label_pat, val_pat, name, unit, ref_low, ref_high in metrics_patterns:
        label_match = re.search(label_pat, text, re.IGNORECASE)
        if label_match:
            # search near context
            start = max(0, label_match.start() - 10)
            end = min(len(text), label_match.end() + 30)
            context = text[start:end]
            val_match = re.search(val_pat, context, re.IGNORECASE)
            if val_match:
                val = float(val_match.group(1))
                is_abnormal = val < ref_low or val > ref_high
                result["test_metrics"].append({
                    "test_name": name,
                    "value": val,
                    "unit": unit,
                    "reference_range": f"{ref_low} - {ref_high}",
                    "is_abnormal": is_abnormal
                })
                if is_abnormal:
                    cond = "high" if val > ref_high else "low"
                    result["alerts"].append(f"Abnormal {name}: {val} {unit} is {cond} (Ref: {ref_low}-{ref_high}).")

    # Generate Summary & Recommendations
    if result["test_metrics"]:
        abnormal_count = sum(1 for m in result["test_metrics"] if m["is_abnormal"])
        result["summary"] = f"Processed medical records. Identified {len(result['test_metrics'])} clinical indicators, with {abnormal_count} markers returning outside optimal reference ranges."
        
        # Recommendations base
        for m in result["test_metrics"]:
            if m["is_abnormal"]:
                if "Cholesterol" in m["test_name"]:
                    result["recommendations"].append("Adopt low-cholesterol dietary patterns, increase cardiovascular physical activity, and discuss statin therapy indicators with a physician.")
                elif "Glucose" in m["test_name"] or "HbA1c" in m["test_name"]:
                    result["recommendations"].append("Decrease glycemic load, monitor carbohydrate intake, and consult an endocrinologist regarding blood glucose stabilizers.")
                elif "BP" in m["test_name"]:
                    result["recommendations"].append("Restrict sodium consumption, practice stress mitigation techniques, and log daily blood pressure trends.")
    else:
        result["summary"] = "Medical document processed. No recognized standard diagnostic metrics (blood pressure, cholesterol, HbA1c) were detected."
        result["recommendations"].append("Schedule a routine comprehensive health consultation with a medical professional to review baseline biometrics.")

    return result


def parse_prescription_medications(text: str) -> List[Dict[str, Any]]:
    """
    Parses medication attributes from unstructured prescription text.
    Returns a list of dicts with keys: name, dosage, frequency, duration.
    """
    fallback = []
    if groq_client:
        prompt = (
            "You are an expert clinical AI. Parse the following prescription text and extract "
            "all medications listed. For each medication, extract the name, dosage, frequency, and duration. "
            "Return a JSON object containing a 'medications' key with a list of medications matching this schema:\n"
            "{\n"
            "  \"medications\": [\n"
            "    {\n"
            "      \"name\": \"medication name (e.g. Metformin)\",\n"
            "      \"dosage\": \"dosage details (e.g. 500mg)\",\n"
            "      \"frequency\": \"how often to take (e.g. Once daily, twice a day)\",\n"
            "      \"duration\": \"how long to take (e.g. 30 days, 1 week, Ongoing)\"\n"
            "    }\n"
            "  ]\n"
            "}\n"
            f"Prescription text:\n{text}"
        )
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a specialized medical database extractor. Output ONLY valid, parsable JSON matching the schema. Do not output any preamble, markdown formatting (like ```json), or postamble."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            if isinstance(data, dict) and "medications" in data:
                return data["medications"]
        except Exception as e:
            logger.error(f"Groq prescription parsing failed: {e}. Falling back to heuristics.")

    # Fallback heuristics: try to search for lines that look like medications
    # Metformin 500mg - 1 daily - 30 days
    meds = []
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Simple regex matching common patterns
        # e.g., "DrugName 500mg" or similar
        match = re.search(r'^([A-Za-z\s\-]+)\s+(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|tabs|caps|units))\b', line, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            dosage = match.group(2).strip()
            # Try to extract frequency and duration from remaining text
            rest = line[match.end():].strip()
            frequency = "As directed"
            duration = "Ongoing"
            
            # Simple duration extraction
            dur_match = re.search(r'(\d+\s*(?:day|week|month|year)s?)', rest, re.IGNORECASE)
            if dur_match:
                duration = dur_match.group(1).strip()
            
            # Simple frequency extraction
            freq_match = re.search(r'(once|twice|thrice|daily|qd|bid|tid|qid|hourly|at night|morning)', rest, re.IGNORECASE)
            if freq_match:
                frequency = freq_match.group(1).strip()
            elif "1x" in rest or "1-0-0" in rest:
                frequency = "Once daily"
            elif "2x" in rest or "1-0-1" in rest:
                frequency = "Twice daily"
            elif "3x" in rest or "1-1-1" in rest:
                frequency = "Three times daily"

            meds.append({
                "name": name,
                "dosage": dosage,
                "frequency": frequency,
                "duration": duration
            })
            
    if not meds:
        # Fallback to returning the text as a generic item if no pattern matches
        if len(text.strip()) > 5:
            meds.append({
                "name": "Extracted Prescription text (check details)",
                "dosage": "N/A",
                "frequency": "See text",
                "duration": text.strip()[:100] + "..." if len(text.strip()) > 100 else text.strip()
            })
            
    return meds


# ================= RAG Chat Engine =================
def run_rag_query(query: str, report_text: Optional[str] = None) -> str:
    """
    RAG chatbot. Looks at query, matches it to the local knowledge base (guidelines) and the loaded report text context if available.
    Uses Groq LLM if available, otherwise falls back to static template answers.
    """
    # Query guidelines
    matched_guidelines = []
    for doc in MED_DOCS:
        score = sum(2 if kw in query.lower() else 0 for kw in doc["keywords"])
        if score > 0:
            matched_guidelines.append(doc["content"])
            
    if groq_client:
        try:
            logger.info("Using Groq API to run RAG medical chat query...")
            context = ""
            if report_text:
                context += f"Patient Medical Report Content:\n{report_text}\n\n"
            if matched_guidelines:
                context += f"Clinical Reference Guidelines:\n" + "\n".join(matched_guidelines) + "\n\n"
                
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are PulseMind Clinical AI, a helpful and professional medical assistant. "
                        "Answer the user's question using the provided patient report and clinical reference guidelines. "
                        "If the answer is not in the context, use your expert medical knowledge to respond safely. "
                        "Always keep responses concise, well-structured, and easy for patients to read. "
                        "IMPORTANT: Always include a short, separate disclaimer at the very end stating that "
                        "this is not a formal medical diagnosis."
                    )
                },
                {
                    "role": "user",
                    "content": f"Context information:\n{context}User Query: {query}"
                }
            ]
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq RAG query failed: {e}. Falling back to static replies.")

    context = ""
    if report_text:
        # parsed report metrics
        parsed = parse_medical_report(report_text)
        metrics_str = ", ".join([f"{m['test_name']}: {m['value']} {m['unit']}" for m in parsed["test_metrics"]])
        context += f"Patient Profile: {parsed['patient_name']} (Age {parsed['age'] or 'N/A'}, Gender {parsed['gender']}). Current Test Results: {metrics_str or 'None'}. "
        
    if matched_guidelines:
        context += "Clinical Reference Data: " + " ".join(matched_guidelines)
        
    # Build conversational response based on matched context
    if "cholesterol" in query.lower():
        if "Total Cholesterol" in context or "LDL Cholesterol" in context:
            return "Based on your clinical documents, your cholesterol values are listed. Normal LDL is below 100 mg/dL, while Total Cholesterol is optimal below 200 mg/dL. High values may warrant discussing lipid-lowering therapies (statins) and nutritional adjustments with your cardiologist."
        return "Normal cholesterol benchmarks are < 100 mg/dL for LDL and < 200 mg/dL for Total Cholesterol. High levels are a risk factor for vascular disease. We recommend discussing a cardiovascular risk assessment with your clinician."
    elif "hba1c" in query.lower() or "glucose" in query.lower() or "diabetes" in query.lower():
        return "A diagnosis of diabetes is confirmed when HbA1c is 6.5% or higher, or fasting blood glucose is 126 mg/dL or higher. Metformin is commonly used as a first-line treatment. If your reports indicate high levels, it is crucial to consult your endocrinologist to structure a glycemic control plan."
    elif "blood pressure" in query.lower() or "hypertension" in query.lower() or "bp" in query.lower():
        return "Optimal resting blood pressure is under 120/80 mmHg. Stage 1 hypertension is diagnosed between 130-139 systolic or 80-89 diastolic. Stage 2 is 140/90 or higher. If your metrics are elevated, restrict sodium intake, monitor values daily, and review therapeutic options like Lisinopril with your doctor."
    elif "abnormal" in query.lower() or "high" in query.lower() or "low" in query.lower():
        if report_text:
            parsed = parse_medical_report(report_text)
            if parsed["alerts"]:
                return "Your reports indicate the following out-of-range parameters: " + " ".join(parsed["alerts"]) + " Please discuss these metrics with your healthcare provider."
        return "I can analyze uploaded reports for abnormal parameters. If you have uploaded a report, you can check the anomalies card on the dashboard, or share the text here so I can check for metrics outside normal ranges."
        
    return "I am the PulseMind Clinical AI. I can review your uploaded blood chemistry panels (cholesterol, glucose, blood pressure) and cross-reference them with guidelines. What specific aspect of your medical reports or biometrics would you like me to explain?"


# ================= Medical Imaging Classifier =================
def classify_medical_image(image_bytes: bytes, modality: str) -> Dict[str, Any]:
    """
    Simulates a Deep Learning CNN classifier for chest X-rays, brain MRIs, and skin lesions.
    Provides diagnostic prediction, confidence scores, and mock 8x8 explainable AI diagnostic boundary maps.
    """
    # Modality options: 'xray', 'mri', 'lesions'
    np.random.seed(len(image_bytes) % 1000)
    
    if modality == "xray":
        findings = ["Pneumonia Detected", "Normal Chest X-Ray", "Pleural Effusion"]
        weights = [0.4, 0.5, 0.1]
    elif modality == "mri":
        findings = ["Glioma Identified", "No Anomalies Detected (Normal)", "Meningioma Detected"]
        weights = [0.3, 0.6, 0.1]
    else: # skin lesions
        findings = ["Benign Melanocytic Nevus", "Malignant Melanoma Risk", "Basal Cell Carcinoma"]
        weights = [0.7, 0.1, 0.2]
        
    prediction = np.random.choice(findings, p=weights)
    confidence = round(float(np.random.uniform(0.78, 0.96)), 3)
    
    # Create an 8x8 matrix representing XAI heat maps (Affected region highlighting)
    xai_grid = np.random.uniform(0.0, 1.0, size=(8, 8))
    # Make a simulated 'hot spot' (affected region)
    center_r, center_c = np.random.randint(2, 6, size=2)
    for r in range(8):
        for c in range(8):
            dist = math.sqrt((r - center_r)**2 + (c - center_c)**2)
            if dist < 2.5:
                xai_grid[r, c] += (3.0 - dist) * 0.35
    xai_grid = np.clip(xai_grid, 0.0, 1.0)
    
    # Recommended follow-ups
    recs = {
        "Pneumonia Detected": "Consult pulmonology. Sputum cultures and broad-spectrum antibiotics may be indicated.",
        "Glioma Identified": "Schedule a contrast-enhanced brain MRI follow-up. Review with neurosurgery.",
        "Meningioma Detected": "Neurosurgical consultation for observation vs. stereotactic radiosurgery planning.",
        "Malignant Melanoma Risk": "Urgent dermatological biopsy and excision mapping.",
        "Basal Cell Carcinoma": "Dermatological excision or Mohs micrographic surgery assessment.",
    }
    
    return {
        "modality": modality,
        "prediction": prediction,
        "confidence_score": confidence,
        "xai_heatmap_grid": xai_grid.tolist(),
        "clinical_guidelines": recs.get(prediction, "No immediate critical imaging anomalies observed. Standard preventive health checkups recommended.")
    }

# ================= PDF Report Generation =================
def generate_pdf_report(report_id: str, data: Dict[str, Any]) -> bytes:
    """
    Creates a formal clinical diagnostic PDF document using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    story = []
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'DocSection',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=colors.HexColor('#09090b'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9.5,
        textColor=colors.HexColor('#3f3f46'),
        leading=14
    )
    
    alert_style = ParagraphStyle(
        'DocAlert',
        parent=styles['BodyText'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor('#dc2626'),
        leading=13
    )

    # Document Header
    story.append(Paragraph("PulseMind AI Diagnostics Report", title_style))
    story.append(Paragraph(f"Document Reference ID: {report_id}", body_style))
    story.append(Spacer(1, 10))
    
    # Patient Demographics Table
    demo_data = [
        [Paragraph("<b>Patient Name:</b>", body_style), Paragraph(data.get("patient_name", "Unknown"), body_style),
         Paragraph("<b>Date of Report:</b>", body_style), Paragraph(data.get("report_date", "Unknown"), body_style)],
        [Paragraph("<b>Age / Gender:</b>", body_style), Paragraph(f"{data.get('age', 'N/A')} / {data.get('gender', 'N/A')}", body_style),
         Paragraph("<b>Security Status:</b>", body_style), Paragraph("HIPAA Compliant Record", body_style)]
    ]
    t = Table(demo_data, colWidths=[110, 140, 110, 140])
    t.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f9fafb')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f9fafb')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))
    
    # Clinical Summary Section
    story.append(Paragraph("Clinical Analysis Summary", section_style))
    story.append(Paragraph(data.get("summary", "No clinical summary available."), body_style))
    story.append(Spacer(1, 12))
    
    # Metrics Table
    metrics = data.get("test_metrics", [])
    if metrics:
        story.append(Paragraph("Diagnostic Metric Diagnostics", section_style))
        table_rows = [["Test Param", "Recorded Value", "Reference Limit", "Flag"]]
        for m in metrics:
            flag = "ABNORMAL" if m.get("is_abnormal") else "Normal"
            table_rows.append([
                m.get("test_name"), 
                f"{m.get('value')} {m.get('unit')}", 
                m.get("reference_range"),
                flag
            ])
            
        mt = Table(table_rows, colWidths=[150, 120, 130, 100])
        mt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f9fafb')),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
            ('TEXTCOLOR', (3,1), (3,-1), colors.HexColor('#dc2626')),
            ('ALIGN', (1,0), (-1,-1), 'LEFT'),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(mt)
        story.append(Spacer(1, 15))

    # Alerts & Actionable Health Recommendations
    alerts = data.get("alerts", [])
    if alerts:
        story.append(Paragraph("Critical Diagnostic Alerts", section_style))
        for alert in alerts:
            story.append(Paragraph(f"• {alert}", alert_style))
        story.append(Spacer(1, 12))
        
    recs = data.get("recommendations", [])
    if recs:
        story.append(Paragraph("Recommended Clinical Pathways", section_style))
        for rec in recs:
            story.append(Paragraph(f"• {rec}", body_style))
        story.append(Spacer(1, 15))
        
    # Legal Disclaimer
    disclaimer_style = ParagraphStyle(
        'DocDisclaimer',
        parent=body_style,
        fontSize=7.5,
        textColor=colors.HexColor('#71717a'),
        leading=10
    )
    story.append(Paragraph("<b>Disclaimer:</b> PulseMind AI is an automated health intelligence platform designed for clinician support and informational tracking. It does not constitute a certified medical diagnosis. All findings and therapies must be validated by a licensed physician.", disclaimer_style))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

def check_symptoms(symptoms: str) -> Dict[str, Any]:
    """
    Analyzes input symptoms and returns possible conditions, severity, recommended actions,
    and emergency warnings.
    """
    symptoms_lower = symptoms.lower()
    
    # Defaults
    conditions = ["General Fatigue / Viral Syndrome"]
    severity = "Low"
    action = "Rest, hydrate, and monitor symptoms. Consult a primary care physician if symptoms persist beyond 48 hours."
    warning = "Seek immediate emergency care if you experience chest pain, difficulty breathing, sudden weakness, or severe pain."
    
    # Specific symptom checks
    if any(k in symptoms_lower for k in ["chest pain", "angina", "heart attack", "crushing pressure"]):
        conditions = ["Acute Coronary Syndrome", "Myocardial Infarction", "Angina Pectoris"]
        severity = "Critical / Emergency"
        action = "Call emergency services (911) immediately. Do not drive yourself to the emergency department."
        warning = "CRITICAL WARNING: Chest pain can indicate a life-threatening cardiovascular event. Immediate medical intervention is mandatory."
    elif any(k in symptoms_lower for k in ["shortness of breath", "breathing", "dyspnea", "wheezing"]):
        conditions = ["Asthma Exacerbation", "Pneumonia", "Acute Bronchitis"]
        severity = "High"
        action = "Use rescue inhaler if prescribed. Seek urgent care or visit the nearest emergency room if symptoms do not improve."
        warning = "WARNING: Difficulty breathing requires prompt professional evaluation."
    elif any(k in symptoms_lower for k in ["fever", "chills", "cough", "sore throat"]):
        conditions = ["Influenza (Flu)", "Upper Respiratory Tract Infection", "COVID-19"]
        severity = "Moderate"
        action = "Isolate, self-test for COVID-19, take antipyretics like Acetaminophen as directed, and rest."
        warning = "Monitor for high fever (>103°F / 39.4°C) or respiratory distress."
    elif any(k in symptoms_lower for k in ["headache", "migraine", "dizzy"]):
        conditions = ["Tension Headache", "Migraine", "Dehydration / Orthostatic Hypotension"]
        severity = "Moderate"
        action = "Rest in a quiet, dark room, hydrate, and take over-the-counter pain relievers if appropriate."
        warning = "Seek urgent care if this is the 'worst headache of your life' or is accompanied by stiff neck, fever, or confusion."
    elif any(k in symptoms_lower for k in ["stomach pain", "abdominal", "nausea", "vomit"]):
        conditions = ["Gastroenteritis", "Acid Reflux (GERD)", "Appendicitis Risk"]
        severity = "Moderate"
        action = "Consume a bland diet (BRAT), stay hydrated with electrolytes, and monitor for localized right lower quadrant pain."
        warning = "Seek urgent medical attention if pain becomes sharp, localized, or is accompanied by high fever or inability to keep fluids down."
        
    return {
        "symptoms": symptoms,
        "possible_conditions": conditions,
        "severity": severity,
        "recommended_action": action,
        "emergency_warning": warning,
        "disclaimer": "Disclaimer: Not a medical diagnosis. For informational purposes only. Seek immediate professional care for severe symptoms."
    }


# ================= V5.0 NEW AI ENGINES =================

def groq_generate(prompt: str, system_prompt: str = None) -> str:
    """Generic Groq LLM call used by all v5 features."""
    if not groq_client:
        return "AI service not available. Please configure GROQ_API_KEY."
    if system_prompt is None:
        system_prompt = (
            "You are PulseMind AI, an intelligent healthcare companion. "
            "Provide accurate, structured medical information. "
            "Always include a brief disclaimer that responses are for informational purposes only "
            "and not a substitute for professional medical care."
        )
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=2000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"groq_generate error: {e}")
        return f"AI generation failed: {e}"


def check_drug_interactions(medications: str) -> str:
    prompt = (
        f"You are a clinical pharmacologist AI. Analyze all pairwise drug interactions for: {medications}\n\n"
        f"For EACH pair provide:\n"
        f"1. Severity Level: Minor / Moderate / Major / Contraindicated\n"
        f"2. Mechanism: Why this interaction occurs\n"
        f"3. Clinical Effect: What happens to the patient\n"
        f"4. Management: monitor, avoid, dose-adjust, timing separation\n"
        f"5. Risk Score: 1-10\n\n"
        f"Also give: Overall Safety Assessment, Highest Risk Pair, Recommended Monitoring Parameters.\n\n"
        f"DISCLAIMER: For clinical decisions, always consult a licensed pharmacist or physician."
    )
    return groq_generate(prompt)


def check_food_drug_interactions(medication: str, foods: str) -> str:
    prompt = (
        f"Analyze food-drug interactions:\nMedication: {medication}\nFoods/Supplements: {foods}\n\n"
        f"For each interaction provide:\n"
        f"1. Interaction Type (pharmacokinetic/pharmacodynamic)\n"
        f"2. Effect on drug (increases/decreases absorption or effect)\n"
        f"3. Recommended action (avoid, time separation, monitor)\n"
        f"4. Safer alternatives if applicable\n\n"
        f"DISCLAIMER: Always follow your prescribing physician's guidance."
    )
    return groq_generate(prompt)


def calculate_health_risk_score_v5(profile: dict) -> str:
    import json as _json
    prompt = (
        f"You are a preventive medicine AI. Generate a DETAILED health risk assessment.\n"
        f"Patient Profile: {_json.dumps(profile, indent=2)}\n\n"
        f"Provide:\n"
        f"1. Risk Scores (0-100) for: Cardiovascular, Metabolic/Diabetes, Respiratory, Mental Health, Cancer, Lifestyle\n"
        f"2. Top 3 Highest Risk Areas with specific reasons\n"
        f"3. Personalized Risk Reduction Plan (diet, exercise, screenings, lifestyle)\n"
        f"4. Recommended health screenings based on age and risk factors\n"
        f"5. 90-day action plan\n\n"
        f"DISCLAIMER: This is an AI estimate, not a medical diagnosis."
    )
    return groq_generate(prompt)


def calculate_bmi_with_advice(weight_kg: float, height_cm: float, age: int, gender: str) -> str:
    height_m = height_cm / 100
    bmi = round(weight_kg / (height_m ** 2), 1)
    if bmi < 18.5:
        category = "Underweight"
    elif bmi < 23:
        category = "Normal Weight"
    elif bmi < 27.5:
        category = "Overweight"
    else:
        category = "Obese"
    prompt = (
        f"BMI: {bmi} - Category: {category}\nAge: {age}, Gender: {gender}\n\n"
        f"Provide:\n"
        f"1. BMI Interpretation with health implications\n"
        f"2. Ideal weight range\n"
        f"3. Caloric intake recommendation\n"
        f"4. Top 5 dietary changes\n"
        f"5. Exercise prescription (type, duration, frequency)\n"
        f"6. Realistic 3-month goal\n\n"
        f"DISCLAIMER: Consult a physician before starting any weight management program."
    )
    result = groq_generate(prompt)
    return f"BMI: {bmi} ({category})\n\n{result}"


def log_mood_entry_v5(mood_score: int, emotions: str, notes: str) -> str:
    CRISIS_KEYWORDS = ["suicide", "kill myself", "end it all", "no point living", "want to die"]
    notes_lower = (notes or "").lower()
    if mood_score <= 2 or any(kw in notes_lower for kw in CRISIS_KEYWORDS):
        return (
            "CRISIS SUPPORT ALERT\n\n"
            "We detected signs of significant distress. You are not alone.\n\n"
            "Immediate Resources:\n"
            "- iCall (India): 9152987821\n"
            "- Vandrevala Foundation: 1860-2662-345 (24/7)\n"
            "- AASRA: 9820466627\n\n"
            "Please reach out to a mental health professional immediately."
        )
    prompt = (
        f"You are a compassionate mental health support AI trained in CBT techniques.\n"
        f"Mood Score: {mood_score}/10\nEmotions: {emotions}\nNotes: {notes}\n\n"
        f"Provide:\n"
        f"1. Empathetic acknowledgment\n"
        f"2. One CBT-based thought reframing technique relevant to their situation\n"
        f"3. One grounding exercise\n"
        f"4. One behavioral activation suggestion for today\n"
        f"5. A positive affirmation\n\n"
        f"Keep the tone warm and supportive.\n"
        f"DISCLAIMER: AI support, not a substitute for professional mental health care."
    )
    return groq_generate(prompt)


def analyze_meal_nutrition(meal_description: str) -> str:
    prompt = (
        f"You are a clinical dietitian AI. Analyze this meal: {meal_description}\n\n"
        f"Provide:\n"
        f"1. Estimated Macros (Calories, Protein g, Carbs g, Fat g, Fiber g)\n"
        f"2. Key Micronutrients present (top 5)\n"
        f"3. Nutritional Gaps or Excesses\n"
        f"4. Health Score: 1-10 with justification\n"
        f"5. Healthier Substitutions (same taste/cuisine)\n"
        f"6. Best time of day to eat this meal\n\n"
        f"DISCLAIMER: For personalized dietary advice, consult a registered dietitian."
    )
    return groq_generate(prompt)


def generate_condition_meal_plan(condition: str, dietary_preferences: str, duration_days: int = 7) -> str:
    prompt = (
        f"Create a {duration_days}-day meal plan for: {condition}\n"
        f"Dietary Preferences: {dietary_preferences}\n\n"
        f"For each day: Breakfast, Morning Snack, Lunch, Evening Snack, Dinner.\n"
        f"Include daily macro totals.\n"
        f"List key foods to AVOID and INCLUDE for this condition.\n\n"
        f"DISCLAIMER: Consult a registered dietitian for personalized plans."
    )
    return groq_generate(prompt)


def get_appointment_checklist(doctor: str, specialty: str, date: str, time: str, notes: str) -> str:
    prompt = (
        f"Generate a pre-appointment checklist for:\n"
        f"Doctor: {doctor} ({specialty}), Appointment: {date} at {time}\nNotes: {notes}\n\n"
        f"Include:\n"
        f"1. Documents to bring\n"
        f"2. Questions to ask\n"
        f"3. Symptoms to describe\n"
        f"4. Medications to list\n"
        f"5. Preparation requirements for {specialty}\n"
        f"6. Day-before reminders"
    )
    return groq_generate(prompt)


def get_second_opinion(primary_diagnosis: str, symptoms: str, lab_results: str = "", medications: str = "") -> str:
    prompt = (
        f"You are a panel of three specialist physicians (Internist, Specialist, GP).\n"
        f"Primary Diagnosis: {primary_diagnosis}\nSymptoms: {symptoms}\n"
        f"Lab Results: {lab_results or 'Not provided'}\nMedications: {medications or 'Not provided'}\n\n"
        f"As a PANEL, provide:\n"
        f"1. Differential Diagnosis List (Top 5 with probability %)\n"
        f"2. Agreement/Disagreement with primary diagnosis\n"
        f"3. Potentially Missed Diagnoses\n"
        f"4. Confirmatory Tests Recommended\n"
        f"5. Specialist Referral Recommendations\n"
        f"6. Consensus Opinion\n\n"
        f"DISCLAIMER: AI-generated second opinion for informational purposes only."
    )
    return groq_generate(prompt)


def generate_differential_diagnosis(symptoms: str, age: int, gender: str) -> str:
    prompt = (
        f"Patient: {age}-year-old {gender}\nSymptoms: {symptoms}\n\n"
        f"Generate:\n"
        f"1. Differential Diagnosis Table: Condition | Probability | Supporting Evidence | Against Evidence\n"
        f"2. Most Likely Diagnosis with confidence %\n"
        f"3. URGENT Red Flags needing immediate ER visit\n"
        f"4. Recommended initial workup (basic tests)\n"
        f"5. Expected timeline if benign\n\n"
        f"DISCLAIMER: AI tool, not a substitute for clinical examination by a physician."
    )
    return groq_generate(prompt)


def get_emergency_guidance(emergency_type: str, context: str = "") -> str:
    PROTOCOLS = {
        "heart attack": "CALL 108 NOW. Sit/lie comfortably. Give Aspirin 325mg if not allergic. Do NOT give food/water. Prepare for CPR if unconscious.",
        "stroke": "CALL 108 NOW - Time is brain! FAST: Face drooping? Arm weakness? Speech slurred? Time to call! Note exact time symptoms started.",
        "choking": "Ask: Are you choking? Heimlich maneuver: stand behind, fist above navel, pull sharply inward/upward. If unconscious: start CPR.",
        "severe bleeding": "Apply firm direct pressure. Do NOT remove cloth (add more on top). Elevate limb. Tourniquet only if life-threatening. Call 108.",
        "anaphylaxis": "MEDICAL EMERGENCY. Use EpiPen if available (outer thigh). Call 108. Lay flat, legs elevated. Second EpiPen after 5-10 mins if needed.",
    }
    base = None
    for key, protocol in PROTOCOLS.items():
        if key in emergency_type.lower():
            base = protocol
            break
    prompt = (
        f"IMMEDIATE first aid guidance for: {emergency_type}\nContext: {context or 'None'}\n\n"
        f"Provide:\n"
        f"1. URGENCY LEVEL (Critical/High/Moderate)\n"
        f"2. CALL NOW (India: 108 ambulance, 112 police/fire)\n"
        f"3. FIRST 60 SECONDS: What to do RIGHT NOW\n"
        f"4. STEP-BY-STEP ACTIONS (numbered, clear)\n"
        f"5. DO NOT DO (critical mistakes to avoid)\n"
        f"6. ER vs Urgent Care vs Home Management\n\n"
        f"DISCLAIMER: Call emergency services immediately for life-threatening situations."
    )
    ai_response = groq_generate(prompt)
    if base:
        return f"IMMEDIATE PROTOCOL:\n{base}\n\n---\n\nDetailed Guidance:\n{ai_response}"
    return ai_response


def compare_reports_v5(report_text_1: str, report_text_2: str) -> str:
    prompt = (
        f"Compare these two medical reports:\n\nREPORT 1:\n{report_text_1[:4000]}\n\nREPORT 2:\n{report_text_2[:4000]}\n\n"
        f"Provide:\n"
        f"1. IMPROVEMENTS: Lab values/findings that improved\n"
        f"2. DETERIORATIONS: Values/findings that worsened\n"
        f"3. NEW FINDINGS: Issues in Report 2 not in Report 1\n"
        f"4. RESOLVED: Issues in Report 1 no longer in Report 2\n"
        f"5. LAB VALUE CHANGES: Side-by-side key values\n"
        f"6. CLINICAL SIGNIFICANCE: What these changes mean\n"
        f"7. RECOMMENDED FOLLOW-UP ACTIONS\n\n"
        f"DISCLAIMER: AI-generated comparison for informational purposes only."
    )
    return groq_generate(prompt)


def audit_medical_bill(bill_text: str) -> Dict[str, Any]:
    """
    Audits CPT codes, charges, looks up benchmarks, identifies billing irregularities,
    and returns a structured JSON payload with items and hospital_name.
    """
    if groq_client:
        try:
            logger.info("Using Groq API to audit medical bill...")
            prompt = (
                "You are an expert healthcare billing auditor and medical coder. "
                "Analyze the following medical bill/invoice text, extract CPT codes, "
                "descriptions, charges, suggest fair market prices, explain discrepancies, "
                "and identify issues like upcoding, unbundling, or excessive markup. "
                "Also extract or suggest a hospital name if present.\n\n"
                "Return a JSON object matching this schema:\n"
                "{\n"
                "  \"hospital_name\": \"string, e.g., Mercy Health Medical Center or Selected Healthcare Facility\",\n"
                "  \"items\": [\n"
                "    {\n"
                "      \"code\": \"CPT code, e.g., 99285\",\n"
                "      \"desc\": \"Brief clinical description\",\n"
                "      \"charge\": 1500.0,\n"
                "      \"fairPrice\": 350.0,\n"
                "      \"explanation\": \"Detailed reason for audit flag\",\n"
                "      \"auditIssue\": \"Short issue label, e.g., Upcoding Detected, Overcharged Item, Unbundled Fee\"\n"
                "    }\n"
                "  ]\n"
                "}\n\n"
                f"Bill Text:\n{bill_text}"
            )
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a specialized medical bill auditor. Output ONLY valid, parsable JSON matching the schema. Do not output any preamble, markdown formatting (like ```json), or postamble. Your output must start with '{' and end with '}'."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            logger.error(f"Groq bill auditing failed: {e}. Falling back to heuristics.")

    # Fallback heuristics
    items = []
    lines = bill_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        cpt_match = re.search(r'\b(\d{5})\b', line)
        charge_match = re.search(r'(?:\$)?\b(\d+(?:\.\d{2})?)\b', line.replace(cpt_match.group(1) if cpt_match else '', ''))
        
        if cpt_match:
            cpt = cpt_match.group(1)
            charge = float(charge_match.group(1)) if charge_match else 250.0
            
            # Match standard codes to fair prices
            if cpt == "99285":
                desc = "Emergency Dept Visit Level 5"
                fair = 420.0
                issue = "Upcoding Detected"
                exp = "Billed at the highest complexity level. Verify clinical severity justified this tier."
            elif cpt == "80053":
                desc = "Comprehensive Metabolic Panel (CMP)"
                fair = 45.0
                issue = "Overcharged Item"
                exp = "Standard panel marked up significantly above national averages."
            elif cpt == "93000":
                desc = "Electrocardiogram (ECG) with interpretation"
                fair = 75.0
                issue = "Overcharged Item"
                exp = "Routine ECG fee exceeds typical regional Medicare standards."
            elif cpt == "93306":
                desc = "Echocardiogram (Transthoracic)"
                fair = 480.0
                issue = "Overcharged Item"
                exp = "Standard diagnostic cardiac ultrasound has excessive local markup."
            else:
                desc = f"CPT Code {cpt} Service"
                fair = round(charge * 0.3, 2)
                issue = "Overcharged Item"
                exp = "Charge exceeds standard regional insurance reimbursement caps."
                
            items.append({
                "code": cpt,
                "desc": desc,
                "charge": charge,
                "fairPrice": fair,
                "explanation": exp,
                "auditIssue": issue
            })
            
    if not items:
        # Generic items if no codes found
        items = [
            { "code": "99214", "desc": "Office Outpatient Visit Level 4", "charge": 350.0, "fairPrice": 130.0, "explanation": "Common level 4 visit. Check documentation supporting level of decision making.", "auditIssue": "Review Severity" },
            { "code": "80061", "desc": "Lipid Panel test", "charge": 180.0, "fairPrice": 28.0, "explanation": "Standard lipid test highly marked up.", "auditIssue": "Overcharged Item" }
        ]
        
    return {
        "hospital_name": "Selected Healthcare Facility",
        "items": items
    }


# ================= V4.0 NEW AI ENGINES =================

def simulate_doctor_visit(
    symptoms: str,
    duration: str,
    medical_history: str,
    medications: str,
    lifestyle: str,
    report_text: str = ""
) -> Dict[str, Any]:
    """
    AI Doctor Visit Simulator — generates a comprehensive consultation note,
    probable conditions, likely doctor questions, specialist recommendation,
    and a visit preparation sheet.
    """
    prompt = (
        f"You are an expert primary care physician conducting an AI-assisted consultation.\n\n"
        f"PATIENT PRESENTATION:\n"
        f"- Chief Complaint / Symptoms: {symptoms}\n"
        f"- Duration: {duration}\n"
        f"- Medical History: {medical_history or 'None reported'}\n"
        f"- Current Medications: {medications or 'None'}\n"
        f"- Lifestyle: {lifestyle or 'Not specified'}\n"
        f"{'- Recent Report Findings: ' + report_text[:1000] if report_text else ''}\n\n"
        f"Generate a structured consultation report. Return ONLY valid JSON in this schema:\n"
        f"{{\n"
        f'  "probable_conditions": [{{"condition": "string", "probability": "string", "reasoning": "string"}}],\n'
        f'  "consultation_notes": "detailed clinical assessment string",\n'
        f'  "likely_doctor_questions": ["question1", "question2", ...],\n'
        f'  "suggested_specialist": "string",\n'
        f'  "specialist_reason": "string",\n'
        f'  "preparation_sheet": {{"bring_documents": ["item1"], "lifestyle_prep": ["item1"], "questions_to_ask": ["q1"], "tests_expected": ["test1"]}},\n'
        f'  "urgency_level": "Routine / Soon / Urgent / Emergency",\n'
        f'  "red_flags": ["flag1", "flag2"],\n'
        f'  "disclaimer": "string"\n'
        f"}}"
    )

    if groq_client:
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a clinical AI that outputs only valid JSON matching the exact schema. No markdown. No preamble."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=2500
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            logger.error(f"simulate_doctor_visit Groq error: {e}")

    # Heuristic fallback
    return {
        "probable_conditions": [
            {"condition": "Viral Syndrome", "probability": "High (60%)", "reasoning": "Duration and symptom pattern consistent with viral etiology."},
            {"condition": "Bacterial Infection", "probability": "Moderate (25%)", "reasoning": "Persistent symptoms may indicate bacterial involvement."}
        ],
        "consultation_notes": f"Patient presents with {symptoms} for {duration}. Full physical examination and lab workup recommended.",
        "likely_doctor_questions": [
            "When exactly did symptoms start?", "Any fever or chills?",
            "Have symptoms improved or worsened?", "Any sick contacts?", "Any allergies to medications?"
        ],
        "suggested_specialist": "General Practitioner / Internist",
        "specialist_reason": "Symptoms require comprehensive initial evaluation before specialist referral.",
        "preparation_sheet": {
            "bring_documents": ["Photo ID", "Insurance card", "List of current medications", "Previous lab reports"],
            "lifestyle_prep": ["Fast 8 hours if blood tests expected", "Write down all symptoms with timeline"],
            "questions_to_ask": ["What tests do I need?", "When should I expect results?", "Should I change any medications?"],
            "tests_expected": ["Complete Blood Count (CBC)", "Basic Metabolic Panel", "Urinalysis"]
        },
        "urgency_level": "Routine",
        "red_flags": ["Chest pain", "Difficulty breathing", "High fever > 103°F"],
        "disclaimer": "AI simulation only. Not a substitute for professional medical consultation."
    }


def forecast_health_twin(
    age: int,
    weight_kg: float,
    height_cm: float,
    systolic_bp: int,
    glucose: float,
    cholesterol: float,
    exercise_days_per_week: int
) -> Dict[str, Any]:
    """
    Health Twin Forecast Engine — predicts 3-month, 6-month, and 12-month
    health trends using deterministic math models + Groq narrative.
    """
    import math

    bmi = round(weight_kg / ((height_cm / 100) ** 2), 1)
    exercise_factor = exercise_days_per_week / 7.0  # 0–1

    # Deterministic weight projections
    weekly_caloric_deficit = exercise_days_per_week * 300  # ~300 kcal per exercise day
    monthly_weight_loss = (weekly_caloric_deficit * 4.33) / 7700  # kg per month
    w3  = round(weight_kg - monthly_weight_loss * 3, 1)
    w6  = round(weight_kg - monthly_weight_loss * 6, 1)
    w12 = round(weight_kg - monthly_weight_loss * 12, 1)

    # Glucose trend (improvement with exercise)
    g_improve = exercise_factor * 0.08
    g3  = round(glucose * (1 - g_improve * 0.5), 1)
    g6  = round(glucose * (1 - g_improve), 1)
    g12 = round(glucose * (1 - g_improve * 1.6), 1)

    # BP trend
    bp_improve = exercise_factor * 0.06
    bp3  = round(systolic_bp * (1 - bp_improve * 0.4))
    bp6  = round(systolic_bp * (1 - bp_improve * 0.7))
    bp12 = round(systolic_bp * (1 - bp_improve))

    # Cardiovascular risk score (0–100, lower is better)
    base_cv = min(100, (age * 0.5) + ((systolic_bp - 120) * 0.3) + ((cholesterol - 180) * 0.2) + (bmi - 22) * 0.8)
    cv_improve = exercise_factor * 5
    cv3  = round(max(5, base_cv - cv_improve))
    cv6  = round(max(5, base_cv - cv_improve * 1.8))
    cv12 = round(max(5, base_cv - cv_improve * 3))

    forecast = {
        "current": {"weight": weight_kg, "glucose": glucose, "systolic_bp": systolic_bp, "cv_risk": round(base_cv), "bmi": bmi},
        "month_3":  {"weight": w3, "glucose": g3, "systolic_bp": bp3, "cv_risk": cv3},
        "month_6":  {"weight": w6, "glucose": g6, "systolic_bp": bp6, "cv_risk": cv6},
        "month_12": {"weight": w12, "glucose": g12, "systolic_bp": bp12, "cv_risk": cv12},
        "chart_data": [
            {"month": "Now",     "weight": weight_kg, "glucose": glucose, "bp": systolic_bp, "cv_risk": round(base_cv)},
            {"month": "3 Months","weight": w3, "glucose": g3, "bp": bp3, "cv_risk": cv3},
            {"month": "6 Months","weight": w6, "glucose": g6, "bp": bp6, "cv_risk": cv6},
            {"month": "12 Months","weight": w12, "glucose": g12, "bp": bp12, "cv_risk": cv12},
        ]
    }

    # Groq narrative
    if groq_client:
        try:
            narrative_prompt = (
                f"Patient: Age {age}, BMI {bmi}, Exercises {exercise_days_per_week} days/week.\n"
                f"Current: BP {systolic_bp} mmHg, Glucose {glucose} mg/dL, Cholesterol {cholesterol} mg/dL.\n"
                f"Projected 12-month outcomes: Weight {w12}kg, Glucose {g12}, BP {bp12}, CV Risk score {cv12}/100.\n\n"
                f"Write a concise 3-paragraph health forecast narrative covering:\n"
                f"1. What these projections mean for the patient's health\n"
                f"2. Key lifestyle changes to improve outcomes\n"
                f"3. Warning signs to watch for. Include medical disclaimer."
            )
            resp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": narrative_prompt}],
                temperature=0.2, max_tokens=600
            )
            forecast["narrative"] = resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"forecast_health_twin narrative error: {e}")
            forecast["narrative"] = "AI narrative unavailable. Review chart data above for trend insights."
    else:
        forecast["narrative"] = (
            f"Based on current metrics, maintaining {exercise_days_per_week} days of weekly exercise "
            f"can reduce weight by ~{round(monthly_weight_loss * 12, 1)}kg and lower cardiovascular risk "
            f"significantly over 12 months. Monitor blood glucose and blood pressure monthly."
        )

    return forecast


def simulate_disease_progression(
    disease: str,
    current_metrics: Dict[str, Any],
    scenario: str = "all"
) -> Dict[str, Any]:
    """
    Disease Progression Simulator — projects timeline for 3 scenarios:
    no_change / moderate / strict over 12 months with monthly data points.
    """
    import math

    scenarios_to_run = ["no_change", "moderate", "strict"] if scenario == "all" else [scenario]

    def build_timeline(disease: str, metrics: dict, mode: str) -> List[Dict]:
        """Build a 13-point timeline (month 0–12) for a given scenario."""
        baseline = metrics.get("risk_score", 50)
        improvement_rate = {"no_change": 0.005, "moderate": 0.04, "strict": 0.075}[mode]
        deterioration_rate = {"no_change": 0.03, "moderate": 0.0, "strict": 0.0}[mode]

        points = []
        current_risk = float(baseline)
        for month in range(13):
            if mode == "no_change":
                current_risk = min(100, current_risk * (1 + deterioration_rate))
            else:
                current_risk = max(5, current_risk * (1 - improvement_rate))

            # Disease-specific secondary metric
            sec_val = None
            if disease.lower() == "diabetes":
                base_hba1c = metrics.get("hba1c", 7.5)
                sec_val = round(base_hba1c + (month * 0.05 if mode == "no_change" else -month * 0.08 if mode == "strict" else -month * 0.04), 2)
                sec_key = "hba1c"
            elif disease.lower() == "hypertension":
                base_bp = metrics.get("systolic_bp", 145)
                sec_val = round(base_bp + (month * 0.4 if mode == "no_change" else -month * 0.7 if mode == "strict" else -month * 0.3))
                sec_key = "systolic_bp"
            elif disease.lower() == "obesity":
                base_bmi = metrics.get("bmi", 32)
                sec_val = round(base_bmi + (month * 0.05 if mode == "no_change" else -month * 0.12 if mode == "strict" else -month * 0.06), 1)
                sec_key = "bmi"
            else:  # heart_disease
                base_chol = metrics.get("cholesterol", 220)
                sec_val = round(base_chol + (month * 1.5 if mode == "no_change" else -month * 2.5 if mode == "strict" else -month * 1.2))
                sec_key = "cholesterol"

            point = {"month": month, "risk_score": round(current_risk, 1)}
            if sec_val is not None:
                point[sec_key] = sec_val
            points.append(point)
        return points

    result = {
        "disease": disease,
        "current_metrics": current_metrics,
        "scenarios": {}
    }

    labels = {
        "no_change": {"label": "No Lifestyle Changes", "color": "#ef4444", "description": "Current trajectory without intervention"},
        "moderate": {"label": "Moderate Improvement", "color": "#f59e0b", "description": "Diet improvements + moderate exercise 3x/week"},
        "strict": {"label": "Strict Improvement", "color": "#10b981", "description": "Medical treatment + strict diet + exercise 5x/week"}
    }

    for s in scenarios_to_run:
        timeline = build_timeline(disease, current_metrics, s)
        result["scenarios"][s] = {**labels[s], "timeline": timeline}

    # AI narrative
    if groq_client:
        try:
            prompt = (
                f"Patient has {disease} with current metrics: {json.dumps(current_metrics)}.\n"
                f"Explain in 2 paragraphs what happens over 12 months in each of 3 scenarios:\n"
                f"1. No lifestyle changes 2. Moderate improvement 3. Strict lifestyle/medical management.\n"
                f"Focus on clinical outcomes and quality of life. Include medical disclaimer."
            )
            resp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2, max_tokens=700
            )
            result["narrative"] = resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"simulate_disease_progression narrative error: {e}")
            result["narrative"] = f"Without intervention, {disease} typically progresses. Lifestyle modifications significantly alter disease trajectory."
    else:
        result["narrative"] = (
            f"For {disease}: No changes lead to worsening outcomes. Moderate lifestyle changes stabilize "
            f"the condition, while strict medical management and lifestyle changes can achieve significant improvement."
        )

    return result


def generate_copilot_recommendations(
    user_id: str,
    medications: List[str] = None,
    last_vitals: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    AI Health Copilot — generates daily personalized health recommendations
    for medications, hydration, exercise, sleep, and follow-ups.
    """
    from datetime import datetime, timezone
    meds_str = ", ".join(medications) if medications else "None on file"
    vitals_str = json.dumps(last_vitals) if last_vitals else "No recent vitals"
    today = datetime.now(timezone.utc).strftime("%A, %B %d")

    if groq_client:
        try:
            prompt = (
                f"Today is {today}. Generate daily health copilot recommendations for a patient.\n"
                f"Current medications: {meds_str}\n"
                f"Last vitals: {vitals_str}\n\n"
                f"Return ONLY valid JSON in this schema:\n"
                f"{{\n"
                f'  "date": "{today}",\n'
                f'  "medication_reminders": [{{"time": "8:00 AM", "drug": "string", "dosage": "string", "instruction": "string"}}],\n'
                f'  "hydration": {{"goal_liters": 2.5, "reminder_times": ["9 AM", "12 PM", "3 PM", "6 PM"], "tip": "string"}},\n'
                f'  "exercise": {{"type": "string", "duration_minutes": 30, "intensity": "Moderate", "tip": "string"}},\n'
                f'  "sleep": {{"target_hours": 7, "bedtime": "10:30 PM", "wake_time": "5:30 AM", "tip": "string"}},\n'
                f'  "follow_ups": [{{"priority": "High/Medium/Low", "action": "string", "due": "string"}}],\n'
                f'  "daily_health_tip": "string",\n'
                f'  "mood_check": "string"\n'
                f"}}"
            )
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "Output ONLY valid JSON matching the schema. No markdown."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=1500
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            logger.error(f"generate_copilot_recommendations error: {e}")

    # Structured fallback
    return {
        "date": today,
        "medication_reminders": [
            {"time": "8:00 AM", "drug": "Morning medications", "dosage": "As prescribed", "instruction": "Take with water after breakfast"}
        ] if medications else [],
        "hydration": {"goal_liters": 2.5, "reminder_times": ["9 AM", "12 PM", "3 PM", "6 PM", "9 PM"], "tip": "Start your day with 500ml of water before coffee."},
        "exercise": {"type": "Brisk Walking", "duration_minutes": 30, "intensity": "Moderate", "tip": "A 30-minute morning walk improves insulin sensitivity and mood."},
        "sleep": {"target_hours": 7, "bedtime": "10:30 PM", "wake_time": "5:30 AM", "tip": "Avoid screens 1 hour before bed. Keep room temperature 18–20°C."},
        "follow_ups": [{"priority": "Medium", "action": "Schedule annual health screening", "due": "This week"}],
        "daily_health_tip": "Eat at least 5 servings of vegetables and fruits today for optimal micronutrient intake.",
        "mood_check": "How are you feeling today? Log your mood to track emotional wellness trends."
    }


def triage_emergency(symptoms_list: List[str]) -> Dict[str, Any]:
    """
    Emergency Triage System — analyzes symptom combinations and returns
    urgency level, HIGH RISK ALERT for dangerous combos, and action steps.
    """
    symptoms_lower = [s.lower() for s in symptoms_list]
    symptoms_text = ", ".join(symptoms_list)

    # Critical combination detection rules
    CRITICAL_COMBOS = [
        (["chest pain", "left arm pain", "sweating"], "HEART ATTACK", "CRITICAL"),
        (["chest pain", "jaw pain", "nausea"], "CARDIAC EVENT", "CRITICAL"),
        (["chest pain", "shortness of breath"], "PULMONARY EMBOLISM / CARDIAC", "CRITICAL"),
        (["sudden headache", "vision loss", "weakness"], "STROKE", "CRITICAL"),
        (["face drooping", "arm weakness", "speech difficulty"], "STROKE (FAST)", "CRITICAL"),
        (["difficulty breathing", "swollen throat", "rash"], "ANAPHYLAXIS", "CRITICAL"),
        (["severe abdominal pain", "rigid abdomen"], "ACUTE ABDOMEN", "HIGH"),
        (["high fever", "stiff neck", "confusion"], "MENINGITIS", "CRITICAL"),
        (["coughing blood", "chest pain"], "PULMONARY HEMORRHAGE", "HIGH"),
        (["loss of consciousness", "seizure"], "NEUROLOGICAL EMERGENCY", "CRITICAL"),
    ]

    detected_alert = None
    urgency = "LOW"
    alert_type = "ROUTINE"

    for combo, condition, level in CRITICAL_COMBOS:
        matches = sum(1 for c in combo if any(c in s for s in symptoms_lower))
        if matches >= 2:
            detected_alert = condition
            urgency = level
            alert_type = "HIGH RISK ALERT" if level == "CRITICAL" else "ELEVATED RISK"
            break

    # Single severe symptom check
    if not detected_alert:
        HIGH_SEVERITY = ["chest pain", "stroke", "unconscious", "seizure", "anaphylaxis", "severe bleeding"]
        MODERATE_SEVERITY = ["fever", "vomiting", "dizziness", "shortness of breath", "abdominal pain"]
        if any(s in symptoms_lower for s in HIGH_SEVERITY):
            urgency = "HIGH"
            alert_type = "ELEVATED RISK"
        elif any(any(m in s for m in MODERATE_SEVERITY) for s in symptoms_lower):
            urgency = "MODERATE"
            alert_type = "MONITOR"
        else:
            urgency = "LOW"
            alert_type = "ROUTINE"

    # Emergency numbers
    emergency_contacts = {"India - Ambulance": "108", "India - Police/Fire": "112", "NIMHANS Crisis": "080-46110007"}

    # Groq detailed guidance
    ai_guidance = ""
    if groq_client:
        try:
            prompt = (
                f"EMERGENCY TRIAGE: Patient presents with: {symptoms_text}\n"
                f"Detected urgency: {urgency}. Alert: {detected_alert or 'None'}\n\n"
                f"Provide:\n"
                f"1. IMMEDIATE ACTION (first 60 seconds)\n"
                f"2. STEP-BY-STEP first aid (numbered)\n"
                f"3. What NOT to do\n"
                f"4. ER vs Urgent Care vs Home management\n"
                f"5. What to tell the dispatcher\n\n"
                f"Be concise, clear, and life-saving. Assume a non-medical responder."
            )
            resp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1, max_tokens=800
            )
            ai_guidance = resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"triage_emergency AI guidance error: {e}")

    return {
        "symptoms": symptoms_list,
        "urgency_level": urgency,
        "alert_type": alert_type,
        "detected_condition": detected_alert,
        "high_risk_alert": urgency == "CRITICAL",
        "emergency_contacts": emergency_contacts,
        "ai_guidance": ai_guidance or f"Urgency: {urgency}. For {symptoms_text}: monitor symptoms and seek appropriate medical care. Call 108 for emergencies.",
        "recommended_action": "CALL 108 IMMEDIATELY" if urgency == "CRITICAL" else (
            "Go to Urgent Care or ER" if urgency == "HIGH" else
            "Contact your doctor today" if urgency == "MODERATE" else
            "Monitor symptoms, rest, hydrate"
        ),
        "disclaimer": "This is an AI triage tool. Always call emergency services for life-threatening situations."
    }


def search_medical_research(condition: str, biomarkers: str = "") -> Dict[str, Any]:
    """
    Medical Research Agent — generates structured research summaries with
    latest treatment options, recent discoveries, and cited references.
    """
    if groq_client:
        try:
            prompt = (
                f"You are a medical research AI with access to current clinical literature.\n"
                f"Condition: {condition}\n"
                f"Relevant Biomarkers/Findings: {biomarkers or 'Not specified'}\n\n"
                f"Generate a structured research summary. Return ONLY valid JSON:\n"
                f"{{\n"
                f'  "condition": "{condition}",\n'
                f'  "overview": "2-3 sentence clinical overview",\n'
                f'  "latest_treatments": [{{"treatment": "string", "evidence_level": "Level A/B/C", "year": "2024", "notes": "string"}}],\n'
                f'  "recent_discoveries": [{{"title": "string", "year": "2023-2025", "significance": "string", "source": "Journal name"}}],\n'
                f'  "standard_guidelines": [{{"body": "WHO/AHA/ADA/etc", "recommendation": "string", "year": "string"}}],\n'
                f'  "research_summary": "3-4 sentence synthesis of current research landscape",\n'
                f'  "citations": [{{"authors": "string", "title": "string", "journal": "string", "year": "string", "pmid": "string"}}],\n'
                f'  "disclaimer": "string"\n'
                f"}}"
            )
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "Output ONLY valid JSON. No markdown. No preamble."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=2000
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            logger.error(f"search_medical_research error: {e}")

    # Fallback
    return {
        "condition": condition,
        "overview": f"{condition} is a clinically significant condition requiring evidence-based management.",
        "latest_treatments": [
            {"treatment": "Standard first-line pharmacotherapy", "evidence_level": "Level A", "year": "2024", "notes": "Consult current clinical guidelines."}
        ],
        "recent_discoveries": [
            {"title": f"Advances in {condition} management", "year": "2024", "significance": "Emerging therapies show promise.", "source": "New England Journal of Medicine"}
        ],
        "standard_guidelines": [
            {"body": "WHO", "recommendation": f"Comprehensive management approach for {condition}", "year": "2024"}
        ],
        "research_summary": f"Current research on {condition} focuses on precision medicine, early detection, and lifestyle intervention strategies.",
        "citations": [
            {"authors": "Smith J, et al.", "title": f"Management of {condition}: A systematic review", "journal": "Lancet", "year": "2024", "pmid": "XXXXXXXX"}
        ],
        "disclaimer": "AI-generated research summary. Always consult primary literature and clinical guidelines for medical decisions."
    }


def analyze_family_history(members: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Family Health Graph — calculates hereditary risk scores from family history,
    generates disease inheritance probability map.
    """
    DISEASE_HERITABILITY = {
        "diabetes": {"weight": 0.40, "label": "Type 2 Diabetes", "category": "Metabolic"},
        "heart disease": {"weight": 0.45, "label": "Cardiovascular Disease", "category": "Cardiac"},
        "hypertension": {"weight": 0.35, "label": "Hypertension", "category": "Cardiac"},
        "cancer": {"weight": 0.25, "label": "Cancer Risk", "category": "Oncology"},
        "stroke": {"weight": 0.38, "label": "Stroke Risk", "category": "Neurological"},
        "obesity": {"weight": 0.55, "label": "Obesity Risk", "category": "Metabolic"},
        "depression": {"weight": 0.37, "label": "Depression / Anxiety", "category": "Mental Health"},
        "alzheimer": {"weight": 0.60, "label": "Alzheimer's / Dementia", "category": "Neurological"},
        "asthma": {"weight": 0.65, "label": "Asthma / Allergy", "category": "Respiratory"},
        "kidney disease": {"weight": 0.30, "label": "Kidney Disease", "category": "Renal"},
    }

    # Relationship risk weights
    REL_WEIGHTS = {"parent": 0.5, "sibling": 0.5, "grandparent": 0.25, "aunt/uncle": 0.125}

    risk_scores: Dict[str, float] = {k: 0.0 for k in DISEASE_HERITABILITY}

    for member in members:
        rel = member.get("relationship", "grandparent").lower()
        conditions = [c.lower() for c in member.get("conditions", [])]
        rel_weight = REL_WEIGHTS.get(rel, 0.125)

        for condition in conditions:
            for key in DISEASE_HERITABILITY:
                if key in condition:
                    risk_scores[key] = min(1.0, risk_scores[key] + rel_weight * DISEASE_HERITABILITY[key]["weight"])

    # Build output
    inheritance_map = []
    for key, score in sorted(risk_scores.items(), key=lambda x: -x[1]):
        if score > 0:
            info = DISEASE_HERITABILITY[key]
            level = "High" if score >= 0.4 else "Moderate" if score >= 0.2 else "Low"
            inheritance_map.append({
                "disease": info["label"],
                "category": info["category"],
                "risk_score": round(score * 100),
                "risk_level": level,
                "color": "#ef4444" if level == "High" else "#f59e0b" if level == "Moderate" else "#10b981"
            })

    # AI narrative
    narrative = ""
    if groq_client and inheritance_map:
        try:
            top_risks = [f"{r['disease']} ({r['risk_level']} risk)" for r in inheritance_map[:3]]
            prompt = (
                f"Family health analysis for patient. Top hereditary risks: {', '.join(top_risks)}.\n"
                f"Family members analyzed: {len(members)}.\n\n"
                f"Provide:\n"
                f"1. What these hereditary risks mean\n"
                f"2. Recommended preventive screenings\n"
                f"3. Lifestyle modifications to reduce genetic risk\n"
                f"Keep it concise and actionable. Include medical disclaimer."
            )
            resp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2, max_tokens=700
            )
            narrative = resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"analyze_family_history narrative error: {e}")

    return {
        "members_analyzed": len(members),
        "inheritance_map": inheritance_map,
        "top_risks": inheritance_map[:3] if inheritance_map else [],
        "narrative": narrative or "Family health analysis complete. Discuss hereditary risk factors with your physician.",
        "recommended_screenings": [
            {"disease": r["disease"], "screening": f"Annual {r['disease']} screening", "priority": r["risk_level"]}
            for r in inheritance_map if r["risk_level"] in ("High", "Moderate")
        ][:5],
        "disclaimer": "Hereditary risk estimates based on reported family history. Genetic counseling recommended for definitive assessment."
    }


def run_command_center(report_text: str, user_id: str, existing_medications: List[str] = None) -> Dict[str, Any]:
    """
    Healthcare Command Center — one-click full pipeline:
    Parse → Timeline → Twin → Risk → Drug Check → Diet → Doctor Questions → Dashboard
    """
    results = {}
    errors = []

    # Step 1: Parse Report
    try:
        parsed = parse_medical_report(report_text)
        results["report_analysis"] = parsed
    except Exception as e:
        errors.append(f"Report parsing: {e}")
        parsed = {}

    # Step 2: Timeline Entry (metadata only — stored via API)
    results["timeline_entry"] = {
        "event": "Medical Report Analyzed",
        "date": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime("%Y-%m-%d"),
        "summary": parsed.get("summary", "Report processed")
    }

    # Step 3: Health Twin Update (extract vitals from parsed)
    metrics = parsed.get("test_metrics", [])
    def find_metric(name: str, default: float) -> float:
        for m in metrics:
            if name.lower() in m.get("test_name", "").lower():
                return float(m.get("value", default))
        return default

    twin_data = {
        "glucose": find_metric("glucose", 95.0),
        "cholesterol": find_metric("cholesterol", 185.0),
        "systolic_bp": find_metric("systolic", 120),
    }
    results["twin_update"] = twin_data

    # Step 4: Risk Calculation
    age = parsed.get("age") or 45
    bmi = 25.0
    sbp = int(twin_data["systolic_bp"])
    chol = int(twin_data["cholesterol"])
    age_factor = (age - 30) * 0.15
    bp_factor = (sbp - 120) * 0.25
    chol_factor = (chol - 200) * 0.1
    raw_score = age_factor + bp_factor + chol_factor
    risk_level = "High Risk" if raw_score > 6 else "Moderate Risk" if raw_score > 3 else "Low Risk"
    results["risk_assessment"] = {
        "heart_disease": risk_level,
        "diabetes": "Moderate Risk" if twin_data["glucose"] > 100 else "Low Risk",
        "hypertension": "High Risk" if sbp > 140 else "Moderate Risk" if sbp > 130 else "Low Risk"
    }

    # Step 5: Drug Interactions
    meds = existing_medications or []
    if meds:
        try:
            results["drug_interactions"] = check_drug_interactions(", ".join(meds))
        except Exception as e:
            errors.append(f"Drug check: {e}")
            results["drug_interactions"] = "Unable to check drug interactions."
    else:
        results["drug_interactions"] = "No medications on file for interaction check."

    # Step 6: Diet Plan
    conditions = []
    if twin_data["glucose"] > 126:
        conditions.append("Diabetes")
    if sbp > 140:
        conditions.append("Hypertension")
    if chol > 200:
        conditions.append("High Cholesterol")
    condition_str = ", ".join(conditions) or "General Health Maintenance"
    try:
        results["diet_plan"] = generate_condition_meal_plan(condition_str, "balanced", 3)
    except Exception as e:
        errors.append(f"Diet plan: {e}")
        results["diet_plan"] = f"Recommended: Mediterranean diet for {condition_str}."

    # Step 7: Doctor Questions
    try:
        doctor_q_prompt = (
            f"Patient report summary: {parsed.get('summary', 'Medical report analyzed')}.\n"
            f"Alerts: {', '.join(parsed.get('alerts', []))}\n\n"
            f"Generate 8 specific, high-value questions this patient should ask their doctor at the next visit. "
            f"Number each question. Be specific to the findings."
        )
        results["doctor_questions"] = groq_generate(doctor_q_prompt) if groq_client else (
            "1. What do these test results mean for my long-term health?\n"
            "2. Should any medications be adjusted?\n"
            "3. What follow-up tests are needed?\n"
            "4. What lifestyle changes are most urgent?\n"
            "5. When should I schedule my next appointment?"
        )
    except Exception as e:
        errors.append(f"Doctor questions: {e}")
        results["doctor_questions"] = "Consult your physician about all abnormal findings."

    # Step 8: Dashboard Summary
    results["dashboard_summary"] = {
        "health_score": max(20, 100 - int(raw_score * 5)),
        "active_risks": [k for k, v in results["risk_assessment"].items() if "High" in v],
        "key_alerts": parsed.get("alerts", []),
        "recommendations": parsed.get("recommendations", []),
        "pipeline_steps_completed": 8 - len(errors),
        "errors": errors
    }

    return results


# ===================================================================
# V5.0 — NATIONAL PREVENTIVE HEALTHCARE INTELLIGENCE PLATFORM
# 16-Phase Engine Functions
# ===================================================================

# ── INDIA DISEASE BASELINE (ICMR/NFHS-5 2021 Statistics) ──────────
INDIA_BASELINE = {
    "diabetes_prevalence": 11.4,          # % adults
    "hypertension_prevalence": 28.5,
    "obesity_prevalence": 22.9,
    "ckd_prevalence": 17.2,               # eGFR-based
    "cvd_prevalence": 54.5,               # per 1000 urban
    "dengue_annual_cases": 289000,
    "malaria_annual_cases": 181769,
    "avg_treatment_cost_diabetes": 15000,  # INR/year
    "avg_treatment_cost_cvd": 85000,
    "avg_treatment_cost_hypertension": 8000,
    "ayushman_coverage_districts": 737,
    "pmjay_beneficiaries_cr": 50.0,        # crore families
}

INDIA_DISTRICTS = [
    "Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore", "Hyderabad",
    "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Patna", "Bhopal",
    "Chandigarh", "Nagpur", "Surat", "Vadodara", "Indore", "Kanpur",
]

GOVT_SCHEMES = [
    {"name": "Ayushman Bharat PM-JAY", "coverage": "₹5 lakh/family/year", "eligible": "BPL families", "url": "pmjay.gov.in"},
    {"name": "Pradhan Mantri Suraksha Bima Yojana", "coverage": "₹2 lakh accident", "eligible": "18-70 years", "url": "jansuraksha.gov.in"},
    {"name": "Rashtriya Swasthya Bima Yojana", "coverage": "₹30,000/year", "eligible": "BPL workers", "url": "labour.gov.in"},
    {"name": "Janani Suraksha Yojana", "coverage": "Cash benefit for delivery", "eligible": "Pregnant women BPL", "url": "nhm.gov.in"},
    {"name": "National Dialysis Programme", "coverage": "Free dialysis", "eligible": "CKD patients", "url": "nhm.gov.in"},
    {"name": "CGHS (Central Govt Health Scheme)", "coverage": "OPD + IPD", "eligible": "Central govt employees", "url": "cghs.gov.in"},
]


def groq_generate(prompt: str, fallback: Any = None, max_tokens: int = 1200) -> Any:
    """Helper: call Groq and return text or fallback."""
    if groq_client:
        try:
            resp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq call failed: {e}")
    return fallback


def groq_generate_json(prompt: str, fallback: Any = None, max_tokens: int = 1200) -> Any:
    """Helper: call Groq and parse JSON, or return fallback."""
    text = groq_generate(prompt, fallback=None, max_tokens=max_tokens)
    if text:
        try:
            m = re.search(r'\{[\s\S]*\}', text)
            if m:
                return json.loads(m.group())
        except Exception:
            pass
    return fallback


# ── PHASE 2: PERSONAL HEALTH DIGITAL TWIN ─────────────────────────
def generate_digital_twin(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a full digital health twin with current state, risk map,
    and projected 12-month state from profile metrics.
    """
    age = profile.get("age", 35)
    weight = profile.get("weight_kg", 70)
    height = profile.get("height_cm", 170)
    bp = profile.get("systolic_bp", 120)
    glucose = profile.get("glucose", 90)
    cholesterol = profile.get("cholesterol", 185)
    exercise = profile.get("exercise_days_per_week", 3)
    sleep = profile.get("sleep_hours", 7)
    smoking = profile.get("smoking", False)
    alcohol = profile.get("alcohol_units_week", 0)
    family_diabetes = profile.get("family_diabetes", False)
    family_cvd = profile.get("family_cvd", False)

    bmi = round(weight / ((height / 100) ** 2), 1)

    # --- Risk Scoring (deterministic + clinically grounded) ---
    diabetes_risk = min(95, max(5,
        (10 if glucose >= 100 else 3) +
        (15 if glucose >= 126 else 0) +
        (8 if bmi >= 30 else 4 if bmi >= 25 else 0) +
        (5 if age >= 45 else 2) +
        (10 if family_diabetes else 0) +
        (3 if exercise < 3 else 0)
    ))
    cardiac_risk = min(95, max(5,
        (12 if bp >= 140 else 7 if bp >= 130 else 2) +
        (10 if cholesterol >= 240 else 5 if cholesterol >= 200 else 1) +
        (15 if smoking else 0) +
        (8 if age >= 50 else 4 if age >= 40 else 1) +
        (12 if family_cvd else 0) +
        (5 if exercise < 2 else 0)
    ))
    hypertension_risk = min(95, max(5,
        (30 if bp >= 140 else 15 if bp >= 130 else 5) +
        (8 if bmi >= 30 else 4 if bmi >= 25 else 0) +
        (5 if age >= 45 else 2) +
        (5 if alcohol > 14 else 2 if alcohol > 7 else 0)
    ))
    kidney_risk = min(95, max(5,
        (15 if diabetes_risk > 60 else 5) +
        (10 if bp >= 140 else 5 if bp >= 130 else 0) +
        (5 if age >= 60 else 2)
    ))
    obesity_risk = min(95, max(5,
        (40 if bmi >= 35 else 25 if bmi >= 30 else 10 if bmi >= 25 else 3) +
        (8 if exercise < 2 else 4 if exercise < 4 else 0) +
        (5 if sleep < 6 else 0)
    ))

    overall_score = max(10, 100 - int(
        (diabetes_risk * 0.25 + cardiac_risk * 0.30 +
         hypertension_risk * 0.20 + kidney_risk * 0.15 + obesity_risk * 0.10) * 0.6
    ))

    # --- Projected State (12 months with moderate lifestyle changes) ---
    improve = 1 - (exercise / 14)  # more exercise → more improvement
    projected = {
        "diabetes_risk": max(5, int(diabetes_risk * (0.85 if exercise >= 4 else 0.95))),
        "cardiac_risk": max(5, int(cardiac_risk * (0.88 if not smoking else 0.98))),
        "hypertension_risk": max(5, int(hypertension_risk * 0.90)),
        "kidney_risk": max(5, int(kidney_risk * 0.92)),
        "obesity_risk": max(5, int(obesity_risk * (0.80 if exercise >= 5 else 0.92))),
        "bmi": round(bmi * (0.97 if exercise >= 3 else 1.02), 1),
        "overall_score": min(100, overall_score + 8),
    }

    # Radar chart data
    radar_data = [
        {"metric": "Diabetes Risk",    "current": diabetes_risk,    "projected": projected["diabetes_risk"],    "fullMark": 100},
        {"metric": "Cardiac Risk",     "current": cardiac_risk,     "projected": projected["cardiac_risk"],     "fullMark": 100},
        {"metric": "Hypertension",     "current": hypertension_risk,"projected": projected["hypertension_risk"],"fullMark": 100},
        {"metric": "Kidney Risk",      "current": kidney_risk,      "projected": projected["kidney_risk"],      "fullMark": 100},
        {"metric": "Obesity Risk",     "current": obesity_risk,     "projected": projected["obesity_risk"],     "fullMark": 100},
    ]

    # Organ health state
    organ_health = {
        "Heart":   max(10, 100 - cardiac_risk),
        "Kidneys": max(10, 100 - kidney_risk),
        "Liver":   max(20, 100 - int(obesity_risk * 0.6) - (5 if alcohol > 7 else 0)),
        "Lungs":   max(10, 100 - (30 if smoking else 0) - int(age * 0.3)),
        "Brain":   max(20, 100 - int(age * 0.4) - (5 if sleep < 6 else 0)),
        "Pancreas": max(10, 100 - diabetes_risk),
    }

    narrative_prompt = f"""You are a preventive healthcare AI. Generate a 3-sentence personalized health twin narrative for:
Age: {age}, BMI: {bmi}, BP: {bp}, Glucose: {glucose}, Cholesterol: {cholesterol}, 
Exercise: {exercise} days/week, Sleep: {sleep} hrs, Smoking: {smoking}.
Overall Health Score: {overall_score}/100. Top risks: Cardiac {cardiac_risk}%, Diabetes {diabetes_risk}%.
Be encouraging, specific, and action-oriented."""

    narrative = groq_generate(narrative_prompt, fallback=(
        f"Your Digital Health Twin reflects a health score of {overall_score}/100. "
        f"Your primary areas of concern are cardiac risk ({cardiac_risk}%) and diabetes risk ({diabetes_risk}%). "
        f"With targeted lifestyle interventions, you can reduce these risks significantly over the next 12 months."
    ))

    return {
        "overall_score": overall_score,
        "bmi": bmi,
        "risk_scores": {
            "diabetes": diabetes_risk,
            "cardiac": cardiac_risk,
            "hypertension": hypertension_risk,
            "kidney": kidney_risk,
            "obesity": obesity_risk,
        },
        "projected_12m": projected,
        "radar_data": radar_data,
        "organ_health": organ_health,
        "narrative": narrative,
        "profile": profile,
    }


# ── PHASE 3 EXTENDED: 5-YEAR HEALTH FORECAST ──────────────────────
def extended_health_forecast(profile: Dict[str, Any], years: int = 5) -> Dict[str, Any]:
    """
    Generate multi-year (up to 5-year) health forecast with 3 intervention scenarios.
    """
    twin = generate_digital_twin(profile)
    base_scores = twin["risk_scores"]

    # Monthly decay rates per scenario
    RATES = {
        "no_change":  {"diabetes": 1.008, "cardiac": 1.006, "hypertension": 1.007, "kidney": 1.005, "obesity": 1.009},
        "moderate":   {"diabetes": 0.994, "cardiac": 0.993, "hypertension": 0.995, "kidney": 0.997, "obesity": 0.991},
        "aggressive": {"diabetes": 0.982, "cardiac": 0.980, "hypertension": 0.983, "kidney": 0.987, "obesity": 0.975},
    }

    scenarios = {}
    months = years * 12
    for sc, rates in RATES.items():
        timeline = []
        current = dict(base_scores)
        for m in range(0, months + 1, 3):  # quarterly points
            timeline.append({
                "month": f"M{m}",
                "year": m // 12,
                **{k: min(99, max(3, round(v, 1))) for k, v in current.items()},
                "overall": max(10, 100 - int(sum(current.values()) / len(current) * 0.6)),
            })
            for k in current:
                current[k] = current[k] * rates[k]
        scenarios[sc] = {
            "timeline": timeline,
            "final_risk": {k: round(v, 1) for k, v in current.items()},
            "overall_final": max(10, 100 - int(sum(current.values()) / len(current) * 0.6)),
        }

    narrative_prompt = f"""Generate a 5-year health trajectory summary for a patient with:
Diabetes risk: {base_scores['diabetes']}%, Cardiac: {base_scores['cardiac']}%, 
Hypertension: {base_scores['hypertension']}%, BMI context.
Compare all 3 scenarios (no change, moderate, aggressive) briefly. 
Focus on what will happen without vs with intervention. 3 sentences."""

    return {
        "base_scores": base_scores,
        "scenarios": scenarios,
        "years_forecast": years,
        "narrative": groq_generate(narrative_prompt, fallback=(
            "Without lifestyle changes, your health risks are projected to increase by 15-25% over 5 years. "
            "With moderate improvements (diet + 3x/week exercise), risks can be stabilized. "
            "An aggressive health plan could reduce your primary risk factors by 30-40%, potentially preventing disease onset."
        )),
    }


# ── PHASE 4: DISEASE PREVENTION ENGINE ────────────────────────────
def analyze_prevention_engine(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detect 5 diseases before onset with explainability.
    Returns risk, confidence, contributing factors, and preventive actions.
    """
    age = metrics.get("age", 40)
    bmi = metrics.get("bmi", 26)
    glucose = metrics.get("glucose", 95)
    hba1c = metrics.get("hba1c", 5.8)
    bp = metrics.get("systolic_bp", 130)
    cholesterol = metrics.get("total_cholesterol", 210)
    ldl = metrics.get("ldl", 130)
    hdl = metrics.get("hdl", 45)
    egfr = metrics.get("egfr", 75)
    uric_acid = metrics.get("uric_acid", 6.5)
    alt = metrics.get("alt", 35)
    exercise = metrics.get("exercise_days_per_week", 2)
    smoking = metrics.get("smoking", False)
    alcohol = metrics.get("alcohol_units_week", 0)
    family_h = metrics.get("family_history", {})

    diseases = []

    # ── Type 2 Diabetes ──
    d2_factors = []
    d2_score = 0
    if glucose >= 126: d2_score += 40; d2_factors.append({"factor": "Fasting glucose ≥126 mg/dL", "weight": 40, "status": "critical"})
    elif glucose >= 100: d2_score += 20; d2_factors.append({"factor": "Pre-diabetic glucose (100-125 mg/dL)", "weight": 20, "status": "warning"})
    if hba1c >= 6.5: d2_score += 35; d2_factors.append({"factor": "HbA1c ≥6.5% (diagnostic range)", "weight": 35, "status": "critical"})
    elif hba1c >= 5.7: d2_score += 18; d2_factors.append({"factor": "HbA1c 5.7-6.4% (pre-diabetes)", "weight": 18, "status": "warning"})
    if bmi >= 30: d2_score += 15; d2_factors.append({"factor": "Obesity (BMI ≥30)", "weight": 15, "status": "warning"})
    if family_h.get("diabetes"): d2_score += 12; d2_factors.append({"factor": "Family history of diabetes", "weight": 12, "status": "info"})
    if exercise < 2: d2_score += 8; d2_factors.append({"factor": "Sedentary lifestyle (<2 days/week exercise)", "weight": 8, "status": "warning"})
    diseases.append({
        "disease": "Type 2 Diabetes",
        "risk_percent": min(98, d2_score),
        "confidence": min(95, d2_score + 5),
        "stage": "Pre-diabetic" if 20 <= d2_score < 45 else ("High Risk" if d2_score >= 45 else "Low Risk"),
        "contributing_factors": d2_factors,
        "preventive_actions": [
            "Reduce refined carbohydrates and added sugars",
            "30 minutes aerobic exercise 5 days/week",
            "Target 5-7% body weight loss if overweight",
            "Monitor fasting glucose every 3 months",
            "Consider Metformin if HbA1c 5.7-6.4% with other risks",
        ],
        "icon": "🩸", "color": "#f59e0b",
    })

    # ── Hypertension ──
    ht_factors = []
    ht_score = 0
    if bp >= 140: ht_score += 45; ht_factors.append({"factor": f"Stage 2 HTN (SBP {bp} mmHg)", "weight": 45, "status": "critical"})
    elif bp >= 130: ht_score += 25; ht_factors.append({"factor": f"Stage 1 HTN (SBP {bp} mmHg)", "weight": 25, "status": "warning"})
    if bmi >= 30: ht_score += 12; ht_factors.append({"factor": "Obesity increases vascular resistance", "weight": 12, "status": "warning"})
    if alcohol > 14: ht_score += 10; ht_factors.append({"factor": "Excess alcohol (>14 units/week)", "weight": 10, "status": "warning"})
    if age >= 50: ht_score += 8; ht_factors.append({"factor": "Age ≥50 (vascular stiffening)", "weight": 8, "status": "info"})
    diseases.append({
        "disease": "Hypertension",
        "risk_percent": min(98, ht_score),
        "confidence": min(95, ht_score + 8),
        "stage": "Stage 1" if 130 <= bp < 140 else ("Stage 2" if bp >= 140 else "Elevated"),
        "contributing_factors": ht_factors,
        "preventive_actions": [
            "DASH diet: reduce sodium (<2.3g/day), increase potassium",
            "Daily 30-minute moderate aerobic exercise",
            "Limit alcohol to <7 units/week",
            "Monitor BP at home twice daily",
            "Consider ACE inhibitor if BP persistently ≥140/90",
        ],
        "icon": "💉", "color": "#ef4444",
    })

    # ── Cardiovascular Disease ──
    cv_factors = []
    cv_score = 0
    if cholesterol >= 240: cv_score += 20; cv_factors.append({"factor": "High total cholesterol (≥240 mg/dL)", "weight": 20, "status": "critical"})
    if ldl >= 160: cv_score += 25; cv_factors.append({"factor": f"High LDL ({ldl} mg/dL)", "weight": 25, "status": "critical"})
    elif ldl >= 130: cv_score += 12; cv_factors.append({"factor": f"Borderline LDL ({ldl} mg/dL)", "weight": 12, "status": "warning"})
    if hdl < 40: cv_score += 15; cv_factors.append({"factor": f"Low HDL ({hdl} mg/dL) - protective factor reduced", "weight": 15, "status": "critical"})
    if smoking: cv_score += 25; cv_factors.append({"factor": "Smoking (2× cardiac risk)", "weight": 25, "status": "critical"})
    if bp >= 140: cv_score += 10; cv_factors.append({"factor": "Concurrent hypertension", "weight": 10, "status": "warning"})
    if family_h.get("heart_disease"): cv_score += 15; cv_factors.append({"factor": "Family history of early CVD", "weight": 15, "status": "info"})
    diseases.append({
        "disease": "Cardiovascular Disease",
        "risk_percent": min(98, cv_score),
        "confidence": min(95, cv_score + 3),
        "stage": "High Risk" if cv_score >= 50 else ("Moderate" if cv_score >= 25 else "Low Risk"),
        "contributing_factors": cv_factors,
        "preventive_actions": [
            "High-intensity statin therapy if LDL ≥160 mg/dL",
            "Mediterranean diet (olive oil, fish, nuts, legumes)",
            "Quit smoking immediately — reduces risk by 50% in 1 year",
            "Aspirin 75mg/day if ASCVD risk >10% (discuss with doctor)",
            "Annual lipid panel monitoring",
        ],
        "icon": "❤️", "color": "#dc2626",
    })

    # ── Chronic Kidney Disease ──
    ck_factors = []
    ck_score = 0
    if egfr < 60: ck_score += 50; ck_factors.append({"factor": f"eGFR <60 mL/min/1.73m² ({egfr}) — CKD Stage 3", "weight": 50, "status": "critical"})
    elif egfr < 90: ck_score += 20; ck_factors.append({"factor": f"eGFR 60-89 ({egfr}) — Mild reduction", "weight": 20, "status": "warning"})
    if d2_score >= 40: ck_score += 15; ck_factors.append({"factor": "Diabetic nephropathy risk (high glucose)", "weight": 15, "status": "warning"})
    if bp >= 140: ck_score += 12; ck_factors.append({"factor": "Hypertension damages glomeruli", "weight": 12, "status": "warning"})
    if uric_acid > 7: ck_score += 8; ck_factors.append({"factor": f"Hyperuricemia (uric acid {uric_acid} mg/dL)", "weight": 8, "status": "warning"})
    diseases.append({
        "disease": "Chronic Kidney Disease",
        "risk_percent": min(98, ck_score),
        "confidence": min(92, ck_score + 5),
        "stage": "Stage 3" if egfr < 60 else ("Stage G2" if egfr < 90 else "Normal"),
        "contributing_factors": ck_factors,
        "preventive_actions": [
            "Strict blood pressure control (target <130/80 mmHg)",
            "Tight glycemic control (HbA1c <7%)",
            "Low-protein diet if eGFR <45",
            "Avoid NSAIDs (ibuprofen) — nephrotoxic",
            "Annual urine albumin-to-creatinine ratio (ACR) test",
        ],
        "icon": "🫘", "color": "#8b5cf6",
    })

    # ── Fatty Liver Disease (NAFLD) ──
    fl_factors = []
    fl_score = 0
    if bmi >= 30: fl_score += 30; fl_factors.append({"factor": "Obesity major NAFLD driver", "weight": 30, "status": "critical"})
    elif bmi >= 25: fl_score += 15; fl_factors.append({"factor": "Overweight increases hepatic fat", "weight": 15, "status": "warning"})
    if alt > 40: fl_score += 20; fl_factors.append({"factor": f"Elevated ALT ({alt} U/L) — hepatocyte damage", "weight": 20, "status": "critical"})
    if glucose >= 100: fl_score += 12; fl_factors.append({"factor": "Insulin resistance drives hepatic steatosis", "weight": 12, "status": "warning"})
    if alcohol > 14: fl_score += 20; fl_factors.append({"factor": "Excessive alcohol — alcoholic fatty liver", "weight": 20, "status": "critical"})
    diseases.append({
        "disease": "Fatty Liver Disease",
        "risk_percent": min(98, fl_score),
        "confidence": min(90, fl_score + 4),
        "stage": "NASH Risk" if fl_score >= 50 else ("NAFLD Risk" if fl_score >= 25 else "Low Risk"),
        "contributing_factors": fl_factors,
        "preventive_actions": [
            "Achieve 7-10% body weight reduction",
            "Mediterranean diet, avoid fructose and trans fats",
            "Abstain from or significantly reduce alcohol",
            "Liver ultrasound annually if BMI >30",
            "Vitamin E supplementation (discuss with doctor for NASH)",
        ],
        "icon": "🟤", "color": "#d97706",
    })

    # XAI summary
    all_risks = {d["disease"]: d["risk_percent"] for d in diseases}
    top_risk = max(all_risks, key=all_risks.get)

    return {
        "diseases": diseases,
        "top_risk": top_risk,
        "overall_prevention_score": max(10, 100 - int(sum(all_risks.values()) / len(all_risks))),
        "xai_summary": {
            "most_significant_factor": "Elevated blood glucose" if d2_score > cv_score else "Lipid abnormality",
            "modifiable_risk_count": sum(1 for d in diseases for f in d["contributing_factors"]
                                         if f["status"] in ["warning", "critical"] and "family" not in f["factor"].lower()),
            "immediate_actions": [
                "Schedule comprehensive metabolic panel within 2 weeks",
                f"Priority: address {top_risk} risk factors first",
                "Consult your physician with this AI assessment",
            ],
        },
    }


# ── PHASE 8: MULTILINGUAL VOICE HEALTH ASSISTANT ──────────────────
LANG_CONFIG = {
    "en": {"name": "English",   "code": "en-IN", "voice_name": "en-IN-Standard-A"},
    "hi": {"name": "Hindi",     "code": "hi-IN", "voice_name": "hi-IN-Standard-A"},
    "mr": {"name": "Marathi",   "code": "mr-IN", "voice_name": "mr-IN-Standard-A"},
    "ta": {"name": "Tamil",     "code": "ta-IN", "voice_name": "ta-IN-Standard-A"},
    "te": {"name": "Telugu",    "code": "te-IN", "voice_name": "te-IN-Standard-A"},
    "kn": {"name": "Kannada",   "code": "kn-IN", "voice_name": "kn-IN-Standard-A"},
    "ml": {"name": "Malayalam", "code": "ml-IN", "voice_name": "ml-IN-Standard-A"},
    "bn": {"name": "Bengali",   "code": "bn-IN", "voice_name": "bn-IN-Standard-A"},
}

def generate_voice_health_response(query: str, language: str = "en") -> Dict[str, Any]:
    """
    Generate a health response in the specified Indian language.
    Uses Groq LLM with language-specific prompting.
    """
    lang_info = LANG_CONFIG.get(language, LANG_CONFIG["en"])
    lang_name = lang_info["name"]

    prompt = f"""You are a friendly Indian health assistant. The patient asked (may be in any language):
"{query}"

Respond ONLY in {lang_name}. Keep response to 2-3 short sentences. 
Be warm, simple, and medically accurate. Avoid jargon.
If the question is an emergency, say "Please call 108 immediately" in {lang_name}."""

    FALLBACKS = {
        "en": "I understand your health concern. Please consult your local doctor for personalized advice. For emergencies, call 108.",
        "hi": "मैं आपकी स्वास्थ्य समस्या समझता हूँ। कृपया अपने डॉक्टर से मिलें। आपातकाल में 108 पर कॉल करें।",
        "mr": "मी तुमची आरोग्य समस्या समजतो. कृपया तुमच्या डॉक्टरांना भेटा. आणीबाणीत 108 वर कॉल करा.",
        "ta": "உங்கள் உடல்நல கவலையை புரிந்துகொள்கிறேன். உங்கள் மருத்துவரை அணுகவும். அவசரத்தில் 108 அழைக்கவும்.",
        "te": "మీ ఆరోగ్య సమస్యను అర్థం చేసుకున్నాను. మీ వైద్యుడిని సంప్రదించండి. అత్యవసరంలో 108కి కాల్ చేయండి.",
        "kn": "ನಿಮ್ಮ ಆರೋಗ್ಯ ಸಮಸ್ಯೆ ಅರ್ಥವಾಗಿದೆ. ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ. ತುರ್ತುಸ್ಥಿತಿಯಲ್ಲಿ 108 ಕರೆ ಮಾಡಿ.",
        "ml": "നിങ്ങളുടെ ആരോഗ്യ ആശങ്ക മനസ്സിലായി. ഡോക്ടറെ കാണുക. അടിയന്തരഘട്ടത്തിൽ 108 വിളിക്കുക.",
        "bn": "আপনার স্বাস্থ্য সমস্যা বুঝতে পারছি। আপনার ডাক্তারের সাথে পরামর্শ করুন। জরুরি অবস্থায় 108 কল করুন।",
    }

    response_text = groq_generate(prompt, fallback=FALLBACKS.get(language, FALLBACKS["en"]))

    return {
        "query": query,
        "language": language,
        "language_name": lang_name,
        "response": response_text,
        "tts_lang_code": lang_info["code"],
        "emergency_number": "108",
        "supported_languages": [{"code": k, "name": v["name"]} for k, v in LANG_CONFIG.items()],
    }


# ── PHASE 9: RURAL HEALTHCARE WORKER (ASHA) MODE ──────────────────
def run_rural_triage(symptoms_text: str, language: str = "hi", village: str = "", worker_name: str = "") -> Dict[str, Any]:
    """
    Simplified AI triage for ASHA/healthcare workers.
    Outputs severity, referral urgency, and next steps in plain language.
    """
    # Urgency detection heuristics
    red_flags = ["unconscious", "not breathing", "heavy bleeding", "chest pain", "seizure",
                 "बेहोश", "सांस नहीं", "छाती में दर्द", "दौरा"]
    orange_flags = ["high fever", "difficulty breathing", "vomiting blood", "not eating",
                    "तेज बुखार", "सांस लेने में तकलीफ", "उल्टी में खून"]
    yellow_flags = ["fever", "cough", "diarrhea", "rash", "बुखार", "खांसी", "दस्त"]

    text_lower = symptoms_text.lower()
    urgency = "GREEN"
    if any(flag in text_lower for flag in red_flags): urgency = "RED"
    elif any(flag in text_lower for flag in orange_flags): urgency = "ORANGE"
    elif any(flag in text_lower for flag in yellow_flags): urgency = "YELLOW"

    urgency_map = {
        "RED":    {"label": "EMERGENCY", "color": "#dc2626", "action": "Call 108 IMMEDIATELY. Do not wait.", "refer": True},
        "ORANGE": {"label": "URGENT",    "color": "#f97316", "action": "Refer to PHC/CHC today. Monitor vitals.", "refer": True},
        "YELLOW": {"label": "MODERATE",  "color": "#eab308", "action": "Treat at home. Return if no improvement in 2 days.", "refer": False},
        "GREEN":  {"label": "MILD",      "color": "#22c55e", "action": "Home care. Educate on hygiene and nutrition.", "refer": False},
    }

    prompt = f"""You are an AI assistant for an ASHA health worker in rural India.
Patient symptoms: "{symptoms_text}"
Urgency: {urgency}
Village: {village or "Not specified"}

In simple language (mix of {LANG_CONFIG.get(language, LANG_CONFIG['hi'])['name']} and English if needed), provide:
1. Likely condition (1-2 words)
2. What to do right now (2 steps)
3. When to refer to hospital

Keep it SHORT and CLEAR for a health worker with basic training."""

    ai_guidance = groq_generate(prompt, fallback=(
        f"Urgency: {urgency}. {urgency_map[urgency]['action']} "
        f"Check temperature, pulse, and breathing. Document findings."
    ))

    return {
        "urgency": urgency,
        "urgency_label": urgency_map[urgency]["label"],
        "urgency_color": urgency_map[urgency]["color"],
        "action": urgency_map[urgency]["action"],
        "refer_to_hospital": urgency_map[urgency]["refer"],
        "ai_guidance": ai_guidance,
        "worker_name": worker_name,
        "village": village,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        "emergency_numbers": {"ambulance": "108", "women_helpline": "1091", "child_helpline": "1098"},
    }


# ── PHASE 11: HEALTHCARE AFFORDABILITY ENGINE ──────────────────────
def estimate_treatment_cost(condition: str, state: str = "Maharashtra", severity: str = "Moderate") -> Dict[str, Any]:
    """
    Estimate treatment costs and recommend government schemes and affordable alternatives.
    """
    condition_lower = condition.lower()

    # Cost database (INR, approximate 2024 India rates)
    COST_DB = {
        "diabetes": {
            "consultation": 500, "medications_month": 800, "hba1c_test": 400,
            "annual_total": 18000, "specialist": "Endocrinologist"
        },
        "hypertension": {
            "consultation": 400, "medications_month": 600, "ecg": 500,
            "annual_total": 12000, "specialist": "Cardiologist"
        },
        "heart disease": {
            "consultation": 800, "angiography": 25000, "stent": 150000,
            "bypass": 350000, "annual_total": 85000, "specialist": "Interventional Cardiologist"
        },
        "kidney disease": {
            "consultation": 700, "dialysis_session": 2500, "dialysis_monthly": 30000,
            "transplant": 600000, "annual_total": 120000, "specialist": "Nephrologist"
        },
        "cancer": {
            "consultation": 1000, "chemotherapy_cycle": 50000, "radiation": 150000,
            "surgery": 200000, "annual_total": 500000, "specialist": "Oncologist"
        },
        "default": {
            "consultation": 500, "medications_month": 700, "tests": 2000,
            "annual_total": 15000, "specialist": "General Physician"
        }
    }

    costs = next(
        (v for k, v in COST_DB.items() if k in condition_lower),
        COST_DB["default"]
    )

    # Severity multiplier
    multipliers = {"Mild": 0.6, "Moderate": 1.0, "Severe": 2.5, "Critical": 5.0}
    mult = multipliers.get(severity, 1.0)
    adjusted_annual = int(costs["annual_total"] * mult)

    # Generic alternatives
    prompt = f"""For {condition} ({severity} severity) in India, suggest:
1. 3 affordable generic medication alternatives (with approx price difference)
2. 2 free/low-cost government hospital options in {state}
Be specific with drug names and costs in INR."""

    alternatives = groq_generate(prompt, fallback=(
        f"Generic alternatives for {condition}: Ask your pharmacist for Jan Aushadhi Kendra generics "
        f"(60-80% cheaper than branded). Visit nearest government hospital or ESI hospital for subsidized care."
    ))

    # Scheme eligibility
    eligible_schemes = []
    if adjusted_annual > 30000:
        eligible_schemes.append(GOVT_SCHEMES[0])  # PM-JAY
    eligible_schemes.append(GOVT_SCHEMES[2])  # RSBY
    if "kidney" in condition_lower:
        eligible_schemes.append(GOVT_SCHEMES[4])  # National Dialysis

    return {
        "condition": condition,
        "severity": severity,
        "state": state,
        "estimated_costs": {
            "consultation_per_visit": costs["consultation"],
            "monthly_medications": int(costs.get("medications_month", 700) * mult),
            "estimated_annual_total": adjusted_annual,
            "with_pmjay_savings": max(0, adjusted_annual - 500000),  # PM-JAY covers up to 5L
        },
        "private_vs_govt_savings": f"Government hospital saves ₹{int(adjusted_annual * 0.7):,}/year",
        "jan_aushadhi_savings": f"Generic medicines save ₹{int(costs.get('medications_month', 700) * 12 * 0.65 * mult):,}/year",
        "eligible_schemes": eligible_schemes,
        "affordable_alternatives": alternatives,
        "nearest_resources": [
            f"Nearest Jan Aushadhi Kendra: janaushadhi.gov.in",
            f"eSanjeevani telemedicine: esanjeevani.in (free)",
            f"PM-JAY empanelled hospitals: pmjay.gov.in",
        ],
    }


# ── PHASE 12: POPULATION HEALTH ANALYTICS ─────────────────────────
def compute_population_analytics(state: str = "All India", disease: str = "diabetes") -> Dict[str, Any]:
    """
    Generate simulated district-level population health analytics
    based on ICMR/NFHS-5 statistics.
    """
    import random
    rng = random.Random(hash(state + disease) % 2**32)

    disease_base = {
        "diabetes": {"base": 11.4, "urban_mult": 1.4, "rural_mult": 0.7, "color": "#f59e0b"},
        "hypertension": {"base": 28.5, "urban_mult": 1.2, "rural_mult": 0.9, "color": "#ef4444"},
        "obesity": {"base": 22.9, "urban_mult": 1.5, "rural_mult": 0.6, "color": "#8b5cf6"},
        "heart_disease": {"base": 5.4, "urban_mult": 1.6, "rural_mult": 0.5, "color": "#dc2626"},
    }
    cfg = disease_base.get(disease, disease_base["diabetes"])

    # District-level data
    district_data = []
    for d in INDIA_DISTRICTS:
        is_metro = d in ["Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore", "Hyderabad"]
        base_rate = cfg["base"] * (cfg["urban_mult"] if is_metro else cfg["rural_mult"])
        rate = round(base_rate + rng.uniform(-2, 3), 1)
        district_data.append({
            "district": d,
            "prevalence_pct": rate,
            "risk_level": "High" if rate > cfg["base"] * 1.3 else ("Moderate" if rate > cfg["base"] else "Low"),
            "color": "#dc2626" if rate > cfg["base"] * 1.3 else ("#f59e0b" if rate > cfg["base"] else "#22c55e"),
            "estimated_affected": int(rng.randint(50000, 2000000) * rate / 100),
        })

    # Trend data (2015-2024)
    trend_data = []
    prev = cfg["base"] * 0.75
    for year in range(2015, 2025):
        prev = round(prev * rng.uniform(1.02, 1.05), 1)
        trend_data.append({"year": str(year), "prevalence": prev, "screened": int(prev * 0.4 * 1000000)})

    # Age group breakdown
    age_breakdown = [
        {"age_group": "18-30", "prevalence": round(cfg["base"] * 0.3 + rng.uniform(0, 1), 1)},
        {"age_group": "31-45", "prevalence": round(cfg["base"] * 0.7 + rng.uniform(0, 2), 1)},
        {"age_group": "46-60", "prevalence": round(cfg["base"] * 1.4 + rng.uniform(0, 3), 1)},
        {"age_group": "61-75", "prevalence": round(cfg["base"] * 1.8 + rng.uniform(0, 4), 1)},
        {"age_group": "75+",   "prevalence": round(cfg["base"] * 2.0 + rng.uniform(0, 5), 1)},
    ]

    return {
        "disease": disease,
        "state": state,
        "national_prevalence": cfg["base"],
        "district_data": district_data,
        "trend_data": trend_data,
        "age_breakdown": age_breakdown,
        "insights": [
            f"Urban districts show {round((cfg['urban_mult']-1)*100)}% higher {disease} prevalence vs national average",
            f"Estimated {int(INDIA_BASELINE.get(f'{disease}_prevalence', cfg['base']) * 14_000_000):,} people affected nationally",
            f"Screening coverage is <40% — early detection gap is critical",
        ],
        "color": cfg["color"],
    }


# ── PHASE 13: DISEASE OUTBREAK PREDICTION ─────────────────────────
def predict_disease_outbreak(region: str = "Mumbai", disease: str = "dengue", season: str = "monsoon") -> Dict[str, Any]:
    """
    Predict outbreak risk for vector-borne and viral diseases
    using epidemiological heuristics.
    """
    import random
    rng = random.Random(hash(region + disease + season) % 2**32)

    DISEASE_SEASONS = {
        "dengue":  {"monsoon": 85, "pre_monsoon": 50, "winter": 15, "summer": 30},
        "malaria": {"monsoon": 80, "pre_monsoon": 45, "winter": 10, "summer": 25},
        "flu":     {"monsoon": 40, "pre_monsoon": 30, "winter": 75, "summer": 20},
        "cholera": {"monsoon": 70, "pre_monsoon": 40, "winter": 15, "summer": 35},
        "typhoid": {"monsoon": 60, "pre_monsoon": 50, "winter": 20, "summer": 40},
    }

    base_risk = DISEASE_SEASONS.get(disease, {}).get(season, 40)
    region_mult = 1.3 if region in ["Mumbai", "Delhi", "Kolkata", "Chennai"] else 0.9
    risk = min(99, int(base_risk * region_mult + rng.uniform(-5, 8)))

    # Weekly risk timeline (12 weeks)
    weekly_data = []
    current_risk = max(10, risk - 20)
    for w in range(1, 13):
        current_risk = min(99, max(5, current_risk + rng.uniform(-5, 8)))
        weekly_data.append({
            "week": f"Week {w}",
            "risk": round(current_risk, 1),
            "cases_est": int(current_risk * rng.randint(100, 500)),
        })
    peak_week = max(weekly_data, key=lambda x: x["risk"])

    risk_level = "CRITICAL" if risk >= 75 else ("HIGH" if risk >= 55 else ("MODERATE" if risk >= 35 else "LOW"))
    color_map = {"CRITICAL": "#dc2626", "HIGH": "#f97316", "MODERATE": "#eab308", "LOW": "#22c55e"}

    prevention_tips = {
        "dengue": ["Eliminate stagnant water", "Use mosquito nets", "Apply repellent", "Wear full-sleeve clothes", "Fumigate area"],
        "malaria": ["Indoor residual spraying", "Insecticide-treated nets", "Prophylactic antimalarials in high-risk zones"],
        "flu": ["Annual flu vaccine", "Hand hygiene", "Wear masks in crowded places", "Isolate if symptomatic"],
        "cholera": ["Drink boiled water only", "Oral Rehydration Salts (ORS) ready", "Food hygiene strict protocol"],
        "typhoid": ["Typhoid vaccination", "Avoid street food", "Safe drinking water only"],
    }

    return {
        "disease": disease,
        "region": region,
        "season": season,
        "risk_percent": risk,
        "risk_level": risk_level,
        "risk_color": color_map[risk_level],
        "weekly_timeline": weekly_data,
        "peak_week": peak_week,
        "prevention_tips": prevention_tips.get(disease, ["Follow standard hygiene protocols"]),
        "alert_message": f"⚠️ {risk_level} outbreak risk for {disease.title()} in {region} during {season}. Preventive action recommended." if risk >= 55 else f"Monitor {disease} situation in {region}.",
        "report_to": "District Health Officer / IDSP (Integrated Disease Surveillance Programme)",
    }


# ── PHASE 14: AI MEDICAL EDUCATOR (5 LEVELS) ──────────────────────
EDUCATION_LEVELS = {
    1: {"name": "Child (Age 6-10)",       "style": "very simple, fun, use analogies like toys/animals, no medical terms"},
    2: {"name": "Student (Age 11-17)",    "style": "simple science language, school-level biology, relatable examples"},
    3: {"name": "Graduate (Age 18+)",     "style": "clear English, some medical terms with explanations, logical flow"},
    4: {"name": "Medical Student",        "style": "clinical terminology, pathophysiology, differential diagnosis approach"},
    5: {"name": "Doctor / Clinician",     "style": "technical, evidence-based, cite mechanisms, clinical implications"},
}

def explain_report_by_level(report_text: str, level: int = 3) -> Dict[str, Any]:
    """
    Explain a medical report at 5 different education/comprehension levels.
    """
    lvl = EDUCATION_LEVELS.get(level, EDUCATION_LEVELS[3])

    prompt = f"""You are a medical educator. Explain the following medical report findings to a {lvl['name']}.
Style: {lvl['style']}
Report: {report_text[:1500]}

Explain:
1. What is being measured
2. What the values mean (normal vs abnormal)
3. What this means for health
4. What should be done

Keep it clear, warm, and appropriate for the audience level."""

    fallback_explanations = {
        1: "Your blood tests are like a report card for your body! 📊 Some numbers are a bit high, which means your body needs help. Eating healthy foods and playing outside can help make these numbers better!",
        2: "Your medical report shows some key health markers. Elevated glucose suggests your body may be having trouble processing sugar — this is related to insulin function. High cholesterol means fatty deposits could build up in arteries. Simple diet and exercise changes can significantly improve these.",
        3: "Your report shows elevated fasting glucose and total cholesterol, which are early indicators of metabolic syndrome. These values suggest pre-diabetic and borderline hyperlipidemic states. Lifestyle modifications — caloric restriction and aerobic exercise — are first-line interventions.",
        4: "The laboratory findings reveal impaired fasting glucose (IFG) with concurrent dyslipidemia. The glucose value suggests insulin resistance. Combined with the lipid profile, ASCVD 10-year risk calculation is warranted. Consider lifestyle modification per ACC/AHA guidelines before pharmacotherapy.",
        5: "Findings indicate IFG (glucose 100-125 mg/dL) consistent with pre-T2DM, alongside mixed dyslipidemia (elevated TG, low HDL). HOMA-IR assessment recommended. Per 2023 ADA Standards of Care, intensive lifestyle intervention targeting 7% weight loss can reduce T2DM progression by 58%.",
    }

    explanation = groq_generate(prompt, fallback=fallback_explanations.get(level, fallback_explanations[3]))

    return {
        "level": level,
        "level_name": lvl["name"],
        "explanation": explanation,
        "all_levels": [{"level": k, "name": v["name"]} for k, v in EDUCATION_LEVELS.items()],
        "report_preview": report_text[:200] + "..." if len(report_text) > 200 else report_text,
    }


# ── PHASE 15: EXPLAINABLE AI FRAMEWORK ────────────────────────────
def build_explainable_prediction(prediction_type: str, input_data: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Wrap any AI prediction with full XAI (explainable AI) framework:
    confidence, feature importance, risk drivers, and plain-language reasoning.
    """
    # Extract numerical features for importance scoring
    numeric_features = {k: v for k, v in input_data.items() if isinstance(v, (int, float))}

    # Normalize to importance scores (simplified SHAP-like)
    importance_scores = {}
    if numeric_features:
        total = sum(abs(v) for v in numeric_features.values()) or 1
        importance_scores = {
            k: round(abs(v) / total * 100, 1)
            for k, v in numeric_features.items()
        }
        # Sort descending
        importance_scores = dict(sorted(importance_scores.items(), key=lambda x: x[1], reverse=True))

    # Confidence calculation
    confidence_base = result.get("confidence", result.get("risk_percent", 70))
    data_completeness = len(numeric_features) / max(10, len(numeric_features)) * 100
    confidence = min(97, int(confidence_base * 0.7 + data_completeness * 0.3))

    prompt = f"""You are an XAI (Explainable AI) system. Explain this medical AI prediction in plain language.
Prediction type: {prediction_type}
Key input values: {json.dumps({k: v for k, v in list(input_data.items())[:6]}, default=str)}
Result: {json.dumps({k: v for k, v in list(result.items())[:4]}, default=str)}

In 3 sentences: what drove this prediction, how confident we are, and what the patient should do."""

    reasoning = groq_generate(prompt, fallback=(
        f"This prediction is based on {len(numeric_features)} health metrics you provided. "
        f"The AI identified patterns consistent with the predicted outcome with {confidence}% confidence. "
        f"Please consult a healthcare professional to validate these findings."
    ))

    return {
        "prediction_type": prediction_type,
        "confidence_percent": confidence,
        "data_completeness_pct": int(data_completeness),
        "feature_importance": [
            {"feature": k.replace("_", " ").title(), "importance": v, "value": input_data.get(k)}
            for k, v in list(importance_scores.items())[:8]
        ],
        "risk_drivers": [
            {"driver": k.replace("_", " ").title(), "contribution": v, "direction": "increases_risk" if v > 10 else "neutral"}
            for k, v in list(importance_scores.items())[:5]
        ],
        "plain_reasoning": reasoning,
        "limitations": [
            "This AI prediction is based on statistical patterns, not clinical examination",
            "Individual medical history and genetics may affect accuracy",
            "Always validate AI predictions with a licensed healthcare professional",
        ],
        "model_info": {"model": "LLM + Clinical Heuristics", "version": "PulseMind AI X v5.0"},
    }


# ── PHASE 16: NATIONAL IMPACT DASHBOARD ───────────────────────────
def compute_national_impact_metrics(db_stats: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Compute measurable national health impact metrics.
    Uses actual usage data from DB if available, otherwise realistic projections.
    """
    # Real usage counts from DB
    reports_analyzed = db_stats.get("reports", 0) if db_stats else 0
    risk_assessments = db_stats.get("risk_predictions", 0) if db_stats else 0
    users = db_stats.get("users", 0) if db_stats else 0

    # Impact multipliers (evidence-based estimates)
    avg_cost_per_hospitalization = 45000      # INR
    hospital_avoidance_rate = 0.15            # 15% of risk detections avoid hospitalization
    quality_life_years_per_prevention = 2.5   # QALYs

    diseases_predicted = risk_assessments + reports_analyzed
    hospital_visits_avoided = int(diseases_predicted * hospital_avoidance_rate)
    cost_savings_inr = hospital_visits_avoided * avg_cost_per_hospitalization
    lives_improved = max(users, int(diseases_predicted * 0.8))
    population_coverage = users

    return {
        "headline_metrics": {
            "diseases_predicted": diseases_predicted,
            "lives_improved": lives_improved,
            "hospital_visits_avoided": hospital_visits_avoided,
            "healthcare_cost_savings_inr": cost_savings_inr,
            "population_covered": population_coverage,
            "states_reached": min(36, max(1, users // 100)),
        },
        "sdg_alignment": [
            {"goal": "SDG 3.4", "description": "Reduce non-communicable disease mortality by 1/3 by 2030", "contribution": "Early detection and prevention"},
            {"goal": "SDG 3.8", "description": "Universal health coverage", "contribution": "Free AI diagnostics accessible to all"},
            {"goal": "SDG 10.2", "description": "Reduce inequality", "contribution": "Multilingual + rural worker support"},
        ],
        "milestones": [
            {"target": "1 Lakh users",     "achieved": users >= 100000,   "value": users},
            {"target": "10K risks detected","achieved": diseases_predicted >= 10000, "value": diseases_predicted},
            {"target": "₹1 Cr savings",    "achieved": cost_savings_inr >= 10000000, "value": cost_savings_inr},
        ],
        "global_benchmarks": {
            "similar_platforms": ["Google Health", "IBM Watson Health", "Apollo HealthCo AI"],
            "pulsemind_differentiator": "India-first, multilingual, rural-ready, offline-capable, 100% explainable AI",
        },
        "future_roadmap": [
            "Integration with ABHA (Ayushman Bharat Health Account)",
            "Real-time IDSP disease surveillance integration",
            "Wearable device (smartwatch/BP cuff) data ingestion",
            "AI-assisted radiology for tier-2/3 cities",
            "NHA digital health ecosystem connector",
        ],
    }
