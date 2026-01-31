#!/usr/bin/env python3
"""
Process DNA data and generate database with t-SNE embeddings.
Based on plot_dna_dist_all.py
"""

import os
import sys
import json
import argparse
import numpy as np
from pathlib import Path
from collections import defaultdict

# Add Source Path for imports if needed, though we'll self-contain much logic
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'dna', 'src', 'summary'))

try:
    from sklearn.manifold import TSNE
except ImportError:
    print("Error: scikit-learn is required. Please install it.")
    sys.exit(1)

def load_config():
    # Load basic config from config.js (simple parsing)
    config_path = Path(__file__).parent.parent / 'config.js'
    if not config_path.exists():
        return {'dataset': 'squad_cqa_hs_wg_arc_mmlu'}
    
    with open(config_path, 'r') as f:
        content = f.read()
        # Very basic extraction of dataset value
        import re
        match = re.search(r"dataset:\s*['\"]([^'\"]+)['\"]", content)
        if match:
            return {'dataset': match.group(1)}
    return {'dataset': 'squad_cqa_hs_wg_arc_mmlu'}

def collect_signatures(dataset_dir):
    records = []
    print(f"Scanning {dataset_dir}...")
    
    # Store best signature per model
    # Key: safe_name (model_id), Value: (score, record)
    best_signature = {}
    
    for dna_path in dataset_dir.rglob("*_dna.json"):
        if dna_path.name.endswith("_DRYRUN.json"): continue
        
        try:
            with open(dna_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            sig = data.get('signature')
            if not sig or not isinstance(sig, list): continue
            
            # Determine score and model info
            # heuristic: prefer 'embed' folders if present (score 1), else 0
            is_embed = 1 if "embed" in str(dna_path).lower() else 0
            
            model_id = dna_path.stem.replace('_dna', '')
            
            # Recover proper name
            # Handle specific cases like "fine-tuned-meta-llama-meta-llama-3-8b-instruct"
            # Strategy: look for known org prefixes or split judiciously
            
            clean_id = model_id.lower()
            org = "Unknown"
            name = model_id
            
            # Heuristic: split by underscore first if available (common in this dataset)
            if '_' in model_id:
                parts = model_id.split('_')
                org = parts[0]
                name = '_'.join(parts[1:])
            else:
                # If no underscore, try to guess from hyphens if it looks like "org-model"
                # This is tricky without a list of orgs.
                # User specifically mentioned "fine-tuned-meta-llama-meta-llama-3-8b-instruct" should be "meta llama"
                # Maybe map common prefixes?
                if "meta-llama" in clean_id:
                    org = "Meta Llama"
                    # Try to strip org from name
                    name = model_id.replace("fine-tuned-", "").replace("meta-llama-", "")
                elif "qwen" in clean_id:
                    org = "Qwen"
                elif "mistral" in clean_id:
                    org = "Mistral"
                elif "01-ai" in clean_id:
                    org = "01-ai"
                elif "google" in clean_id:
                    org = "Google"
                elif "microsoft" in clean_id:
                    org = "Microsoft"
                else:
                    org = "Others" # checking later 
                    
            if org == "Unknown" or org == "Others":
                 # fall back to first part of hyphenated string if generic
                 if '-' in model_id:
                     org = model_id.split('-')[0]
            
            # Clean org name (capitalize)
            org = org.replace('-', ' ').title()
            
            # Special fixes
            if "Meta Llama" in org or "Llama" in org: org = "Meta Llama"
            if "01 Ai" in org: org = "01-ai"
            if "Qwen" in org: org = "Qwen"
            
            full_id = f"{org}/{name}"
                
            # Check for family
            family = "Unknown"
            full_id_lower = full_id.lower()
            if "llama" in full_id_lower: family = "Llama"
            elif "qwen" in full_id_lower: family = "Qwen"
            elif "mistral" in full_id_lower: family = "Mistral"
            elif "gemma" in full_id_lower: family = "Gemma"
            elif "phi" in full_id_lower: family = "Phi"
            elif "yi" in full_id_lower: family = "Yi"
            elif "falcon" in full_id_lower: family = "Falcon"
            elif "deepseek" in full_id_lower: family = "DeepSeek"
            
            record = {
                'id': full_id,
                'name': model_id,
                'organization': org,
                'family': family,
                'signature': sig,
                'parameters': extract_params(model_id),
                'isInstruct': "instruct" in full_id_lower or "chat" in full_id_lower
            }
            
            # Deduplication logic
            # If we haven't seen this model, or this one has a higher score (is_embed)
            if model_id not in best_signature or is_embed > best_signature[model_id][0]:
                best_signature[model_id] = (is_embed, record)
                
        except Exception as e:
            print(f"Error reading {dna_path}: {e}")
            continue
    
    # Extract records
    return [item[1] for item in best_signature.values()]

def extract_params(name):
    import re
    match = re.search(r'(\d+(\.\d+)?)B', name, re.IGNORECASE)
    if match:
        return match.group(1) + 'B'
    return "Unknown"

def main():
    config = load_config()
    dataset_name = config['dataset']
    
    root_dir = Path(__file__).parent.parent
    dna_out_dir = root_dir / 'dna-out' / dataset_name
    output_file = root_dir / 'public' / 'dna_database.json'
    
    if not dna_out_dir.exists():
        print(f"Dataset directory not found: {dna_out_dir}")
        sys.exit(1)
        
    records = collect_signatures(dna_out_dir)
    print(f"Found {len(records)} models")
    
    if len(records) < 2:
        print("Not enough models for t-SNE")
        sys.exit(1)
        
    # Prepare vectors
    vectors = np.array([r['signature'] for r in records])
    
    # Run t-SNE
    print("Running t-SNE...")
    perplexity = min(30, len(records) - 1)
    tsne = TSNE(n_components=2, perplexity=perplexity, random_state=42)
    embeddings = tsne.fit_transform(vectors)
    
    # Assign coordinates and clean up data for JSON
    models_out = []
    
    # Normalize coordinates to 0-100 range for simpler visualization logic (optional, but consistent)
    # Actually, keeping raw t-SNE values is fine, D3 scales them.
    
    for i, record in enumerate(records):
        record['x'] = float(embeddings[i, 0])
        record['y'] = float(embeddings[i, 1])
        # Remove signature from final JSON to save size? The user needs it for distance calculation in workbench.
        # So keep signature.
        models_out.append(record)
        
    # Organizations
    orgs = sorted(list(set(m['organization'] for m in models_out)))
    
    output = {
        'metadata': {
            'count': len(models_out),
            'dataset': dataset_name,
            'generated': True
        },
        'models': models_out
    }
    
    # Save
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
        
    print(f"Database written to {output_file}")

if __name__ == "__main__":
    main()
