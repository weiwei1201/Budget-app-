import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "budget-tracker-v15";
const SAVINGS_ID  = "__savings__";
const PRESET_EMOJI  = ["🍜","🍱","☕","🚌","🚗","✈️","🛍️","👗","🎮","🎬","🎵","💊","🏥","💡","📱","🏠","📚","🐾","🏋️","💼","🎁","🌿","💈","🧴","🪴","🍺","🎯","🎨","🧩","💻","🛒","🌐"];
const PRESET_COLORS = ["#f97316","#8b5cf6","#ec4899","#06b6d4","#10b981","#f59e0b","#ef4444","#3b82f6","#14b8a6","#a855f7","#84cc16","#f43f5e"];

const C = {
  bg:"#f5f0e8", hdrBg:"#ede8df", card:"#ffffff", border:"#e2d9cc",
  muted:"#a89880", text:"#3d2e1e", textSub:"#7a6652",
  accent:"#c2855a", accentDk:"#a0673e", navBg:"#faf7f2",
  inputBg:"#f5f0e8", modeBg:"#f0ebe2",
};

const defaultData = {
  accounts:[{id:"cash",name:"現金",icon:"💵",balance:0,color:"#4ade80",type:"cash"}],
  transactions:[],
  expenseCategories:[
    {id:"food",name:"餐飲",icon:"🍜",color:"#f97316",builtIn:true},
    {id:"transport",name:"交通",icon:"🚌",color:"#8b5cf6",builtIn:true},
    {id:"shopping",name:"購物",icon:"🛍️",color:"#ec4899",builtIn:true},
    {id:"entertainment",name:"娛樂",icon:"🎮",color:"#06b6d4",builtIn:true},
    {id:"health",name:"醫療",icon:"💊",color:"#10b981",builtIn:true},
    {id:"utilities",name:"帳單",icon:"💡",color:"#f59e0b",builtIn:true},
    {id:"other",name:"其他",icon:"📦",color:"#94a3b8",builtIn:true},
  ],
  incomeCategories:[
    {id:"salary",name:"薪資",icon:"💼",color:"#22c55e",builtIn:true},
    {id:"bonus",name:"獎金",icon:"🎉",color:"#10b981",builtIn:true},
    {id:"gift",name:"贈與",icon:"🎁",color:"#f59e0b",builtIn:true},
    {id:"lottery",name:"中獎",icon:"🍀",color:"#06b6d4",builtIn:true},
    {id:"sale",name:"出售淨利",icon:"🏷️",color:"#8b5cf6",builtIn:true},
    {id:"sponsor",name:"贊助",icon:"🤝",color:"#ec4899",builtIn:true},
    {id:"incOther",name:"其他",icon:"📦",color:"#94a3b8",builtIn:true},
  ],
  budgets:[],
  goals:[],
  savingsName:"儲蓄帳戶",
  savingsUnallocated:0,    // money in savings not assigned to any goal
  savingsTotalAllocated:0, // money assigned to goals (sum of all goal allocations)
};

async function loadData(){
  try{const r=await window.storage.get(STORAGE_KEY);if(r?.value)return JSON.parse(r.value);}catch(_){}
  return defaultData;
}
async function saveData(d){try{await window.storage.set(STORAGE_KEY,JSON.stringify(d));}catch(_){}}

const fmt   = n=>"NT$ "+Number(n).toLocaleString("zh-TW");
const toIso = d=>d.toISOString().slice(0,10);
const nowIso= ()=>toIso(new Date());
const ymNow = ()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;};
const ymLabel=ym=>{const[y,m]=ym.split("-");return`${y} 年 ${Number(m)} 月`;};
const ymList=()=>{const l=[],now=new Date();for(let i=-60;i<=60;i++){const d=new Date(now.getFullYear(),now.getMonth()+i,1);l.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);}return l.reverse();};
const prevYm=ym=>{const[y,m]=ym.split("-").map(Number);const d=new Date(y,m-2,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;};
const yearNow=()=>String(new Date().getFullYear());
const prevYear=()=>String(new Date().getFullYear()-1);

const MODE_EXPENSE ="expense";
const MODE_INCOME  ="income";
const MODE_WITHDRAW="withdraw";
const MODE_TRANSFER="transfer";

// ── Pie Chart ─────────────────────────────────────────────────────────────────
function PieChart({data,emptyMsg}){
  const size=180,cx=90,cy=90,r=76,inner=40;
  const total=data.reduce((s,d)=>s+d.value,0);
  if(!total)return <div style={{textAlign:"center",color:C.muted,padding:"20px 0",fontSize:13}}>{emptyMsg||"本月無資料"}</div>;
  let start=-Math.PI/2;
  const slices=data.map(d=>{
    const angle=(d.value/total)*2*Math.PI,end=start+angle;
    const x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start);
    const x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end);
    const xi1=cx+inner*Math.cos(start),yi1=cy+inner*Math.sin(start);
    const xi2=cx+inner*Math.cos(end),yi2=cy+inner*Math.sin(end);
    const large=angle>Math.PI?1:0;
    const path=`M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large} 0 ${xi1},${yi1} Z`;
    const s={path,color:d.color,value:d.value,name:d.name};start=end;return s;
  });
  return(
    <div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:"block",margin:"0 auto"}}>
        {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke={C.bg} strokeWidth={1.5}/>)}
      </svg>
      <div style={{display:"flex",flexWrap:"wrap",gap:"5px 12px",marginTop:10,justifyContent:"center"}}>
        {slices.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:12}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:s.color,flexShrink:0}}/>
            <span style={{color:C.muted}}>{s.name}</span>
            <span style={{color:C.text,fontWeight:600}}>{((s.value/total)*100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const [data,setData]              =useState(null);
  const [tab,setTab]                =useState("overview");
  const [overviewSub,setOverviewSub]=useState("ledger");
  const [savingsSub,setSavingsSub]   =useState("goals"); // "goals" | "alloc"
  const [sidebarOpen,setSidebarOpen]  =useState(false);
  const [calYm,setCalYm]              =useState(ymNow());
  const [calDay,setCalDay]            =useState(null); // selected date string "YYYY-MM-DD"
  const [modal,setModal]            =useState(null);
  // curYm is now driven by the calendar page selection
  const [curYm,setCurYm]            =useState(ymNow()); // kept for budget/overview month filtering

  // tx form
  const initTx=useCallback(ym=>({
    mode:MODE_EXPENSE,amount:"",expCat:"food",incCat:"salary",account:"",toAccount:"",note:"",
    date:(()=>{const[y,m]=ym.split("-").map(Number),now=new Date();return now.getFullYear()===y&&now.getMonth()+1===m?toIso(now):`${ym}-01`;})()
  }),[]);
  const [txForm,setTxForm]          =useState(null);
  const [editTx,setEditTx]          =useState(null); // {groupId, form}

  // account forms
  const [accForm,setAccForm]        =useState({name:"",icon:"🏦",balance:"",type:"bank"});
  const [editAcc,setEditAcc]        =useState(null); // {id, form}

  // category form
  const initCatForm=()=>({name:"",icon:"",color:PRESET_COLORS[0],isIncome:false});
  const [catForm,setCatForm]        =useState(initCatForm());
  const [emojiOpen,setEmojiOpen]    =useState(false);

  // budget form
  const [budgetForm,setBudgetForm]  =useState({categoryId:"food",amount:"",period:"monthly"});
  const [editBudget,setEditBudget]  =useState(null); // {id, form}

  // category edit
  const [editCat,setEditCat]        =useState(null); // {id, isIncome, form}

  // goal forms
  const [goalForm,setGoalForm]      =useState({name:"",amount:"",defaultDeposit:"",category:"other"});
  const [editGoal,setEditGoal]      =useState(null); // {id, form}
  const [editAlloc,setEditAlloc]    =useState(null); // {groupId, lead, allocatedAmt, type}
  const [allocErrMsg,setAllocErrMsg]=useState("");
  const [depositForm,setDepositForm]=useState({fromAccount:"",totalAmount:"",useUnallocated:false,items:{}});

  // savings name edit
  const [editSavName,setEditSavName]=useState(false);
  const [savNameDraft,setSavNameDraft]=useState("");

  // kebab menu
  const [kebab,setKebab]            =useState(null); // string id
  const closeKebab=()=>setKebab(null);

  // drag goals
  const [dragging,setDragging]      =useState(null);
  const [dragOver,setDragOver]      =useState(null);

  // long press (ledger)
  const [lp,setLp]                  =useState(null);
  const lpTimer=useRef(null);
  const startLP=id=>{lpTimer.current=setTimeout(()=>setLp(id),500);};
  const cancelLP=()=>clearTimeout(lpTimer.current);
  const dismissLP=()=>setLp(null);

  useEffect(()=>{
    loadData().then(d=>{
      if(!d.expenseCategories||!Array.isArray(d.expenseCategories))d.expenseCategories=defaultData.expenseCategories;
      if(!d.incomeCategories||!Array.isArray(d.incomeCategories))d.incomeCategories=defaultData.incomeCategories;
      if(!d.accounts||!Array.isArray(d.accounts))d.accounts=defaultData.accounts;
      if(!d.transactions||!Array.isArray(d.transactions))d.transactions=[];
      if(!d.budgets||!Array.isArray(d.budgets))d.budgets=[];
      if(!d.goals||!Array.isArray(d.goals))d.goals=[];
      if(!d.savingsName)d.savingsName=defaultData.savingsName;
      if(d.savingsUnallocated===undefined||isNaN(Number(d.savingsUnallocated)))d.savingsUnallocated=0;
      if(d.savingsTotalAllocated===undefined||isNaN(Number(d.savingsTotalAllocated)))d.savingsTotalAllocated=0;
      d.transactions=d.transactions.map(t=>({...t,groupId:t.groupId||t.id}));
      setData(d);
      const f=initTx(ymNow());f.account=d.accounts[0]?.id||"";setTxForm(f);
    });
  },[initTx]);

  const update=useCallback(fn=>{setData(prev=>{const next=fn(prev);saveData(next);return next;});},[]);

  if(!data||!txForm)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,color:C.muted}}>載入中…</div>;

  // ── Derived ───────────────────────────────────────────────────────────────
  const getExpCat=id=>data.expenseCategories.find(c=>c.id===id)||{name:id,icon:"",color:"#94a3b8"};
  const getIncCat=id=>data.incomeCategories.find(c=>c.id===id)||{name:id,icon:"",color:"#94a3b8"};
  const getAcc   =id=>{
    if(id===SAVINGS_ID)return{id:SAVINGS_ID,name:data.savingsName||"儲蓄帳戶",icon:"⭐",color:"#2d7a4f",type:"savings"};
    return data.accounts.find(a=>a.id===id)||{name:id,icon:"",color:"#94a3b8"};
  };

  const bankAccs=data.accounts.filter(a=>a.type==="bank");
  const cashAccs=data.accounts.filter(a=>a.type==="cash");
  const hasBanks=bankAccs.length>0;
  const allWithSavings=[...data.accounts,{id:SAVINGS_ID,name:data.savingsName||"儲蓄帳戶",icon:"⭐",color:"#2d7a4f",type:"savings"}];

  // Usable balance: real accounts only
  const usableBalance=data.accounts.reduce((s,a)=>s+Number(a.balance),0);

  // Per-goal allocated: stored directly on each goal as goal.allocated
  // goalAllocMap is used for display (progress bars) only
  const goalAllocMap={};
  data.goals.forEach(g=>{ goalAllocMap[g.id]=Number(g.allocated)||0; });

  const savingsUnallocated=Number(data.savingsUnallocated)||0;
  const savingsTotalAllocated=Number(data.savingsTotalAllocated)||0;
  const savingsTotal=savingsUnallocated+savingsTotalAllocated;

  // current month tx
  const txMonth=data.transactions.filter(t=>t.date?.startsWith(curYm));
  const monthlyIncome =txMonth.filter(t=>t.displayType==="income").reduce((s,t)=>s+Number(t.amount),0);
  const monthlyExpense=txMonth.filter(t=>t.displayType==="expense").reduce((s,t)=>s+Number(t.amount),0);

  // sorted goals
  const sortedGoals=[
    ...data.goals.filter(g=>!g.archivedAt).sort((a,b)=>a.order-b.order),
    ...data.goals.filter(g=>!!g.archivedAt).sort((a,b)=>a.archivedAt-b.archivedAt),
  ];

  // budget stats
  function getBudgetStats(b){
    const cp=b.period==="monthly"?curYm:yearNow();
    const pp=b.period==="monthly"?prevYm(curYm):prevYear();
    const sum=pfx=>data.transactions
      .filter(t=>t.displayType==="expense"&&t.expCat===b.categoryId&&t.date?.startsWith(pfx))
      .reduce((s,t)=>s+Number(t.amount),0);
    const usedPrev=sum(pp),overPrev=Math.max(0,usedPrev-b.amount);
    const usedCurrent=sum(cp),effectiveUsed=usedCurrent+overPrev;
    const pct=b.amount>0?(effectiveUsed/b.amount)*100:0;
    return{usedCurrent,overPrev,effectiveUsed,pct};
  }

  // Ledger: real account txs + savings_deposit + goal_redeem
  // Alloc records: goal_deposit (分配), goal_deposit from unallocated, savings_deposit (存入 summary)
  function showInLedger(lead){
    if(lead.type==="goal_deposit") return false;         // pure allocation, internal
    if(lead.type==="goal_delete_refund") return false;   // internal
    // savings_deposit and goal_redeem must show in ledger regardless of displayType
    if(lead.type==="savings_deposit") return true;
    if(lead.type==="goal_redeem") return true;
    if(lead.displayType==="income_internal") return false;
    return true;
  }

  function showInAlloc(lead){
    // savings_deposit: show as deposit summary (came from real account)
    if(lead.type==="savings_deposit") return true;
    // goal_deposit from unallocated (groupId ends with _alloc)
    if(lead.type==="goal_deposit") return true;
    // goal_redeem: show in alloc too
    if(lead.type==="goal_redeem") return true;
    if(lead.type==="goal_alloc_adjust") return true;
    return false;
  }

  // ledger groups — savings_deposit and goal_redeem also shown here
  const displayGroups=(()=>{
    const seen=new Set(),groups=[];
    txMonth.forEach(tx=>{
      if(seen.has(tx.groupId))return;
      seen.add(tx.groupId);
      if(showInLedger(tx)) groups.push({groupId:tx.groupId,lead:tx});
    });
    groups.sort((a,b)=>{const d=b.lead.date?.localeCompare(a.lead.date||"");return d!==0?d:b.groupId.localeCompare(a.groupId);});
    return groups;
  })();

  // alloc record groups — goal_deposit, savings_deposit, goal_redeem
  // For savings_deposit groups: merge with their goal_deposit children for display
  const allocGroups=(()=>{
    const seen=new Set(),groups=[];
    data.transactions.forEach(tx=>{
      if(seen.has(tx.groupId))return;
      seen.add(tx.groupId);
      if(showInAlloc(tx)) groups.push({groupId:tx.groupId,lead:tx});
    });
    // For each savings_deposit lead, find all goal_deposit siblings (same parent gid without suffix)
    // Parent gid: savings_deposit groupId = gid, goal_deposit groupId = gid+"_alloc"
    // so we need to pair them
    // Build a map: deposit gid → total allocated amount
    const depositAllocTotals={};
    data.transactions.filter(t=>t.type==="goal_deposit"||t.type==="goal_deposit_ref").forEach(t=>{
      // goal_deposit groupId is like "1234567890_alloc"
      const parentGid=t.groupId.replace(/_alloc$/,"");
      depositAllocTotals[parentGid]=(depositAllocTotals[parentGid]||0)+Number(t.amount);
    });
    // For useUnallocated: groupId ends with _alloc, sum all txs in that groupId directly
    const groupSums={};
    data.transactions.filter(t=>t.type==="goal_deposit").forEach(t=>{
      groupSums[t.groupId]=(groupSums[t.groupId]||0)+Number(t.amount);
    });
    groups.forEach(g=>{
      if(g.lead.type==="goal_deposit"){
        // from-unallocated deposit: sum all goal_deposit with same groupId
        g.allocatedAmt=groupSums[g.groupId]||0;
      } else {
        // savings_deposit: use the _alloc sibling totals
        g.allocatedAmt=depositAllocTotals[g.groupId]||0;
      }
    });
    groups.sort((a,b)=>{const d=(b.lead.date||"").localeCompare(a.lead.date||"");return d!==0?d:b.groupId.localeCompare(a.groupId);});
    return groups;
  })();

  // pie data
  const pieExpData=data.expenseCategories.map(cat=>({name:cat.name,color:cat.color,
    // exclude goal_redeem (savings-only) from expense pie
    value:txMonth.filter(t=>t.displayType==="expense"&&t.expCat===cat.id&&t.type!=="goal_redeem").reduce((s,t)=>s+Number(t.amount),0)
  })).filter(d=>d.value>0);

  const pieIncData=data.incomeCategories.map(cat=>({name:cat.name,color:cat.color,
    value:txMonth.filter(t=>t.displayType==="income"&&t.incCat===cat.id).reduce((s,t)=>s+Number(t.amount),0)
  })).filter(d=>d.value>0);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function newGroupId(){return Date.now().toString();}

  function debitAccount(accounts,id,amount){
    if(id===SAVINGS_ID)return;
    const a=accounts.find(x=>x.id===id);if(a)a.balance=Number(a.balance)-amount;
  }
  function creditAccount(accounts,id,amount){
    if(id===SAVINGS_ID)return;
    const a=accounts.find(x=>x.id===id);if(a)a.balance=Number(a.balance)+amount;
  }

  // ── Transaction CRUD ───────────────────────────────────────────────────────
  function openAddTx(preExpCat){
    const f=initTx(curYm);f.account=data.accounts[0]?.id||"";
    if(preExpCat)f.expCat=preExpCat;
    setTxForm(f);setModal("add-tx");
  }

  function addTransaction(){
    const amount=Number(txForm.amount);if(!amount||isNaN(amount))return;
    const{mode,account,toAccount,expCat,incCat,note,date}=txForm;
    const gid=newGroupId();
    update(d=>{
      let txs=[...d.transactions],accs=d.accounts.map(a=>({...a}));
      let savUnalloc=Number(d.savingsUnallocated)||0;

      if(mode===MODE_EXPENSE){
        // if paying from savings, reduce savings total (unallocated first)
        if(account===SAVINGS_ID){
          savUnalloc=Math.max(0,savUnalloc-amount);
        } else {
          debitAccount(accs,account,amount);
        }
        txs.unshift({id:gid,groupId:gid,date,amount,expCat,account,note,type:"expense",displayType:"expense"});
      } else if(mode===MODE_INCOME){
        if(account===SAVINGS_ID){
          savUnalloc+=amount;
        } else {
          creditAccount(accs,account,amount);
        }
        txs.unshift({id:gid,groupId:gid,date,amount,incCat,account,note,type:"income",displayType:"income"});
      } else if(mode===MODE_WITHDRAW){
        // from any account (inc savings) → cash
        const cashId=cashAccs[0]?.id||"cash";
        if(account===SAVINGS_ID){
          savUnalloc=Math.max(0,savUnalloc-amount);
        } else {
          debitAccount(accs,account,amount);
        }
        creditAccount(accs,cashId,amount);
        txs.unshift({id:gid+"_out",groupId:gid,date,amount,expCat:"withdraw",account,note:`提領現金${note?"・"+note:""}`,type:"withdraw_out",displayType:"transfer"});
        txs.unshift({id:gid+"_in",groupId:gid,date,amount,expCat:"withdraw",account:cashId,note:`提領自 ${getAcc(account).name}${note?"・"+note:""}`,type:"withdraw_in",displayType:"income_internal"});
      } else if(mode===MODE_TRANSFER){
        if(!toAccount||toAccount===account)return d;
        if(account===SAVINGS_ID){
          savUnalloc=Math.max(0,savUnalloc-amount);
        } else {
          debitAccount(accs,account,amount);
        }
        if(toAccount===SAVINGS_ID){
          savUnalloc+=amount;
        } else {
          creditAccount(accs,toAccount,amount);
        }
        txs.unshift({id:gid+"_out",groupId:gid,date,amount,expCat:"transfer",account,note:`轉帳至 ${getAcc(toAccount).name}${note?"・"+note:""}`,type:"transfer_out",displayType:"transfer"});
        txs.unshift({id:gid+"_in",groupId:gid,date,amount,expCat:"transfer",account:toAccount,note:`轉入自 ${getAcc(account).name}${note?"・"+note:""}`,type:"transfer_in",displayType:"income_internal"});
      }
      return{...d,accounts:accs,transactions:txs,savingsUnallocated:savUnalloc};
    });
    setModal(null);
  }

  function deleteTx(groupId){
    update(d=>{
      const group=d.transactions.filter(t=>t.groupId===groupId);if(!group.length)return d;
      let accs=d.accounts.map(a=>({...a}));
      let savUnalloc=Number(d.savingsUnallocated)||0;
      group.forEach(tx=>{
        const isSav=tx.account===SAVINGS_ID;
        const isSavTo=tx.toAccount===SAVINGS_ID;
        if(["expense","withdraw_out","transfer_out"].includes(tx.type)){
          if(isSav) savUnalloc+=Number(tx.amount);
          else creditAccount(accs,tx.account,Number(tx.amount));
        } else if(["income","withdraw_in","transfer_in"].includes(tx.type)){
          if(isSav) savUnalloc=Math.max(0,savUnalloc-Number(tx.amount));
          else debitAccount(accs,tx.account,Number(tx.amount));
        }
      });
      return{...d,accounts:accs,transactions:d.transactions.filter(t=>t.groupId!==groupId),savingsUnallocated:savUnalloc};
    });
    dismissLP();
  }

  function openEditTx(groupId){
    const lead=data.transactions.find(t=>t.groupId===groupId);if(!lead)return;
    setEditTx({groupId,form:{amount:String(lead.amount),note:lead.note||"",date:lead.date||"",expCat:lead.expCat||"food",incCat:lead.incCat||"salary",type:lead.type}});
    dismissLP();setModal("edit-tx");
  }

  function submitEditTx(){
    if(!editTx)return;
    const newAmt=Number(editTx.form.amount);if(!newAmt||isNaN(newAmt))return;
    update(d=>{
      const group=d.transactions.filter(t=>t.groupId===editTx.groupId);if(!group.length)return d;
      const lead=group[0];
      const diff=newAmt-Number(lead.amount);
      let accs=d.accounts.map(a=>({...a}));
      let savUnalloc=Number(d.savingsUnallocated)||0;
      if(diff!==0){
        group.forEach(tx=>{
          const isSav=tx.account===SAVINGS_ID;
          if(["expense","withdraw_out","transfer_out"].includes(tx.type)){
            if(isSav) savUnalloc=Math.max(0,savUnalloc-diff);
            else debitAccount(accs,tx.account,diff);
          } else if(["income","withdraw_in","transfer_in"].includes(tx.type)){
            if(isSav) savUnalloc+=diff;
            else creditAccount(accs,tx.account,diff);
          }
        });
      }
      const transactions=d.transactions.map(t=>t.groupId!==editTx.groupId?t:{
        ...t,amount:newAmt,note:editTx.form.note,date:editTx.form.date,
        ...(t.type==="expense"?{expCat:editTx.form.expCat}:{}),
        ...(t.type==="income"?{incCat:editTx.form.incCat}:{}),
      });
      return{...d,accounts:accs,transactions,savingsUnallocated:savUnalloc};
    });
    setModal(null);setEditTx(null);
  }

  // ── Savings deposit ────────────────────────────────────────────────────────
  function openDeposit(){
    const items={};
    data.goals.filter(g=>!g.archivedAt).forEach(g=>{
      items[g.id]={checked:false,amount:g.defaultDeposit?String(g.defaultDeposit):""};
    });
    setDepositForm({fromAccount:data.accounts[0]?.id||"",totalAmount:"",useUnallocated:false,items});
    setModal("deposit");
  }

  function depositAllocated(){
    return Object.values(depositForm.items).reduce((s,v)=>s+(v.checked?Number(v.amount)||0:0),0);
  }

  function submitDeposit(){
    const total=Number(depositForm.totalAmount);if(!total||isNaN(total))return;
    const allocated=depositAllocated();if(allocated>total)return;
    const gid=newGroupId(),date=nowIso();

    update(d=>{
      let txs=[...d.transactions],accs=d.accounts.map(a=>({...a}));
      let savUnalloc=Number(d.savingsUnallocated)||0;
      let savAlloc=Number(d.savingsTotalAllocated)||0;
      let goals=[...d.goals.map(g=>({...g}))];

      if(depositForm.useUnallocated){
        // ── Case 2: from unallocated → allocated ──
        // savingsUnallocated -= allocated (only the actually-allocated part moves)
        // savingsTotalAllocated += allocated
        // total savings unchanged
        savUnalloc=Math.max(0,savUnalloc-allocated);
        savAlloc+=allocated;
        Object.entries(depositForm.items).forEach(([gid2,v])=>{
          const amt=Number(v.amount);if(!v.checked||!amt)return;
          const g=goals.find(x=>x.id===gid2);if(g)g.allocated=(Number(g.allocated)||0)+amt;
          txs.unshift({id:gid+gid2,groupId:gid+"_alloc",date,amount:amt,goalId:gid2,
            account:SAVINGS_ID,note:`從未分配分配至目標`,type:"goal_deposit",displayType:"income_internal"});
        });
      } else {
        // ── Case 1: from real account → savings ──
        // Real account decreases by total
        // savingsUnallocated += (total - allocated)
        // savingsTotalAllocated += allocated
        debitAccount(accs,depositForm.fromAccount,total);
        savUnalloc+=(total-allocated);
        savAlloc+=allocated;
        txs.unshift({id:gid+"_out",groupId:gid,date,amount:total,
          account:depositForm.fromAccount,note:`存入${d.savingsName||"儲蓄帳戶"}`,type:"transfer_out",displayType:"transfer"});
        txs.unshift({id:gid+"_in",groupId:gid,date,amount:total,
          account:SAVINGS_ID,note:`來自 ${(d.accounts.find(a=>a.id===depositForm.fromAccount)||{name:"帳戶"}).name}`,
          type:"savings_deposit",displayType:"income_internal"});
        Object.entries(depositForm.items).forEach(([gid2,v])=>{
          const amt=Number(v.amount);if(!v.checked||!amt)return;
          const g=goals.find(x=>x.id===gid2);if(g)g.allocated=(Number(g.allocated)||0)+amt;
          // type "goal_deposit_ref": used only for allocatedAmt calculation, NOT shown as separate alloc record
          txs.unshift({id:gid+gid2,groupId:gid+"_alloc",date,amount:amt,goalId:gid2,
            account:SAVINGS_ID,note:`分配至目標`,type:"goal_deposit_ref",displayType:"income_internal"});
        });
      }

      return{...d,accounts:accs,transactions:txs,goals,
        savingsUnallocated:savUnalloc,savingsTotalAllocated:savAlloc};
    });
    setModal(null);
  }

  // ── Archive (redeem) goal — per spec Case 3 ─────────────────────────────
  // allocated = goal.allocated (already-deposited amount)
  // targetAmt = goal.amount
  // excess    = allocated - targetAmt  (moves allocated→unallocated, total unchanged)
  // spendAmt  = targetAmt              (leaves savings entirely: -totalAllocated, -savingsTotal)
  //
  // savingsTotalAllocated -= (excess + spendAmt)  [= -= allocated, zeroing this goal]
  // savingsUnallocated    += excess               [excess comes back]
  // savingsTotal          -= spendAmt             [spendAmt leaves]
  function archiveGoal(id){
    const goal=data.goals.find(g=>g.id===id);if(!goal)return;
    const allocated=Number(goal.allocated)||0;
    const targetAmt=Number(goal.amount);
    const spendAmt=targetAmt;                        // exactly target exits savings
    const excess=Math.max(0,allocated-targetAmt);    // extra goes back to unallocated
    const gid=newGroupId(),date=nowIso();
    update(d=>{
      let txs=[...d.transactions];
      let savUnalloc=Number(d.savingsUnallocated)||0;
      let savAlloc=Number(d.savingsTotalAllocated)||0;
      // excess: allocated → unallocated (stays in savings, total unchanged)
      savUnalloc+=excess;
      savAlloc-=excess;
      // spendAmt: exits savings entirely
      savAlloc-=spendAmt;
      // record savings-internal expense
      if(spendAmt>0){
        txs.unshift({id:gid,groupId:gid,date,amount:spendAmt,account:SAVINGS_ID,goalId:id,
          note:`儲蓄目標「${goal.name}」達標支出`,
          type:"goal_redeem",displayType:"expense",expCat:goal.category||"other"});
      }
      return{...d,transactions:txs,savingsUnallocated:savUnalloc,savingsTotalAllocated:savAlloc,
        goals:d.goals.map(g=>g.id===id?{...g,archivedAt:Date.now(),allocated:0}:g)};
    });
  }

  // ── Delete goal → allocated returns to unallocated ──────────────────────
  function deleteGoal(id){
    const goal=data.goals.find(g=>g.id===id);if(!goal)return;
    const allocated=Number(goal.allocated)||0;
    update(d=>{
      const savUnalloc=(Number(d.savingsUnallocated)||0)+allocated;
      const savAlloc=Math.max(0,(Number(d.savingsTotalAllocated)||0)-allocated);
      return{...d,savingsUnallocated:savUnalloc,savingsTotalAllocated:savAlloc,
        goals:d.goals.filter(g=>g.id!==id)};
    });
    closeKebab();
  }

  // ── Add / edit goal ───────────────────────────────────────────────────────
  function addGoal(){
    if(!goalForm.name.trim()||!goalForm.amount||isNaN(goalForm.amount))return;
    const maxOrd=data.goals.reduce((m,g)=>Math.max(m,g.order||0),0);
    update(d=>({...d,goals:[...d.goals,{
      id:newGroupId(),name:goalForm.name.trim(),amount:Number(goalForm.amount),
      defaultDeposit:goalForm.defaultDeposit?Number(goalForm.defaultDeposit):null,
      category:goalForm.category||"other",order:maxOrd+1
    }]}));
    setModal(null);setGoalForm({name:"",amount:"",defaultDeposit:"",category:"other"});
  }

  function openEditGoal(g){
    setEditGoal({id:g.id,form:{name:g.name,amount:String(g.amount),defaultDeposit:g.defaultDeposit?String(g.defaultDeposit):"",category:g.category||"other",allocated:String(Number(g.allocated)||0)}});
    closeKebab();setModal("edit-goal");
  }

  function submitEditGoal(){
    if(!editGoal)return;
    const newAlloc=editGoal.form.allocated!==""?Number(editGoal.form.allocated):null;
    update(d=>{
      const g=d.goals.find(x=>x.id===editGoal.id);if(!g)return d;
      const oldAlloc=Number(g.allocated)||0;
      let savUnalloc=Number(d.savingsUnallocated)||0;
      let savAlloc=Number(d.savingsTotalAllocated)||0;
      let txs=[...d.transactions];
      let allocDiff=0;
      if(newAlloc!==null&&newAlloc!==oldAlloc){
        allocDiff=newAlloc-oldAlloc; // positive = more allocated, negative = less
        savAlloc+=allocDiff;
        savUnalloc-=allocDiff;
        if(allocDiff<0){
          // allocated decreased → excess goes to unallocated, record it
          const gid=newGroupId(),date=nowIso();
          txs.unshift({id:gid,groupId:gid,date,amount:Math.abs(allocDiff),
            account:SAVINGS_ID,goalId:editGoal.id,
            note:`目標「${editGoal.form.name||g.name}」已分配→未分配`,
            type:"goal_alloc_adjust",displayType:"income_internal"});
        }
      }
      const goals=d.goals.map(x=>x.id!==editGoal.id?x:{
        ...x,name:editGoal.form.name.trim()||x.name,
        amount:Number(editGoal.form.amount)||x.amount,
        defaultDeposit:editGoal.form.defaultDeposit?Number(editGoal.form.defaultDeposit):null,
        category:editGoal.form.category||x.category,
        ...(newAlloc!==null?{allocated:newAlloc}:{})
      });
      return{...d,goals,transactions:txs,savingsUnallocated:Math.max(0,savUnalloc),savingsTotalAllocated:Math.max(0,savAlloc)};
    });
    setModal(null);setEditGoal(null);
  }

  // ── Edit / Delete alloc records ──────────────────────────────────────────
  function openEditAlloc(groupId,lead,allocatedAmt){
    // Check if any goal in this group is archived
    const goalId=lead.goalId;
    if(goalId){
      const g=data.goals.find(x=>x.id===goalId);
      if(g&&g.archivedAt){
        setAllocErrMsg(`目標項目「${g.name}」已購買/刪除，無法更改其分配紀錄`);
        setModal("alloc-err");
        return;
      }
    }
    setEditAlloc({groupId,lead,allocatedAmt,origAmt:lead.amount});
    setModal("edit-alloc");
  }

  function submitEditAlloc(){
    if(!editAlloc)return;
    const newAmt=Number(editAlloc.newAmt);
    if(!newAmt||isNaN(newAmt))return;
    const diff=newAmt-editAlloc.origAmt; // positive=more, negative=less
    const lead=editAlloc.lead;
    update(d=>{
      let txs=d.transactions.map(t=>{
        if(t.groupId!==editAlloc.groupId) return t;
        return {...t,amount:newAmt};
      });
      let savUnalloc=Number(d.savingsUnallocated)||0;
      let savAlloc=Number(d.savingsTotalAllocated)||0;
      let goals=[...d.goals.map(g=>({...g}))];
      if(lead.type==="savings_deposit"){
        // deposit from real account: adjust real account balance and savings
        const accs=d.accounts.map(a=>{
          if(a.id!==lead.account) return a;
          return {...a,balance:Number(a.balance)-diff};
        });
        savUnalloc+=diff; // net unallocated changes by diff
        return{...d,accounts:accs,transactions:txs,savingsUnallocated:Math.max(0,savUnalloc),savingsTotalAllocated:savAlloc};
      } else if(lead.type==="goal_deposit"){
        // from-unallocated allocation: adjust unalloc/alloc
        savUnalloc-=diff;
        savAlloc+=diff;
        if(lead.goalId){
          goals=goals.map(g=>g.id!==lead.goalId?g:{...g,allocated:Math.max(0,(Number(g.allocated)||0)+diff)});
        }
        return{...d,goals,transactions:txs,savingsUnallocated:Math.max(0,savUnalloc),savingsTotalAllocated:Math.max(0,savAlloc)};
      }
      return{...d,transactions:txs};
    });
    setModal(null);setEditAlloc(null);
  }

  function deleteAllocGroup(groupId,lead){
    const goalId=lead.goalId;
    if(goalId){
      const g=data.goals.find(x=>x.id===goalId);
      if(g&&g.archivedAt){
        setAllocErrMsg(`目標項目「${g.name}」已購買/刪除，無法刪除其分配紀錄`);
        setModal("alloc-err");
        return;
      }
    }
    const amt=lead.amount;
    update(d=>{
      let txs=d.transactions.filter(t=>t.groupId!==groupId);
      let savUnalloc=Number(d.savingsUnallocated)||0;
      let savAlloc=Number(d.savingsTotalAllocated)||0;
      let goals=[...d.goals.map(g=>({...g}))];
      if(lead.type==="savings_deposit"){
        const accs=d.accounts.map(a=>a.id!==lead.account?a:{...a,balance:Number(a.balance)+amt});
        savUnalloc=Math.max(0,savUnalloc-amt);
        return{...d,accounts:accs,transactions:txs,savingsUnallocated:savUnalloc,savingsTotalAllocated:savAlloc};
      } else if(lead.type==="goal_deposit"){
        savUnalloc+=amt;
        savAlloc=Math.max(0,savAlloc-amt);
        if(lead.goalId) goals=goals.map(g=>g.id!==lead.goalId?g:{...g,allocated:Math.max(0,(Number(g.allocated)||0)-amt)});
        return{...d,goals,transactions:txs,savingsUnallocated:savUnalloc,savingsTotalAllocated:savAlloc};
      } else if(lead.type==="goal_redeem"){
        // un-archive goal and restore alloc
        savAlloc+=amt;
        goals=goals.map(g=>g.id!==lead.goalId?g:{...g,allocated:(Number(g.allocated)||0)+amt,archivedAt:undefined});
        return{...d,goals,transactions:txs,savingsUnallocated:savUnalloc,savingsTotalAllocated:savAlloc};
      }
      return{...d,transactions:txs};
    });
  }

  // ── Drag goals ────────────────────────────────────────────────────────────
  function handleDragEnd(){
    if(dragging!==null&&dragOver!==null&&dragging!==dragOver){
      update(d=>{
        const pending=d.goals.filter(g=>!g.archivedAt).sort((a,b)=>a.order-b.order);
        const done=d.goals.filter(g=>!!g.archivedAt);
        const di=pending.findIndex(g=>g.id===dragging),oi=pending.findIndex(g=>g.id===dragOver);
        if(di<0||oi<0)return d;
        const re=[...pending];const[item]=re.splice(di,1);re.splice(oi,0,item);
        return{...d,goals:[...re.map((g,i)=>({...g,order:i})),...done]};
      });
    }
    setDragging(null);setDragOver(null);
  }

  // ── Account CRUD ──────────────────────────────────────────────────────────
  function addAccount(){
    if(!accForm.name)return;
    const color=accForm.type==="cash"?"#4ade80":"#60a5fa";
    update(d=>({...d,accounts:[...d.accounts,{id:newGroupId(),...accForm,balance:Number(accForm.balance||0),color}]}));
    setModal(null);setAccForm({name:"",icon:"🏦",balance:"",type:"bank"});
  }

  function openEditAcc(acc){
    setEditAcc({id:acc.id,form:{name:acc.name,icon:acc.icon||"",balance:String(acc.balance)}});
    closeKebab();setModal("edit-account");
  }

  function submitEditAcc(){
    if(!editAcc)return;
    const newBal=Number(editAcc.form.balance);if(isNaN(newBal))return;
    update(d=>{
      const acc=d.accounts.find(a=>a.id===editAcc.id);if(!acc)return d;
      const diff=newBal-Number(acc.balance);
      const accs=d.accounts.map(a=>a.id!==editAcc.id?a:{...a,name:editAcc.form.name||a.name,icon:editAcc.form.icon||a.icon,balance:newBal});
      let txs=[...d.transactions];
      if(diff!==0){
        const gid=newGroupId(),date=nowIso();
        const note=diff>0?`備抵盈餘（${editAcc.form.name||acc.name} 調帳）`:`備抵損失（${editAcc.form.name||acc.name} 調帳）`;
        txs.unshift({id:gid,groupId:gid,date,amount:Math.abs(diff),account:editAcc.id,
          note,type:diff>0?"income":"expense",displayType:diff>0?"income":"expense",
          incCat:"incOther",expCat:"other"});
      }
      return{...d,accounts:accs,transactions:txs};
    });
    setModal(null);setEditAcc(null);
  }

  // ── Budget CRUD ───────────────────────────────────────────────────────────
  function addBudget(){
    if(!budgetForm.amount||isNaN(budgetForm.amount))return;
    update(d=>{
      const ex=d.budgets.find(b=>b.categoryId===budgetForm.categoryId&&b.period===budgetForm.period);
      const budgets=ex
        ?d.budgets.map(b=>b.categoryId===budgetForm.categoryId&&b.period===budgetForm.period?{...b,amount:Number(budgetForm.amount)}:b)
        :[...d.budgets,{id:newGroupId(),...budgetForm,amount:Number(budgetForm.amount)}];
      return{...d,budgets};
    });
    setModal(null);
  }

  // ── Category CRUD ─────────────────────────────────────────────────────────
  function addCategory(){
    if(!catForm.name.trim())return;
    const cat={id:newGroupId(),name:catForm.name.trim(),icon:catForm.icon,color:catForm.color,builtIn:false};
    update(d=>catForm.isIncome?{...d,incomeCategories:[...d.incomeCategories,cat]}:{...d,expenseCategories:[...d.expenseCategories,cat]});
    setModal(null);setCatForm(initCatForm());setEmojiOpen(false);
  }

  function openEditBudget(b){
    setEditBudget({id:b.id,form:{amount:String(b.amount),period:b.period,categoryId:b.categoryId}});
    closeKebab(); setModal("edit-budget");
  }

  function submitEditBudget(){
    if(!editBudget)return;
    const amt=Number(editBudget.form.amount); if(!amt||isNaN(amt))return;
    update(d=>({...d,budgets:d.budgets.map(b=>b.id!==editBudget.id?b:{...b,amount:amt,period:editBudget.form.period})}));
    setModal(null); setEditBudget(null);
  }

  function openEditCat(cat, isIncome){
    setEditCat({id:cat.id,isIncome,form:{name:cat.name,icon:cat.icon||"",color:cat.color}});
    closeKebab(); setModal("edit-cat");
  }

  function submitEditCat(){
    if(!editCat)return;
    const upd=c=>c.id!==editCat.id?c:{...c,name:editCat.form.name||c.name,icon:editCat.form.icon,color:editCat.form.color};
    update(d=>editCat.isIncome
      ?{...d,incomeCategories:d.incomeCategories.map(upd)}
      :{...d,expenseCategories:d.expenseCategories.map(upd)});
    setModal(null); setEditCat(null);
  }

  function switchMode(m){
    const db=bankAccs[0]?.id||"",da=data.accounts[0]?.id||"";
    setTxForm(f=>({...f,mode:m,
      account:(m===MODE_WITHDRAW||m===MODE_TRANSFER)?db:da,
      toAccount:m===MODE_TRANSFER?(bankAccs[1]?.id||SAVINGS_ID):""
    }));
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const S={
    app:    {minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Noto Sans TC','Microsoft JhengHei',sans-serif"},
    hdr:    {background:C.hdrBg,borderBottom:`1px solid ${C.border}`,padding:"16px 20px 8px"},
    row:    {display:"flex",alignItems:"center",gap:10,marginBottom:10},
    title:  {fontSize:20,fontWeight:700,color:C.text,margin:0,flex:1},
    ymSel:  {background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.text,fontSize:13,cursor:"pointer"},
    balCard:{background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,borderRadius:16,padding:"14px 18px",marginBottom:10,boxShadow:"0 4px 16px rgba(194,133,90,.22)"},
    balLbl: {fontSize:11,color:"rgba(255,255,255,.75)",marginBottom:1},
    balAmt: {fontSize:26,fontWeight:800,color:"#fff",letterSpacing:-1},
    balSub: {fontSize:11,color:"rgba(255,255,255,.6)",marginTop:2},
    row2:   {display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:2},
    mini:   {background:C.card,borderRadius:12,padding:"9px 13px",border:`1px solid ${C.border}`},
    miniLbl:{fontSize:11,color:C.muted,marginBottom:2},
    miniAmt:{fontSize:15,fontWeight:700},
    sec:    {padding:"12px 18px"},
    secTtl: {fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:9},
    card:   {background:C.card,borderRadius:14,padding:"12px 14px",marginBottom:7,display:"flex",alignItems:"center",gap:10,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(61,46,30,.05)",position:"relative"},
    icon:   (c,sz=36)=>({width:sz,height:sz,borderRadius:sz*.3,background:c+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*.44,flexShrink:0}),
    iconT:  (c,sz=36)=>({width:sz,height:sz,borderRadius:sz*.3,background:c+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*.32,flexShrink:0,fontWeight:700,color:c}),
    fab:    {position:"fixed",bottom:90,right:20,width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,border:"none",color:"#fff",fontSize:24,cursor:"pointer",boxShadow:"0 4px 18px rgba(194,133,90,.42)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:101},
    nav:    {position:"fixed",bottom:0,left:0,right:0,background:C.navBg,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:99},
    navBtn: a=>({flex:1,padding:"8px 0 12px",border:"none",background:"transparent",cursor:"pointer",fontSize:18,color:a?C.accent:C.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:1}),
    navLbl: {fontSize:9,fontWeight:600},
    overlay:{position:"fixed",inset:0,background:"rgba(61,46,30,.6)",zIndex:200,display:"flex",alignItems:"flex-end"},
    sheet:  {background:C.navBg,borderRadius:"20px 20px 0 0",width:"100%",padding:"22px 20px 40px",maxHeight:"92vh",overflowY:"auto"},
    shTtl:  {fontSize:17,fontWeight:700,marginBottom:16,color:C.text},
    input:  {width:"100%",background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 13px",color:C.text,fontSize:15,boxSizing:"border-box",marginBottom:10,outline:"none"},
    sel:    {width:"100%",background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 13px",color:C.text,fontSize:15,boxSizing:"border-box",marginBottom:10},
    lbl:    {fontSize:12,color:C.muted,marginBottom:4,display:"block"},
    btnRow: {display:"flex",gap:9,marginTop:8},
    btnP:   {flex:1,padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"},
    btnS:   {flex:1,padding:"12px",borderRadius:12,border:`1px solid ${C.border}`,background:"transparent",color:C.textSub,fontSize:15,cursor:"pointer"},
    modeRow:{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"},
    modeBtn:(a,col)=>({flex:"1 1 40%",padding:"7px 4px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:600,fontSize:13,background:a?col:C.modeBg,color:a?"#fff":C.muted}),
    pBar:   {height:6,background:C.border,borderRadius:99,overflow:"hidden",margin:"4px 0 2px",position:"relative"},
    pFill:  (p,col)=>({position:"absolute",left:0,top:0,height:"100%",width:Math.min(p,100)+"%",background:p>=100?"#22c55e":p>70?"#f59e0b":col,borderRadius:99,transition:"width .5s"}),
    addBtn: {background:C.accent,border:"none",color:"#fff",borderRadius:8,padding:"5px 11px",fontWeight:600,cursor:"pointer",fontSize:12},
    txRow:  {display:"flex",alignItems:"center",gap:8,background:C.card,borderRadius:11,padding:"10px 13px",marginBottom:6,border:`1px solid ${C.border}`,position:"relative"},
    hint:   {background:C.inputBg,borderRadius:9,padding:"8px 12px",marginBottom:10,fontSize:13,color:C.muted,border:`1px solid ${C.border}`},
    subTab: a=>({flex:1,padding:"6px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:a?C.accent:"transparent",color:a?"#fff":C.muted}),
    colorDot:(col,sel)=>({width:22,height:22,borderRadius:"50%",background:col,cursor:"pointer",border:sel?`3px solid ${C.accentDk}`:"3px solid transparent",boxSizing:"border-box"}),
    emojiGrid:{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10,background:C.inputBg,borderRadius:9,padding:8,border:`1px solid ${C.border}`},
    emojiBtn: sel=>({width:32,height:32,borderRadius:6,border:"none",fontSize:16,cursor:"pointer",background:sel?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}),
    check:  chk=>({width:22,height:22,borderRadius:7,border:chk?"none":`2px solid ${C.border}`,background:chk?"#22c55e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}),
    kebabBtn:{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.muted,padding:"2px 4px",lineHeight:1,flexShrink:0},
    kebabMenu:{position:"absolute",right:8,top:44,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 4px 18px rgba(61,46,30,.15)",zIndex:50,minWidth:120,overflow:"hidden"},
    kebabItem:(danger)=>({display:"block",width:"100%",padding:"11px 16px",border:"none",background:"none",textAlign:"left",color:danger?"#c0392b":C.text,fontSize:14,cursor:"pointer",fontWeight:600}),
    revealRow:{display:"flex",gap:5,marginLeft:"auto"},
    revealBtn:(danger)=>({background:danger?"#c0392b":C.accent,color:"#fff",border:"none",borderRadius:8,padding:"4px 10px",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}),
  };

  function CatIcon({cat,sz=36}){
    if(cat?.icon)return <div style={S.icon(cat.color,sz)}>{cat.icon}</div>;
    return <div style={S.iconT(cat?.color||"#94a3b8",sz)}>{(cat?.name||"?").slice(0,2)}</div>;
  }

  // Kebab for generic cards
  function Kebab({id,onEdit,onDelete,topOffset=44}){
    const open=kebab===id;
    return(
      <>
        <button style={S.kebabBtn} onClick={e=>{e.stopPropagation();setKebab(open?null:id);}}>⋯</button>
        {open&&(
          <div onClick={e=>e.stopPropagation()} style={{...S.kebabMenu,top:topOffset}}>
            {onEdit&&<button style={S.kebabItem(false)} onClick={()=>{onEdit();closeKebab();}}>✏️ 修改</button>}
            {onDelete&&<button style={{...S.kebabItem(true),borderTop:`1px solid ${C.border}`}} onClick={()=>{onDelete();closeKebab();}}>🗑 刪除</button>}
          </div>
        )}
      </>
    );
  }

  const navTabs=[
    {id:"overview", lbl:"總覽", icon:"📊"},
    {id:"calendar", lbl:"月曆", icon:"📅"},
    {id:"budget",   lbl:"預算", icon:"🎯"},
    {id:"goals",    lbl:"儲蓄", icon:"⭐"},
    {id:"cats",     lbl:"類別", icon:"🏷️"},
    {id:"accounts", lbl:"帳戶", icon:"💳"},
  ];
  const modeOptions=[
    {id:MODE_EXPENSE, label:"支出",   color:"#ef4444"},
    {id:MODE_INCOME,  label:"收入",   color:"#22c55e"},
    ...(hasBanks||true?[
      {id:MODE_WITHDRAW,label:"💵 提款",color:"#f59e0b"},
      {id:MODE_TRANSFER,label:"↔ 轉帳",color:"#60a5fa"},
    ]:[]),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return(
    <div style={S.app} onClick={()=>{closeKebab();}}>
      {/* Header — compact */}
      <div style={{background:C.hdrBg,borderBottom:`1px solid ${C.border}`,padding:"8px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,cursor:"default"}}>
          <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:C.text,padding:"0 4px",lineHeight:1,flexShrink:0}}>☰</button>
          <span style={{fontSize:15,fontWeight:700,color:C.text,flex:1}}>💰 我的帳本</span>
          <select style={{...S.ymSel,padding:"4px 8px",fontSize:12}} value={curYm} onChange={e=>{setCurYm(e.target.value);}}>
            {ymList().map(ym=><option key={ym} value={ym}>{ymLabel(ym)}</option>)}
          </select>

        </div>
        <div style={{display:"flex",gap:6,alignItems:"stretch"}}>
          <div style={{flex:2,background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,borderRadius:10,padding:"7px 11px",boxShadow:"0 2px 8px rgba(194,133,90,.2)",display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.75)"}}>可使用資產</div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",letterSpacing:-0.5}}>{fmt(usableBalance)}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.6)"}}>儲蓄 {fmt(savingsTotal)}</div>
            </div>
            <button onClick={()=>openAddTx()}
              style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,.25)",
                border:"2px solid rgba(255,255,255,.6)",color:"#fff",fontSize:22,fontWeight:300,
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,lineHeight:1,backdropFilter:"blur(4px)"}}>
              ＋
            </button>
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
            <div style={{background:C.card,borderRadius:8,padding:"5px 9px",border:`1px solid ${C.border}`,flex:1}}>
              <div style={{fontSize:10,color:C.muted}}>本月收入</div>
              <div style={{fontSize:13,fontWeight:700,color:"#2d7a4f"}}>{fmt(monthlyIncome)}</div>
            </div>
            <div style={{background:C.card,borderRadius:8,padding:"5px 9px",border:`1px solid ${C.border}`,flex:1}}>
              <div style={{fontSize:10,color:C.muted}}>本月支出</div>
              <div style={{fontSize:13,fontWeight:700,color:"#c0392b"}}>{fmt(monthlyExpense)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Overview ── */}
      {tab==="overview"&&(
        <div style={S.sec}>
          <div style={{display:"flex",gap:5,background:C.card,borderRadius:10,padding:3,marginBottom:12,border:`1px solid ${C.border}`}}>
            <button style={S.subTab(overviewSub==="ledger")} onClick={()=>setOverviewSub("ledger")}>📋 流水帳</button>
            <button style={S.subTab(overviewSub==="pie")}    onClick={()=>setOverviewSub("pie")}>🥧 分析</button>
          </div>

          {overviewSub==="ledger"&&(
            <>
              {displayGroups.length===0&&<div style={{textAlign:"center",color:C.muted,padding:"28px 0"}}>本月尚無記錄</div>}
              {displayGroups.map(({groupId,lead})=>{
                const isSavDeposit=lead.type==="savings_deposit";
                const isRedeem=lead.type==="goal_redeem";
                const isOut=["withdraw_out","transfer_out"].includes(lead.type);
                const isIn =["withdraw_in","transfer_in"].includes(lead.type);
                // For savings_deposit: find the _out sibling to get the real from-account
                const savDepOutTx=isSavDeposit
                  ?data.transactions.find(t=>t.groupId===groupId&&t.type==="transfer_out")
                  :null;
                const fromAccId=savDepOutTx?savDepOutTx.account:lead.account;
                const acc=getAcc(fromAccId);
                // category display
                const cat=isRedeem?getExpCat(lead.expCat)
                  :lead.displayType==="income"?getIncCat(lead.incCat)
                  :getExpCat(lead.expCat);
                const iconEl=isSavDeposit?"⭐":isRedeem?(cat?.icon||"⭐"):isOut||isIn?"↔️":lead.displayType==="income"?"💰":(cat?.icon||null);
                const iconColor=isSavDeposit?"#2d7a4f":isRedeem?cat?.color||"#c0392b":isOut?"#f59e0b":isIn?"#2d7a4f":cat?.color||C.muted;
                // savings deposit: black no-sign; goal_redeem: red −; others: normal
                const amtColor=isSavDeposit?C.text:isOut||lead.displayType==="expense"?"#c0392b":"#2d7a4f";
                const amtSign =isSavDeposit?"":isOut||lead.displayType==="expense"?"−":"+";
                const isLP=lp===groupId;
                return(
                  <div key={groupId} style={{...S.txRow,background:isLP?"#fce8e0":undefined}}
                    onMouseDown={()=>startLP(groupId)} onMouseUp={cancelLP} onMouseLeave={cancelLP}
                    onTouchStart={()=>startLP(groupId)} onTouchEnd={cancelLP}>
                    {iconEl?<div style={S.icon(iconColor)}>{iconEl}</div>:<div style={S.iconT(iconColor)}>{(cat?.name||"?").slice(0,2)}</div>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {isSavDeposit?"儲蓄":lead.note||cat?.name}
                      </div>
                      <div style={{fontSize:11,color:C.muted}}>{lead.date} · {acc.icon} {acc.name}</div>
                    </div>
                    <div style={{fontWeight:700,color:amtColor,fontSize:14,flexShrink:0,marginRight:isLP?6:0}}>{amtSign}{fmt(lead.amount)}</div>
                    {isLP&&(
                      <div style={S.revealRow}>
                        <button style={S.revealBtn(false)} onClick={e=>{e.stopPropagation();openEditTx(groupId);}}>修改</button>
                        <button style={S.revealBtn(true)}  onClick={e=>{e.stopPropagation();deleteTx(groupId);}}>刪除</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {displayGroups.length>0&&<div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:4}}>長按可修改或刪除</div>}
            </>
          )}

          {overviewSub==="pie"&&(
            <>
              <div style={{...S.card,flexDirection:"column",alignItems:"stretch",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontWeight:700,fontSize:13}}>收入分析</span>
                  <span style={{fontWeight:700,fontSize:13,color:"#2d7a4f"}}>{fmt(monthlyIncome)}</span>
                </div>
                <PieChart data={pieIncData} emptyMsg="本月無收入資料"/>
                {pieIncData.length>0&&(
                  <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                    {[...pieIncData].sort((a,b)=>b.value-a.value).map((d,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}44`}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:9,height:9,borderRadius:"50%",background:d.color}}/><span style={{fontSize:13}}>{d.name}</span></div>
                        <div style={{display:"flex",gap:8}}><span style={{fontSize:11,color:C.muted}}>{monthlyIncome>0?((d.value/monthlyIncome)*100).toFixed(0):0}%</span><span style={{fontSize:13,fontWeight:700,color:"#2d7a4f",minWidth:80,textAlign:"right"}}>{fmt(d.value)}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{...S.card,flexDirection:"column",alignItems:"stretch"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontWeight:700,fontSize:13}}>支出分析</span>
                  <span style={{fontWeight:700,fontSize:13,color:"#c0392b"}}>{fmt(monthlyExpense)}</span>
                </div>
                <PieChart data={pieExpData} emptyMsg="本月無支出資料"/>
                {pieExpData.length>0&&(
                  <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                    {[...pieExpData].sort((a,b)=>b.value-a.value).map((d,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}44`}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:9,height:9,borderRadius:"50%",background:d.color}}/><span style={{fontSize:13}}>{d.name}</span></div>
                        <div style={{display:"flex",gap:8}}><span style={{fontSize:11,color:C.muted}}>{monthlyExpense>0?((d.value/monthlyExpense)*100).toFixed(0):0}%</span><span style={{fontSize:13,fontWeight:700,color:"#c0392b",minWidth:80,textAlign:"right"}}>{fmt(d.value)}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Calendar ── */}
      {tab==="calendar"&&(()=>{
        const [cy,cm]=calYm.split("-").map(Number);
        const firstDay=new Date(cy,cm-1,1).getDay(); // 0=Sun
        const daysInMonth=new Date(cy,cm,0).getDate();
        const prevYmStr=prevYm(calYm);
        const nextYmStr=(()=>{const d=new Date(cy,cm,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;})();
        // Build day dot map
        const dayMap={}; // "YYYY-MM-DD" -> {inc, exp}
        data.transactions.forEach(t=>{
          if(!t.date||!t.date.startsWith(calYm)) return;
          if(!dayMap[t.date]) dayMap[t.date]={inc:0,exp:0};
          if(t.displayType==="income") dayMap[t.date].inc+=Number(t.amount);
          else if(t.displayType==="expense"&&t.type!=="goal_redeem") dayMap[t.date].exp+=Number(t.amount);
          else if(t.type==="goal_redeem") dayMap[t.date].exp+=Number(t.amount);
          else if(t.type==="savings_deposit") { /* no usable asset effect, no dot */ }
        });
        // Month totals
        const monthTxs=data.transactions.filter(t=>t.date&&t.date.startsWith(calYm));
        const mInc=monthTxs.filter(t=>t.displayType==="income").reduce((s,t)=>s+Number(t.amount),0);
        const mExp=monthTxs.filter(t=>t.displayType==="expense"||t.type==="goal_redeem").reduce((s,t)=>s+Number(t.amount),0);
        const mSav=monthTxs.filter(t=>t.type==="savings_deposit").reduce((s,t)=>s+Number(t.amount),0);
        // Pie for this month
        const calPieExp=data.expenseCategories.map(cat=>({name:cat.name,color:cat.color,
          value:monthTxs.filter(t=>t.displayType==="expense"&&t.expCat===cat.id).reduce((s,t)=>s+Number(t.amount),0)
        })).filter(d=>d.value>0);
        const calPieInc=data.incomeCategories.map(cat=>({name:cat.name,color:cat.color,
          value:monthTxs.filter(t=>t.displayType==="income"&&t.incCat===cat.id).reduce((s,t)=>s+Number(t.amount),0)
        })).filter(d=>d.value>0);
        // Selected day transactions
        const dayTxs=calDay?data.transactions.filter(t=>t.date===calDay):[];
        const dayGroups=(()=>{const seen=new Set(),g=[];dayTxs.forEach(t=>{if(seen.has(t.groupId))return;seen.add(t.groupId);g.push({groupId:t.groupId,lead:t});});return g;})();
        const WEEKDAYS=["日","一","二","三","四","五","六"];
        const today=toIso(new Date());
        return(
          <div style={{paddingBottom:20}}>
            {/* Month navigator */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 8px"}}>
              <button onClick={()=>{setCalYm(prevYmStr);setCalDay(null);setCurYm(prevYmStr);}}
                style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.accent,padding:"4px 8px"}}>‹</button>
              <span style={{fontSize:16,fontWeight:700,color:C.text}}>{ymLabel(calYm)}</span>
              <button onClick={()=>{setCalYm(nextYmStr);setCalDay(null);setCurYm(nextYmStr);}}
                style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.accent,padding:"4px 8px"}}>›</button>
            </div>
            {/* Calendar grid */}
            <div style={{padding:"0 12px"}}>
              {/* Weekday headers */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
                {WEEKDAYS.map((d,i)=>(
                  <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,
                    color:i===0?"#e05050":i===6?"#5080e0":C.muted,padding:"4px 0"}}>{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const d=i+1;
                  const dateStr=`${calYm}-${String(d).padStart(2,"0")}`;
                  const info=dayMap[dateStr];
                  const isToday=dateStr===today;
                  const isSel=dateStr===calDay;
                  const dot=info?(info.inc-info.exp>0?"#2d7a4f":info.inc-info.exp<0?"#c0392b":"#a89880"):null;
                  const dow=(firstDay+i)%7;
                  return(
                    <div key={d} onClick={()=>setCalDay(isSel?null:dateStr)}
                      style={{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",
                        justifyContent:"center",borderRadius:8,cursor:"pointer",
                        background:isSel?C.accent:isToday?C.accent+"18":"transparent",
                        border:isToday&&!isSel?`1px solid ${C.accent}`:"1px solid transparent",
                        transition:"background .1s"}}>
                      <span style={{fontSize:13,fontWeight:isToday||isSel?700:400,
                        color:isSel?"#fff":dow===0?"#e05050":dow===6?"#5080e0":C.text}}>{d}</span>
                      {dot&&<div style={{width:5,height:5,borderRadius:"50%",background:isSel?"rgba(255,255,255,.8)":dot,marginTop:1}}/>}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Selected day panel */}
            {calDay&&(
              <div style={{margin:"10px 12px 0",background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                <div style={{padding:"10px 14px 8px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:700,fontSize:13,color:C.text}}>{calDay.slice(5).replace("-","月")}日</span>
                  <button onClick={()=>setCalDay(null)} style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>✕</button>
                </div>
                {dayGroups.length===0
                  ?<div style={{padding:"16px",textAlign:"center",color:C.muted,fontSize:13}}>當日無收支紀錄</div>
                  :dayGroups.map(({groupId,lead})=>{
                    const isOut=["withdraw_out","transfer_out"].includes(lead.type);
                    const isIn=["withdraw_in","transfer_in"].includes(lead.type);
                    const isSavDep=lead.type==="savings_deposit";
                    const isRedeem=lead.type==="goal_redeem";
                    const acc=getAcc(isSavDep?(data.transactions.find(t=>t.groupId===groupId&&t.type==="transfer_out")?.account||lead.account):lead.account);
                    const cat=lead.displayType==="income"?getIncCat(lead.incCat):getExpCat(lead.expCat);
                    const iconEl=isSavDep?"⭐":isRedeem?(cat?.icon||"✅"):isOut||isIn?"↔️":lead.displayType==="income"?"💰":(cat?.icon||null);
                    const iconColor=isSavDep?"#2d7a4f":isRedeem?cat?.color||"#c0392b":isOut?"#f59e0b":isIn?"#2d7a4f":cat?.color||C.muted;
                    const amtColor=isSavDep?C.text:isOut||lead.displayType==="expense"?"#c0392b":"#2d7a4f";
                    const amtSign=isSavDep?"":isOut||lead.displayType==="expense"?"−":"+";
                    return(
                      <div key={groupId}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",
                          borderBottom:`1px solid ${C.border}44`,position:"relative",
                          background:lp===groupId?"#fce8e0":undefined,transition:"background .1s"}}
                        onMouseDown={()=>startLP(groupId)} onMouseUp={cancelLP} onMouseLeave={cancelLP}
                        onTouchStart={()=>startLP(groupId)} onTouchEnd={cancelLP}>
                        {iconEl?<div style={S.icon(iconColor,32)}>{iconEl}</div>:<div style={S.iconT(iconColor,32)}>{(cat?.name||"?").slice(0,2)}</div>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{isSavDep?"儲蓄":lead.note||cat?.name}</div>
                          <div style={{fontSize:11,color:C.muted}}>{acc.icon} {acc.name}</div>
                        </div>
                        <div style={{fontWeight:700,color:amtColor,fontSize:13,flexShrink:0,marginRight:lp===groupId?6:0}}>{amtSign}{fmt(lead.amount)}</div>
                        {lp===groupId&&(
                          <div style={{display:"flex",gap:4}}>
                            <button style={S.revealBtn(false)} onClick={e=>{e.stopPropagation();openEditTx(groupId);dismissLP();}}>修改</button>
                            <button style={S.revealBtn(true)} onClick={e=>{e.stopPropagation();deleteTx(groupId);dismissLP();}}>刪除</button>
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            )}
            {/* Monthly summary */}
            <div style={{padding:"14px 12px 0"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>{ymLabel(calYm)} 月份總覽</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{background:C.card,borderRadius:10,padding:"9px 10px",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.muted}}>收入</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#2d7a4f"}}>{fmt(mInc)}</div>
                </div>
                <div style={{background:C.card,borderRadius:10,padding:"9px 10px",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.muted}}>支出</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#c0392b"}}>{fmt(mExp)}</div>
                </div>
                <div style={{background:C.card,borderRadius:10,padding:"9px 10px",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.muted}}>存入儲蓄</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#2d7a4f"}}>{fmt(mSav)}</div>
                </div>
              </div>
              {/* Income pie */}
              {calPieInc.length>0&&(
                <div style={{background:C.card,borderRadius:14,padding:"14px",border:`1px solid ${C.border}`,marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>收入分析</div>
                  <PieChart data={calPieInc}/>
                </div>
              )}
              {/* Expense pie */}
              {calPieExp.length>0&&(
                <div style={{background:C.card,borderRadius:14,padding:"14px",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>支出分析</div>
                  <PieChart data={calPieExp}/>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Budget ── */}
      {tab==="budget"&&(
        <div style={S.sec}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={S.secTtl}>預算管理</div>
            <button onClick={()=>setModal("add-budget")} style={S.addBtn}>+ 新增</button>
          </div>
          {data.budgets.length===0&&<div style={{textAlign:"center",color:C.muted,padding:"28px 0"}}>尚未設定預算，設定後每期自動延用</div>}
          {data.budgets.map(b=>{
            const cat=getExpCat(b.categoryId);
            const{usedCurrent,overPrev,effectiveUsed,pct}=getBudgetStats(b);
            const isOver=effectiveUsed>b.amount;
            const overPct=b.amount>0?(overPrev/b.amount)*100:0;
            const currPct=b.amount>0?(usedCurrent/b.amount)*100:0;
            return(
              <div key={b.id} style={{...S.card,flexDirection:"column",alignItems:"stretch"}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <CatIcon cat={cat}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontWeight:700}}>{cat.name}</span>
                      <span style={{fontSize:11,color:C.muted}}>{b.period==="monthly"?"每月":"每年"}</span>
                    </div>
                    <div style={{fontSize:12,marginTop:1}}>
                      <span style={{color:C.muted}}>{fmt(usedCurrent)}</span>
                      {overPrev>0&&<span style={{color:"#c97c30"}}> +{fmt(overPrev)}上期</span>}
                      <span style={{color:C.muted}}> / {fmt(b.amount)}</span>
                      <span style={{marginLeft:4,fontWeight:700,color:isOver?"#c0392b":pct>70?"#d47c00":"#2d7a4f"}}>{pct.toFixed(0)}%</span>
                    </div>
                    {isOver&&<div style={{fontSize:11,color:"#c0392b"}}>🚨 超支 {fmt(effectiveUsed-b.amount)}</div>}
                  </div>
                  <Kebab id={b.id}
                    onEdit={()=>openEditBudget(b)}
                    onDelete={()=>update(d=>({...d,budgets:d.budgets.filter(x=>x.id!==b.id)}))}/>
                </div>
                <div style={S.pBar}>
                  {overPrev>0&&<div style={{position:"absolute",left:0,top:0,height:"100%",width:Math.min(overPct,100)+"%",background:"#c97c30",borderRadius:99,opacity:.5}}/>}
                  <div style={S.pFill(overPct+currPct,cat.color)}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted}}>
                  <span>已用 {fmt(effectiveUsed)}</span><span>剩 {fmt(Math.max(0,b.amount-effectiveUsed))}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Savings / Goals ── */}
      {tab==="goals"&&(
        <div style={S.sec}>
          {/* sub-tabs */}
          <div style={{display:"flex",gap:5,background:C.card,borderRadius:10,padding:3,marginBottom:12,border:`1px solid ${C.border}`}}>
            <button style={S.subTab(savingsSub==="goals")} onClick={()=>setSavingsSub("goals")}>⭐ 儲蓄目標</button>
            <button style={S.subTab(savingsSub==="alloc")} onClick={()=>setSavingsSub("alloc")}>📋 分配紀錄</button>
          </div>

          {savingsSub==="goals"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={S.secTtl}>儲蓄計畫</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>openDeposit()} style={{...S.addBtn,background:"#2d7a4f"}}>＋ 存入</button>
              <button onClick={()=>setModal("add-goal")} style={S.addBtn}>＋ 目標</button>
            </div>
          </div>

          {/* Savings account card */}
          <div style={{background:"linear-gradient(135deg,#1e5c38,#2d7a4f)",borderRadius:14,padding:"14px 16px",marginBottom:14,boxShadow:"0 3px 12px rgba(45,122,79,.2)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                {editSavName
                  ?<div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input value={savNameDraft} onChange={e=>setSavNameDraft(e.target.value)}
                      style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:6,padding:"4px 8px",color:"#fff",fontSize:14,width:110,outline:"none"}}/>
                    <button onClick={()=>{update(d=>({...d,savingsName:savNameDraft}));setEditSavName(false);}}
                      style={{background:"rgba(255,255,255,.25)",border:"none",borderRadius:6,padding:"4px 10px",color:"#fff",fontSize:12,cursor:"pointer"}}>✓</button>
                  </div>
                  :<div style={{fontSize:14,color:"rgba(255,255,255,.85)",fontWeight:700}}>{data.savingsName||"儲蓄帳戶"}</div>
                }
                <div style={{fontSize:24,fontWeight:800,color:"#fff",marginTop:4}}>{fmt(savingsTotal)}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:2}}>
                  未分配 {fmt(savingsUnallocated)} ／ 總額 {fmt(savingsTotal)}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                <span style={{fontSize:26}}>⭐</span>
                <button onClick={()=>{setSavNameDraft(data.savingsName||"儲蓄帳戶");setEditSavName(true);}}
                  style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:6,padding:"3px 8px",color:"rgba(255,255,255,.8)",fontSize:11,cursor:"pointer"}}>改名</button>
              </div>
            </div>
          </div>

          {sortedGoals.length===0&&<div style={{textAlign:"center",color:C.muted,padding:"20px 0"}}>尚未設定任何目標</div>}
          {sortedGoals.map(goal=>{
            const alloc=goalAllocMap[goal.id]||0;
            const targetAmt=Number(goal.amount);
            const reached=alloc>=targetAmt;
            const archived=!!goal.archivedAt;
            const pct=targetAmt>0?(alloc/targetAmt)*100:0;
            const isDraggingThis=dragging===goal.id,isDragOverThis=dragOver===goal.id;
            const cat=getExpCat(goal.category);
            return(
              <div key={goal.id}
                draggable={!archived}
                onDragStart={()=>setDragging(goal.id)}
                onDragOver={e=>{e.preventDefault();if(!archived)setDragOver(goal.id);}}
                onDragEnd={handleDragEnd}
                onClick={e=>e.stopPropagation()}
                style={{
                  background:isDragOverThis?"#f0e8de":C.card,borderRadius:13,padding:"11px 13px",marginBottom:7,
                  border:isDragOverThis?`1px solid ${C.accent}`:`1px solid ${C.border}`,
                  opacity:isDraggingThis?0.4:1,cursor:archived?"default":"grab",transition:"background .15s",
                  position:"relative",
                }}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  {/* check button */}
                  {reached&&!archived
                    ?<button onClick={()=>archiveGoal(goal.id)} style={{...S.check(true),fontSize:13}}>✓</button>
                    :<div style={{...S.check(archived)}}>{archived&&<span style={{fontSize:13,color:"#fff"}}>✓</span>}</div>
                  }
                  <div style={{flex:1,minWidth:0,opacity:archived?0.5:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontWeight:700,fontSize:14,textDecoration:archived?"line-through":"none",color:archived?C.muted:C.text}}>{goal.name}</span>
                        <span style={{fontSize:11,background:cat.color+"22",color:cat.color,borderRadius:99,padding:"1px 7px",fontWeight:600}}>{cat.icon} {cat.name}</span>
                      </div>
                      <span style={{fontSize:12,color:C.muted,flexShrink:0}}>{fmt(alloc)} / {fmt(targetAmt)}</span>
                    </div>
                    <div style={S.pBar}><div style={S.pFill(pct,C.accent)}/></div>
                    <div style={{fontSize:11,color:C.muted}}>
                      {archived?"已完成 🎉":reached?`達標！點 ✓ 記帳`:`尚差 ${fmt(targetAmt-alloc)}`}
                      {goal.defaultDeposit&&!archived&&<span style={{marginLeft:6,color:C.accent}}>預設 {fmt(goal.defaultDeposit)}</span>}
                    </div>
                  </div>
                  <Kebab id={"goal_"+goal.id}
                    onEdit={()=>openEditGoal(goal)}
                    onDelete={()=>deleteGoal(goal.id)}
                    topOffset={44}/>
                </div>
              </div>
            );
          })}
          {sortedGoals.some(g=>!g.archivedAt)&&<div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:4}}>拖曳排序</div>}
          </>}

          {/* ── Alloc Records sub-tab ── */}
          {savingsSub==="alloc"&&(
            <div>
              <div style={S.secTtl}>分配紀錄</div>
              {allocGroups.length===0&&<div style={{textAlign:"center",color:C.muted,padding:"28px 0"}}>尚無分配紀錄</div>}
              {allocGroups.map(({groupId,lead,allocatedAmt})=>{
                const isRedeem     =lead.type==="goal_redeem";
                const isDeposit    =lead.type==="savings_deposit";
                const isFromUnalloc=lead.type==="goal_deposit";
                const isAdjust     =lead.type==="goal_alloc_adjust"; // allocated→unallocated
                const depOutTx=isDeposit
                  ?data.transactions.find(t=>t.groupId===groupId&&t.type==="transfer_out")
                  :null;
                const fromAcc=isDeposit?getAcc(depOutTx?.account||""):getAcc(lead.account);
                const iconEl=isRedeem?"−":isDeposit?"⭐":isAdjust?"↩️":"🔄";
                const iconColor=isRedeem?"#c0392b":isDeposit?"#2d7a4f":isAdjust?C.muted:C.accent;
                const goalName=isRedeem?(data.goals.find(g=>g.id===lead.goalId)?.name||"目標"):null;
                const adjustGoalName=isAdjust?(data.goals.find(g=>g.id===lead.goalId)?.name||lead.note||"目標"):null;
                const dispAmt=isRedeem?lead.amount:isDeposit?lead.amount:lead.amount;
                return(
                  <div key={groupId} style={{...S.txRow,background:C.card}}>
                    <div style={S.icon(iconColor,34)}>{iconEl}</div>
                    <div style={{flex:1,minWidth:0}}>
                      {isRedeem&&<div style={{fontWeight:600,fontSize:13}}>達標支出：{goalName}</div>}
                      {isDeposit&&(
                        <div style={{fontWeight:600,fontSize:13}}>
                          存入儲蓄
                          {allocatedAmt>0&&<span style={{color:C.muted,fontWeight:400,fontSize:12}}> · 已分配 {fmt(allocatedAmt)}</span>}
                        </div>
                      )}
                      {isFromUnalloc&&<div style={{fontWeight:600,fontSize:13}}>未分配 → 已分配<span style={{color:C.accent,marginLeft:5}}>{fmt(lead.amount)}</span></div>}
                      {isAdjust&&<div style={{fontWeight:600,fontSize:13}}>已分配 → 未分配<span style={{color:C.muted,marginLeft:5}}>{fmt(lead.amount)}</span></div>}
                      <div style={{fontSize:11,color:C.muted}}>
                        {lead.date} · {isAdjust?adjustGoalName:isFromUnalloc?"未分配":fromAcc.name}
                      </div>
                    </div>
                    <div style={{fontWeight:700,color:isRedeem?"#c0392b":isAdjust?C.muted:isFromUnalloc?C.accent:"#2d7a4f",fontSize:14,flexShrink:0,marginRight:4}}>
                      {isRedeem?"−":isAdjust?"−":"+"}{fmt(dispAmt)}
                    </div>
                    {lead.type!=="goal_alloc_adjust"&&(
                      <Kebab id={"alloc_"+groupId}
                        onEdit={()=>openEditAlloc(groupId,lead,allocatedAmt)}
                        onDelete={()=>deleteAllocGroup(groupId,lead)}
                        topOffset={36}/>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Categories ── */}
      {tab==="cats"&&(
        <div style={S.sec}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={S.secTtl}>類別管理</div>
            <button onClick={()=>{setCatForm(initCatForm());setEmojiOpen(false);setModal("add-cat");}} style={S.addBtn}>+ 新增</button>
          </div>
          <div style={{fontSize:12,color:C.muted,marginBottom:6,fontWeight:600}}>── 支出 ──</div>
          {data.expenseCategories.map(cat=>(
            <div key={cat.id} style={S.card} onClick={e=>e.stopPropagation()}>
              <CatIcon cat={cat}/>
              <div style={{flex:1}}><div style={{fontWeight:600}}>{cat.name}</div><div style={{fontSize:11,color:C.muted}}>{cat.builtIn?"預設":"自訂"}</div></div>
              <div style={{width:12,height:12,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
              {!cat.builtIn&&<Kebab id={"ecat_"+cat.id}
                onEdit={()=>openEditCat(cat,false)}
                onDelete={()=>update(d=>({...d,expenseCategories:d.expenseCategories.filter(c=>c.id!==cat.id)}))}/>}
            </div>
          ))}
          <div style={{fontSize:12,color:C.muted,margin:"10px 0 6px",fontWeight:600}}>── 收入 ──</div>
          {data.incomeCategories.map(cat=>(
            <div key={cat.id} style={S.card} onClick={e=>e.stopPropagation()}>
              <CatIcon cat={cat}/>
              <div style={{flex:1}}><div style={{fontWeight:600}}>{cat.name}</div><div style={{fontSize:11,color:C.muted}}>{cat.builtIn?"預設":"自訂"}</div></div>
              <div style={{width:12,height:12,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
              {!cat.builtIn&&<Kebab id={"icat_"+cat.id}
                onEdit={()=>openEditCat(cat,true)}
                onDelete={()=>update(d=>({...d,incomeCategories:d.incomeCategories.filter(c=>c.id!==cat.id)}))}/>}
            </div>
          ))}
        </div>
      )}

      {/* ── Accounts ── */}
      {tab==="accounts"&&(
        <div style={S.sec}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={S.secTtl}>帳戶管理</div>
            <button onClick={()=>setModal("add-account")} style={S.addBtn}>+ 新增</button>
          </div>
          {data.accounts.map(acc=>(
            <div key={acc.id} style={S.card} onClick={e=>e.stopPropagation()}>
              <div style={S.icon(acc.color)}>{acc.icon}</div>
              <div style={{flex:1}}><div style={{fontWeight:700}}>{acc.name}</div><div style={{fontSize:11,color:C.muted}}>{acc.type==="cash"?"現金":"銀行 / 線上轉帳"}</div></div>
              <div style={{fontWeight:800,fontSize:17,color:Number(acc.balance)>=0?"#2d7a4f":"#c0392b",marginRight:4}}>{fmt(acc.balance)}</div>
              <Kebab id={"acc_"+acc.id}
                onEdit={()=>openEditAcc(acc)}
                onDelete={acc.id==="cash"?null:()=>update(d=>({...d,accounts:d.accounts.filter(a=>a.id!==acc.id)}))}/>
            </div>
          ))}
          {/* Savings virtual account */}
          <div style={{...S.card,background:"linear-gradient(135deg,#f0faf4,#e8f5ee)",border:"1px solid #b7dfc8"}} onClick={e=>e.stopPropagation()}>
            <div style={S.icon("#2d7a4f")}>⭐</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>{data.savingsName||"儲蓄帳戶"}</div>
              <div style={{fontSize:11,color:C.muted}}>未分配 {fmt(savingsUnallocated)} ／ 總額 {fmt(savingsTotal)}</div>
            </div>
            <div style={{fontWeight:800,fontSize:17,color:"#2d7a4f",marginRight:4}}>{fmt(savingsTotal)}</div>
            <Kebab id="__sav_acc"
              onEdit={()=>{setSavNameDraft(data.savingsName||"儲蓄帳戶");setEditSavName(true);setTab("goals");closeKebab();}}/>
          </div>
          {!hasBanks&&<div style={S.hint}>💡 新增銀行帳戶後可使用「提款」和「轉帳」</div>}
        </div>
      )}

      
      {/* Sidebar overlay */}
      {sidebarOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
          {/* backdrop */}
          <div onClick={()=>setSidebarOpen(false)}
            style={{position:"absolute",inset:0,background:"rgba(61,46,30,.45)"}}/>
          {/* drawer */}
          <div style={{position:"relative",width:220,background:C.navBg,borderRight:`1px solid ${C.border}`,
            height:"100%",display:"flex",flexDirection:"column",boxShadow:"4px 0 24px rgba(61,46,30,.15)",
            animation:"slideIn .2s ease"}}>
            <style>{`@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
            {/* drawer header */}
            <div style={{padding:"20px 20px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:16,fontWeight:700,color:C.text}}>💰 我的帳本</span>
              <button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button>
            </div>
            {/* nav items */}
            <div style={{flex:1,padding:"12px 12px",display:"flex",flexDirection:"column",gap:4}}>
              {navTabs.map(t=>(
                <button key={t.id} onClick={()=>{setTab(t.id);setSidebarOpen(false);}}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,
                    border:"none",cursor:"pointer",textAlign:"left",fontSize:14,fontWeight:600,
                    background:tab===t.id?C.accent+"22":"transparent",
                    color:tab===t.id?C.accent:C.textSub,
                    transition:"all .15s"}}>
                  <span style={{fontSize:18}}>{t.icon}</span>
                  <span>{t.lbl}</span>
                  {tab===t.id&&<div style={{marginLeft:"auto",width:4,height:4,borderRadius:"50%",background:C.accent}}/>}
                </button>
              ))}
            </div>
            {/* drawer footer */}
            <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>{setSidebarOpen(false);setModal("confirm-reset");}}
                style={{width:"100%",padding:"9px",borderRadius:10,border:`1px solid #e8b4b4`,
                  background:"#fef2f2",color:"#c0392b",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                🗑 重置所有資料
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {modal&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={S.sheet}>

            {/* Edit Transaction */}
            {modal==="edit-tx"&&editTx&&(
              <>
                <div style={S.shTtl}>修改記錄</div>
                <label style={S.lbl}>金額 (NT$)</label>
                <input style={S.input} type="number" value={editTx.form.amount} onChange={e=>setEditTx(t=>({...t,form:{...t.form,amount:e.target.value}}))}/>
                {editTx.form.type==="expense"&&<>
                  <label style={S.lbl}>類別</label>
                  <select style={S.sel} value={editTx.form.expCat} onChange={e=>setEditTx(t=>({...t,form:{...t.form,expCat:e.target.value}}))}>
                    {data.expenseCategories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </>}
                {editTx.form.type==="income"&&<>
                  <label style={S.lbl}>收入類別</label>
                  <select style={S.sel} value={editTx.form.incCat} onChange={e=>setEditTx(t=>({...t,form:{...t.form,incCat:e.target.value}}))}>
                    {data.incomeCategories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </>}
                <label style={S.lbl}>備注</label>
                <input style={S.input} value={editTx.form.note} onChange={e=>setEditTx(t=>({...t,form:{...t.form,note:e.target.value}}))}/>
                <label style={S.lbl}>日期</label>
                <input style={S.input} type="date" value={editTx.form.date} onChange={e=>setEditTx(t=>({...t,form:{...t.form,date:e.target.value}}))}/>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={submitEditTx}>確認修改</button>
                </div>
              </>
            )}

            {/* Add Transaction */}
            {modal==="add-tx"&&txForm&&(
              <>
                <div style={S.shTtl}>新增記錄</div>
                <div style={S.modeRow}>
                  {modeOptions.map(m=><button key={m.id} style={S.modeBtn(txForm.mode===m.id,m.color)} onClick={()=>switchMode(m.id)}>{m.label}</button>)}
                </div>
                <label style={S.lbl}>金額 (NT$)</label>
                <input style={S.input} type="number" placeholder="0" value={txForm.amount} onChange={e=>setTxForm(f=>({...f,amount:e.target.value}))}/>
                {txForm.mode===MODE_EXPENSE&&<>
                  <label style={S.lbl}>類別</label>
                  <select style={S.sel} value={txForm.expCat} onChange={e=>setTxForm(f=>({...f,expCat:e.target.value}))}>
                    {data.expenseCategories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </>}
                {txForm.mode===MODE_INCOME&&<>
                  <label style={S.lbl}>收入類別</label>
                  <select style={S.sel} value={txForm.incCat} onChange={e=>setTxForm(f=>({...f,incCat:e.target.value}))}>
                    {data.incomeCategories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </>}
                {(txForm.mode===MODE_EXPENSE||txForm.mode===MODE_INCOME)&&<>
                  <label style={S.lbl}>{txForm.mode===MODE_INCOME?"存入帳戶":"支付帳戶"}</label>
                  <select style={S.sel} value={txForm.account} onChange={e=>setTxForm(f=>({...f,account:e.target.value}))}>
                    {allWithSavings.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                </>}
                {txForm.mode===MODE_WITHDRAW&&<>
                  <label style={S.lbl}>從哪個帳戶提款</label>
                  <select style={S.sel} value={txForm.account} onChange={e=>setTxForm(f=>({...f,account:e.target.value}))}>
                    {allWithSavings.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                  <div style={S.hint}>💡 自動加入現金並標記來源</div>
                </>}
                {txForm.mode===MODE_TRANSFER&&<>
                  <label style={S.lbl}>轉出帳戶</label>
                  <select style={S.sel} value={txForm.account} onChange={e=>setTxForm(f=>({...f,account:e.target.value,toAccount:allWithSavings.find(a=>a.id!==e.target.value)?.id||""}))}>
                    {allWithSavings.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                  <label style={S.lbl}>轉入帳戶</label>
                  <select style={S.sel} value={txForm.toAccount} onChange={e=>setTxForm(f=>({...f,toAccount:e.target.value}))}>
                    {allWithSavings.filter(a=>a.id!==txForm.account).map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                </>}
                <label style={S.lbl}>備注（選填）</label>
                <input style={S.input} placeholder="例：午餐、房租" value={txForm.note} onChange={e=>setTxForm(f=>({...f,note:e.target.value}))}/>
                <label style={S.lbl}>日期</label>
                <input style={S.input} type="date" value={txForm.date} onChange={e=>setTxForm(f=>({...f,date:e.target.value}))}/>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={addTransaction}>確認新增</button>
                </div>
              </>
            )}

            {/* Deposit */}
            {modal==="deposit"&&(()=>{
              const allocated=depositAllocated();
              const total=Number(depositForm.totalAmount)||0;
              const remaining=total-allocated;
              const activeGoals=data.goals.filter(g=>!g.archivedAt);
              return(
                <>
                  <div style={S.shTtl}>存入儲蓄帳戶</div>
                  {/* source toggle */}
                  <label style={S.lbl}>資金來源</label>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <button style={S.modeBtn(!depositForm.useUnallocated,"#2d7a4f")} onClick={()=>setDepositForm(f=>({...f,useUnallocated:false}))}>從帳戶存入</button>
                    <button style={S.modeBtn(depositForm.useUnallocated,"#2d7a4f")} onClick={()=>setDepositForm(f=>({...f,useUnallocated:true}))}>
                      從未分配分配 {fmt(savingsUnallocated)}
                    </button>
                  </div>

                  {!depositForm.useUnallocated&&<>
                    <label style={S.lbl}>從哪個帳戶</label>
                    <select style={S.sel} value={depositForm.fromAccount} onChange={e=>setDepositForm(f=>({...f,fromAccount:e.target.value}))}>
                      {data.accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                    </select>
                  </>}

                  <label style={S.lbl}>{depositForm.useUnallocated?"分配金額 (NT$)":"存入金額 (NT$)"}</label>
                  <input style={S.input} type="number" placeholder="0" value={depositForm.totalAmount}
                    onChange={e=>setDepositForm(f=>({...f,totalAmount:e.target.value}))}/>

                  {depositForm.useUnallocated&&total>savingsUnallocated&&(
                    <div style={{...S.hint,color:"#c0392b",borderColor:"#f5c6c6",background:"#fef2f2",marginBottom:10}}>
                      ⚠️ 超出未分配金額 {fmt(savingsUnallocated)}
                    </div>
                  )}

                  <label style={S.lbl}>分配至目標</label>
                  {activeGoals.length===0&&<div style={{...S.hint}}>尚無目標</div>}
                  {activeGoals.map(g=>{
                    const item=depositForm.items[g.id]||{checked:false,amount:""};
                    const alloc=goalAllocMap[g.id]||0;
                    const tgt=Number(g.amount);
                    const cap=Math.max(0,tgt-alloc); // max can allocate to this goal
                    const pct=tgt>0?(alloc/tgt)*100:0;
                    return(
                      <div key={g.id} style={{...S.card,flexDirection:"column",marginBottom:8}} onClick={e=>e.stopPropagation()}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div onClick={()=>{
                            setDepositForm(f=>{
                              const cur=f.items[g.id]||{checked:false,amount:""};
                              return{...f,items:{...f.items,[g.id]:{...cur,checked:!cur.checked,amount:!cur.checked&&g.defaultDeposit?String(g.defaultDeposit):cur.amount}}};
                            });
                          }} style={S.check(item.checked)}>
                            {item.checked&&<span style={{fontSize:12,color:"#fff"}}>✓</span>}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600,fontSize:13}}>{g.name}</div>
                            <div style={{fontSize:11,color:C.muted}}>{fmt(alloc)}/{fmt(tgt)} · {pct.toFixed(0)}%{cap>0?` · 上限 ${fmt(cap)}`:""}</div>
                            <div style={S.pBar}><div style={S.pFill(pct,C.accent)}/></div>
                          </div>
                          {item.checked&&(
                            <input type="number" placeholder="金額" value={item.amount}
                              style={{width:80,background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 8px",color:C.text,fontSize:13,outline:"none"}}
                              onChange={e=>setDepositForm(f=>({...f,items:{...f.items,[g.id]:{...item,amount:e.target.value}}}))}/>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {total>0&&(
                    <div style={{...S.hint,display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <span>已分配：{fmt(allocated)}</span>
                      <span style={{fontWeight:700,color:remaining<0?"#c0392b":remaining===0?"#2d7a4f":C.muted}}>
                        {remaining<0?"超出 "+fmt(-remaining):"未分配 "+fmt(remaining)}
                      </span>
                    </div>
                  )}
                  <div style={S.btnRow}>
                    <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                    <button style={{...S.btnP,opacity:remaining<0||(depositForm.useUnallocated&&total>savingsUnallocated)?.5:1}}
                      onClick={submitDeposit}
                      disabled={remaining<0||(depositForm.useUnallocated&&total>savingsUnallocated)}>
                      確認存入
                    </button>
                  </div>
                </>
              );
            })()}

            {/* Add Goal */}
            {modal==="add-goal"&&(
              <>
                <div style={S.shTtl}>新增儲蓄目標</div>
                <label style={S.lbl}>目標名稱</label>
                <input style={S.input} placeholder="例：電腦、旅遊基金" value={goalForm.name} onChange={e=>setGoalForm(f=>({...f,name:e.target.value}))}/>
                <label style={S.lbl}>目標金額 (NT$)</label>
                <input style={S.input} type="number" placeholder="0" value={goalForm.amount} onChange={e=>setGoalForm(f=>({...f,amount:e.target.value}))}/>
                <label style={S.lbl}>分類（達標後記帳用）</label>
                <select style={S.sel} value={goalForm.category} onChange={e=>setGoalForm(f=>({...f,category:e.target.value}))}>
                  {data.expenseCategories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <label style={S.lbl}>預設每次存入金額（選填）</label>
                <input style={S.input} type="number" placeholder="留空則每次手動填寫" value={goalForm.defaultDeposit} onChange={e=>setGoalForm(f=>({...f,defaultDeposit:e.target.value}))}/>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={addGoal}>確認新增</button>
                </div>
              </>
            )}

            {/* Edit Goal */}
            {modal==="edit-goal"&&editGoal&&(
              <>
                <div style={S.shTtl}>修改目標</div>
                <label style={S.lbl}>目標名稱</label>
                <input style={S.input} value={editGoal.form.name} onChange={e=>setEditGoal(g=>({...g,form:{...g.form,name:e.target.value}}))}/>
                <label style={S.lbl}>目標金額 (NT$)</label>
                <input style={S.input} type="number" value={editGoal.form.amount} onChange={e=>setEditGoal(g=>({...g,form:{...g.form,amount:e.target.value}}))}/>
                <label style={S.lbl}>分類</label>
                <select style={S.sel} value={editGoal.form.category} onChange={e=>setEditGoal(g=>({...g,form:{...g.form,category:e.target.value}}))}>
                  {data.expenseCategories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <label style={S.lbl}>預設每次存入金額</label>
                <input style={S.input} type="number" placeholder="留空則每次手動填寫" value={editGoal.form.defaultDeposit} onChange={e=>setEditGoal(g=>({...g,form:{...g.form,defaultDeposit:e.target.value}}))}/>
                <label style={S.lbl}>已分配金額 (NT$)</label>
                <input style={S.input} type="number" value={editGoal.form.allocated} onChange={e=>setEditGoal(g=>({...g,form:{...g.form,allocated:e.target.value}}))}/>
                {(()=>{const orig=Number(data.goals.find(g=>g.id===editGoal.id)?.allocated)||0;const diff=Number(editGoal.form.allocated)-orig;if(!diff||isNaN(diff))return null;return(<div style={{...S.hint,color:diff<0?"#2d7a4f":"#c0392b",borderColor:diff<0?"#b7dfc8":"#f5c6c6",background:diff<0?"#f0faf4":"#fef2f2",marginBottom:10}}>{diff<0?`📥 ${fmt(Math.abs(diff))} 已分配 → 未分配`:`📤 ${fmt(diff)} 未分配 → 已分配`}</div>);})()}
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={submitEditGoal}>確認修改</button>
                </div>
              </>
            )}

            {/* Edit Budget */}
            {modal==="edit-budget"&&editBudget&&(
              <>
                <div style={S.shTtl}>修改預算</div>
                <label style={S.lbl}>預算上限 (NT$)</label>
                <input style={S.input} type="number" value={editBudget.form.amount}
                  onChange={e=>setEditBudget(b=>({...b,form:{...b.form,amount:e.target.value}}))}/>
                <label style={S.lbl}>週期</label>
                <select style={S.sel} value={editBudget.form.period}
                  onChange={e=>setEditBudget(b=>({...b,form:{...b.form,period:e.target.value}}))}>
                  <option value="monthly">每月</option><option value="yearly">每年</option>
                </select>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={submitEditBudget}>確認修改</button>
                </div>
              </>
            )}

            {/* Edit Category */}
            {modal==="edit-cat"&&editCat&&(
              <>
                <div style={S.shTtl}>修改類別</div>
                <label style={S.lbl}>類別名稱</label>
                <input style={S.input} value={editCat.form.name}
                  onChange={e=>setEditCat(c=>({...c,form:{...c.form,name:e.target.value}}))}/>
                <label style={S.lbl}>顏色</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {PRESET_COLORS.map(col=><div key={col} style={S.colorDot(col,editCat.form.color===col)}
                    onClick={()=>setEditCat(c=>({...c,form:{...c.form,color:col}}))}/>)}
                </div>
                <label style={S.lbl}>圖案（可不選）</label>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                  <div style={{...S.icon(editCat.form.color),border:`1px solid ${C.border}`}}>
                    {editCat.form.icon||<span style={{color:C.muted,fontSize:12}}>無</span>}
                  </div>
                  <button onClick={()=>setEmojiOpen(o=>!o)} style={{...S.btnS,flex:"none",padding:"6px 12px",fontSize:13}}>
                    {emojiOpen?"收起":"選圖案"}
                  </button>
                  {editCat.form.icon&&<button onClick={()=>setEditCat(c=>({...c,form:{...c.form,icon:""}}))}
                    style={{...S.btnS,flex:"none",padding:"6px 10px",fontSize:12,color:"#c0392b",borderColor:"#c0392b"}}>清除</button>}
                </div>
                {emojiOpen&&(
                  <div style={S.emojiGrid}>
                    {PRESET_EMOJI.map(e=><button key={e} style={S.emojiBtn(editCat.form.icon===e)}
                      onClick={()=>{setEditCat(c=>({...c,form:{...c.form,icon:e}}));setEmojiOpen(false);}}>{e}</button>)}
                  </div>
                )}
                <div style={{display:"flex",alignItems:"center",gap:10,background:C.inputBg,borderRadius:9,padding:"10px 12px",marginBottom:12,border:`1px solid ${C.border}`}}>
                  {editCat.form.icon?<div style={S.icon(editCat.form.color)}>{editCat.form.icon}</div>
                    :<div style={S.iconT(editCat.form.color)}>{editCat.form.name.slice(0,2)||"？"}</div>}
                  <div><div style={{fontWeight:600}}>{editCat.form.name||"類別名稱"}</div><div style={{fontSize:12,color:C.muted}}>預覽</div></div>
                </div>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={submitEditCat}>確認修改</button>
                </div>
              </>
            )}

            {/* Add Budget */}
            {modal==="add-budget"&&(
              <>
                <div style={S.shTtl}>新增 / 更新預算</div>
                <div style={S.hint}>設定後每期自動延用，超支累計至下期</div>
                <label style={S.lbl}>類別（支出）</label>
                <select style={S.sel} value={budgetForm.categoryId} onChange={e=>setBudgetForm(f=>({...f,categoryId:e.target.value}))}>
                  {data.expenseCategories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <label style={S.lbl}>週期</label>
                <select style={S.sel} value={budgetForm.period} onChange={e=>setBudgetForm(f=>({...f,period:e.target.value}))}>
                  <option value="monthly">每月</option><option value="yearly">每年</option>
                </select>
                <label style={S.lbl}>預算上限 (NT$)</label>
                <input style={S.input} type="number" placeholder="0" value={budgetForm.amount} onChange={e=>setBudgetForm(f=>({...f,amount:e.target.value}))}/>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={addBudget}>確認</button>
                </div>
              </>
            )}

            {/* Add Category */}
            {modal==="add-cat"&&(
              <>
                <div style={S.shTtl}>新增類別</div>
                <label style={S.lbl}>類型</label>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  {[{v:false,l:"支出"},{v:true,l:"收入"}].map(o=>(
                    <button key={String(o.v)} style={{...S.modeBtn(catForm.isIncome===o.v,C.accent),flex:1}} onClick={()=>setCatForm(f=>({...f,isIncome:o.v}))}>{o.l}</button>
                  ))}
                </div>
                <label style={S.lbl}>類別名稱</label>
                <input style={S.input} placeholder="例：寵物、打賞" value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))}/>
                <label style={S.lbl}>顏色</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                  {PRESET_COLORS.map(col=><div key={col} style={S.colorDot(col,catForm.color===col)} onClick={()=>setCatForm(f=>({...f,color:col}))}/>)}
                </div>
                <label style={S.lbl}>圖案（可不選）</label>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                  <div style={{...S.icon(catForm.color),border:`1px solid ${C.border}`}}>{catForm.icon||<span style={{color:C.muted,fontSize:12}}>無</span>}</div>
                  <button onClick={()=>setEmojiOpen(o=>!o)} style={{...S.btnS,flex:"none",padding:"6px 12px",fontSize:13}}>{emojiOpen?"收起":"選圖案"}</button>
                  {catForm.icon&&<button onClick={()=>setCatForm(f=>({...f,icon:""}))} style={{...S.btnS,flex:"none",padding:"6px 10px",fontSize:12,color:"#c0392b",borderColor:"#c0392b"}}>清除</button>}
                </div>
                {emojiOpen&&(
                  <div style={S.emojiGrid}>
                    {PRESET_EMOJI.map(e=><button key={e} style={S.emojiBtn(catForm.icon===e)} onClick={()=>{setCatForm(f=>({...f,icon:e}));setEmojiOpen(false);}}>{e}</button>)}
                  </div>
                )}
                <div style={{display:"flex",alignItems:"center",gap:10,background:C.inputBg,borderRadius:9,padding:"10px 12px",marginBottom:12,border:`1px solid ${C.border}`}}>
                  {catForm.icon?<div style={S.icon(catForm.color)}>{catForm.icon}</div>:<div style={S.iconT(catForm.color)}>{catForm.name.slice(0,2)||"？"}</div>}
                  <div><div style={{fontWeight:600}}>{catForm.name||"類別名稱"}</div><div style={{fontSize:12,color:C.muted}}>預覽</div></div>
                </div>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={addCategory}>確認新增</button>
                </div>
              </>
            )}

            {/* Add Account */}
            {modal==="add-account"&&(
              <>
                <div style={S.shTtl}>新增帳戶</div>
                <label style={S.lbl}>帳戶名稱</label>
                <input style={S.input} placeholder="例：玉山銀行" value={accForm.name} onChange={e=>setAccForm(f=>({...f,name:e.target.value}))}/>
                <label style={S.lbl}>帳戶類型</label>
                <select style={S.sel} value={accForm.type} onChange={e=>setAccForm(f=>({...f,type:e.target.value}))}>
                  <option value="bank">銀行 / 線上轉帳</option><option value="cash">現金</option>
                </select>
                <label style={S.lbl}>圖示（Emoji）</label>
                <input style={S.input} placeholder="🏦" value={accForm.icon} onChange={e=>setAccForm(f=>({...f,icon:e.target.value}))}/>
                <label style={S.lbl}>初始餘額 (NT$)</label>
                <input style={S.input} type="number" placeholder="0" value={accForm.balance} onChange={e=>setAccForm(f=>({...f,balance:e.target.value}))}/>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={addAccount}>確認新增</button>
                </div>
              </>
            )}

            {/* Edit Account */}
            {modal==="edit-account"&&editAcc&&(
              <>
                <div style={S.shTtl}>修改帳戶</div>
                <label style={S.lbl}>帳戶名稱</label>
                <input style={S.input} value={editAcc.form.name} onChange={e=>setEditAcc(a=>({...a,form:{...a.form,name:e.target.value}}))}/>
                <label style={S.lbl}>圖示（Emoji）</label>
                <input style={S.input} value={editAcc.form.icon} onChange={e=>setEditAcc(a=>({...a,form:{...a.form,icon:e.target.value}}))}/>
                <label style={S.lbl}>帳戶餘額 (NT$)</label>
                <input style={S.input} type="number" value={editAcc.form.balance} onChange={e=>setEditAcc(a=>({...a,form:{...a.form,balance:e.target.value}}))}/>
                {(()=>{
                  const acc=data.accounts.find(a=>a.id===editAcc.id);
                  const diff=Number(editAcc.form.balance)-(acc?Number(acc.balance):0);
                  if(!editAcc.form.balance||isNaN(Number(editAcc.form.balance))||diff===0)return null;
                  return <div style={{...S.hint,color:diff>0?"#2d7a4f":"#c0392b",borderColor:diff>0?"#b7dfc8":"#f5c6c6",background:diff>0?"#f0faf4":"#fef2f2"}}>
                    {diff>0?`📈 備抵盈餘 +${fmt(diff)}`:`📉 備抵損失 ${fmt(diff)}`}（自動記帳）
                  </div>;
                })()}
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={submitEditAcc}>確認修改</button>
                </div>
              </>
            )}
          {/* Confirm Reset */}
            {modal==="confirm-reset"&&(
              <>
                <div style={S.shTtl}>⚠️ 重置所有資料</div>
                <div style={{...S.hint,color:"#c0392b",borderColor:"#f5c6c6",background:"#fef2f2",marginBottom:16}}>
                  這個操作將刪除所有帳戶、交易紀錄、目標和預算，並且無法復原。確定要繼續嗎？
                </div>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>否，取消</button>
                  <button style={{...S.btnP,background:"linear-gradient(135deg,#c0392b,#922b21)"}}
                    onClick={()=>{
                      update(()=>({...defaultData}));
                      setModal(null);
                      setTab("overview");
                      setCalDay(null);
                    }}>
                    是，刪除全部
                  </button>
                </div>
              </>
            )}

          {/* Edit Alloc */}
            {modal==="edit-alloc"&&editAlloc&&(
              <>
                <div style={S.shTtl}>修改分配紀錄</div>
                <div style={S.hint}>
                  {editAlloc.lead.type==="savings_deposit"?"存入儲蓄":
                   editAlloc.lead.type==="goal_deposit"?"未分配→已分配":"達標支出"}
                  · {editAlloc.lead.date}
                </div>
                <label style={S.lbl}>金額 (NT$)</label>
                <input style={S.input} type="number" value={editAlloc.newAmt??String(editAlloc.origAmt)}
                  onChange={e=>setEditAlloc(a=>({...a,newAmt:e.target.value}))}/>
                <div style={S.btnRow}>
                  <button style={S.btnS} onClick={()=>setModal(null)}>取消</button>
                  <button style={S.btnP} onClick={submitEditAlloc}>確認修改</button>
                </div>
              </>
            )}

            {/* Alloc Error */}
            {modal==="alloc-err"&&(
              <>
                <div style={S.shTtl}>無法修改</div>
                <div style={{...S.hint,color:"#c0392b",borderColor:"#f5c6c6",background:"#fef2f2"}}>⚠️ {allocErrMsg}</div>
                <button style={S.btnP} onClick={()=>setModal(null)}>確認</button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
