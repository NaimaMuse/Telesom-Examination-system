import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import api from '../../services/api';
import './Judges.css';

const errorMessage=error=>error.response?.data?.message||error.message||'Unable to complete the request.';

function SectionIcon({type}){
  const paths={
    user:<><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M19 8v6m-3-3h6"/></>,
    clipboard:<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 9 4.5ZM8 11h8m-8 4h8m-8 4h5"/></>,
    mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    lock:<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></>,
    eye:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    file:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6m-11 5h6m-6 4h6"/></>,
    pencil:<><path d="m16 4 4 4L9 19l-5 1 1-5L16 4Z"/><path d="m14 6 4 4"/></>,
  };
  return <svg className="judges-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export default function Judges(){
  const [judges,setJudges]=useState([]);
  const [defenses,setDefenses]=useState([]);
  const [form,setForm]=useState({name:'',email:'',password:''});
  const [credentials,setCredentials]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [assigning,setAssigning]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const load=useCallback(async(signal)=>{
    setLoading(true);
    setError('');
    try{
      const [judgeResult,firstDefensePage]=await Promise.all([
        api.get('/users/judges',{signal}),
        api.get('/evaluations/defenses',{signal,params:{page:1}}),
      ]);
      if(signal?.aborted)return;
      const defenseRecords=[...(firstDefensePage.data.records||[])];
      const totalPages=Math.ceil((firstDefensePage.data.total||0)/50);
      for(let page=2;page<=totalPages;page++){
        const {data}=await api.get('/evaluations/defenses',{signal,params:{page}});
        if(signal?.aborted)return;
        defenseRecords.push(...(data.records||[]));
      }
      setJudges(judgeResult.data.judges||[]);
      setDefenses(defenseRecords);
    }catch(loadError){
      if(!signal?.aborted)setError(errorMessage(loadError));
    }finally{
      if(!signal?.aborted)setLoading(false);
    }
  },[]);

  useEffect(()=>{
    const controller=new AbortController();
    load(controller.signal);
    return()=>controller.abort();
  },[load]);

  async function createJudge(event){
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try{
      const {data}=await api.post('/users/judges',form);
      setJudges(current=>[...current,data.judge].sort((a,b)=>a.name.localeCompare(b.name)));
      setCredentials({name:data.judge.name,...data.credentials});
      setForm({name:'',email:'',password:''});
      setShowPassword(false);
      setNotice('Judge account created. Copy these credentials and send them to the judge.');
    }catch(createError){
      setError(errorMessage(createError));
    }finally{
      setSaving(false);
    }
  }

  async function assignJudge(defense,judge){
    setAssigning(defense._id);
    setError('');
    setNotice('');
    try{
      const {data}=await api.patch(`/evaluations/defenses/${defense._id}/judge`,{judge:judge||null,__v:defense.__v});
      setDefenses(current=>current.map(record=>record._id===defense._id
        ? {...record,assignedJudge:judge?judges.find(item=>item._id===judge)||null:null,__v:data.record.__v}
        :record));
      setNotice('Judge assignment saved.');
    }catch(assignError){
      setError(errorMessage(assignError));
    }finally{
      setAssigning('');
    }
  }

  async function copyCredentials(){
    try{
      await navigator.clipboard.writeText(`Name: ${credentials.name}\nEmail: ${credentials.email}\nPassword: ${credentials.temporaryPassword}`);
      setNotice('Judge credentials copied.');
    }catch{
      setError('Could not copy credentials. Select and copy them manually.');
    }
  }

  return <main className="judges-page">
    {error&&<p className="judges-message is-error" role="alert">{error}</p>}
    {notice&&<p className="judges-message" role="status">{notice}</p>}

    <section className="judges-panel">
      <header className="judges-section-heading">
        <span className="judges-section-icon"><SectionIcon type="user"/></span>
        <div><h2>Create a Judge Account</h2><p>Add a new judge by providing their details below.</p></div>
      </header>
      <form className="judges-create-form" onSubmit={createJudge}>
        <label>Judge Name<div className="judges-input-wrap"><SectionIcon type="user"/><input required minLength={2} maxLength={100}
          placeholder="Enter judge name" value={form.name}
          onChange={event=>setForm(current=>({...current,name:event.target.value}))}/></div></label>
        <label>Gmail / Email<div className="judges-input-wrap"><SectionIcon type="mail"/><input type="email" required maxLength={254}
          autoComplete="email" placeholder="Enter email address" value={form.email}
          onChange={event=>setForm(current=>({...current,email:event.target.value}))}/></div></label>
        <label>Initial Password<div className="judges-input-wrap"><SectionIcon type="lock"/><input type={showPassword?'text':'password'}
          required minLength={8} maxLength={128} autoComplete="new-password" placeholder="Enter initial password"
          value={form.password} onChange={event=>setForm(current=>({...current,password:event.target.value}))}/>
          <button className="judges-password-toggle" type="button" aria-label={showPassword?'Hide password':'Show password'}
            aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}><SectionIcon type="eye"/></button></div></label>
        <button className="judges-create-button" type="submit" disabled={saving}>
          <SectionIcon type="user"/>{saving?'Creating…':'Create Judge'}
        </button>
      </form>
      {credentials&&<div className="judges-credentials">
        <div><strong>Share these credentials with {credentials.name}</strong>
          <p>Email: <code>{credentials.email}</code></p>
          <p>Password: <code>{credentials.temporaryPassword}</code></p>
          <small>Ask the judge to sign in at /staff/login. This password is shown here to share; it is not stored in readable form.</small>
        </div>
        <button type="button" onClick={copyCredentials}>Copy credentials</button>
      </div>}
    </section>

    <section className="judges-panel">
      <header className="judges-section-heading">
        <span className="judges-section-icon"><SectionIcon type="clipboard"/></span>
        <div><h2>Assign Defense Evaluations</h2><p>Assign a judge to each project defense and track the evaluation status.</p></div>
      </header>
      {loading?<p role="status">Loading judges and defense forms…</p>:
        !defenses.length?<p>No project defense forms are available to assign.</p>:
        <div className="judges-table-scroll"><table className="judges-defense-table">
          <thead><tr><th scope="col">#</th><th scope="col">Project / Defense Title</th>
            <th scope="col">Course &amp; Cohort</th><th scope="col">Status</th>
            <th scope="col">Assigned Judge</th><th scope="col">Action</th></tr></thead>
          <tbody>{defenses.map((defense,index)=>{
          const currentId=defense.assignedJudge?._id||defense.assignedJudge||'';
          const title=defense.projectTitle||defense.groupName||defense.assessmentTitle||'Untitled defense';
          const status=defense.submittedAt?'Submitted':'Draft';
          return <tr key={defense._id}>
            <td><span className="judges-row-number">{index+1}</span></td>
            <td className="judges-project-title">{title}</td>
            <td className="judges-course-info"><span>{defense.course?.title||defense.course?.name||'Course not specified'}</span>
              <span>{[defense.groupName,defense.cohort].filter(Boolean).join(' · ')||'—'}</span></td>
            <td><span className={`judges-status-badge ${status==='Submitted'?'is-submitted':'is-draft'}`}>
              <SectionIcon type={status==='Submitted'?'file':'pencil'}/>{status}</span></td>
            <td><label className="judges-assigned-label"><span className="visually-hidden">Assigned judge for {title}</span>
              <select aria-label={`Assign judge to ${title}`}
              value={currentId} disabled={assigning===defense._id||defense.status==='finalized'}
              onChange={event=>assignJudge(defense,event.target.value)}>
              <option value="">Not assigned</option>
              {judges.filter(judge=>judge.isActive).map(judge=><option key={judge._id} value={judge._id}>{judge.name} · {judge.email}</option>)}
            </select></label></td>
            <td><Link className="judges-view-button" to={`/admin/project-defenses/${defense._id}`}>
              <SectionIcon type="eye"/>View
            </Link></td>
          </tr>;
        })}</tbody></table></div>}
    </section>

    <section className="judges-panel">
      <h2>Judge accounts <span>{judges.length}</span></h2>
      {!loading&&!judges.length?<p>No judge accounts created yet.</p>:
        <ul className="judges-account-list">{judges.map(judge=><li key={judge._id}>
          <strong>{judge.name}</strong><span>{judge.email}</span>
          <small>{judge.isActive?'Active':'Inactive'}</small>
        </li>)}</ul>}
    </section>
  </main>;
}
