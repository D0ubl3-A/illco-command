#!/usr/bin/env python3
import argparse,json,os,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; SEED=ROOT/'data/project-g.json'
def expand(x):
 if isinstance(x,dict): return x
 i,n,p,r,a,c,g=x
 return {'projectId':i,'name':n,'businessGoal':g,'completionPercentage':p,'completionConfidence':'high' if r>=55 else 'medium','completionBasis':'Evidence-based estimate from visible planning, implementation, validation, deployment/operation, and governance evidence.','readinessScore':r,'readinessStatus':'needs_review','contributors':{'Aaron Allton':{'visibleShare':a,'work':['Visible Project G evidence attributed to Aaron Allton, including the iLL Agency account.' if a else 'No contribution visible in the supplied Project G evidence.'],'aliases':['iLL Agency']},'Cody Rose':{'visibleShare':c,'work':['Visible Project G evidence attributed to Cody Rose.' if c else 'No contribution visible in the supplied Project G evidence.'],'aliases':[]}},'criticalBlockers':['Confirmed owners, approvers, committed dates, communication cadence, and high-risk mitigation ownership require review.'],'sectionUpdates':[],'notes':[],'assistantRuns':[],'history':[]}
def load(p):
 if not p.exists(): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(SEED.read_text())
 s=json.loads(p.read_text());s['projects']=[expand(x) for x in s['projects']];return s
def save(p,s):
 s['revision']=s.get('revision',0)+1;t=p.with_suffix('.tmp');t.write_text(json.dumps(s,indent=2)+'\n');os.replace(t,p)
def proj(s,q):
 m=[x for x in s['projects'] if q in (x['projectId'],x['name']) or q.lower() in x['name'].lower()]
 if len(m)!=1: raise SystemExit(f'Project match count: {len(m)}')
 return m[0]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--state',default='project-g-state.json');sp=ap.add_subparsers(dest='cmd',required=True)
 sp.add_parser('init');sp.add_parser('dashboard');v=sp.add_parser('validate');v.add_argument('--project',required=True)
 u=sp.add_parser('update');u.add_argument('--project',required=True);u.add_argument('--section',required=True);u.add_argument('--author',required=True);u.add_argument('--text',required=True)
 n=sp.add_parser('note');n.add_argument('--project',required=True);n.add_argument('--author',required=True);n.add_argument('--recipient',required=True);n.add_argument('--text',required=True)
 pr=sp.add_parser('progress');pr.add_argument('--project',required=True);pr.add_argument('--percentage',type=int,required=True);pr.add_argument('--confidence',required=True);pr.add_argument('--basis',required=True)
 a=ap.parse_args();path=Path(a.state);s=load(path)
 if a.cmd=='init': out={'projects':len(s['projects']),'state':str(path.resolve())}
 elif a.cmd=='dashboard': out={'projects':[{'id':p['projectId'],'name':p['name'],'completion':p['completionPercentage'],'readiness':p['readinessScore']} for p in s['projects']]}
 elif a.cmd=='validate':
  ps=s['projects'] if a.project=='all' else [proj(s,a.project)];out={'kickoffReady':sum(not p['criticalBlockers'] for p in ps),'needsReview':sum(bool(p['criticalBlockers']) for p in ps)}
 elif a.cmd=='update':
  p=proj(s,a.project);p['sectionUpdates'].insert(0,{'id':f"update_{s['revision']}",'section':a.section,'author':a.author,'text':a.text});save(path,s);out=p
 elif a.cmd=='note':
  p=proj(s,a.project);p['notes'].insert(0,{'id':f"note_{s['revision']}",'author':a.author,'recipient':a.recipient,'section':'general','text':a.text,'status':'open'});save(path,s);out=p
 else:
  p=proj(s,a.project);p['completionPercentage']=a.percentage;p['completionConfidence']=a.confidence;p['completionBasis']=a.basis;save(path,s);out=p
 print(json.dumps(out,indent=2))
if __name__=='__main__': main()
