import streamlit as st
import requests
import os
import json
import time

# Page Config
st.set_page_config(page_title="Legal Contract AI", page_icon="⚖️", layout="wide")

# Custom CSS for premium feel
st.markdown("""
    <style>
    .main {
        background-color: #f8f9fa;
    }
    .stAlert {
        border-radius: 10px;
    }
    .st-emotion-cache-1kyx73v {
        background-color: #ffffff;
        padding: 2rem;
        border-radius: 15px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    </style>
    """, unsafe_allow_html=True)

st.title("⚖️ Legal Contract Review")
st.markdown("#### Playbook-Aligned Analysis for SMBs")

API_BASE_URL = "http://localhost:8000/api/v1"

# Sidebar
with st.sidebar:
    st.header("⚙️ Configuration")
    company_id = st.text_input("Company ID", value="default_co")
    
    st.divider()
    st.header("📜 History")
    if st.button("🔄 Refresh History"):
        try:
            history_resp = requests.get(f"{API_BASE_URL}/history")
            if history_resp.status_code == 200:
                history = history_resp.json()
                for item in history:
                    if st.button(f"📄 {item['timestamp'][:10]} - {item['contract_id'][:8]}", key=item['contract_id']):
                        st.session_state.selected_contract = item['contract_id']
        except:
            st.error("Could not connect to API")

def render_analysis(result):
    st.divider()
    
    # Summary Section
    st.subheader("📋 Executive Summary")
    st.info(result.get("summary", "No summary available."))
    
    # Risks and Violations
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("⚠️ Playbook Violations")
        violations = result.get("violations", [])
        if violations:
            for violation in violations:
                severity = violation.get('severity', 'medium').lower()
                icon = "🔴" if severity == 'high' else "🟠" if severity == 'medium' else "🔵"
                st.markdown(f"{icon} **{violation['clause'].replace('_', ' ').capitalize()}**: {violation['issue']}")
        else:
            st.success("✅ No playbook violations detected.")
            
    with col2:
        st.subheader("🚩 Risk Assessment")
        risk_data = result.get("risk_assessment", {})
        score = risk_data.get("risk_score", 0)
        level = risk_data.get("risk_level", "Unknown")
        
        st.metric("Risk Score", score, delta=f"Level: {level}", delta_color="inverse")
        
        counts = risk_data.get("violation_counts", {})
        if counts:
            st.write(f"High: {counts.get('high', 0)} | Medium: {counts.get('medium', 0)} | Low: {counts.get('low', 0)}")

    st.divider()
    
    # Redlines
    st.subheader("📝 Suggested Redlines")
    redlines = result.get("redlines", [])
    if redlines:
        for redline in redlines:
            # Match new backend keys (rationale, suggested_redline) or fallback
            reason = redline.get("rationale") or redline.get("reason") or "Violation"
            suggested = redline.get("suggested_redline") or redline.get("suggested_clause") or ""
            original = redline.get("original_clause", "")
            
            with st.expander(f"Redline: {redline.get('violation', 'Suggestion').replace('_', ' ').capitalize()}"):
                col_orig, col_sugg = st.columns(2)
                with col_orig:
                    st.markdown("**Original Clause**")
                    st.code(original if original else "Not provided", language=None)
                with col_sugg:
                    st.markdown("**Suggested Clause**")
                    if suggested:
                        st.code(suggested, language=None)
                    else:
                        st.info("No template available. See rationale for guidance.")
                st.markdown(f"**Rationale:** {reason}")
    else:
        st.success("✅ No redlines required for this contract.")

    # Key Terms (Optional/Collapsed)
    with st.expander("🔍 View Extracted Key Terms"):
        terms = result.get("clause_classification", {})
        if terms:
            t_cols = st.columns(2)
            # Filter to show only found clauses
            found_terms = {k: v for k, v in terms.items() if v.get('exists')}
            for i, (clause, attrs) in enumerate(found_terms.items()):
                with t_cols[i % 2]:
                    st.markdown(f"**{clause.replace('_', ' ').capitalize()}**")
                    # Try to find the raw text from result['key_terms'] or similar if we added it back
                    raw_text = result.get("violations", []) # Just as fallback
                    # In our new schema, raw text is in result['violations'][i]['original_clause'] 
                    # or should be in result['clause_classification'] if we added it there.
                    # Looking at contract_pipeline.py:117, it's not in structured_clauses yet.
                    st.caption(f"Status: Found | Attributes: {attrs}")

# Main Content
uploaded_file = st.file_uploader("Upload Contract (PDF, DOCX, TXT)", type=["pdf", "docx", "txt"])

if uploaded_file is not None:
    if st.button("🚀 Run AI Review"):
        with st.spinner("Reviewing contract against playbook..."):
            files = {"file": (uploaded_file.name, uploaded_file.getvalue())}
            params = {"company_id": company_id}
            
            start_t = time.time()
            try:
                # Use the new analyze endpoint
                response = requests.post(f"{API_BASE_URL}/contracts/analyze", files=files, params=params)
                if response.status_code == 200:
                    result = response.json()
                    st.success(f"Review completed in {time.time() - start_t:.2f} seconds")
                    render_analysis(result)
                else:
                    st.error(f"Error: {response.text}")
            except Exception as e:
                st.error(f"Backend connection failed: {e}")

# Load History
if "selected_contract" in st.session_state:
    try:
        hist_resp = requests.get(f"{API_BASE_URL}/contracts/{st.session_state.selected_contract}")
        if hist_resp.status_code == 200:
            render_analysis(hist_resp.json())
    except:
        st.error("Error loading history")
