/**
 * Terralyze Eco — Core Application Logic
 * Pure Client-side SPA, UI Animations, Web Audio API synthesis, & LocalStorage Sync
 */

// --- GLOBAL APPLICATION STATE ---
let state = {
  streakCount: 1,
  lastActivityDate: '',
  dailyTargetBudget: 15.0, // kg CO2e
  activityLog: [],
  activeChallenges: [], // items: { id: string, joined: boolean, completed: boolean }
  simTrees: 0,
  simBulbs: 0,
  simSolar: 0,
  audioEnabled: true,
  
  // Current session calculator state
  calcCategory: 'transport', // transport, food, energy, waste
  
  // Trivia Game state
  triviaActive: false,
  triviaQuestions: [],
  currentTriviaIndex: 0,
  triviaAnswers: [], // user chosen option index
  triviaScore: 0,
  triviaTimerInterval: null,
  triviaTimeElapsed: 0,
};

// --- CARBON CONVERSION COEFFICIENTS (kg CO2e per unit) ---
const COEFFICIENTS = {
  transport: {
    car: {
      petrol: 0.18,  // per km
      diesel: 0.17,  // per km
      electric: 0.05 // per km
    },
    transit: 0.04,   // per km
    flight: 0.15,    // per km
    bike: 0.00       // per km
  },
  food: {
    'meat-heavy': 3.0, // per meal
    'average': 2.0,    // per meal
    'vegetarian': 1.2, // per meal
    'vegan': 0.7       // per meal
  },
  energy: {
    electricity: 0.38, // per kWh
    gas: 0.20          // per kWh
  },
  waste: {
    general: 0.50      // per kg
    // recycling saves percentage of general waste footprint
  }
};

// --- TRIVIA QUESTIONS BANK ---
const TRIVIA_BANK = {
  'climate-science': [
    {
      question: "What is the primary mechanism of the greenhouse effect?",
      options: [
        "Atmospheric gases trapping infrared radiation (heat) emitted from Earth's surface",
        "Ozone layer depletion letting in more harmful UV radiation from the sun",
        "Acid rain chemical reactions heating up soil and water systems",
        "Oceans releasing carbon dioxide gas when they get hit by solar flares"
      ],
      answerIndex: 0,
      explanation: "Greenhouse gases (like CO2 and water vapor) absorb thermal infrared radiation emitted by the Earth and re-radiate it in all directions, warming the atmosphere."
    },
    {
      question: "Which of the following greenhouse gases is the most abundant in Earth's atmosphere overall?",
      options: [
        "Carbon Dioxide (CO2)",
        "Water Vapor (H2O)",
        "Methane (CH4)",
        "Nitrous Oxide (N2O)"
      ],
      answerIndex: 1,
      explanation: "Water vapor is the most abundant greenhouse gas. However, human activities primarily increase CO2, which persists much longer and drives global warming."
    },
    {
      question: "What is the primary cause of ocean acidification?",
      options: [
        "Acid rain carrying agricultural runoff into rivers",
        "The absorption of excess atmospheric CO2 by seawater",
        "Microplastics dissolving into toxic chemical compounds",
        "Underwater volcanic eruptions releasing sulfuric acid"
      ],
      answerIndex: 1,
      explanation: "As atmospheric CO2 levels rise, oceans absorb more of it. This chemical reaction produces carbonic acid, lowering seawater pH and harming marine life."
    },
    {
      question: "What percentage of the excess heat trapped by greenhouse gases is absorbed by oceans?",
      options: [
        "Approximately 10%",
        "Approximately 30%",
        "Approximately 50%",
        "Approximately 90%"
      ],
      answerIndex: 3,
      explanation: "Oceans absorb over 90% of the excess heat trapped by greenhouse gases, buffering atmospheric warming but causing ocean warming and expansion."
    },
    {
      question: "Which Arctic phenomenon accelerates global warming when sea ice melts?",
      options: [
        "Albedo effect reduction (dark open water absorbs more solar heat than white ice)",
        "Geothermal heat release from the seabed",
        "Increased solar wind deflection near the magnetic north pole",
        "Rapid ozone creation in cold upper atmospheric layers"
      ],
      answerIndex: 0,
      explanation: "Sea ice reflects solar energy back to space. When it melts, dark ocean water absorbs it instead, heating the region further in a positive feedback loop."
    }
  ],
  'carbon-footprint': [
    {
      question: "What is the average global carbon footprint per person per year?",
      options: [
        "Around 1.5 tonnes CO2e",
        "Around 4.7 tonnes CO2e",
        "Around 16.0 tonnes CO2e",
        "Around 35.0 tonnes CO2e"
      ],
      answerIndex: 1,
      explanation: "According to the World Bank, the average global per capita footprint is about 4.7 tonnes, though developed nations like the US average over 14 tonnes."
    },
    {
      question: "Which phase of a food product's lifecycle generally accounts for the largest share of its carbon emissions?",
      options: [
        "On-farm production (land use, methane from animals, fertilizers)",
        "Long-distance transportation and distribution (food miles)",
        "Packaging (cardboard, plastics, aluminum foil)",
        "Retail refrigeration and household cooking energy"
      ],
      answerIndex: 0,
      explanation: "On-farm agricultural production accounts for about 80% of food carbon footprints. Eating local is good, but eating plant-based reduces footprints much more."
    },
    {
      question: "Approximately how much carbon dioxide does one mature tree absorb per year?",
      options: [
        "About 2.2 kg CO2",
        "About 22.0 kg CO2",
        "About 120.0 kg CO2",
        "About 500.0 kg CO2"
      ],
      answerIndex: 1,
      explanation: "An average mature tree sequesteres around 22 kilograms (48 lbs) of carbon dioxide annually, making reforestation a key carbon offsetting method."
    },
    {
      question: "Which method of laundry washing reduces carbon footprint the most?",
      options: [
        "Washing at 30°C or cold cycle (air drying instead of machine tumble drying)",
        "Using extra liquid detergent in warm water cycles",
        "Running short wash cycles at 60°C",
        "Dry cleaning garments instead of machine washing"
      ],
      answerIndex: 0,
      explanation: "Over 75% of a washing machine's footprint goes to heating water. Washing cold and line-drying cuts laundry energy consumption by 90%."
    },
    {
      question: "What is considered a 'carbon offset'?",
      options: [
        "A mechanism that balances emissions by funding equivalent carbon reductions elsewhere",
        "A tax penalty applied to corporations exceeding greenhouse limits",
        "A filter installed on industrial chimneys to capture solid soot particles",
        "Replacing a petrol vehicle with a larger diesel car"
      ],
      answerIndex: 0,
      explanation: "Carbon offsets represent actions (like planting trees or building clean energy) that remove or prevent CO2 emissions to compensate for emissions made elsewhere."
    }
  ],
  'renewables': [
    {
      question: "Which energy source is classified as clean and completely renewable?",
      options: [
        "Geothermal energy",
        "Natural gas (methane)",
        "Clean coal technology",
        "Nuclear fission energy"
      ],
      answerIndex: 0,
      explanation: "Geothermal energy utilizes heat from the Earth's core. It is renewable and produces near-zero greenhouse gas emissions."
    },
    {
      question: "What type of technology generates electricity directly from sunlight?",
      options: [
        "Photovoltaic (PV) cells",
        "Solar thermal parabolic troughs",
        "Photosynthetic bio-reactors",
        "Galvanic hydrogen fuel cells"
      ],
      answerIndex: 0,
      explanation: "Photovoltaic cells use semiconductor materials to absorb photons and generate free electrons, converting light directly into electric currents."
    },
    {
      question: "Which clean energy source is highly weather-dependent but has the lowest operational footprint?",
      options: [
        "Wind energy",
        "Biomass combustion",
        "Petroleum generator systems",
        "Natural gas micro-turbines"
      ],
      answerIndex: 0,
      explanation: "Wind turbines generate zero carbon during operations, though their output fluctuates based on local weather conditions."
    }
  ],
  'biodiversity': [
    {
      question: "What is a 'keystone species' in ecology?",
      options: [
        "A species that has a disproportionately large impact on its ecosystem relative to its abundance",
        "A species that was first introduced from an external geographic continent",
        "A micro-organism that lives inside mineral rocks and stone formations",
        "A plant species that yields heavy wood used for construction keystones"
      ],
      answerIndex: 0,
      explanation: "Keystone species (like sea otters or wolves) maintain the structure of their ecological communities. Removing them can collapse the entire ecosystem."
    },
    {
      question: "What is currently the leading driver of global biodiversity loss?",
      options: [
        "Habitat destruction and land-use change (deforestation, agriculture)",
        "Overhunting and direct harvesting of animals",
        "Invasive alien species displacing native plants",
        "Chemical pollution of oceanic reef systems"
      ],
      answerIndex: 0,
      explanation: "Clearing forests for agriculture, urbanization, and timber destroys habitats, presenting the largest threat to terrestrial species today."
    }
  ]
};

// --- PRE-CODED ECO CHALLENGES ---
const CHALLENGE_LIBRARY = [
  { id: 'ch_meatless', name: 'Meatless Monday', desc: 'Eat plant-based meals today.', category: 'food', reward: 2.5 },
  { id: 'ch_nocar', name: 'No-Car Commute', desc: 'Use public transit, cycle, or walk.', category: 'transport', reward: 5.0 },
  { id: 'ch_coldwash', name: 'Cold Water Cycle', desc: 'Wash laundry on cold setting and line dry.', category: 'energy', reward: 1.2 },
  { id: 'ch_standby', name: 'Standby Shutdown', desc: 'Unplug idle electronics and chargers.', category: 'energy', reward: 0.6 },
  { id: 'ch_recycleday', name: 'Zero Waste Focus', desc: 'Recycle all waste and compost organic matter.', category: 'waste', reward: 1.5 }
];

// --- RECOMMENDATION TIPS BANK ---
const RECOMMENDATIONS = [
  { category: 'transport', title: 'Carpool or Transit', text: 'Sharing a ride cuts travel emissions by 50%. Public transit reduces it even further.' },
  { category: 'transport', title: 'Maintain Tires & Speed', text: 'Under-inflated tires increase fuel consumption by 3%. Driving smoothly saves petrol.' },
  { category: 'transport', title: 'Active Transit', text: 'Biking or walking produces zero emissions and provides a healthy cardiovascular workout.' },
  
  { category: 'food', title: 'Incorporate Plant Meals', text: 'Substituting beef with beans/tofu even once a week significantly lowers your agricultural footprint.' },
  { category: 'food', title: 'Minimize Food Waste', text: 'Rotting food in landfills produces methane. Meal prep carefully and compost leftovers.' },
  { category: 'food', title: 'Choose Local & Seasonal', text: 'Reduces heavy transport miles and emissions from long-term temperature-controlled storage.' },
  
  { category: 'energy', title: 'Thermostat Adjustment', text: 'Adjusting your thermostat by 1°C can lower your home heating or cooling bill by 8%.' },
  { category: 'energy', title: 'LED Bulb Upgrades', text: 'LEDs consume 80% less energy than incandescent bulbs and last up to 25 times longer.' },
  { category: 'energy', title: 'Unplug Phantom Loads', text: 'Appliances on standby draw trickle power. Unplug chargers or use smart power strips.' },
  
  { category: 'waste', title: 'Avoid Single-Use Plastics', text: 'Producing plastic is highly petrochemical intensive. Choose reusable bags and cups.' },
  { category: 'waste', title: 'Strict Recycler Habits', text: 'Clean glass, paper, and metals before throwing them in recycle bins to prevent contamination.' },
  { category: 'waste', title: 'Repair Before Disposing', text: 'Fixing items or purchasing second-hand items prevents industrial manufacturing footprints.' }
];

// --- WEB AUDIO SYNTHESIZED SOUND ENGINE ---
const SoundFX = {
  ctx: null,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  },

  playClick() {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  },

  playSuccess() {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Eco arpeggio (C4 -> E4 -> G4 -> C5)
    const notes = [261.63, 329.63, 392.00, 523.25];
    const duration = 0.12;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.06, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.07 + duration);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + duration);
    });
  },

  playError() {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Low alert slide
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  },

  playChallengeComplete() {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [349.23, 440.00, 523.25, 698.46, 880.00]; // F major arpeggio
    const duration = 0.15;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.08, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.06 + duration);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + duration);
    });
  }
};

// --- SYSTEM INITIALIZATION & LOCAL STORAGE SYNC ---
function loadStateFromStorage() {
  const stored = localStorage.getItem('terralyze_state');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      state = { ...state, ...parsed };
      
      // Reset non-persist states
      state.triviaActive = false;
      state.triviaTimerInterval = null;
    } catch (e) {
      console.error("Failed to parse local storage state", e);
    }
  } else {
    // Populate some default history logs for representation
    generateDefaultLogs();
  }
  
  checkStreakProgression();
  initializeChallengesState();
  saveStateToStorage();
}

function saveStateToStorage() {
  const serializable = {
    streakCount: state.streakCount,
    lastActivityDate: state.lastActivityDate,
    dailyTargetBudget: state.dailyTargetBudget,
    activityLog: state.activityLog,
    activeChallenges: state.activeChallenges,
    simTrees: state.simTrees,
    simBulbs: state.simBulbs,
    simSolar: state.simSolar,
    audioEnabled: state.audioEnabled
  };
  localStorage.setItem('terralyze_state', JSON.stringify(serializable));
}

function generateDefaultLogs() {
  const today = new Date();
  const logs = [];
  
  // Create dummy logs for the past 6 days
  for (let i = 6; i > 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = "18:30";
    const ts = d.getTime();
    
    // Distribute carbon values across days
    logs.push({
      id: 'act_tr_' + ts,
      type: 'transport',
      description: `Commute: ${20 + i} km via Petrol Car`,
      value: Number(((20 + i) * COEFFICIENTS.transport.car.petrol).toFixed(1)),
      time: timeStr,
      timestamp: ts,
      dateStr: dateStr
    });
    logs.push({
      id: 'act_fd_' + ts,
      type: 'food',
      description: `Diet: Prepared 3 Average Meals`,
      value: Number((3 * COEFFICIENTS.food.average).toFixed(1)),
      time: timeStr,
      timestamp: ts + 1000,
      dateStr: dateStr
    });
    logs.push({
      id: 'act_en_' + ts,
      type: 'energy',
      description: `Home: Energy used (8 kWh grid)`,
      value: Number((8 * COEFFICIENTS.energy.electricity).toFixed(1)),
      time: timeStr,
      timestamp: ts + 2000,
      dateStr: dateStr
    });
  }
  
  state.activityLog = logs;
  state.lastActivityDate = new Date(today.getTime() - 24*60*60*1000).toISOString().split('T')[0];
}

function checkStreakProgression() {
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (!state.lastActivityDate) {
    state.streakCount = 1;
    state.lastActivityDate = todayStr;
    return;
  }
  
  if (state.lastActivityDate === todayStr) {
    return;
  }
  
  const lastDate = new Date(state.lastActivityDate);
  const todayDate = new Date(todayStr);
  const diffTime = Math.abs(todayDate - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    state.streakCount += 1;
    state.lastActivityDate = todayStr;
    showToast('flame', `Streak extended! Day ${state.streakCount} streak active.`, 'warning');
  } else if (diffDays > 1) {
    state.streakCount = 1;
    state.lastActivityDate = todayStr;
    showToast('flame', 'New tracking streak started!', 'info');
  }
}

function initializeChallengesState() {
  // Synchronize challenge library structure with saved state
  if (state.activeChallenges.length === 0) {
    state.activeChallenges = CHALLENGE_LIBRARY.map(ch => ({
      id: ch.id,
      joined: false,
      completed: false
    }));
  } else {
    // Check if new challenges were added to code
    CHALLENGE_LIBRARY.forEach(ch => {
      const exists = state.activeChallenges.some(saved => saved.id === ch.id);
      if (!exists) {
        state.activeChallenges.push({
          id: ch.id,
          joined: false,
          completed: false
        });
      }
    });
  }
}

// --- DOM SYNC & METRIC CALCULATIONS ---
function updateDashboardMetrics() {
  const todayStr = new Date().toISOString().split('T')[0];
  const logs = state.activityLog;
  
  // Calculate Today's footprint
  const todayLogs = logs.filter(log => log.dateStr === todayStr && log.type !== 'offset');
  const todayOffsetLogs = logs.filter(log => log.dateStr === todayStr && log.type === 'offset');
  const todayRawVal = todayLogs.reduce((acc, curr) => acc + curr.value, 0);
  const todayOffsets = todayOffsetLogs.reduce((acc, curr) => acc + curr.value, 0);
  const todayNet = Math.max(0, todayRawVal - todayOffsets);
  
  document.getElementById('stat-today-co2').textContent = `${todayNet.toFixed(1)} kg`;
  
  // Calculate Weekly Footprint (last 7 days total)
  const last7DaysLimit = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyLogs = logs.filter(log => log.timestamp >= last7DaysLimit && log.type !== 'offset');
  const weeklyOffsetLogs = logs.filter(log => log.timestamp >= last7DaysLimit && log.type === 'offset');
  const weeklyRaw = weeklyLogs.reduce((acc, curr) => acc + curr.value, 0);
  const weeklyOffsetVal = weeklyOffsetLogs.reduce((acc, curr) => acc + curr.value, 0);
  const weeklyNet = Math.max(0, weeklyRaw - weeklyOffsetVal);
  
  document.getElementById('stat-weekly-co2').textContent = `${weeklyNet.toFixed(1)} kg`;
  
  // Calculate Daily Average (over days with active records in the last week)
  const uniqueDays = new Set(weeklyLogs.map(log => log.dateStr));
  const activeDaysCount = uniqueDays.size || 1;
  const dailyAverage = weeklyNet / activeDaysCount;
  
  document.getElementById('stat-weekly-avg').textContent = `${dailyAverage.toFixed(1)} kg`;
  
  // Total offsets (challenges completed total)
  const totalOffsetVal = logs.filter(log => log.type === 'offset').reduce((acc, curr) => acc + curr.value, 0);
  document.getElementById('stat-total-offsets').textContent = `${totalOffsetVal.toFixed(1)} kg`;
  
  // Update header and dashboard budget progression
  const budgetLimit = state.dailyTargetBudget;
  const budgetPercentage = Math.min(100, Math.round((todayNet / budgetLimit) * 100));
  
  // Header circle (Radius = 16, Circumference = 2 * PI * 16 = 100.5)
  const headerCircle = document.getElementById('header-goal-circle');
  const headerOffset = 100.5 - (budgetPercentage / 100) * 100.5;
  headerCircle.style.strokeDashoffset = headerOffset;
  document.getElementById('header-goal-pct').textContent = `${budgetPercentage}%`;
  document.getElementById('header-goal-text').textContent = `${todayNet.toFixed(1)} / ${budgetLimit.toFixed(1)} kg`;
  
  // Dashboard circle (Radius = 65, Circumference = 2 * PI * 65 = 408.4)
  const dashCircle = document.getElementById('dashboard-goal-circle');
  const dashOffset = 408.4 - (budgetPercentage / 100) * 408.4;
  dashCircle.style.strokeDashoffset = dashOffset;
  document.getElementById('dashboard-goal-pct').textContent = `${budgetPercentage}%`;
  document.getElementById('dashboard-goal-val').textContent = `${todayNet.toFixed(1)} / ${budgetLimit.toFixed(1)} kg`;
  
  // Dynamic stroke color indicator (Green when safe, Red when over budget)
  if (todayNet > budgetLimit) {
    dashCircle.style.stroke = 'var(--accent-red)';
    headerCircle.style.stroke = 'var(--accent-red)';
    document.getElementById('dashboard-goal-sublabel').textContent = 'Limit Exceeded';
    document.getElementById('dashboard-goal-sublabel').className = 'large-sublabel text-yellow';
  } else {
    dashCircle.style.stroke = 'var(--primary-mint)';
    headerCircle.style.stroke = 'var(--primary-mint)';
    document.getElementById('dashboard-goal-sublabel').textContent = 'Emitted';
    document.getElementById('dashboard-goal-sublabel').className = 'large-sublabel';
  }
  
  // Mini streaks
  document.getElementById('mini-streak-count').textContent = state.streakCount;
  document.getElementById('streak-count-value').textContent = state.streakCount;
  
  // Refresh list and chart
  renderActivityLogs();
  renderWeeklyChart();
}

function renderActivityLogs() {
  const container = document.getElementById('activity-log-list');
  const logs = state.activityLog;
  
  if (logs.length === 0) {
    container.innerHTML = `
      <li class="empty-activity">
        <i data-lucide="calendar"></i>
        <p>No activity logged today. Add items in the Calculator to track your carbon footprint!</p>
      </li>
    `;
    lucide.createIcons();
    return;
  }
  
  container.innerHTML = logs.map(log => {
    return `
      <li class="activity-item">
        <div class="activity-item-icon act-${log.type}">
          <i data-lucide="${getIconForCategory(log.type)}"></i>
        </div>
        <div class="activity-item-content">
          <p>${log.description}</p>
          <div class="activity-item-meta">
            <span>${log.dateStr} at ${log.time}</span>
            <span class="${log.type === 'offset' ? 'text-green' : 'text-yellow'}" style="font-weight:700;">
              ${log.type === 'offset' ? '-' : '+'}${log.value.toFixed(1)} kg CO2e
            </span>
          </div>
        </div>
        <button class="btn-delete-log" onclick="deleteLogItem('${log.id}')" title="Delete record">
          <i data-lucide="trash-2"></i>
        </button>
      </li>
    `;
  }).join('');
  
  lucide.createIcons();
}

function getIconForCategory(cat) {
  switch (cat) {
    case 'transport': return 'car';
    case 'food': return 'apple';
    case 'energy': return 'zap';
    case 'waste': return 'trash';
    case 'offset': return 'award';
    default: return 'leaf';
  }
}

function deleteLogItem(id) {
  SoundFX.playError();
  state.activityLog = state.activityLog.filter(log => log.id !== id);
  showToast('trash-2', 'Activity record removed.', 'danger');
  saveStateToStorage();
  updateDashboardMetrics();
}

// --- DYNAMIC SVG CHART GENERATION ---
function renderWeeklyChart() {
  const chart = document.getElementById('weekly-emissions-chart');
  if (!chart) return;
  
  // Calculate stats for the last 7 calendar days
  const today = new Date();
  const labels = [];
  const dailyValues = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Day short name label (e.g. "Mon")
    const shortDayName = d.toLocaleDateString([], { weekday: 'short' });
    labels.push(shortDayName);
    
    // Aggregate values for this day (net emissions)
    const dayLogs = state.activityLog.filter(log => log.dateStr === dateStr && log.type !== 'offset');
    const dayOffsets = state.activityLog.filter(log => log.dateStr === dateStr && log.type === 'offset');
    const rawVal = dayLogs.reduce((acc, curr) => acc + curr.value, 0);
    const offsetVal = dayOffsets.reduce((acc, curr) => acc + curr.value, 0);
    const netVal = Math.max(0, rawVal - offsetVal);
    dailyValues.push(netVal);
  }
  
  // Sizing details
  const width = chart.clientWidth || 320;
  const height = 180;
  const paddingLeft = 30;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;
  
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  
  const maxVal = Math.max(state.dailyTargetBudget * 1.2, ...dailyValues, 10);
  
  // Clear existing elements in SVG
  chart.innerHTML = '';
  
  // Render grid lines & Y labels (0, Half, Max)
  const gridVals = [0, maxVal / 2, maxVal];
  gridVals.forEach(val => {
    const y = paddingTop + plotHeight - (val / maxVal) * plotHeight;
    // Line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", paddingLeft);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - paddingRight);
    line.setAttribute("y2", y);
    line.setAttribute("class", "chart-grid-line");
    chart.appendChild(line);
    
    // Label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", paddingLeft - 8);
    text.setAttribute("y", y + 4);
    text.setAttribute("class", "chart-text");
    text.setAttribute("style", "text-anchor: end; font-size: 8px;");
    text.textContent = `${val.toFixed(0)}`;
    chart.appendChild(text);
  });
  
  // Render budget line
  const budgetY = paddingTop + plotHeight - (state.dailyTargetBudget / maxVal) * plotHeight;
  const budgetLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  budgetLine.setAttribute("x1", paddingLeft);
  budgetLine.setAttribute("y1", budgetY);
  budgetLine.setAttribute("x2", width - paddingRight);
  budgetLine.setAttribute("y2", budgetY);
  budgetLine.setAttribute("stroke", "var(--accent-red)");
  budgetLine.setAttribute("stroke-width", "1");
  budgetLine.setAttribute("stroke-dasharray", "4 4");
  chart.appendChild(budgetLine);
  
  // Render Columns
  const barCount = dailyValues.length;
  const barGap = 16;
  const barWidth = (plotWidth - (barGap * (barCount - 1))) / barCount;
  
  dailyValues.forEach((val, i) => {
    const colHeight = (val / maxVal) * plotHeight;
    const x = paddingLeft + i * (barWidth + barGap);
    const y = paddingTop + plotHeight - colHeight;
    
    // Draw bar rect
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", Math.max(2, colHeight));
    rect.setAttribute("rx", "4");
    rect.setAttribute("class", "chart-bar");
    
    // Dynamic color: highlight in red if budget exceeded
    if (val > state.dailyTargetBudget) {
      rect.setAttribute("fill", "url(#red-gradient)");
    } else {
      rect.setAttribute("fill", "url(#eco-gradient)");
    }
    
    // Mouse hover events for tooltips
    const tooltip = document.getElementById('chart-tooltip');
    rect.addEventListener('mouseenter', (e) => {
      tooltip.style.display = 'block';
      tooltip.textContent = `${val.toFixed(1)} kg CO2e`;
      
      const chartBox = chart.getBoundingClientRect();
      const leftOffset = x + barWidth / 2 + paddingLeft;
      tooltip.style.left = `${(x + barWidth / 2)}px`;
      tooltip.style.top = `${y - 10}px`;
    });
    
    rect.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
    
    chart.appendChild(rect);
    
    // Draw X Label below bar
    const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xLabel.setAttribute("x", x + barWidth / 2);
    xLabel.setAttribute("y", height - 6);
    xLabel.setAttribute("class", "chart-text");
    xLabel.textContent = labels[i];
    chart.appendChild(xLabel);
  });
  
  // Defs for gradients
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  
  // Eco Mint gradient
  const ecoGrad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  ecoGrad.setAttribute("id", "eco-gradient");
  ecoGrad.setAttribute("x1", "0%");
  ecoGrad.setAttribute("y1", "0%");
  ecoGrad.setAttribute("x2", "0%");
  ecoGrad.setAttribute("y2", "100%");
  ecoGrad.innerHTML = `
    <stop offset="0%" stop-color="var(--primary-mint)" />
    <stop offset="100%" stop-color="var(--primary-green)" stop-opacity="0.3" />
  `;
  defs.appendChild(ecoGrad);
  
  // Red Alert gradient
  const redGrad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  redGrad.setAttribute("id", "red-gradient");
  redGrad.setAttribute("x1", "0%");
  redGrad.setAttribute("y1", "0%");
  redGrad.setAttribute("x2", "0%");
  redGrad.setAttribute("y2", "100%");
  redGrad.innerHTML = `
    <stop offset="0%" stop-color="var(--accent-red)" />
    <stop offset="100%" stop-color="var(--accent-orange)" stop-opacity="0.3" />
  `;
  defs.appendChild(redGrad);
  
  chart.appendChild(defs);
}

// --- DYNAMIC RECOMMENDER SYSTEM ---
function updateActionTips() {
  const logs = state.activityLog;
  const container = document.getElementById('tips-container');
  if (!container) return;
  
  // Categorize log values to find the user's highest impact category
  const totals = { transport: 0, food: 0, energy: 0, waste: 0 };
  logs.forEach(log => {
    if (totals[log.type] !== undefined) {
      totals[log.type] += log.value;
    }
  });
  
  // Find highest category
  let maxCat = 'transport';
  let maxVal = 0;
  for (const cat in totals) {
    if (totals[cat] > maxVal) {
      maxVal = totals[cat];
      maxCat = cat;
    }
  }
  
  // Get active filter
  const activeFilterBtn = document.querySelector('.filter-badge.active');
  const filter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
  
  // Filter tips list
  let matchingTips = [];
  if (filter === 'all') {
    // Return all tips, prioritizing those from the highest carbon category
    const highCatTips = RECOMMENDATIONS.filter(t => t.category === maxCat);
    const otherTips = RECOMMENDATIONS.filter(t => t.category !== maxCat);
    matchingTips = [...highCatTips, ...otherTips];
  } else {
    matchingTips = RECOMMENDATIONS.filter(t => t.category === filter);
  }
  
  // Render
  container.innerHTML = matchingTips.map(tip => {
    return `
      <div class="tip-card">
        <div class="tip-icon val-${getThemeForCategory(tip.category)}">
          <i data-lucide="${getIconForCategory(tip.category)}"></i>
        </div>
        <div class="tip-details">
          <h4>${tip.title} ${tip.category === maxCat && filter === 'all' ? '<span class="text-yellow" style="font-size:0.65rem; font-weight:800; border: 1px solid var(--accent-yellow); padding: 1px 4px; border-radius: 4px; margin-left: 5px;">HIGH IMPACT</span>' : ''}</h4>
          <p>${tip.text}</p>
          <span class="tip-co2-badge">Saves CO2</span>
        </div>
      </div>
    `;
  }).join('');
  
  lucide.createIcons();
}

function getThemeForCategory(cat) {
  switch (cat) {
    case 'transport': return 'blue';
    case 'food': return 'green';
    case 'energy': return 'orange';
    case 'waste': return 'yellow';
    default: return 'green';
  }
}

// Bind tips filter chip listeners
document.querySelectorAll('.filter-badge').forEach(badge => {
  badge.addEventListener('click', (e) => {
    SoundFX.playClick();
    document.querySelectorAll('.filter-badge').forEach(b => b.classList.remove('active'));
    badge.classList.add('active');
    updateActionTips();
  });
});

// --- ECO CHALLENGES WORKSPACE ---
function renderChallengesList() {
  const container = document.getElementById('challenges-container');
  if (!container) return;
  
  container.innerHTML = CHALLENGE_LIBRARY.map(ch => {
    const savedState = state.activeChallenges.find(item => item.id === ch.id) || { joined: false, completed: false };
    
    let buttonHtml = `<button class="btn btn-xs btn-secondary" onclick="joinChallenge('${ch.id}')">Join Challenge</button>`;
    let cardClass = '';
    
    if (savedState.completed) {
      buttonHtml = `<span class="text-green" style="font-weight:700; font-size:0.8rem; display:flex; align-items:center; gap:0.25rem;"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Completed</span>`;
      cardClass = 'completed';
    } else if (savedState.joined) {
      buttonHtml = `<button class="btn btn-xs btn-primary" onclick="completeChallenge('${ch.id}')">Complete</button>`;
      cardClass = 'joined';
    }
    
    return `
      <div class="challenge-card ${cardClass}">
        <div class="challenge-info">
          <h4>${ch.name}</h4>
          <p class="subtext" style="font-size:0.8rem;">${ch.desc}</p>
          <div class="challenge-reward">
            <i data-lucide="trending-down"></i>
            <span>Saves ${ch.reward.toFixed(1)} kg CO2e</span>
          </div>
        </div>
        <div class="challenge-action-col">
          ${buttonHtml}
        </div>
      </div>
    `;
  }).join('');
  
  lucide.createIcons();
}

function joinChallenge(id) {
  SoundFX.playClick();
  const ch = state.activeChallenges.find(item => item.id === id);
  if (ch) {
    ch.joined = true;
    showToast('award', `Joined challenge! Finish it today to log carbon offsets.`, 'info');
    saveStateToStorage();
    renderChallengesList();
  }
}

function completeChallenge(id) {
  SoundFX.playChallengeComplete();
  const ch = state.activeChallenges.find(item => item.id === id);
  const chInfo = CHALLENGE_LIBRARY.find(lib => lib.id === id);
  
  if (ch && chInfo) {
    ch.completed = true;
    
    // Log offset activity
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    state.activityLog.unshift({
      id: 'offset_' + Date.now(),
      type: 'offset',
      description: `Challenge: Completed "${chInfo.name}"`,
      value: chInfo.reward,
      time: timeStr,
      timestamp: Date.now(),
      dateStr: todayStr
    });
    
    showToast('heart', `Success! Offset ${chInfo.reward} kg carbon.`, 'success');
    saveStateToStorage();
    renderChallengesList();
    updateDashboardMetrics();
  }
}

// --- OFFSET SIMULATOR & VIRTUAL FOREST RESERVE ---
const simTreesInput = document.getElementById('sim-trees');
const simBulbsInput = document.getElementById('sim-bulbs');
const simSolarInput = document.getElementById('sim-solar');
const forestGrid = document.getElementById('virtual-forest-grid');

function updateOffsetSimulator() {
  const trees = parseInt(simTreesInput.value);
  const bulbs = parseInt(simBulbsInput.value);
  const solar = parseInt(simSolarInput.value);
  
  // Save sliders to state
  state.simTrees = trees;
  state.simBulbs = bulbs;
  state.simSolar = solar;
  saveStateToStorage();
  
  // Update textual badges
  document.getElementById('sim-trees-val').textContent = `${trees} tree${trees === 1 ? '' : 's'}`;
  document.getElementById('sim-bulbs-val').textContent = `${bulbs} bulb${bulbs === 1 ? '' : 's'}`;
  document.getElementById('sim-solar-val').textContent = solar === 1 ? 'Installed (Active)' : 'Off';
  
  // Calculate projected annual offset savings
  const annualSaved = (trees * 22.0) + (bulbs * 15.0) + (solar * 1200.0);
  document.getElementById('sim-projected-reduction').textContent = `${annualSaved.toLocaleString(undefined, {maximumFractionDigits:0})} kg CO2/yr saved`;
  
  // Render virtual forest (generate tree element counts)
  if (trees === 0) {
    forestGrid.innerHTML = `
      <div class="empty-forest-msg">
        <i data-lucide="sprout"></i>
        <p>Your reserve is currently barren. Adjust the sliders in the Action Sim Studio to grow trees and generate carbon offsets!</p>
      </div>
    `;
    lucide.createIcons();
  } else {
    // Generate tree icon grids
    let forestHtml = '';
    for (let i = 0; i < trees; i++) {
      forestHtml += `<i data-lucide="tree-pine" class="forest-tree" style="animation-delay: ${i * 0.02}s"></i>`;
    }
    forestGrid.innerHTML = forestHtml;
    lucide.createIcons();
  }
}

// Bind Simulator slider listeners
[simTreesInput, simBulbsInput, simSolarInput].forEach(slider => {
  slider.addEventListener('input', () => {
    updateOffsetSimulator();
    if (slider === simTreesInput) SoundFX.playClick();
  });
});

// --- CARBON CALCULATOR REAL-TIME ESTIMATE ENGINE ---
const calcTabs = document.querySelectorAll('.calc-tab-btn');
const calcViews = document.querySelectorAll('.calc-form-view');

// Active calculator sub-tabs toggler
calcTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    SoundFX.playClick();
    calcTabs.forEach(t => t.classList.remove('active'));
    calcViews.forEach(v => v.classList.remove('hidden'));
    calcViews.forEach(v => v.classList.remove('active'));
    
    tab.classList.add('active');
    const targetType = tab.getAttribute('data-type');
    state.calcCategory = targetType;
    
    const targetView = document.getElementById(`form-${targetType}`);
    if (targetView) targetView.classList.add('active');
    
    calculateRealTimeEstimate();
  });
});

// Segmented controls for Transport mode
const modeSegmentBtns = document.querySelectorAll('#transport-mode-selector .segment-btn');
modeSegmentBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    SoundFX.playClick();
    modeSegmentBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const mode = btn.getAttribute('data-mode');
    const fuelGroup = document.getElementById('car-fuel-group');
    
    if (mode === 'car') {
      fuelGroup.classList.remove('hidden');
    } else {
      fuelGroup.classList.add('hidden');
    }
    
    calculateRealTimeEstimate();
  });
});

// Range slider indicators auto-update & trigger compute
const inputsToWatch = [
  { id: 'transport-distance', indicatorId: 'transport-distance-val', suffix: ' km' },
  { id: 'food-meals', indicatorId: 'food-meals-val', suffix: ' meal', pluralSuffix: ' meals' },
  { id: 'energy-electricity', indicatorId: 'energy-electricity-val', suffix: ' kWh' },
  { id: 'energy-gas', indicatorId: 'energy-gas-val', suffix: ' kWh' },
  { id: 'energy-renewable', indicatorId: 'energy-renewable-val', suffix: '%' },
  { id: 'waste-amount', indicatorId: 'waste-amount-val', suffix: ' kg' },
  { id: 'waste-recycle', indicatorId: 'waste-recycle-val', suffix: '%' }
];

inputsToWatch.forEach(item => {
  const el = document.getElementById(item.id);
  if (el) {
    el.addEventListener('input', () => {
      const val = parseFloat(el.value);
      const indicator = document.getElementById(item.indicatorId);
      
      if (item.pluralSuffix && val !== 1) {
        indicator.textContent = val + item.pluralSuffix;
      } else {
        indicator.textContent = val + item.suffix;
      }
      
      calculateRealTimeEstimate();
    });
  }
});

// Car fuel type selector change
const fuelSelector = document.getElementById('car-fuel-type');
if (fuelSelector) {
  fuelSelector.addEventListener('change', calculateRealTimeEstimate);
}

// Core calculator estimation computation
function calculateRealTimeEstimate() {
  const currentTab = state.calcCategory;
  let co2 = 0;
  
  let transVal = 0;
  let foodVal = 0;
  let energyVal = 0;
  let wasteVal = 0;
  
  // 1. Calculate Transport
  const selectedModeBtn = document.querySelector('#transport-mode-selector .segment-btn.active');
  const mode = selectedModeBtn ? selectedModeBtn.getAttribute('data-mode') : 'car';
  const dist = parseFloat(document.getElementById('transport-distance').value);
  
  if (mode === 'car') {
    const fuel = document.getElementById('car-fuel-type').value;
    const factor = COEFFICIENTS.transport.car[fuel];
    transVal = dist * factor;
  } else if (mode === 'transit') {
    transVal = dist * COEFFICIENTS.transport.transit;
  } else if (mode === 'flight') {
    transVal = dist * COEFFICIENTS.transport.flight;
  } else {
    transVal = dist * COEFFICIENTS.transport.bike;
  }
  
  // 2. Calculate Food
  const diet = document.getElementById('food-diet-type').value;
  const meals = parseInt(document.getElementById('food-meals').value);
  foodVal = meals * COEFFICIENTS.food[diet];
  
  // 3. Calculate Energy
  const elec = parseFloat(document.getElementById('energy-electricity').value);
  const gas = parseFloat(document.getElementById('energy-gas').value);
  const cleanPct = parseFloat(document.getElementById('energy-renewable').value);
  
  const elecFootprint = elec * COEFFICIENTS.energy.electricity * (1 - cleanPct / 100);
  const gasFootprint = gas * COEFFICIENTS.energy.gas;
  energyVal = elecFootprint + gasFootprint;
  
  // 4. Calculate Waste
  const wasteAmt = parseFloat(document.getElementById('waste-amount').value);
  const recyclePct = parseFloat(document.getElementById('waste-recycle').value);
  wasteVal = wasteAmt * COEFFICIENTS.waste.general * (1 - recyclePct / 100);
  
  // Display individual breakdown levels
  document.getElementById('breakdown-val-transport').textContent = `${transVal.toFixed(1)} kg`;
  document.getElementById('breakdown-val-food').textContent = `${foodVal.toFixed(1)} kg`;
  document.getElementById('breakdown-val-energy').textContent = `${energyVal.toFixed(1)} kg`;
  document.getElementById('breakdown-val-waste').textContent = `${wasteVal.toFixed(1)} kg`;
  
  // Adjust progress bar widths inside the comparison cards
  const subMax = Math.max(transVal, foodVal, energyVal, wasteVal, 5.0);
  document.getElementById('breakdown-bar-transport').style.width = `${(transVal / subMax) * 100}%`;
  document.getElementById('breakdown-bar-food').style.width = `${(foodVal / subMax) * 100}%`;
  document.getElementById('breakdown-bar-energy').style.width = `${(energyVal / subMax) * 100}%`;
  document.getElementById('breakdown-bar-waste').style.width = `${(wasteVal / subMax) * 100}%`;
  
  // Define tab specific active estimate displays
  if (currentTab === 'transport') co2 = transVal;
  else if (currentTab === 'food') co2 = foodVal;
  else if (currentTab === 'energy') co2 = energyVal;
  else if (currentTab === 'waste') co2 = wasteVal;
  
  document.getElementById('calc-estimate-co2').textContent = `${co2.toFixed(1)} kg`;
  return { co2, transVal, foodVal, energyVal, wasteVal };
}

// Log calculator inputs to activity database
const logActivityBtn = document.getElementById('log-activity-btn');
if (logActivityBtn) {
  logActivityBtn.addEventListener('click', () => {
    SoundFX.playSuccess();
    const currentTab = state.calcCategory;
    const { co2, transVal, foodVal, energyVal, wasteVal } = calculateRealTimeEstimate();
    
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let desc = '';
    let val = 0;
    
    if (currentTab === 'transport') {
      const selectedModeBtn = document.querySelector('#transport-mode-selector .segment-btn.active');
      const mode = selectedModeBtn ? selectedModeBtn.textContent : 'Car';
      const dist = document.getElementById('transport-distance').value;
      desc = `Commute: ${dist} km via ${mode}`;
      val = transVal;
    } else if (currentTab === 'food') {
      const dietText = document.getElementById('food-diet-type').options[document.getElementById('food-diet-type').selectedIndex].text;
      const meals = document.getElementById('food-meals').value;
      desc = `Diet: ${meals} meals (${dietText})`;
      val = foodVal;
    } else if (currentTab === 'energy') {
      const elec = document.getElementById('energy-electricity').value;
      desc = `Home: Energy logs (${elec} kWh electricity)`;
      val = energyVal;
    } else if (currentTab === 'waste') {
      const wasteAmt = document.getElementById('waste-amount').value;
      desc = `Waste: Disposed ${wasteAmt} kg household trash`;
      val = wasteVal;
    }
    
    // Insert into activity log
    state.activityLog.unshift({
      id: 'act_' + Date.now(),
      type: currentTab,
      description: desc,
      value: val,
      time: timeStr,
      timestamp: Date.now(),
      dateStr: todayStr
    });
    
    showToast('check', `Added record to logs (+${val.toFixed(1)} kg CO2e)`, 'success');
    
    // Set last activity date to trigger streaks check on next visits
    state.lastActivityDate = todayStr;
    
    saveStateToStorage();
    updateDashboardMetrics();
    updateActionTips();
    
    // Return view to main tab
    switchTab('dashboard');
  });
}

// --- CONFIG DAILY BUDGET LIMIT MODAL ---
const goalModal = document.getElementById('goal-modal');
const editGoalBtn = document.getElementById('edit-goal-btn');
const closeGoalModalBtn = document.getElementById('close-goal-modal-btn');
const cancelGoalBtn = document.getElementById('cancel-goal-btn');
const saveGoalBtn = document.getElementById('save-goal-btn');

if (editGoalBtn) {
  editGoalBtn.addEventListener('click', () => {
    SoundFX.playClick();
    document.getElementById('goal-input-field').value = state.dailyTargetBudget;
    goalModal.classList.remove('hidden');
  });
}

function closeGoalModal() {
  SoundFX.playClick();
  goalModal.classList.add('hidden');
}

if (closeGoalModalBtn) closeGoalModalBtn.addEventListener('click', closeGoalModal);
if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', closeGoalModal);

if (saveGoalBtn) {
  saveGoalBtn.addEventListener('click', () => {
    const budgetVal = parseFloat(document.getElementById('goal-input-field').value);
    if (budgetVal >= 2 && budgetVal <= 100) {
      state.dailyTargetBudget = budgetVal;
      showToast('settings', `Target carbon budget configured to ${budgetVal.toFixed(1)} kg CO2e.`, 'success');
      closeGoalModal();
      updateDashboardMetrics();
      saveStateToStorage();
    } else {
      showToast('alert-triangle', 'Configure budget range between 2 and 100 kg.', 'warning');
    }
  });
}

// --- ECO-TRIVIA GAME ENGINE ---
const generateTriviaBtn = document.getElementById('generate-trivia-btn');
const quitTriviaBtn = document.getElementById('quit-trivia-btn');
const submitTriviaBtn = document.getElementById('submit-trivia-btn');
const nextTriviaBtn = document.getElementById('next-trivia-btn');

const triviaSetupPanel = document.getElementById('trivia-setup-panel');
const triviaArenaPanel = document.getElementById('trivia-arena-panel');
const triviaResultsPanel = document.getElementById('trivia-results-panel');

if (generateTriviaBtn) {
  generateTriviaBtn.addEventListener('click', () => {
    SoundFX.playClick();
    
    const topic = document.getElementById('trivia-topic').value;
    const size = parseInt(document.getElementById('trivia-size').value);
    
    // Load and shuffle questions for sizes
    const questionsPool = TRIVIA_BANK[topic] || TRIVIA_BANK['climate-science'];
    
    // Quick array clone & random shuffle
    let shuffled = [...questionsPool].sort(() => 0.5 - Math.random());
    state.triviaQuestions = shuffled.slice(0, size);
    
    // Reset game parameters
    state.currentTriviaIndex = 0;
    state.triviaAnswers = [];
    state.triviaScore = 0;
    state.triviaActive = true;
    state.triviaTimeElapsed = 0;
    
    triviaSetupPanel.classList.add('hidden');
    triviaArenaPanel.classList.remove('hidden');
    triviaResultsPanel.classList.add('hidden');
    
    // Start game timer
    clearInterval(state.triviaTimerInterval);
    document.getElementById('trivia-timer-text').textContent = "00:00";
    state.triviaTimerInterval = setInterval(() => {
      state.triviaTimeElapsed++;
      const m = Math.floor(state.triviaTimeElapsed / 60).toString().padStart(2, '0');
      const s = (state.triviaTimeElapsed % 60).toString().padStart(2, '0');
      document.getElementById('trivia-timer-text').textContent = `${m}:${s}`;
    }, 1000);
    
    renderTriviaQuestion();
  });
}

function renderTriviaQuestion() {
  const currentIdx = state.currentTriviaIndex;
  const total = state.triviaQuestions.length;
  const q = state.triviaQuestions[currentIdx];
  
  // Track parameters
  document.getElementById('trivia-current-num').textContent = currentIdx + 1;
  document.getElementById('trivia-total-num').textContent = total;
  document.getElementById('trivia-progress-bar').style.width = `${((currentIdx + 1) / total) * 100}%`;
  
  document.getElementById('trivia-question-text').textContent = q.question;
  
  // Render options buttons
  const optionsContainer = document.getElementById('trivia-options-list');
  optionsContainer.innerHTML = q.options.map((opt, i) => {
    return `
      <button class="quiz-option-btn" data-index="${i}" onclick="selectTriviaOption(${i})">
        <span>${opt}</span>
        <i data-lucide="check-circle-2" class="quiz-option-icon quiz-option-icon-correct text-green"></i>
        <i data-lucide="x-circle" class="quiz-option-icon quiz-option-icon-incorrect text-red"></i>
      </button>
    `;
  }).join('');
  
  // Reset visual states
  document.getElementById('trivia-feedback-panel').classList.add('hidden');
  submitTriviaBtn.classList.remove('hidden');
  submitTriviaBtn.disabled = true;
  nextTriviaBtn.classList.add('hidden');
  
  lucide.createIcons();
}

function selectTriviaOption(idx) {
  SoundFX.playClick();
  const btns = document.querySelectorAll('#trivia-options-list .quiz-option-btn');
  btns.forEach(btn => btn.classList.remove('selected'));
  
  const chosenBtn = document.querySelector(`#trivia-options-list .quiz-option-btn[data-index="${idx}"]`);
  if (chosenBtn) chosenBtn.classList.add('selected');
  
  // Record choice and enable verification button
  state.triviaAnswers[state.currentTriviaIndex] = idx;
  submitTriviaBtn.disabled = false;
}

if (submitTriviaBtn) {
  submitTriviaBtn.addEventListener('click', () => {
    const currentIdx = state.currentTriviaIndex;
    const q = state.triviaQuestions[currentIdx];
    const userChoice = state.triviaAnswers[currentIdx];
    const correctIdx = q.answerIndex;
    
    // Disable other choice buttons
    const btns = document.querySelectorAll('#trivia-options-list .quiz-option-btn');
    btns.forEach(btn => {
      btn.disabled = true;
      const idx = parseInt(btn.getAttribute('data-index'));
      
      if (idx === correctIdx) {
        btn.classList.add('correct');
      } else if (idx === userChoice) {
        btn.classList.add('incorrect');
      }
    });
    
    // Evaluate correctness
    const feedbackTitle = document.getElementById('trivia-feedback-status');
    const feedbackText = document.getElementById('trivia-feedback-explanation');
    
    if (userChoice === correctIdx) {
      SoundFX.playSuccess();
      state.triviaScore++;
      feedbackTitle.innerHTML = `<i data-lucide="check-circle-2" class="text-green"></i> <span>Correct!</span>`;
    } else {
      SoundFX.playError();
      feedbackTitle.innerHTML = `<i data-lucide="alert-triangle" class="text-red"></i> <span>Incorrect Choice</span>`;
    }
    
    feedbackText.textContent = q.explanation;
    document.getElementById('trivia-feedback-panel').classList.remove('hidden');
    
    submitTriviaBtn.classList.add('hidden');
    nextTriviaBtn.classList.remove('hidden');
    
    // Adjust next label for the final question
    if (currentIdx === state.triviaQuestions.length - 1) {
      nextTriviaBtn.innerHTML = `Complete Evaluation <i data-lucide="award"></i>`;
    } else {
      nextTriviaBtn.innerHTML = `Next Query <i data-lucide="chevron-right"></i>`;
    }
    
    lucide.createIcons();
  });
}

if (nextTriviaBtn) {
  nextTriviaBtn.addEventListener('click', () => {
    SoundFX.playClick();
    if (state.currentTriviaIndex === state.triviaQuestions.length - 1) {
      // Game over, evaluate scorecard
      finishTriviaGame();
    } else {
      state.currentTriviaIndex++;
      renderTriviaQuestion();
    }
  });
}

function finishTriviaGame() {
  clearInterval(state.triviaTimerInterval);
  state.triviaActive = false;
  
  triviaArenaPanel.classList.add('hidden');
  triviaResultsPanel.classList.remove('hidden');
  
  const score = state.triviaScore;
  const total = state.triviaQuestions.length;
  const pct = Math.round((score / total) * 100);
  
  document.getElementById('trivia-score-pct').textContent = `${pct}%`;
  document.getElementById('trivia-score-fraction').textContent = `${score} / ${total} Correct`;
  
  // Results circle progress (Circumference = 2 * PI * 75 = 471.2)
  const resultsCircle = document.getElementById('trivia-score-circle');
  const offset = 471.2 - (pct / 100) * 471.2;
  resultsCircle.style.strokeDashoffset = offset;
  
  // Headline messages
  const headline = document.getElementById('trivia-results-headline');
  const details = document.getElementById('trivia-results-text');
  
  if (pct === 100) {
    headline.textContent = "Ecological Visionary!";
    details.textContent = `Unbelievable work. You answered ${score} out of ${total} correctly. Your understanding of carbon dynamics and climate science is elite!`;
  } else if (pct >= 60) {
    headline.textContent = "Green Practitioner";
    details.textContent = `Good study skills! You got ${score} out of ${total} correct. Continue logging footprints and checking tips to learn more.`;
  } else {
    headline.textContent = "Sprout Level Awareness";
    details.textContent = `You got ${score} out of ${total} correct. Climate knowledge is grown iteratively. Try reviewing recommendations or re-taking trivia topics.`;
  }
  
  // Render review breakdown
  const reviewList = document.getElementById('trivia-review-list');
  reviewList.innerHTML = state.triviaQuestions.map((q, i) => {
    const userChoice = state.triviaAnswers[i];
    const correct = userChoice === q.answerIndex;
    
    return `
      <div class="review-card" style="border-left: 3px solid ${correct ? 'var(--primary-mint)' : 'var(--accent-red)'}">
        <div class="review-card-header">
          <span>Question ${i + 1}</span>
          <span class="${correct ? 'text-green' : 'text-red'}">${correct ? 'Correct' : 'Incorrect'}</span>
        </div>
        <h4>${q.question}</h4>
        <p class="subtext" style="font-size:0.8rem;">Your choice: <strong style="color:var(--text-main);">${q.options[userChoice] || 'None'}</strong></p>
        <p class="subtext" style="font-size:0.8rem;">Correct answer: <strong style="color:var(--primary-mint);">${q.options[q.answerIndex]}</strong></p>
        <div class="review-explanation">${q.explanation}</div>
      </div>
    `;
  }).join('');
}

// Quit and Retry triggers
if (quitTriviaBtn) {
  quitTriviaBtn.addEventListener('click', () => {
    SoundFX.playError();
    clearInterval(state.triviaTimerInterval);
    state.triviaActive = false;
    
    triviaSetupPanel.classList.remove('hidden');
    triviaArenaPanel.classList.add('hidden');
  });
}

const triviaRetryBtn = document.getElementById('trivia-retry-btn');
if (triviaRetryBtn) {
  triviaRetryBtn.addEventListener('click', () => {
    SoundFX.playClick();
    triviaSetupPanel.classList.remove('hidden');
    triviaResultsPanel.classList.add('hidden');
  });
}

const triviaFinishBtn = document.getElementById('trivia-finish-btn');
if (triviaFinishBtn) {
  triviaFinishBtn.addEventListener('click', () => {
    SoundFX.playClick();
    switchTab('dashboard');
  });
}

// --- TOAST NOTIFICATIONS ALERTS ---
function showToast(icon, message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  toast.innerHTML = `
    <div class="toast-icon">
      <i data-lucide="${icon}"></i>
    </div>
    <div class="toast-message">${message}</div>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();
  
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}

// --- SPA ROUTER & NAVIGATION ---
const PAGE_TITLES = {
  dashboard: { title: "Ecological Dashboard", subtitle: "Welcome back, Pioneer. Let's analyze your environmental metrics today." },
  calculator: { title: "Carbon Calculator", subtitle: "Log carbon-intensive daily items to monitor energy footprint indexes." },
  challenges: { title: "Challenges & Tips", subtitle: "Commit to active eco-challenges and view tailored sustainability suggestions." },
  simulator: { title: "Offset Simulator", suffix: "Plant trees, install clean energy, and visualize long-term annual savings." },
  trivia: { title: "Eco-Trivia Game", subtitle: "Challenge your climate awareness and learn facts about global warming." }
};

function switchTab(tabId) {
  SoundFX.playClick();
  
  // Remove active styling flag
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
  
  // Set active class
  const sidebarBtn = document.querySelector(`.sidebar-nav [data-tab="${tabId}"]`);
  if (sidebarBtn) sidebarBtn.classList.add('active');
  
  const mobBtn = document.querySelector(`.mobile-nav [data-tab="${tabId}"]`);
  if (mobBtn) mobBtn.classList.add('active');
  
  const targetSection = document.getElementById(`tab-${tabId}`);
  if (targetSection) targetSection.classList.add('active');
  
  // Update header titles
  const textInfo = PAGE_TITLES[tabId];
  if (textInfo) {
    document.getElementById('page-title').textContent = textInfo.title;
    document.getElementById('page-subtitle').textContent = textInfo.subtitle || textInfo.suffix;
  }
  
  // Sub-triggers based on tab switching
  if (tabId === 'dashboard') {
    updateDashboardMetrics();
  } else if (tabId === 'calculator') {
    calculateRealTimeEstimate();
  } else if (tabId === 'challenges') {
    updateActionTips();
    renderChallengesList();
  } else if (tabId === 'simulator') {
    updateOffsetSimulator();
  } else if (tabId === 'trivia') {
    triviaSetupPanel.classList.remove('hidden');
    triviaArenaPanel.classList.add('hidden');
    triviaResultsPanel.classList.add('hidden');
  }
}

// Bind routing triggers to nav buttons
document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(elem => {
  elem.addEventListener('click', (e) => {
    const tabId = elem.getAttribute('data-tab');
    switchTab(tabId);
  });
});

// Audio muting setting controls
document.getElementById('toggle-audio-btn').addEventListener('click', () => {
  state.audioEnabled = !state.audioEnabled;
  const audioBtn = document.getElementById('toggle-audio-btn');
  const audioIcon = document.getElementById('audio-icon');
  
  if (state.audioEnabled) {
    audioBtn.classList.remove('muted');
    audioIcon.setAttribute('data-lucide', 'volume-2');
    showToast('volume-2', 'Audio synthesis feedback enabled.', 'info');
    SoundFX.playClick();
  } else {
    audioBtn.classList.add('muted');
    audioIcon.setAttribute('data-lucide', 'volume-x');
    showToast('volume-x', 'Audio synthesis feedback muted.', 'info');
  }
  lucide.createIcons();
  saveStateToStorage();
});

// Clear dashboard activity log database history
document.getElementById('clear-history-btn').addEventListener('click', () => {
  SoundFX.playError();
  state.activityLog = [];
  showToast('trash', 'Activity history logs cleared.', 'danger');
  saveStateToStorage();
  updateDashboardMetrics();
  updateActionTips();
});

// Initial startup execution
window.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  updateDashboardMetrics();
  
  // Set default volume buttons visual class
  const audioBtn = document.getElementById('toggle-audio-btn');
  const audioIcon = document.getElementById('audio-icon');
  if (!state.audioEnabled) {
    audioBtn.classList.add('muted');
    audioIcon.setAttribute('data-lucide', 'volume-x');
    lucide.createIcons();
  }
});
