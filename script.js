// TypeRush ⚡ Levels — Addictive Typing Game with levels, power-ups, particles, XP, missions
// All in vanilla JS, no external assets

const dom = {
  bg: document.getElementById('bg'),
  word: document.getElementById('word'),
  input: document.getElementById('input'),
  progress: document.getElementById('progress'),
  wpm: document.getElementById('wpm'),
  accuracy: document.getElementById('accuracy'),
  combo: document.getElementById('combo'),
  time: document.getElementById('time'),
  score: document.getElementById('score'),
  coins: document.getElementById('coins'),
  startBtn: document.getElementById('startBtn'),
  restartBtn: document.getElementById('restartBtn'),
  leaderBtn: document.getElementById('leaderBtn'),
  achieveBtn: document.getElementById('achieveBtn'),
  darkToggle: document.getElementById('darkToggle'),
  musicToggle: document.getElementById('musicToggle'),
  muteToggle: document.getElementById('muteToggle'),
  power: document.getElementById('power'),
  resultModal: document.getElementById('resultModal'),
  rWpm: document.getElementById('rWpm'),
  rAcc: document.getElementById('rAcc'),
  rScore: document.getElementById('rScore'),
  rMaxCombo: document.getElementById('rMaxCombo'),
  playerName: document.getElementById('playerName'),
  saveScoreBtn: document.getElementById('saveScoreBtn'),
  leaderModal: document.getElementById('leaderModal'),
  leaderList: document.getElementById('leaderList'),
  clearLeader: document.getElementById('clearLeader'),
  achieveModal: document.getElementById('achieveModal'),
  achieveList: document.getElementById('achieveList'),
  levelsGrid: document.getElementById('levelsGrid'),
  renameBtn: document.getElementById('renameBtn'),
  pname: document.getElementById('pname'),
  avatar: document.getElementById('avatar'),
  xpBar: document.getElementById('xpBar'),
  xpText: document.getElementById('xpText'),
  levelBadge: document.getElementById('levelBadge'),
  missionsList: document.getElementById('missionsList'),
};

// Animated background (particles)
const bg = {
  ctx: null, w:0, h:0, parts: [],
  init(){
    const c = dom.bg; this.ctx = c.getContext('2d'); this.resize();
    window.addEventListener('resize', ()=> this.resize());
    for(let i=0;i<120;i++) this.parts.push(this.make());
    this.loop();
  },
  make(){
    return {
      x: Math.random()*this.w, y: Math.random()*this.h,
      r: Math.random()*2+0.5,
      vx: (Math.random()-.5)*0.3, vy: (Math.random()-.5)*0.3,
      a: Math.random()*1
    };
  },
  resize(){ this.w = dom.bg.width = window.innerWidth; this.h = dom.bg.height = window.innerHeight; },
  loop(){
    const ctx=this.ctx;
    ctx.clearRect(0,0,this.w,this.h);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    this.parts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.a+=0.02;
      if(p.x<0) p.x+=this.w; if(p.x>this.w) p.x-=this.w;
      if(p.y<0) p.y+=this.h; if(p.y>this.h) p.y-=this.h;
      const r = p.r*(1+Math.sin(p.a)*0.3);
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
    });
    requestAnimationFrame(()=>this.loop());
  }
};

// Word bank
const WORDS = `dog cat love happy fast quick jump light night smile water green phone bottle window garden planet rocket galaxy future magic piano violin guitar camera energy system python laptop mobile coffee sugar tiger panda fox zebra flower butter yellow purple orange cookie school college mirror thunder coding typing gaming travel jungle silver golden diamond rainbow cloud ocean river island desert castle forest dragon wizard hero pixel laser turbo sprint memory shadow breeze echo nova orbit comet meteor solar lunar cosmic quantum vector matrix binary kernel parse render engine canvas rhythm melody harmony tempo chorus verse logic syntax cursor buffer packet server client router switch portal nexus vertex gamma theta sigma omega alpha` .split(/\s+/);

// Level definitions
const LEVELS = [
  { id:1, name:'Beginner',    minLen:3, maxLen:5, time:10, decay:0.2, theme:[ '#56e39f','#59c3c3' ], unlockScore: 150 },
  { id:2, name:'Fast Learner',minLen:5, maxLen:7, time:7,  decay:0.18, theme:[ '#ffd166','#fca311' ], unlockScore: 220 },
  { id:3, name:'Pro',         minLen:7, maxLen:10, time:5, decay:0.16, theme:[ '#ef476f','#ff6b6b' ], unlockScore: 280 },
  { id:4, name:'Insane',      minLen:7, maxLen:12, time:3.5,decay:0.14, theme:[ '#8338ec','#3a86ff' ], unlockScore: 350 },
  { id:5, name:'Survival 🚀', minLen:5, maxLen:12, time:2.8,decay:0.10, theme:[ '#00e5ff','#00ffa3' ], unlockScore: 0, survival:true },
];

// Persistent profile
const Profile = {
  key: 'typerush_profile_v2',
  data: { name:'Player', coins:0, xp:0, xpCap:100, level:1, unlocked:[1], avatar:'🐱', missions:[] },
  load(){
    try{ const d = JSON.parse(localStorage.getItem(this.key)); if(d) this.data = d; }catch{}
  },
  save(){ localStorage.setItem(this.key, JSON.stringify(this.data)); },
  addXP(x){
    this.data.xp += x;
    while(this.data.xp >= this.data.xpCap){
      this.data.xp -= this.data.xpCap;
      this.data.level++; this.data.xpCap = Math.round(this.data.xpCap*1.2 + 20);
      toast(`Profile Level Up! Lvl ${this.data.level}`);
      audio.good();
    }
    this.save(); uiProfile();
  },
  addCoins(c){ this.data.coins+=c; this.save(); dom.coins.textContent=this.data.coins; },
  unlockLevel(id){ if(!this.data.unlocked.includes(id)){ this.data.unlocked.push(id); this.save(); renderLevels(); toast(`Unlocked Level ${id}!`);} }
};

// State
let state = {
  running:false,
  level: LEVELS[0],
  timePerWord: 3,
  timerId:null,
  currentWord:'',
  startTs:0,
  totalChars:0, correctChars:0, totalKeys:0, correctKeys:0,
  wordsTyped:0, combo:0, maxCombo:0, score:0,
  achievements: new Set(),
  muted:false, musicOn:false
};

// Audio
const audio = {
  ctx:null, master:null, music:null, sfx:null, loopHandle:null,
  init(){ if(this.ctx) return; this.ctx=new (window.AudioContext||window.webkitAudioContext)(); this.master=this.ctx.createGain(); this.master.gain.value=0.8; this.music=this.ctx.createGain(); this.music.gain.value=0.25; this.sfx=this.ctx.createGain(); this.sfx.gain.value=0.7; this.music.connect(this.master); this.sfx.connect(this.master); this.master.connect(this.ctx.destination);},
  tone(f=440, d=0.12, type='sine', v=0.8, dest='sfx'){ if(state.muted) return; this.init(); const o=this.ctx.createOscillator(); const g=this.ctx.createGain(); o.type=type; o.frequency.value=f; g.gain.value=v; o.connect(g); g.connect(dest==='music'?this.music:this.sfx); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime+d); o.stop(this.ctx.currentTime+d);},
  chord(freqs=[392,494,587], dur=0.3){ if(state.muted) return; freqs.forEach((f,i)=> this.tone(f, dur+i*0.02, 'sine', 0.25, 'music')); },
  click(){ this.tone(660, .06, 'square', .3); },
  good(){ this.tone(880, .12, 'sawtooth', .4); },
  bad(){ this.tone(180, .2, 'triangle', .5); },
  comboUp(){ this.tone(520+state.combo*10, .1, 'square', .35); },
  loop(on){
    this.init();
    state.musicOn = on;
    if(on){
      const lvl = state.level.id;
      const loop = ()=>{
        if(!state.musicOn) return;
        // change harmony by level intensity
        const base = lvl*30 + 300;
        this.chord([base, base*1.25, base*1.5]);
        setTimeout(()=> this.chord([base*0.9, base*1.2, base*1.45]), 500);
        setTimeout(()=> this.chord([base*1.05, base*1.3, base*1.6]), 1000);
        this.loopHandle = setTimeout(loop, 1500 - lvl*100);
      };
      loop();
    } else {
      if(this.loopHandle) clearTimeout(this.loopHandle);
    }
  }
};

// Utilities
function randWord(minLen=3, maxLen=10){
  const w = WORDS.filter(w=> w.length>=minLen && w.length<=maxLen);
  return w[Math.floor(Math.random()*w.length)];
}
function setTheme(colors){
  document.documentElement.style.setProperty('--accent', colors[0]);
  document.documentElement.style.setProperty('--accent2', colors[1]);
}
function setWord(w){
  state.currentWord = w;
  dom.word.textContent = w;
  dom.input.value = '';
  dom.input.setAttribute('maxlength', w.length * 2);
  dom.input.focus();
  audio.click();
}
function updateHUD(){
  const minutes = Math.max((performance.now() - state.startTs)/60000, 0.001);
  const wpm = Math.round((state.correctChars/5)/minutes);
  const acc = state.totalKeys ? Math.round((state.correctKeys/state.totalKeys)*100) : 100;
  dom.wpm.textContent = wpm;
  dom.accuracy.textContent = `${acc}%`;
  dom.combo.textContent = `x${state.combo}`;
  dom.time.textContent = `${state.timePerWord.toFixed(1)}s`;
  dom.score.textContent = state.score;
  dom.coins.textContent = Profile.data.coins;
}

// Power-ups
const POWERS = [
  { id:'time',  label:'⏱ +Time',    apply: ()=> { state.timePerWord = Math.min(state.timePerWord + 1.5, state.level.time+2); } },
  { id:'combo', label:'🔥 x2 Combo', apply: ()=> { state.combo += 2; } },
  { id:'coins', label:'💎 +10 Coins',apply: ()=> { Profile.addCoins(10); } }
];
function tryPowerUp(){
  if(Math.random() < 0.18){ // 18% chance
    const p = POWERS[Math.floor(Math.random()*POWERS.length)];
    dom.power.textContent = p.label;
    dom.power.classList.remove('hidden');
    setTimeout(()=> dom.power.classList.add('show'), 10);
    p.apply();
    setTimeout(()=> { dom.power.classList.remove('show'); }, 1200);
  }
}

// Timer
function startTimer(){
  const start = performance.now();
  const total = state.timePerWord * 1000;
  const step = ()=>{
    if(!state.running) return;
    const t = performance.now() - start;
    const pct = Math.min(t/total, 1);
    dom.progress.style.width = `${(1-pct)*100}%`;
    if(pct >= 1){
      miss();
      if(state.level.survival){ endRound(); return; }
      nextWord(true);
    } else {
      state.timerId = requestAnimationFrame(step);
    }
  };
  cancelAnimationFrame(state.timerId);
  state.timerId = requestAnimationFrame(step);
}

function adjustDifficulty(){
  state.timePerWord = Math.max(state.timePerWord - state.level.decay, Math.min(1.2, state.level.time*0.5));
}

function scoreFor(word){
  const base = 10 + word.length * 2;
  const comboBonus = Math.floor(state.combo/5) * 10;
  return base + comboBonus + (state.level.id*3);
}

// Achievements
const ACHIEVEMENTS = [
  { id:'first', name:'First Word!', cond:s=>s.wordsTyped>=1 },
  { id:'combo25', name:'Combo x25', cond:s=>s.maxCombo>=25 },
  { id:'wpm60', name:'Fast Fingers (WPM 60+)', cond:s=> ((s.correctChars/5)/((performance.now()-s.startTs)/60000)) >= 60 },
  { id:'acc95', name:'Accuracy 95%+', cond:s=> (s.totalKeys? s.correctKeys/s.totalKeys*100:100) >= 95 },
  { id:'hundred', name:'100 Words', cond:s=> s.wordsTyped>=100 },
  { id:'streak10', name:'Perfect 10', cond:s=> s.maxCombo>=10 },
];
function renderAchievements(){
  dom.achieveList.innerHTML='';
  ACHIEVEMENTS.forEach(a=>{
    const li = document.createElement('li');
    const done = state.achievements.has(a.id);
    li.innerHTML = `<span>${a.name}</span><span class="badge2">${done?'Unlocked':'Locked'}</span>`;
    dom.achieveList.appendChild(li);
  });
}
function checkAchievements(){
  let unlocked=[];
  ACHIEVEMENTS.forEach(a=>{
    if(!state.achievements.has(a.id) && a.cond(state)){
      state.achievements.add(a.id);
      unlocked.push(a.name);
    }
  });
  if(unlocked.length){
    toast(`Unlocked: ${unlocked.join(', ')}`); audio.good();
  }
  renderAchievements();
}

// Levels UI
function renderLevels(){
  dom.levelsGrid.innerHTML='';
  LEVELS.forEach(l=>{
    const btn = document.createElement('button');
    btn.className = 'levelBtn';
    btn.textContent = `${l.id}. ${l.name}`;
    const unlocked = Profile.data.unlocked.includes(l.id);
    if(!unlocked) btn.classList.add('locked');
    if(l.id === state.level.id) btn.classList.add('active');
    btn.addEventListener('click', ()=>{
      if(!unlocked) { toast('Locked! Score more to unlock.'); return; }
      state.level = l; setTheme(l.theme); document.querySelectorAll('.levelBtn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    });
    dom.levelsGrid.appendChild(btn);
  });
}

// Missions
const ALL_MISSIONS = [
  { id:'m1', text:'Type 50 words', cond: s=> s.wordsTyped>=50, reward: 50 },
  { id:'m2', text:'Reach WPM 70',  cond: s=> ((s.correctChars/5)/((performance.now()-s.startTs)/60000)) >= 70, reward: 70 },
  { id:'m3', text:'Combo x20',     cond: s=> s.maxCombo>=20, reward: 60 },
];
function refreshDailyMissions(){
  const today = new Date().toDateString();
  if(Profile.data.missions.length && Profile.data.missions[0].day === today) return;
  // pick 2 missions
  const picked = ALL_MISSIONS.sort(()=>0.5-Math.random()).slice(0,2).map(m=>({ ...m, done:false }));
  Profile.data.missions = [{ day: today, items: picked }];
  Profile.save();
}
function renderMissions(){
  refreshDailyMissions();
  dom.missionsList.innerHTML='';
  const items = Profile.data.missions[0].items;
  items.forEach(m=>{
    const li = document.createElement('li');
    li.innerHTML = `${m.done?'✅':'⬜'} ${m.text} <span class="badge">+${m.reward} coins</span>`;
    dom.missionsList.appendChild(li);
  });
}
function checkMissions(){
  const items = Profile.data.missions[0].items;
  let changed=false;
  items.forEach(m=>{
    if(!m.done && m.cond(state)){ m.done=true; Profile.addCoins(m.reward); toast(`Mission complete: ${m.text}`); changed=true; }
  });
  if(changed){ Profile.save(); renderMissions(); }
}

// Leaderboard
function getLeaderboard(){ return JSON.parse(localStorage.getItem('typerush_leader_v2')||'[]'); }
function setLeaderboard(a){ localStorage.setItem('typerush_leader_v2', JSON.stringify(a.slice(0,20))); }
function pushScore(e){ const l=getLeaderboard(); l.push(e); l.sort((a,b)=> b.score-a.score); setLeaderboard(l); }
function renderLeaderboard(){
  const list = getLeaderboard();
  dom.leaderList.innerHTML = list.length? '' : '<li>No scores yet</li>';
  list.forEach(e=>{
    const li = document.createElement('li');
    li.textContent = `${e.name} — ${e.score} pts (Lvl ${e.level}, ${e.mode}, WPM ${e.wpm}, ${e.acc}%, max ${e.maxCombo})`;
    dom.leaderList.appendChild(li);
  });
}

// Toast
let toastId=0;
function toast(msg){
  const id=`t${toastId++}`;
  const el=document.createElement('div');
  el.textContent=msg;
  el.style.position='fixed'; el.style.bottom='20px'; el.style.left='50%'; el.style.transform='translateX(-50%)';
  el.style.padding='10px 14px'; el.style.background='rgba(0,0,0,.8)'; el.style.color='#fff'; el.style.borderRadius='10px'; el.style.boxShadow='0 10px 30px rgba(0,0,0,.3)';
  el.style.zIndex=9999; el.style.pointerEvents='none';
  document.body.appendChild(el); setTimeout(()=> el.remove(), 1800);
}

// Game flow
function resetState(){
  state.running=false;
  state.timePerWord = state.level.time;
  state.startTs = performance.now();
  state.totalChars=0; state.correctChars=0; state.totalKeys=0; state.correctKeys=0;
  state.wordsTyped=0; state.combo=0; state.maxCombo=0; state.score=0;
  updateHUD();
}
function nextWord(timeoutMiss=false){
  const w = randWord(state.level.minLen, state.level.maxLen);
  setWord(w); adjustDifficulty(); startTimer();
  if(timeoutMiss){ state.combo=0; }
}
function hit(){
  state.wordsTyped++; state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.correctChars += state.currentWord.length;
  state.score += scoreFor(state.currentWord);
  Profile.addXP(5 + state.level.id); // XP for each correct word
  audio.good();
  if(state.combo % 5 === 0){ audio.comboUp(); toast(`Combo x${state.combo}! Bonus`); }
  tryPowerUp();
  checkAchievements(); checkMissions();
  nextWord();
}
function miss(){
  state.combo=0; audio.bad();
}
function endRound(){
  state.running=false; cancelAnimationFrame(state.timerId); dom.input.disabled=true;
  const minutes = Math.max((performance.now()-state.startTs)/60000, 0.001);
  const wpm = Math.round((state.correctChars/5)/minutes);
  const acc = state.totalKeys? Math.round(state.correctKeys/state.totalKeys*100) : 100;
  dom.rWpm.textContent = wpm; dom.rAcc.textContent = `${acc}%`; dom.rScore.textContent = state.score; dom.rMaxCombo.textContent = `x${state.maxCombo}`;
  dom.resultModal.showModal(); dom.restartBtn.disabled=false;

  // Unlock next level if score high enough
  const idx = LEVELS.findIndex(l=>l.id===state.level.id);
  const next = LEVELS[idx+1];
  if(next && state.score >= (state.level.unlockScore||0)){
    Profile.unlockLevel(next.id);
  }
  // Coins reward
  const reward = Math.round(state.score/20);
  Profile.addCoins(reward);
  Profile.addXP(20 + state.level.id*5);

  // Save leaderboard
  pushScore({name: Profile.data.name, score: state.score, wpm, acc, maxCombo: state.maxCombo, mode: state.level.survival?'Survival':'Classic', level: state.level.id, ts: Date.now()});
}
function startGame(){
  resetState();
  state.running=true; dom.input.disabled=false; nextWord();
}

// Input
dom.input.addEventListener('input', e=>{
  if(!state.running) return;
  const val=e.target.value; state.totalKeys++;
  const should=state.currentWord;
  const ok = should.startsWith(val);
  if(!ok){ dom.input.classList.add('wrong'); setTimeout(()=> dom.input.classList.remove('wrong'), 120); miss(); return; }
  else state.correctKeys++;
  if(val===should){ e.target.value=''; hit(); }
});

// Controls
dom.startBtn.addEventListener('click', ()=>{ audio.init(); audio.loop(state.musicOn); startGame(); dom.restartBtn.disabled=true; });
dom.restartBtn.addEventListener('click', ()=>{ startGame(); dom.resultModal.close(); });
dom.leaderBtn.addEventListener('click', ()=>{ renderLeaderboard(); dom.leaderModal.showModal(); });
dom.clearLeader.addEventListener('click', (e)=>{ e.preventDefault(); localStorage.removeItem('typerush_leader_v2'); renderLeaderboard(); });
dom.achieveBtn.addEventListener('click', ()=>{ renderAchievements(); dom.achieveModal.showModal(); });
dom.musicToggle.addEventListener('click', ()=>{ state.musicOn=!state.musicOn; audio.loop(state.musicOn); });
dom.muteToggle.addEventListener('click', ()=>{ state.muted=!state.muted; toast(state.muted?'SFX Muted':'SFX On'); });
dom.darkToggle.addEventListener('click', ()=>{ document.documentElement.classList.toggle('light'); localStorage.setItem('typerush_theme', document.documentElement.classList.contains('light')?'light':'dark'); });

// Profile UI
function uiProfile(){
  dom.pname.textContent = Profile.data.name;
  dom.avatar.textContent = Profile.data.avatar;
  dom.levelBadge.textContent = `Lvl ${Profile.data.level}`;
  dom.xpBar.style.width = `${Math.min(100, (Profile.data.xp/Profile.data.xpCap)*100)}%`;
  dom.xpText.textContent = `${Profile.data.xp} / ${Profile.data.xpCap} XP`;
  dom.coins.textContent = Profile.data.coins;
}
dom.renameBtn.addEventListener('click', ()=>{
  const name = prompt('Enter player name:', Profile.data.name) || Profile.data.name;
  Profile.data.name = name;
  const avatars = ['🐱','🐶','🐼','🦊','🐯','🐨','🐵','🐸','🐹','🐰'];
  Profile.data.avatar = avatars[Math.floor(Math.random()*avatars.length)];
  Profile.save(); uiProfile();
});

// Restore theme
if(localStorage.getItem('typerush_theme')==='light'){ document.documentElement.classList.add('light'); }

// Save score (modal)
dom.saveScoreBtn.addEventListener('click', (e)=>{
  e.preventDefault();
  const minutes = Math.max((performance.now()-state.startTs)/60000, 0.001);
  const wpm = Math.round((state.correctChars/5)/minutes);
  const acc = state.totalKeys? Math.round(state.correctKeys/state.totalKeys*100) : 100;
  const name = dom.playerName.value.trim() || Profile.data.name;
  pushScore({name, score: state.score, wpm, acc, maxCombo: state.maxCombo, mode: state.level.survival?'Survival':'Classic', level: state.level.id, ts: Date.now()});
  dom.resultModal.close(); toast('Saved to Leaderboard!');
});

// Init
Profile.load(); uiProfile(); renderLevels(); renderMissions(); renderLeaderboard(); renderAchievements();
setTheme(LEVELS[0].theme);
bg.init();

// Keyboard shortcut
window.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !state.running) startGame(); });
