"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./onboarding.css";

type View = "home" | "plans" | "assessment" | "waiting" | "session" | "history" | "admin";
type Point = { x: number; y: number };
type MotionState = "idle" | "walking" | "sitting" | "reading" | "coffee" | "water";
type AccountSession = { id:string; status:string; summary:string|null; started_at:string; ended_at:string|null };
type AccountData = { user:{id:string;email:string;name:string;plan:string}; assessment:{concern:string;intensity:number;duration:string;impacts:string[];goal:string}|null; sessions:AccountSession[]; currentSessionId:string|null; messages:{role:string;content:string;created_at:string}[] };

const quickPrompts = [
  "Quero organizar meus pensamentos",
  "Estou com dificuldade para dormir",
  "Preciso falar sobre meu dia",
];

const documents = [
  { title: "Regulação emocional — guia clínico", tag: "Emoções", chunks: 18, date: "Hoje" },
  { title: "Higiene do sono: recomendações", tag: "Sono", chunks: 12, date: "Ontem" },
  { title: "Técnicas de grounding", tag: "Ansiedade", chunks: 9, date: "05 ago" },
  { title: "Protocolo de segurança e crise", tag: "Segurança", chunks: 15, date: "02 ago" },
];

const libraryBooks = [
  { title: "Psicologia e Análise do Comportamento", author: "Haydu, Fornazari & Estanislau", topic: "Análise do comportamento", language: "Português", href: "/knowledge/analise-do-comportamento.pdf", color: "#17625b", access: "Ler agora" },
  { title: "Psicologia e Análise do Comportamento", author: "Universidade Estadual de Londrina", topic: "Reflexões e aplicações", language: "Português", href: "https://www.uel.br/pos/pgac/wp-content/uploads/2019/02/UELlivro4fev19web.pdf", color: "#9d633e", access: "Abrir PDF" },
  { title: "Análise do Comportamento no Brasil", author: "eduCAPES", topic: "História e fundamentos", language: "Português", href: "https://educapes.capes.gov.br/handle/capes/947037", color: "#405b74", access: "Acessar obra" },
  { title: "Publicações em Análise do Comportamento", author: "ABPMC", topic: "Clínica e comportamento", language: "Português", href: "https://www.abpmc.org.br/publicacoes", color: "#74513c", access: "Ver coleção" },
  { title: "Psychology 2e", author: "OpenStax · Rice University", topic: "Psicologia geral", language: "Inglês", href: "https://openstax.org/details/books/psychology-2e", color: "#792e3e", access: "Ler gratuitamente" },
  { title: "Introduction to Behavioral Neuroscience", author: "Kirby, Glenn, Sandstrom & Williams", topic: "Neurociência comportamental", language: "Inglês", href: "https://open.umn.edu/opentextbooks/textbooks/1774", color: "#284b5a", access: "Acessar livro" },
  { title: "Biological Psychology", author: "Open Textbook Library", topic: "Psicologia biológica", language: "Inglês", href: "https://open.umn.edu/opentextbooks/textbooks/biological-psychology", color: "#446c51", access: "Acessar livro" },
  { title: "Essentials of Exercise and Sport Psychology", author: "Open Textbook Library", topic: "Saúde e comportamento", language: "Inglês", href: "https://open.umn.edu/opentextbooks/textbooks/essentials-of-exercise-and-sport-psychology-an-open-access-textbook", color: "#9a7150", access: "Acessar livro" },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const icons: Record<string, string> = {
    home: "⌂", clock: "◷", chat: "◌", book: "▤", settings: "⚙", shield: "◇",
    coffee: "☕", water: "♒", chair: "♧", plant: "❧", mic: "●", send: "➜",
    users: "♙", file: "▱", trend: "↗", plus: "+", search: "⌕", more: "•••",
  };
  return <span className="icon" style={{ fontSize: size }} aria-hidden="true">{icons[name] ?? "•"}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [logged, setLogged] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountSessions, setAccountSessions] = useState<AccountSession[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [avatar, setAvatar] = useState<Point>({ x: 48, y: 63 });
  const [action, setAction] = useState("Explorando a sala");
  const [motionState, setMotionState] = useState<MotionState>("idle");
  const [queue, setQueue] = useState(3);
  const [seconds, setSeconds] = useState(168);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"ready"|"neural"|"unavailable">("ready");
  const [thinking, setThinking] = useState(false);
  const [aiError, setAiError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("Essencial");
  const [profile, setProfile] = useState({ name: "", email: "", password: "", concern: "", intensity: "", duration: "", impact: [] as string[], goal: "", safety: "" });
  const [messages, setMessages] = useState([
    { role: "ai", text: "Olá. Eu sou a Serena, uma agente virtual de IA. Este é um espaço de escuta e reflexão — não substituo uma psicóloga ou atendimento médico. Como você está chegando hoje?", source: "Protocolo de acolhimento v2" },
  ]);
  const [tab, setTab] = useState<"documents" | "sessions">("documents");
  const inputRef = useRef<HTMLInputElement>(null);
  const motionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadAccount() {
    const response = await fetch("/api/account", { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json() as AccountData;
    setLogged(true); setAccountName(data.user.name); setAccountSessions(data.sessions || []);
    setProfile((current) => ({ ...current, name:data.user.name, email:data.user.email, concern:data.assessment?.concern || current.concern, intensity:String(data.assessment?.intensity || current.intensity), duration:data.assessment?.duration || current.duration, impact:data.assessment?.impacts || current.impact, goal:data.assessment?.goal || current.goal }));
    if (data.currentSessionId) setSessionId(data.currentSessionId);
    if (data.messages?.length) setMessages(data.messages.map((message) => ({ role:message.role === "assistant" ? "ai" : message.role, text:message.content, source:"" })));
    return true;
  }

  useEffect(() => { loadAccount().catch(() => false); }, []);

  useEffect(() => {
    if (view !== "waiting" || seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [view, seconds]);

  useEffect(() => {
    if (view === "waiting" && seconds === 115) setQueue(2);
  }, [seconds, view]);

  useEffect(() => {
    if (view !== "waiting") return;
    const move = (event: KeyboardEvent) => {
      const keys: Record<string, Point> = { ArrowLeft: {x:-3,y:0}, ArrowRight: {x:3,y:0}, ArrowUp: {x:0,y:-3}, ArrowDown: {x:0,y:3}, a:{x:-3,y:0}, d:{x:3,y:0}, w:{x:0,y:-3}, s:{x:0,y:3} };
      const delta = keys[event.key]; if (!delta) return;
      event.preventDefault(); setAction("Caminhando pela sala"); setMotionState("walking");
      setAvatar((point) => ({ x: Math.max(8, Math.min(94, point.x + delta.x)), y: Math.max(48, Math.min(88, point.y + delta.y)) }));
      if (motionTimer.current) clearTimeout(motionTimer.current); motionTimer.current = setTimeout(() => setMotionState("idle"), 260);
    };
    window.addEventListener("keydown", move); return () => window.removeEventListener("keydown", move);
  }, [view]);

  const time = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);

  function navigate(next: View) {
    if (!logged && next !== "home") { setShowLogin(true); return; }
    setView(next);
  }

  async function signIn(email: string, password: string) {
    try {
      const response = await fetch("/api/auth/login", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({email,password}) });
      const data = await response.json() as { error?:string; code?:string };
      if (!response.ok) {
        if (data.code === "CLOUD_SETUP_REQUIRED") return "A conta na nuvem ainda precisa ser ativada.";
        return data.error || "E-mail ou senha inválidos.";
      }
      await loadAccount(); setShowLogin(false); setView("history");
      return "";
    } catch { return "Não foi possível entrar agora."; }
  }

  async function signUp(name:string, email:string, password:string) {
    try {
      const response = await fetch("/api/auth/signup", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({name,email,password}) });
      const data = await response.json() as { error?:string; confirmationRequired?:boolean };
      if (!response.ok) return data.error || "Não foi possível criar sua conta.";
      if (data.confirmationRequired) return "Conta criada. Confirme o e-mail recebido e depois entre por aqui.";
      await loadAccount(); setShowLogin(false); setView("plans");
      return "";
    } catch { return "Não foi possível criar sua conta agora."; }
  }

  function choosePlan(plan: string) {
    setSelectedPlan(plan); setView("assessment");
  }

  async function finishAssessment() {
    const name = profile.name.trim().split(" ")[0] || "você";
    const context = `Queixa principal: ${profile.concern}. Intensidade: ${profile.intensity}/10. Duração: ${profile.duration}. Impactos: ${profile.impact.join(", ") || "não informados"}. Objetivo: ${profile.goal}.`;
    setMessages([{ role: "ai", text: `Olá, ${name}. Obrigada por compartilhar essas informações antes da conversa. Entendi que ${profile.concern.toLowerCase()} tem sido a parte mais difícil e que você gostaria de ${profile.goal.toLowerCase()}. Podemos começar pelo momento em que isso mais pesa no seu dia?`, source: `Avaliação inicial · plano ${selectedPlan}` }, { role: "system", text: context, source: "" }]);
    try {
      if (!logged) {
        const signup = await fetch("/api/auth/signup", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ name:profile.name, email:profile.email, password:profile.password }) });
        const signupData = await signup.json() as { confirmationRequired?:boolean; code?:string; error?:string };
        if (!signup.ok && signupData.code !== "CLOUD_SETUP_REQUIRED") throw new Error(signupData.error || "Não foi possível criar a conta");
        if (signupData.confirmationRequired) throw new Error("Confirme o e-mail enviado pelo Supabase e depois entre para continuar.");
      }
      const onboarding = await fetch("/api/onboarding", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({...profile,plan:selectedPlan}) });
      const onboardingData = await onboarding.json() as { sessionId?:string|number; error?:string };
      if (!onboarding.ok) throw new Error(onboardingData.error || "Não foi possível salvar a avaliação");
      if (onboardingData.sessionId) setSessionId(String(onboardingData.sessionId));
      setLogged(true); setAccountName(profile.name.trim());
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Não foi possível concluir o cadastro.");
      return;
    }
    setView("waiting");
  }

  function interact(label: string, point: Point) {
    if (motionTimer.current) clearTimeout(motionTimer.current);
    setMotionState("walking"); setAvatar(point); setAction(`Indo até: ${label.toLowerCase()}`);
    motionTimer.current = setTimeout(() => {
      const next: MotionState = /sent/i.test(label) ? "sitting" : /livro|biblioteca|folhe/i.test(label) ? "reading" : /caf/i.test(label) ? "coffee" : /água|agua|beb/i.test(label) ? "water" : "idle";
      setMotionState(next); setAction(label);
    }, 620);
  }

  async function send(text = input) {
    const clean = text.trim();
    if (!clean) return;
    setAiError("");
    setThinking(true);
    setMessages((m) => [...m, { role: "user", text: clean, source: "" }]);
    setInput("");
    const lower = clean.toLowerCase();
    const crisis = /suic|morrer|me matar|não quero viver|machucar/.test(lower);
    const crisisText = "Sinto muito que você esteja passando por isso. Sua segurança vem primeiro. Se houver risco imediato, ligue agora para o SAMU (192) ou vá a uma emergência. Você também pode falar gratuitamente com o CVV pelo 188. Consegue chamar alguém de confiança para ficar com você agora?";
    let response = { role: "ai", text: crisisText, source: "Protocolo de segurança e crise" };
    if (!crisis) {
      try {
        const result = await fetch("/api/rag", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: clean, sessionId: sessionId || undefined, history: messages.map(({ role, text }) => ({ role, text })) }) });
        const data = await result.json() as { answer?: string; error?: string; code?: string };
        if (!result.ok || !data.answer) {
          setThinking(false);
          setAiError(data.code === "AI_NOT_CONFIGURED"
            ? "A conversa inteligente ainda precisa ser conectada ao modelo de IA. Nenhuma resposta automática será usada no lugar dela."
            : data.error || "Não foi possível gerar a resposta agora. Tente novamente.");
          return;
        }
        response = { role: "ai", text: data.answer, source: "" };
      } catch {
        setThinking(false);
        setAiError("A conexão com a conversa inteligente falhou. Sua mensagem foi preservada; tente novamente em instantes.");
        return;
      }
    }
    if (!crisis) await new Promise((resolve) => setTimeout(resolve, Math.min(3600, Math.max(1300, response.text.length * 14))));
    setThinking(false); setMessages((m) => [...m, response]);
    try {
      const naturalVoice = await fetch("/api/speech", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: response.text }) });
      if (naturalVoice.ok) {
        const audio = new Audio(URL.createObjectURL(await naturalVoice.blob()));
        setVoiceStatus("neural");
        audio.onplay = () => setSpeaking(true); audio.onended = () => setSpeaking(false); audio.onerror = () => setSpeaking(false);
        await audio.play(); return;
      }
    } catch { /* A interface continua por texto quando a voz neural não está disponível. */ }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const voice = new SpeechSynthesisUtterance(response.text); const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find((candidate) => candidate.lang.toLowerCase() === "pt-br" && /premium|enhanced|natural/i.test(candidate.name));
      if (!premiumVoice) { setVoiceStatus("unavailable"); return; }
      setVoiceStatus("neural"); voice.voice = premiumVoice;
      voice.lang = "pt-BR"; voice.rate = .92; voice.pitch = 1; voice.volume = .96;
      voice.onstart = () => setSpeaking(true); voice.onend = () => setSpeaking(false); voice.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(voice);
    }
  }

  function toggleVoice() {
    const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { 0: { transcript: string } } }[] }) => void; onend: () => void; start: () => void } }).webkitSpeechRecognition;
    if (!SpeechRecognition) { setListening(!listening); return; }
    const rec = new SpeechRecognition(); rec.lang = "pt-BR"; rec.interimResults = false;
    rec.onresult = (e) => setInput(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    setListening(true); rec.start();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("home")}><span className="brand-mark"><span /></span><span>Serena<small>cuidado conversacional</small></span></button>
        <nav>
          <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>Início</button>
          <button className={view === "plans" ? "active" : ""} onClick={() => setView("plans")}>Planos</button>
          <button className={view === "waiting" ? "active" : ""} onClick={() => navigate("waiting")}>Sala de espera</button>
          <button className={view === "history" ? "active" : ""} onClick={() => navigate("history")}>Minha jornada</button>
        </nav>
        <div className="top-actions"><button className="help" onClick={() => alert("Se você estiver em perigo imediato, ligue 192. Apoio emocional: CVV 188.")}>Preciso de ajuda agora</button>{logged ? <button className="profile" onClick={() => setView("history")}><span className="mini-avatar">{(accountName || "V").charAt(0).toUpperCase()}</span><span>{accountName || "Meu perfil"}<small>Meu espaço</small></span><b>⌄</b></button> : <><button className="account-create" onClick={() => setShowLogin(true)}>Criar conta</button><button className="primary small" onClick={() => setShowLogin(true)}>Entrar</button></>}</div>
      </header>

      <main>
        {view === "home" && <Landing onStart={() => logged ? setView("waiting") : setView("plans")} />}
        {view === "plans" && <Plans onChoose={choosePlan} />}
        {view === "assessment" && <Assessment profile={profile} setProfile={setProfile} plan={selectedPlan} returning={logged} onFinish={finishAssessment} />}
        {view === "waiting" && <Waiting avatar={avatar} action={action} motionState={motionState} queue={queue} time={time} seconds={seconds} onInteract={interact} onEnter={() => setView("session")} />}
        {view === "session" && <Session messages={messages.filter((message) => message.role !== "system")} input={input} listening={listening} speaking={speaking} thinking={thinking} aiError={aiError} voiceStatus={voiceStatus} setInput={setInput} send={send} toggleVoice={toggleVoice} inputRef={inputRef} />}
        {view === "history" && <History name={accountName} sessions={accountSessions} onContinue={() => setView("session")} />}
        {view === "admin" && <Admin tab={tab} setTab={setTab} />}
      </main>

      {logged && <button className="admin-link" onClick={() => setView(view === "admin" ? "home" : "admin")}><Icon name={view === "admin" ? "home" : "settings"} /> {view === "admin" ? "Voltar ao app" : "Painel administrativo"}</button>}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSignIn={signIn} onSignUp={signUp} />}
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return <div className="landing">
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><span className="pulse" /> Um espaço seguro para conversar</span><h1>Respire. Você não precisa<br />organizar tudo <em>sozinho.</em></h1><p>Uma conversa acolhedora para ajudar você a compreender pensamentos, nomear emoções e encontrar próximos passos — no seu tempo.</p><div className="hero-actions"><button className="primary" onClick={onStart}>Começar uma conversa <span>→</span></button><button className="text-button" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>Como funciona <span>↓</span></button></div><p className="privacy"><Icon name="shield" /> Suas conversas são privadas e protegidas</p></div>
      <div className="hero-visual"><div className="sun-orb" /><div className="leaf leaf-a" /><div className="leaf leaf-b" /><div className="portrait-card"><div className="portrait-avatar"><div className="hair" /><div className="face"><i /><i /><b /></div><div className="body" /></div><div className="ai-label"><span className="pulse" /> Serena · agente virtual de IA</div><div className="wave">⌁ ⌁⌁ ⌁⌁⌁ ⌁</div></div><div className="quote-card">“Vamos olhar para isso<br />juntos, sem pressa.”</div></div>
    </section>
    <section className="trust-strip"><div><b>Disponível 24h</b><span>Converse quando precisar</span></div><div><b>Conversa contextualizada</b><span>Seu relato anterior é levado em conta</span></div><div><b>Você no controle</b><span>Pare ou retome quando quiser</span></div></section>
    <section className="how" id="how"><span className="eyebrow">Sua jornada</span><h2>Um cuidado que começa antes da conversa</h2><div className="steps"><article><b>01</b><Icon name="users" size={30}/><h3>Crie seu espaço</h3><p>Um cadastro rápido e seguro para guardar sua jornada.</p></article><article><b>02</b><Icon name="coffee" size={30}/><h3>Faça uma pausa</h3><p>Relaxe na sala virtual enquanto preparamos seu atendimento.</p></article><article><b>03</b><Icon name="chat" size={30}/><h3>Converse com Serena</h3><p>Por texto ou voz, com acolhimento e referências confiáveis.</p></article></div></section>
    <SafetyNote />
  </div>;
}

function Plans({ onChoose }: { onChoose: (plan: string) => void }) {
  const plans = [
    { name: "Acolher", price: "R$ 29", cadence: "1 conversa por semana", features: ["Avaliação inicial", "Histórico protegido", "Texto e voz"] },
    { name: "Essencial", price: "R$ 59", cadence: "Conversas ilimitadas", features: ["Avaliação personalizada", "Jornada recomendada", "Voz natural e biblioteca"], featured: true },
    { name: "Cuidar+", price: "R$ 99", cadence: "Acompanhamento contínuo", features: ["Tudo do Essencial", "Relatórios de evolução", "Prioridade na sala"] },
  ];
  return <div className="plans-page"><div className="plans-hero"><span className="eyebrow">Escolha sua jornada</span><h1>Um plano para o seu momento.</h1><p>Comece com uma avaliação breve. Você pode mudar ou cancelar quando quiser.</p></div><div className="plan-grid">{plans.map((plan) => <article key={plan.name} className={plan.featured ? "featured" : ""}>{plan.featured && <span className="recommended">Mais escolhido</span>}<h2>{plan.name}</h2><div className="plan-price"><b>{plan.price}</b><span>/mês</span></div><p>{plan.cadence}</p><ul>{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul><button className={plan.featured ? "primary full" : "plan-button"} onClick={() => onChoose(plan.name)}>Escolher {plan.name} →</button></article>)}</div><SafetyNote compact /></div>;
}

function Assessment({ profile, setProfile, plan, returning, onFinish }: { profile: {name:string;email:string;password:string;concern:string;intensity:string;duration:string;impact:string[];goal:string;safety:string}; setProfile: React.Dispatch<React.SetStateAction<{name:string;email:string;password:string;concern:string;intensity:string;duration:string;impact:string[];goal:string;safety:string}>>; plan:string; returning:boolean; onFinish:()=>void }) {
  const [step, setStep] = useState(0);
  const update = (key: keyof typeof profile, value: string | string[]) => setProfile((current) => ({...current, [key]: value}));
  const impacts = ["Trabalho ou estudos", "Sono", "Relacionamentos", "Energia", "Autocuidado"];
  const valid = step === 0 ? profile.name && profile.email && (returning || profile.password.length >= 6) : step === 1 ? profile.concern && profile.intensity && profile.duration : profile.goal && profile.safety;
  return <div className="assessment-page"><section className="assessment-card"><header><div><span className="eyebrow">Plano {plan}</span><h1>{step === 0 ? "Vamos criar seu espaço" : step === 1 ? "Como isso tem afetado você?" : "O que você espera desta jornada?"}</h1></div><span className="step-count">{step + 1} de 3</span></header><div className="progress"><i style={{width:`${((step+1)/3)*100}%`}}/></div>{step === 0 && <div className="form-grid"><label>Como gostaria de ser chamado?<input value={profile.name} onChange={(e)=>update("name",e.target.value)} placeholder="Seu nome"/></label><label>E-mail<input value={profile.email} onChange={(e)=>update("email",e.target.value)} type="email" placeholder="voce@exemplo.com"/></label><label className="wide">Crie uma senha<input value={profile.password} onChange={(e)=>update("password",e.target.value)} type="password" placeholder="Pelo menos 6 caracteres"/></label><p className="form-note wide"><Icon name="shield"/> Seus dados ajudam a personalizar a conversa e não substituem avaliação clínica.</p></div>}{step === 1 && <div className="assessment-fields"><label>O que mais está pesando neste momento?<textarea value={profile.concern} onChange={(e)=>update("concern",e.target.value)} placeholder="Conte com suas palavras. Ex.: a pressão no trabalho está me esgotando."/></label><label>Há quanto tempo isso acontece?<select value={profile.duration} onChange={(e)=>update("duration",e.target.value)}><option value="">Selecione</option><option>Há alguns dias</option><option>Há algumas semanas</option><option>Há alguns meses</option><option>Há mais de um ano</option></select></label><label>Quanto isso incomoda hoje? <b>{profile.intensity || "—"}/10</b><input type="range" min="1" max="10" value={profile.intensity || "5"} onChange={(e)=>update("intensity",e.target.value)}/></label><fieldset><legend>Quais áreas foram afetadas?</legend><div className="choice-chips">{impacts.map((item)=><button type="button" key={item} className={profile.impact.includes(item)?"selected":""} onClick={()=>update("impact",profile.impact.includes(item)?profile.impact.filter(x=>x!==item):[...profile.impact,item])}>{item}</button>)}</div></fieldset></div>}{step === 2 && <div className="assessment-fields"><label>O que gostaria de conseguir primeiro?<textarea value={profile.goal} onChange={(e)=>update("goal",e.target.value)} placeholder="Ex.: organizar meus pensamentos e lidar melhor com a cobrança."/></label><fieldset><legend>Para sua segurança: você corre risco imediato ou pensa em se machucar agora?</legend><div className="safety-options"><button type="button" className={profile.safety==="no"?"selected":""} onClick={()=>update("safety","no")}>Não, estou em segurança</button><button type="button" className={profile.safety==="yes"?"danger selected":"danger"} onClick={()=>update("safety","yes")}>Sim ou não tenho certeza</button></div></fieldset>{profile.safety === "yes" && <div className="crisis-box"><b>Você merece apoio humano agora.</b><p>Se houver perigo imediato, ligue 192 ou vá a uma emergência. Para apoio emocional, ligue gratuitamente para o CVV no 188. Se puder, chame alguém de confiança para ficar com você.</p></div>}<div className="journey-preview"><Icon name="chat"/><div><b>Como Serena usará isso</b><span>Ela começará reconhecendo sua queixa e seu objetivo, sem diagnosticar ou prescrever.</span></div></div></div>}<footer>{step > 0 && <button className="back-button" onClick={()=>setStep(step-1)}>← Voltar</button>}<button className="primary" disabled={!valid || profile.safety === "yes"} onClick={()=>step < 2 ? setStep(step+1) : onFinish()}>{step < 2 ? "Continuar →" : "Ir para a sala de espera →"}</button></footer></section></div>;
}

function Waiting({ avatar, action, motionState, queue, time, seconds, onInteract, onEnter }: { avatar: Point; action: string; motionState: MotionState; queue: number; time: string; seconds: number; onInteract: (a: string, p: Point) => void; onEnter: () => void }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [readingBook, setReadingBook] = useState<(typeof libraryBooks)[number] | null>(null);
  const [avatarType, setAvatarType] = useState<"female"|"male">("female");
  const [ambientOn, setAmbientOn] = useState(false);
  const ambientRef = useRef<AudioContext | null>(null);
  const visibleBooks = libraryBooks.filter((book) => `${book.title} ${book.author} ${book.topic} ${book.language}`.toLowerCase().includes(bookSearch.toLowerCase()));
  function toggleAmbient() {
    if (ambientRef.current) { ambientRef.current.close(); ambientRef.current = null; setAmbientOn(false); return; }
    const context = new AudioContext(); const master = context.createGain(); master.gain.value = .018; master.connect(context.destination);
    [174.61, 220, 261.63].forEach((frequency, index) => { const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.type = "sine"; oscillator.frequency.value = frequency; gain.gain.value = index === 0 ? .8 : .38; oscillator.connect(gain).connect(master); oscillator.start(); });
    ambientRef.current = context; setAmbientOn(true);
  }
  useEffect(() => () => { ambientRef.current?.close(); }, []);
  return <div className="page waiting-page"><div className="page-title"><div><span className="eyebrow"><span className="pulse" /> Você está na fila</span><h1>Sua sala de pausa</h1><p>Explore o ambiente enquanto preparamos seu espaço de conversa.</p></div><div className="queue-card"><span>Tempo estimado</span><b>{time}</b><small>{queue} pessoas à sua frente</small></div></div>
    <div className="waiting-grid"><section className="game-card immersive"><div className="game-room" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onInteract("Caminhando pela sala", { x: Math.max(6, Math.min(96, ((e.clientX-r.left)/r.width)*100)), y: Math.max(46, Math.min(89, ((e.clientY-r.top)/r.height)*100)) }); }}>
      <div className="room-light"/><button className="hotspot sofa" onClick={(e) => { e.stopPropagation(); onInteract("Sentando e respirando", { x: 27, y: 69 }); }} aria-label="Sentar no sofá"><span>Sentar</span></button><button className="hotspot coffee-table" onClick={(e) => { e.stopPropagation(); onInteract("Tomando um café", { x: 51, y: 76 }); }} aria-label="Tomar café"><span>Tomar café</span></button><button className="hotspot water" onClick={(e) => { e.stopPropagation(); onInteract("Bebendo água", { x: 75, y: 60 }); }} aria-label="Beber água"><span>Beber água</span></button><button className="hotspot bookshelf" onClick={(e) => { e.stopPropagation(); setLibraryOpen(true); onInteract("Explorando a biblioteca", { x: 90, y: 64 }); }} aria-label="Abrir biblioteca"><span>Explorar biblioteca</span></button>
      <div className={`player realistic-player motion-${motionState}`} style={{ left: `${avatar.x}%`, top: `${avatar.y}%`, "--player-scale": .8 + ((avatar.y - 48) / 40) * .48 } as React.CSSProperties}><img src={avatarType === "female" ? "/player-avatar-realistic.png" : "/player-avatar-male.png"} alt={`Seu avatar ${avatarType === "female" ? "feminino" : "masculino"}`}/><span>Você</span><i className="held-object" aria-hidden="true"/></div>
      <div className="game-hint"><b>Modo imersivo</b> · clique no ambiente para caminhar</div></div><div className="game-status"><span><span className="pulse" /> {action}</span><span>Ambiente fotorealista · som espacial disponível</span></div></section>
      <aside className="waiting-panel"><h3>Seu espaço, seu avatar</h3><p>Escolha como deseja se representar e explore a sala no seu ritmo.</p><div className="avatar-picker"><button className={avatarType === "female" ? "active" : ""} onClick={() => setAvatarType("female")}><img src="/player-avatar-realistic.png" alt="Avatar feminino"/>Feminino</button><button className={avatarType === "male" ? "active" : ""} onClick={() => setAvatarType("male")}><img src="/player-avatar-male.png" alt="Avatar masculino"/>Masculino</button></div><button onClick={() => onInteract("Sentando no divã", {x:29,y:61})}><span><Icon name="chair"/></span><b>Sentar no divã<small>2 minutos de presença</small></b><i>→</i></button><button onClick={() => setLibraryOpen(true)}><span><Icon name="book"/></span><b>Visitar a biblioteca<small>Escolha um livro e leia aqui</small></b><i>→</i></button><button onClick={toggleAmbient}><span>{ambientOn ? "♫" : "♪"}</span><b>{ambientOn ? "Pausar ambiente" : "Música ambiente"}<small>Som generativo em volume suave</small></b><i>{ambientOn ? "Ⅱ" : "▶"}</i></button><div className="breathing"><span>Inspire</span><div className="breath-orb"/><small>Acompanhe o círculo</small></div>{seconds < 150 && <button className="primary full" onClick={onEnter}>Entrar na conversa →</button>}</aside>
    </div><SafetyNote compact />{libraryOpen && <div className="library-backdrop" onMouseDown={() => setLibraryOpen(false)}><section className="virtual-library" onMouseDown={(e) => e.stopPropagation()}><header><div><span className="eyebrow">Biblioteca Serena</span><h2>Leituras para explorar com calma</h2><p>Obras gratuitas de universidades, organizações científicas e editoras abertas.</p></div><button onClick={() => setLibraryOpen(false)} aria-label="Fechar biblioteca">×</button></header><div className="library-search"><Icon name="search"/><input value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} placeholder="Buscar por livro, autor ou tema..." autoFocus/><span>{visibleBooks.length} obras</span></div><div className="book-grid">{visibleBooks.map((book) => <article key={book.title + book.author}><div className="book-cover" style={{background: book.color}}><i>Serena<br/>biblioteca</i><b>{book.title}</b><small>ACESSO ABERTO</small></div><div className="book-info"><span>{book.topic}</span><h3>{book.title}</h3><p>{book.author}</p><small>{book.language} · Gratuito</small><a href={book.href} target="_blank" rel="noreferrer">{book.access} ↗</a></div></article>)}</div><footer><Icon name="shield"/> Todos os links levam a fontes oficiais ou obras com acesso aberto autorizado.</footer></section></div>}</div>;
}

function Session({ messages, input, listening, speaking, thinking, aiError, voiceStatus, setInput, send, toggleVoice, inputRef }: { messages: {role:string;text:string;source:string}[]; input:string; listening:boolean; speaking:boolean; thinking:boolean; aiError:string; voiceStatus:"ready"|"neural"|"unavailable"; setInput:(v:string)=>void; send:(v?:string)=>void; toggleVoice:()=>void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return <div className="session-page"><div className="session-alert"><Icon name="shield"/> Serena é uma inteligência artificial, não uma psicóloga humana. Ela não realiza diagnósticos nem prescreve tratamentos. <button>Saiba mais</button></div><div className="session-layout">
    <aside className="video-panel"><div className="video-top"><span><span className="pulse"/> Conversa ativa · personagem de IA</span><button>•••</button></div><div className={`agent-scene live-agent ${speaking ? "speaking" : "listening"}`}><img className="agent-frame neutral" src="/serena-agent-listening.png" alt="Serena, personagem virtual de IA, ouvindo"/><img className="agent-frame gesture" src="/serena-agent-speaking.png" alt="Serena, personagem virtual de IA, gesticulando durante a fala"/><div className="live-badge"><span className="pulse"/>{speaking ? "Serena está falando" : "Serena está ouvindo"}</div><div className="sound-wave">│ ▏┃ ▎│ ┃ ▏│</div></div><div className="agent-name"><div><b>Serena</b><span>Personagem virtual gerada por IA · não é psicóloga humana</span></div><span className="ai-chip">IA</span></div><div className="video-controls"><button className={listening ? "recording" : ""} onClick={toggleVoice}><Icon name="mic"/> {listening ? "Ouvindo..." : "Falar por voz"}</button><button onClick={() => { window.speechSynthesis.cancel(); }}>⌁ Áudio</button></div><div className="human-help"><Icon name="users"/><div><b>Prefere ajuda humana?</b><span>Encontre atendimento profissional</span></div><button>Ver opções</button></div></aside>
    <section className="chat-panel"><header><div><h2>Sua conversa</h2><span>Hoje, 14:32 · Privada</span></div><button className="end-session">Encerrar</button></header><div className="messages">{messages.map((m, i) => <div key={i} className={`message-row ${m.role}`}><div className="message-avatar">{m.role === "ai" ? "S" : "M"}</div><div><span className="speaker">{m.role === "ai" ? "Serena" : "Você"}</span><div className="bubble">{m.text}</div>{m.source && <button className="source"><Icon name="book"/> Fonte: {m.source}</button>}</div></div>)}{thinking && <div className="message-row ai typing-row" aria-label="Serena está preparando uma resposta"><div className="message-avatar">S</div><div><span className="speaker">Serena</span><div className="bubble typing-bubble"><i/><i/><i/></div></div></div>}</div><div className="quick-prompts">{messages.length < 2 && quickPrompts.map((p) => <button key={p} onClick={() => send(p)}>{p}</button>)}</div><footer>{aiError && <div className="ai-connection-error" role="alert"><b>Conversa por IA indisponível</b><span>{aiError}</span></div>}<div className="composer"><input ref={inputRef} value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key === "Enter" && send()} placeholder="Escreva o que está sentindo..." aria-label="Mensagem"/><button className={listening ? "listening" : ""} onClick={toggleVoice} aria-label="Gravar áudio"><Icon name="mic"/></button><button className="send" onClick={()=>send()} aria-label="Enviar"><Icon name="send"/></button></div><small>Serena pode cometer erros. Em emergências, ligue 192 ou CVV 188.</small></footer></section>
  </div></div>;
}

function History({ name, sessions, onContinue }: { name:string; sessions:AccountSession[]; onContinue:()=>void }) {
  const date = (value:string) => new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"short" }).format(new Date(value));
  return <div className="page history-page"><div className="page-title"><div><span className="eyebrow">Minha jornada</span><h1>Um passo de cada vez, {name || "você"}.</h1><p>Suas conversas ficam vinculadas à sua conta para a Serena compreender a continuidade da sua história.</p></div><button className="primary" onClick={onContinue}>Continuar conversa →</button></div><div className="journey-grid"><section className="summary-card"><span>Histórico protegido</span><div className="big-number">{sessions.length} <small>{sessions.length === 1 ? "conversa" : "conversas"}</small></div><p>A Serena considera sua avaliação inicial e as mensagens anteriores antes de responder.</p></section><section className="themes-card account-context"><h3>Como funciona a memória</h3><p>Somente o histórico da sua própria conta é carregado. A agente usa o contexto para evitar que você precise recomeçar do zero, sem realizar diagnóstico ou prescrição.</p></section></div><section className="history-list"><h2>Conversas recentes</h2>{sessions.length ? sessions.map((session)=><article key={session.id}><span className="date-badge">{date(session.started_at)}</span><div><b>{session.summary || "Conversa com Serena"}</b><small>{session.status === "closed" ? "Encerrada" : "Em andamento"} · Serena (agente de IA)</small></div><button onClick={onContinue}>Continuar →</button></article>) : <div className="empty-history"><b>Sua primeira conversa aparecerá aqui.</b><span>Comece pela avaliação para que a Serena conheça seu contexto inicial.</span></div>}</section></div>
}

function Admin({tab,setTab}:{tab:"documents"|"sessions";setTab:(t:"documents"|"sessions")=>void}) { return <div className="admin-page"><aside className="admin-nav"><div className="brand light"><span className="brand-mark"><span/></span><span>Serena<small>Administração</small></span></div><div className="admin-user"><span>AR</span><div><b>Ana Ribeiro</b><small>Administradora</small></div></div><nav><small>VISÃO GERAL</small><button className={tab==="sessions"?"active":""} onClick={()=>setTab("sessions")}><Icon name="trend"/> Dashboard</button><small>CONHECIMENTO</small><button className={tab==="documents"?"active":""} onClick={()=>setTab("documents")}><Icon name="file"/> Base de conteúdo <b>54</b></button><button><Icon name="book"/> Categorias</button><small>ATENDIMENTO</small><button><Icon name="chat"/> Conversas</button><button><Icon name="shield"/> Segurança</button><small>SISTEMA</small><button><Icon name="settings"/> Configurações</button></nav><div className="admin-safety"><Icon name="shield"/><b>Protocolos ativos</b><span>Última revisão: 02 ago</span></div></aside><section className="admin-content"><header><div><h1>Base de conhecimento</h1><p>Gerencie os conteúdos que fundamentam as respostas da Serena.</p></div><button className="primary" onClick={()=>alert("Selecione PDF, DOCX ou TXT para adicionar à base.")}><Icon name="plus"/> Adicionar conteúdo</button></header><div className="stats"><article><span>Documentos ativos</span><b>54</b><small><i>+4</i> este mês</small></article><article><span>Trechos indexados</span><b>812</b><small>100% processados</small></article><article><span>Uso nas respostas</span><b>94%</b><small><i>+2,4%</i> este mês</small></article><article><span>Revisão pendente</span><b>3</b><small>Requer atenção</small></article></div><div className="knowledge-card"><div className="filterbar"><div className="search"><Icon name="search"/><input placeholder="Buscar por título ou categoria..."/></div><button>Todos os status⌄</button><button>Todas as categorias⌄</button></div><table><thead><tr><th>CONTEÚDO</th><th>CATEGORIA</th><th>TRECHOS</th><th>ADICIONADO</th><th>STATUS</th><th></th></tr></thead><tbody>{documents.map((d)=><tr key={d.title}><td><span className="doc-icon"><Icon name="file"/></span><div><b>{d.title}</b><small>PDF · 1,4 MB</small></div></td><td><span className="tag">{d.tag}</span></td><td>{d.chunks}</td><td>{d.date}</td><td><span className="active-status"><span/> Ativo</span></td><td><button className="more"><Icon name="more"/></button></td></tr>)}</tbody></table><div className="table-footer">Mostrando 4 de 54 conteúdos <div><button>←</button><button className="active">1</button><button>2</button><button>3</button><button>→</button></div></div></div></section></div> }

function SafetyNote({compact=false}:{compact?:boolean}) { return <section className={`safety-note ${compact?"compact":""}`}><Icon name="shield" size={24}/><div><b>Serena é uma inteligência artificial — não uma psicóloga humana ou profissional licenciada.</b><p>Ela oferece apoio conversacional e informação, mas não realiza diagnósticos, não prescreve tratamentos e não substitui acompanhamento profissional. Em caso de risco imediato, ligue 192. Para apoio emocional, CVV 188.</p></div><button>Entenda os limites</button></section> }

function LoginModal({onClose,onSignIn,onSignUp}:{onClose:()=>void;onSignIn:(email:string,password:string)=>Promise<string>;onSignUp:(name:string,email:string,password:string)=>Promise<string>}) {
  const [mode,setMode]=useState<"login"|"signup">("login"); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(){setLoading(true);setError("");const message=mode==="login"?await onSignIn(email,password):await onSignUp(name,email,password);setError(message);setLoading(false);}
  function changeMode(next:"login"|"signup"){setMode(next);setError("");}
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="login-modal" onMouseDown={(e)=>e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><div className="brand center"><span className="brand-mark"><span/></span><span>Serena<small>cuidado conversacional</small></span></div><div className="auth-tabs"><button className={mode==="login"?"active":""} onClick={()=>changeMode("login")}>Entrar</button><button className={mode==="signup"?"active":""} onClick={()=>changeMode("signup")}>Criar conta</button></div><span className="eyebrow">Seu espaço seguro</span><h2>{mode==="login"?"Bem-vinda de volta":"Crie sua conta"}</h2><p>{mode==="login"?"Entre para continuar sua jornada de onde parou.":"Seu cadastro guardará sua avaliação e o histórico das conversas."}</p>{mode==="signup"&&<label>Como gostaria de ser chamado?<input value={name} onChange={(e)=>setName(e.target.value)} autoComplete="name" placeholder="Seu nome"/></label>}<label>E-mail<input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" autoComplete="email"/></label><label>Senha<input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" autoComplete={mode==="login"?"current-password":"new-password"} placeholder={mode==="signup"?"Pelo menos 6 caracteres":""}/></label>{error&&<div className="ai-connection-error" role="alert">{error}</div>}{mode==="login"&&<div className="login-options"><label><input type="checkbox" defaultChecked/> Lembrar de mim</label><button type="button">Esqueci minha senha</button></div>}<button className="primary full" disabled={loading||!email||password.length<6||(mode==="signup"&&!name.trim())} onClick={submit}>{loading?"Aguarde...":mode==="login"?"Entrar com segurança →":"Criar minha conta →"}</button><button className="auth-switch" onClick={()=>changeMode(mode==="login"?"signup":"login")}>{mode==="login"?"Ainda não tenho conta":"Já tenho uma conta"}</button><small className="terms">Ao continuar, você concorda com os Termos e a Política de Privacidade.</small><div className="login-safety"><Icon name="shield"/> Sua conta e seu histórico são protegidos pelo Supabase.</div></div></div> }
