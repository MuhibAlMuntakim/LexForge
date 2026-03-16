import sys
import os
import json

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

try:
    import logging
    logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
    from src.legal_contract_ai.core.contract_pipeline import ContractPipeline
    
    print("--- Starting Pipeline Verification (New Architecture v2) ---")
    pipeline = ContractPipeline()
    
    test_contract = "data/contracts/test_vendor_contract.txt"
    if not os.path.exists(test_contract):
        # Create a sample test contract if it doesn't exist
        os.makedirs("data/contracts", exist_ok=True)
        with open(test_contract, "w") as f:
            f.write("""
            INDEMNIFICATION. Vendor shall indemnify Customer for all claims.
            LIMITATION OF LIABILITY. Vendor liability is unlimited.
            CONFIDENTIALITY. Mutual confidentiality applies for 1 year.
            TERMINATION. Either party may terminate with 90 days notice.
            GOVERNING LAW. This agreement is governed by the laws of Texas.
            PAYMENT TERMS. Net 90 days.
            """)
        print(f"Created sample contract: {test_contract}")
        
    print(f"Running review on {test_contract}...")
    result = pipeline.run_review(test_contract)
    
    print("\n" + "="*50)
    print("--- ANALYSIS RESULTS ---")
    print("="*50)
    print(f"Contract ID:     {result['contract_id']}")
    print(f"Playbook Ver:    {result['playbook_version']}")
    print(f"Risk Assessment: {result['risk_assessment']['risk_level']} (Score: {result['risk_assessment']['risk_score']})")
    print(f"Manual Review:   {'REQUIRED' if result['requires_manual_review'] else 'NOT REQUIRED'}")
    print(f"Summary:         {result['summary'][:200]}...")
    
    print("\n[Violations Found]")
    for v in result['violations']:
        print(f"  - [{v['severity'].upper()}] {v['clause']}: {v['issue']}")
        if v.get('playbook_template'):
            print(f"    (Template Available)")
            
    print("\n[AI Risk Discovery Observations]")
    for obs in result['ai_observations']:
        print(f"  - [{obs['severity'].upper()}] {obs['risk']}: {obs['explanation']}")

    print("\n[Clause Classification (Structured)]")
    for clause, attrs in result['clause_classification'].items():
        print(f"  - {clause}: {attrs}")

    print("\n[Redlines Generated: {len(result['redlines'])}]")
    for rl in result['redlines']:
        print(f"  - Violation: {rl.get('violation')}")
        print(f"    Rationale: {rl['rationale']}")
        if rl.get('suggested_redline'):
            print(f"    Redline:   {rl['suggested_redline'][:100]}...")
        else:
            print(f"    Redline:   NO TEMPLATE FOUND (Explanation only)")
    
    print("\n" + "="*50)
    print("Verification successful.")
    
except Exception as e:
    print(f"Verification failed: {e}")
    import traceback
    traceback.print_exc()
