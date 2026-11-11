#!/usr/bin/env python3
"""Fail-closed empirical weight-change gate. Never fits on or edits holdout data.

Input: one candidate, scores exported by the actual application engine, an
independent observed-outcome panel, preregistered split IDs, and benchmark
receipts. This is a release gate, not proof of causal suitability.
"""
from __future__ import annotations
import argparse,hashlib,json,math,random,statistics
from pathlib import Path

REQUIRED_BENCHMARKS={'engine_regression','external_benchmark','profile_plausibility','score_context_consistency','missing_data_contract'}

def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def ranks(values):
 order=sorted(range(len(values)),key=lambda i:values[i]);out=[0.0]*len(values);i=0
 while i<len(order):
  j=i+1
  while j<len(order) and values[order[j]]==values[order[i]]:j+=1
  for k in order[i:j]:out[k]=(i+j-1)/2+1
  i=j
 return out

def spearman(x,y):
 if len(x)!=len(y) or len(x)<3:return None
 a,b=ranks(x),ranks(y);ma=statistics.mean(a);mb=statistics.mean(b)
 va=sum((v-ma)**2 for v in a);vb=sum((v-mb)**2 for v in b)
 return sum((u-ma)*(v-mb) for u,v in zip(a,b))/math.sqrt(va*vb) if va and vb else None

def measure(rows):
 return {'baseline':spearman([r['baseline_score'] for r in rows],[r['observed_outcome'] for r in rows]),'candidate':spearman([r['candidate_score'] for r in rows],[r['observed_outcome'] for r in rows])}

def gate(spec, rows, benchmarks, min_test_units=30, min_test_blocks=5, bootstrap=1000):
 errors=[];weights=spec.get('candidate_weights',{});old=spec.get('baseline_weights',{})
 if set(weights)!=set(old) or not weights:errors.append('weight_dimensions_changed_or_missing')
 if not all(finite(v) and v>=0 for v in list(weights.values())+list(old.values())):errors.append('invalid_weight')
 elif abs(sum(weights.values())-sum(old.values()))>1e-8:errors.append('weight_total_changed')
 if spec.get('split_registered_before_candidate_selection') is not True:errors.append('split_not_preregistered')
 if spec.get('test_used_for_candidate_selection') is not False:errors.append('test_leakage_not_excluded')
 if spec.get('source_contract_approved') is not True:errors.append('unreviewed_outcome_definition')
 if spec.get('outcome_is_observed_moves_or_operating_activity') is not True:errors.append('popularity_or_proxy_is_not_observed_outcome')
 if not spec.get('cohort') or not spec.get('profile_id'):errors.append('missing_profile_cohort')
 if spec.get('score_export_engine_sha256')!=spec.get('tested_engine_sha256') or not spec.get('tested_engine_sha256'):errors.append('scores_not_tied_to_tested_engine')
 if spec.get('candidate_weights_sha256')!=digest(weights):errors.append('candidate_weight_hash_mismatch')
 if spec.get('panel_sha256')!=digest(rows):errors.append('frozen_panel_hash_mismatch')
 if spec.get('baseline_publication_mode')!=spec.get('candidate_publication_mode'):errors.append('weight_experiment_changes_scoring_semantics')
 checks={x.get('name'):x for x in benchmarks}
 for name in sorted(REQUIRED_BENCHMARKS):
  b=checks.get(name,{})
  if b.get('passed') is not True or b.get('candidate_weights_sha256')!=digest(weights) or b.get('engine_sha256')!=spec.get('tested_engine_sha256') or not b.get('receipt_sha256'):errors.append('benchmark_not_passed:'+name)
 parts={k:[] for k in ['train','validation','test']};seen=set()
 for r in rows:
  required=['source_geo_id','spatial_block','period_start','period_end','profile_id','cohort','split','baseline_score','candidate_score','observed_outcome','source_url','source_sha256','source_geo_level']
  if any(k not in r for k in required):errors.append('incomplete_panel_row');continue
  if r['split'] not in parts:errors.append('invalid_split');continue
  if r['profile_id']!=spec.get('profile_id') or r['cohort']!=spec.get('cohort'):errors.append('cohort_or_profile_mismatch')
  if r.get('commercial_reuse_status')!='Green':errors.append('unapproved_source_rights')
  if r.get('place_id') and r['source_geo_level']!='municipality' and r.get('allocated_from_larger_area',False):errors.append('coarse_outcome_repeated_as_local')
  key=(r['source_geo_id'],r['period_start'],r['period_end'])
  if key in seen:errors.append('duplicate_outcome_unit')
  seen.add(key)
  if not all(finite(r[k]) for k in ['baseline_score','candidate_score','observed_outcome']):errors.append('nonfinite_score_or_outcome');continue
  if not isinstance(r['period_start'],int) or not isinstance(r['period_end'],int) or r['period_start']>r['period_end']:errors.append('invalid_period');continue
  if r.get('candidate_eligible') is not True or r.get('baseline_eligible') is not True:errors.append('eligibility_sample_changed')
  parts[r['split']].append(r)
 for k,v in parts.items():
  if not v:errors.append('missing_split:'+k)
 for a,b in [('train','validation'),('train','test'),('validation','test')]:
  if parts[a] and parts[b]:
   if max(x['period_end'] for x in parts[a])>=min(x['period_start'] for x in parts[b]):errors.append('overlapping_temporal_windows:'+a+':'+b)
   if {x['spatial_block'] for x in parts[a]} & {x['spatial_block'] for x in parts[b]}:errors.append('spatial_block_leakage:'+a+':'+b)
 if len({x['source_geo_id'] for x in parts['test']})<min_test_units:errors.append('insufficient_independent_test_units')
 blocks={x['spatial_block'] for x in parts['test']}
 if len(blocks)<min_test_blocks:errors.append('insufficient_test_blocks')
 result={'schema':'profile-weight-gate-1','profile_id':spec.get('profile_id'),'promote':False,'weights_written':False,'errors':sorted(set(errors)),'counts':{k:len(v) for k,v in parts.items()},'scope':spec.get('scope'),'minimums_are_engineering_release_gates_not_statistical_guarantees':True}
 if errors:return result
 metrics={k:measure(v) for k,v in parts.items()};result['rank_correlations']=metrics
 if any(v['baseline'] is None or v['candidate'] is None for v in metrics.values()):result['errors'].append('undefined_rank_correlation');return result
 if metrics['validation']['candidate']<=metrics['validation']['baseline']:result['errors'].append('validation_not_improved')
 if metrics['test']['candidate']<=metrics['test']['baseline']:result['errors'].append('test_not_improved')
 groups={b:[r for r in parts['test'] if r['spatial_block']==b] for b in sorted(blocks)};rng=random.Random(21516);bs=[]
 for _ in range(bootstrap):
  sample=[r for b in rng.choices(list(groups),k=len(groups)) for r in groups[b]];m=measure(sample)
  if m['candidate'] is not None and m['baseline'] is not None:bs.append(m['candidate']-m['baseline'])
 if len(bs)<bootstrap*.95:result['errors'].append('unstable_block_bootstrap')
 else:
  bs.sort();ci=[bs[int(.025*(len(bs)-1))],bs[int(.975*(len(bs)-1))]];result['paired_spatial_block_bootstrap_delta_95pct']=ci
  if ci[0]<=0:result['errors'].append('improvement_not_robust_to_block_resampling')
 result['promote']=not result['errors'];return result

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--input',required=True);p.add_argument('--out',required=True);a=p.parse_args();j=json.loads(Path(a.input).read_text());result=gate(j['spec'],j['rows'],j['benchmarks']);Path(a.out).write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));return 0 if result['promote'] else 2
if __name__=='__main__':raise SystemExit(main())
