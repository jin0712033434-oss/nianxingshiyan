// ========================================
// 黏性现象仿真模拟器 - 完整网页版
// 功能完全对应Python桌面版本
// ========================================

// 全局状态管理
const AppState = {
  currentPage: 'home',
  currentExperiment: null,
  currentSubPage: 'principle',
  sidebarCollapsed: false,
  isDarkTheme: false,
  simulationRunning: false,
  simulationPaused: false,
  simTime: 0,
  stokesBallY: 0.05,
  stokesBallV: 0,
  chartInstance: null,
  animFrameId: null,
  dataHistory: [],  // 历史数据
  timeHistory: []   // 时间轴数据
};

// ========================================
// 流体预设数据（完全对应Python版）
// ========================================
const FLUID_PRESETS = {
  '氢气 (20°C)': { mu: 0.0000088, rho: 0.0899 },
  '氦气 (0°C)': { mu: 0.0000186, rho: 0.1786 },
  '空气 (20°C)': { mu: 0.0000181, rho: 1.225 },
  '乙醚 (20°C)': { mu: 0.00023, rho: 713 },
  '苯 (20°C)': { mu: 0.00065, rho: 879 },
  '丙酮 (20°C)': { mu: 0.00032, rho: 784 },
  '甲醇 (20°C)': { mu: 0.00059, rho: 791 },
  '汽油 (20°C)': { mu: 0.0006, rho: 750 },
  '煤油 (20°C)': { mu: 0.00164, rho: 800 },
  '水 (20°C)': { mu: 0.001, rho: 1000 },
  '酒精 (20°C)': { mu: 0.0012, rho: 789 },
  '牛奶 (20°C)': { mu: 0.002, rho: 1030 },
  '血液 (37°C)': { mu: 0.0035, rho: 1060 },
  '玉米油 (20°C)': { mu: 0.065, rho: 925 },
  '橄榄油 (20°C)': { mu: 0.081, rho: 920 },
  '蓖麻油 (20°C)': { mu: 0.985, rho: 961 },
  '甘油 (20°C)': { mu: 1.412, rho: 1260 },
  '糖浆 (20°C)': { mu: 2.0, rho: 1330 }
};

// ========================================
// 实验配置数据
// ========================================
const EXPERIMENTS = {
  newton: {
    name: '牛顿粘性定律实验',
    icon: '📐',
    formula: 'τ = μ · (du/dy)',
    description: '探索牛顿黏性定律，理解剪切应力与速度梯度的关系',
    variables: {
      'τ': '剪切应力 (Pa)',
      'μ': '动力黏度 (Pa·s)',
      'du/dy': '速度梯度 (s⁻¹)'
    },
    params: [
      { id: 'velocity', name: '上平板速度 v', symbol: 'v', unit: 'm/s', min: 0.1, max: 5.0, step: 0.1, value: 1.0 },
      { id: 'viscosity', name: '动力黏度 μ', symbol: 'μ', unit: 'Pa·s', min: 0.00005, max: 2.0, step: 0.00005, value: 0.001, useFluidPreset: true },
      { id: 'distance', name: '板间距 y', symbol: 'y', unit: 'm', min: 0.001, max: 0.05, step: 0.001, value: 0.01 }
    ]
  },
  poiseuille: {
    name: '泊肃叶定律实验',
    icon: '💧',
    formula: 'Q = πR⁴ΔP / (8μL)',
    description: '研究管道中的层流流动，掌握流量与压降的关系',
    variables: {
      'Q': '体积流量 (m³/s)',
      'vmax': '最大速度 (m/s)',
      'Rf': '流阻 (Pa·s/m³)',
      'Re': '雷诺数',
      'v_avg': '平均速度 (m/s)'
    },
    params: [
      { id: 'radius', name: '管道半径 R', symbol: 'R', unit: 'm', min: 0.0005, max: 0.005, step: 0.0001, value: 0.001 },
      { id: 'length', name: '管道长度 L', symbol: 'L', unit: 'm', min: 0.1, max: 2.0, step: 0.05, value: 1.0 },
      { id: 'pressure', name: '压强差 ΔP', symbol: 'ΔP', unit: 'Pa', min: 102, max: 105, step: 1, value: 103 },
      { id: 'viscosity', name: '动力黏度 μ', symbol: 'μ', unit: 'Pa·s', min: 0.00005, max: 2.0, step: 0.00005, value: 0.001, useFluidPreset: true },
      { id: 'density', name: '流体密度 ρ', symbol: 'ρ', unit: 'kg/m³', min: 0.05, max: 1500, step: 0.5, value: 1000, useFluidPreset: true }
    ]
  },
  stokes: {
    name: '斯托克斯定律实验',
    icon: '⚪',
    formula: 'F = 6πμrv',
    description: '观察球体在黏性流体中的沉降，学习阻力计算公式',
    variables: {
      'Fg': '重力 (N)',
      'Fb': '浮力 (N)',
      'vt': '终端速度 (m/s)',
      's': '沉降系数',
      'Re': '雷诺数'
    },
    params: [
      { id: 'ballRadius', name: '小球半径 r', symbol: 'r', unit: 'm', min: 0.0001, max: 0.01, step: 0.0001, value: 0.001 },
      { id: 'ballDensity', name: '小球密度 ρs', symbol: 'ρs', unit: 'kg/m³', min: 500, max: 20000, step: 10, value: 2500 },
      { id: 'fluidDensity', name: '流体密度 ρf', symbol: 'ρf', unit: 'kg/m³', min: 0.05, max: 1500, step: 0.5, value: 1000, useFluidPreset: true },
      { id: 'viscosity', name: '动力黏度 μ', symbol: 'μ', unit: 'Pa·s', min: 0.00005, max: 2.0, step: 0.00005, value: 0.001, useFluidPreset: true }
    ]
  }
};

// ========================================
// 物理计算引擎（完全对应Python版）
// ========================================
const PhysicsEngine = {
  // 牛顿粘性定律
  newtonViscosity(v, mu, y) {
    if (!y || y === 0) y = 0.001; // 防止除以零
    if (!mu || mu === 0) mu = 0.00001;
    const grad = v / y;
    const tau = mu * grad;
    // 防止NaN和Infinity
    if (!isFinite(grad)) grad = 0;
    if (!isFinite(tau)) tau = 0;
    return { grad, tau };
  },

  // 泊肃叶定律
  poiseuille(R, L, dP, mu, rho) {
    if (!mu || mu === 0) mu = 0.00001; // 防止除以零
    if (!L || L === 0) L = 0.1;
    if (!R || R === 0) R = 0.001;
    if (!rho || rho === 0) rho = 1000;
    if (!dP || dP < 0) dP = 100;
    const Q = (Math.PI * Math.pow(R, 4) * dP) / (8 * mu * L);
    const vmax = (dP * Math.pow(R, 2)) / (4 * mu * L);
    const Rf = (8 * mu * L) / (Math.PI * Math.pow(R, 4));
    const v_avg = Q / (Math.PI * R * R);
    const Re = (rho * v_avg * 2 * R) / mu;
    // 防止NaN和Infinity
    return {
      Q: isFinite(Q) ? Q : 0,
      vmax: isFinite(vmax) ? vmax : 0,
      Rf: isFinite(Rf) ? Rf : 0,
      Re: isFinite(Re) ? Re : 0,
      v_avg: isFinite(v_avg) ? v_avg : 0
    };
  },

  // 斯托克斯定律
  stokes(r, rhos, rhof, mu, g = 9.8) {
    if (!mu || mu === 0) mu = 0.00001; // 防止除以零
    if (!r || r === 0) r = 0.0001;
    if (!rhos || rhos === 0) rhos = 1000;
    if (!rhof || rhof === 0) rhof = 1000;
    const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
    const mass = rhos * volume;
    const Fg = mass * g;
    const Fb = rhof * volume * g;
    const vt = (2 * Math.pow(r, 2) * (rhos - rhof) * g) / (9 * mu);
    const s = vt / g;
    const Re = (rhof * Math.abs(vt) * 2 * r) / mu;
    // 防止NaN和Infinity
    return {
      Fg: isFinite(Fg) ? Fg : 0,
      Fb: isFinite(Fb) ? Fb : 0,
      vt: isFinite(vt) ? vt : 0,
      s: isFinite(s) ? s : 0,
      volume: isFinite(volume) ? volume : 0,
      mass: isFinite(mass) ? mass : 0,
      Re: isFinite(Re) ? Re : 0
    };
  },
  
  // 斯托克斯阻力
  stokesDrag(mu, r, v) {
    return 6 * Math.PI * mu * r * v;
  }
};

// ========================================
// 主题管理
// ========================================
const ThemeManager = {
  init() {
    const toggle = document.getElementById('themeToggle');
    toggle.addEventListener('change', (e) => {
      AppState.isDarkTheme = e.target.checked;
      this.applyTheme();
    });
  },

  applyTheme() {
    if (AppState.isDarkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
};

// ========================================
// 页面导航
// ========================================
const Navigation = {
  goToHome() {
    AppState.currentPage = 'home';
    document.getElementById('homePage').style.display = 'flex';
    document.getElementById('experimentPage').style.display = 'none';
    this.stopSimulation();
  },

  goToExperiment(expType) {
    AppState.currentPage = 'experiment';
    AppState.currentExperiment = expType;
    
    // 清除图表历史数据
    AppState.dataHistory = [];
    AppState.timeHistory = [];
    
    // 重置斯托克斯小球状态
    AppState.stokesBallY = 0.05;
    AppState.stokesBallV = 0;
    
    // 清理之前的Canvas资源
    cleanupCanvas();
    
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('experimentPage').style.display = 'block';
    
    const exp = EXPERIMENTS[expType];
    document.getElementById('experimentTitle').textContent = exp.name;
    
    Navigation.switchSubPage('principle');
    renderPrinciplePage();
    renderLineSimPage();
  },

  switchSubPage(pageName) {
    AppState.currentSubPage = pageName;
    
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === pageName) {
        item.classList.add('active');
      }
    });
    
    document.querySelectorAll('.sub-page').forEach(page => {
      page.classList.remove('active');
    });
    
    const pageMap = {
      'principle': 'principlePage',
      'lineSim': 'lineSimPage',
      'realSim': 'realSimPage'
    };
    
    document.getElementById(pageMap[pageName]).classList.add('active');
  },

  toggleSidebar() {
    AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
  },

  stopSimulation() {
    AppState.simulationRunning = false;
    AppState.simulationPaused = false;
    if (AppState.animFrameId) {
      cancelAnimationFrame(AppState.animFrameId);
    }
  }
};

// ========================================
// 原理页面渲染
// ========================================
function renderPrinciplePage() {
  const exp = EXPERIMENTS[AppState.currentExperiment];
  const container = document.getElementById('principlePage');
  
  const theme = AppState.isDarkTheme ? 'dark' : 'light';
  const titleColor = AppState.isDarkTheme ? '#00D4FF' : '#1a3c7c';
  const textColor = AppState.isDarkTheme ? '#ffffff' : '#495057';
  const bgColor = AppState.isDarkTheme ? '#1a1a25' : '#f8fbff';
  const borderColor = AppState.isDarkTheme ? '#2a2a3a' : '#e1e8f0';
  
  // 根据实验类型生成不同的原理内容
  let principleContent = '';
  
  if (AppState.currentExperiment === 'newton') {
    principleContent = `
      <div class="principle-content">
        <h2 style="color: ${titleColor}">${exp.icon} ${exp.name}</h2>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">实验简介</h3>
          <p style="color: ${textColor}">牛顿粘性定律实验是研究流体黏性的经典实验。通过在流体中移动平板，测量所需的力，可以得出流体的黏性系数，并验证牛顿黏性定律。</p>
        </div>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">牛顿黏性定律</h3>
          <p style="color: ${textColor}">牛顿黏性定律指出：流体中的剪切应力 τ 与速度梯度 du/dy 成正比。</p>
          <div class="formula-box">${exp.formula}</div>
          <p style="color: ${textColor}"><strong>其中：</strong></p>
          <ul class="variable-list">
            ${Object.entries(exp.variables).map(([symbol, desc]) => `<li><strong>${symbol}</strong>: ${desc}</li>`).join('')}
          </ul>
        </div>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">实验装置</h3>
          <p style="color: ${textColor}">实验装置主要包括：</p>
          <ol style="color: ${textColor}; padding-left: 20px;">
            <li>两块平行平板，其间充满待测流体</li>
            <li>上板固定，下板可移动</li>
            <li>力传感器，用于测量移动下板所需的力</li>
            <li>速度控制系统，控制下板的移动速度</li>
          </ol>
        </div>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">关键概念</h3>
          <p style="color: ${textColor}">• <strong>黏度</strong>：流体抵抗剪切变形的能力</p>
          <p style="color: ${textColor}">• <strong>剪切应力</strong>：单位面积上的切向力</p>
          <p style="color: ${textColor}">• <strong>速度梯度</strong>：速度在垂直于流动方向上的变化率</p>
          <p style="color: ${textColor}">• <strong>牛顿流体</strong>：满足牛顿黏性定律的流体</p>
        </div>
      </div>
    `;
  } else if (AppState.currentExperiment === 'poiseuille') {
    principleContent = `
      <div class="principle-content">
        <h2 style="color: ${titleColor}">${exp.icon} ${exp.name}</h2>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">实验简介</h3>
          <p style="color: ${textColor}">泊肃叶定律描述了不可压缩黏性流体在圆管中做层流运动时的流量规律。该定律在医学（血液流动）、工程（管道设计）等领域有重要应用。</p>
        </div>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">泊肃叶定律</h3>
          <div class="formula-box">${exp.formula}</div>
          <p style="color: ${textColor}"><strong>其中：</strong></p>
          <ul class="variable-list">
            ${Object.entries(exp.variables).map(([symbol, desc]) => `<li><strong>${symbol}</strong>: ${desc}</li>`).join('')}
          </ul>
        </div>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">实验装置</h3>
          <p style="color: ${textColor}">实验装置主要包括：</p>
          <ol style="color: ${textColor}; padding-left: 20px;">
            <li>水平圆管，透明材质便于观察</li>
            <li>压力源，提供稳定的压差</li>
            <li>流量计，测量流体流量</li>
            <li>压力计，测量管道两端压力</li>
          </ol>
        </div>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">关键概念</h3>
          <p style="color: ${textColor}">• <strong>层流</strong>：流体分层流动，各层互不混合</p>
          <p style="color: ${textColor}">• <strong>雷诺数</strong>：判断流动状态的无量纲数</p>
          <p style="color: ${textColor}">• <strong>速度分布</strong>：圆管中层流的速度呈抛物线分布</p>
          <p style="color: ${textColor}">• <strong>压降</strong>：流体流动过程中压力的损失</p>
        </div>
      </div>
    `;
  } else if (AppState.currentExperiment === 'stokes') {
    principleContent = `
      <div class="principle-content">
        <h2 style="color: ${titleColor}">${exp.icon} ${exp.name}</h2>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">实验简介</h3>
          <p style="color: ${textColor}">斯托克斯定律描述了小球在黏性流体中缓慢运动时所受的阻力。通过观察球体的沉降过程，可以测量流体的黏度。</p>
        </div>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">斯托克斯定律</h3>
          <p style="color: ${textColor}">斯托克斯阻力公式：</p>
          <div class="formula-box">${exp.formula}</div>
          <p style="color: ${textColor}">终端速度公式：</p>
          <div class="formula-box">v = (2 · r² · g · (ρs - ρf)) / (9 · μ)</div>
          <p style="color: ${textColor}"><strong>其中：</strong></p>
          <ul class="variable-list">
            ${Object.entries(exp.variables).map(([symbol, desc]) => `<li><strong>${symbol}</strong>: ${desc}</li>`).join('')}
          </ul>
        </div>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">实验装置</h3>
          <p style="color: ${textColor}">实验装置主要包括：</p>
          <ol style="color: ${textColor}; padding-left: 20px;">
            <li>透明圆柱形容器，装满待测流体</li>
            <li>不同材质和大小的小球</li>
            <li>计时装置，测量沉降时间</li>
            <li>刻度尺，测量沉降距离</li>
          </ol>
        </div>
        
        <div class="principle-section" style="background: ${bgColor}; border-color: ${borderColor};">
          <h3 style="color: ${titleColor}">关键概念</h3>
          <p style="color: ${textColor}">• <strong>终端速度</strong>：球体达到受力平衡时的恒定速度</p>
          <p style="color: ${textColor}">• <strong>阻力</strong>：流体对运动物体的阻碍力</p>
          <p style="color: ${textColor}">• <strong>浮力</strong>：流体对浸入其中物体的向上托力</p>
          <p style="color: ${textColor}">• <strong>雷诺数</strong>：需小于1，确保层流条件</p>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = principleContent;
}

// ========================================
// 线图模拟页面渲染
// ========================================
function renderLineSimPage() {
  const exp = EXPERIMENTS[AppState.currentExperiment];
  const container = document.getElementById('lineSimPage');
  
  console.log('Rendering line sim page for:', AppState.currentExperiment);
  console.log('Container element:', container);
  
  if (!container) {
    console.error('lineSimPage container not found!');
    return;
  }
  
  container.innerHTML = `
    <div class="line-sim-layout">
      <!-- 左侧控制面板 -->
      <div class="control-panel">
        <h3>参数控制</h3>
        
        <div id="paramsContainer"></div>
        
        ${exp.params.some(p => p.useFluidPreset) ? `
          <div class="fluid-presets">
            <h4>流体预设</h4>
            <div class="preset-grid" id="presetGrid"></div>
          </div>
        ` : ''}
      </div>
      
      <!-- 中央动画画布 -->
      <div class="canvas-area">
        <canvas id="simCanvas"></canvas>
      </div>
      
      <!-- 右侧数据面板 -->
      <div class="data-panel">
        <h3>实时数据</h3>
        <div id="dataContainer"></div>
        
        <!-- 实时图表 -->
        <div class="chart-container">
          <canvas id="realtimeChart"></canvas>
        </div>
        
        <div class="bottom-controls">
          <button class="ctrl-btn play-pause" id="playPauseBtn">▶ 开始</button>
          <button class="ctrl-btn reset" id="resetBtn">↺ 重置</button>
        </div>
      </div>
    </div>
  `;
  
  console.log('HTML inserted, now setting up controls...');
  
  setupLineSimControls();
  initSimulationCanvas();
}

// ========================================
// 线图模拟控件设置
// ========================================
function setupLineSimControls() {
  const exp = EXPERIMENTS[AppState.currentExperiment];
  const paramsContainer = document.getElementById('paramsContainer');
  
  // 渲染参数控件
  paramsContainer.innerHTML = exp.params.map(param => `
    <div class="param-group">
      <div class="param-label">
        <span class="param-symbol">${param.symbol} - ${param.name}</span>
        <span class="param-value" id="${param.id}Value">${param.value}</span>
      </div>
      <input type="range" 
             id="${param.id}" 
             min="${param.min}" 
             max="${param.max}" 
             step="${param.step}" 
             value="${param.value}">
      <div style="font-size: 11px; color: var(--text-hint); text-align: right;">${param.unit}</div>
    </div>
  `).join('');
  
  // 渲染流体预设
  if (exp.params.some(p => p.useFluidPreset)) {
    const presetGrid = document.getElementById('presetGrid');
    presetGrid.innerHTML = Object.keys(FLUID_PRESETS).map(name => `
      <button class="preset-btn" data-fluid="${name}">${name}</button>
    `).join('');
    
    // 流体预设点击事件
    presetGrid.addEventListener('click', (e) => {
      if (e.target.classList.contains('preset-btn')) {
        const fluidName = e.target.dataset.fluid;
        applyFluidPreset(fluidName);
      }
    });
  }
  
  // 参数滑块事件
  exp.params.forEach(param => {
    const slider = document.getElementById(param.id);
    const valueDisplay = document.getElementById(`${param.id}Value`);
    
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      valueDisplay.textContent = value.toFixed(param.step < 0.001 ? 5 : param.step < 0.01 ? 3 : 1);
      updateDataDisplay();
    });
  });
  
  // 模式切换
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateChartData();
    });
  });
  
  // 控制按钮（开始/暂停切换）
  const playPauseBtn = document.getElementById('playPauseBtn');
  playPauseBtn.addEventListener('click', () => {
    if (AppState.simulationRunning && !AppState.simulationPaused) {
      // 当前正在运行，暂停
      pauseSimulation();
      playPauseBtn.innerHTML = '▶ 继续';
      playPauseBtn.className = 'ctrl-btn play-pause';
    } else {
      // 当前暂停或未开始，开始
      startSimulation();
      playPauseBtn.innerHTML = '⏸ 暂停';
      playPauseBtn.className = 'ctrl-btn play-pause running';
    }
  });
  
  document.getElementById('resetBtn').addEventListener('click', resetSimulation);
  
  // 更新数据
  updateDataDisplay();
  
  // 初始化实时图表
  initRealtimeChart();
}

// ========================================
// 应用流体预设
// ========================================
function applyFluidPreset(fluidName) {
  const fluid = FLUID_PRESETS[fluidName];
  if (!fluid) return;
  
  const exp = EXPERIMENTS[AppState.currentExperiment];
  
  exp.params.forEach(param => {
    if (param.useFluidPreset) {
      if (param.id === 'viscosity' || param.id === 'mu') {
        const slider = document.getElementById('viscosity');
        const valueDisplay = document.getElementById('viscosityValue');
        if (slider) {
          slider.value = fluid.mu;
          valueDisplay.textContent = fluid.mu.toExponential(2);
        }
      }
      if (param.id === 'density' || param.id === 'rho' || param.id === 'fluidDensity') {
        const sliderId = param.id === 'density' ? 'density' : 'fluidDensity';
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(`${sliderId}Value`);
        if (slider) {
          slider.value = fluid.rho;
          valueDisplay.textContent = fluid.rho.toFixed(2);
        }
      }
    }
  });
  
  updateDataDisplay();
}

// ========================================
// 动画画布实现
// ========================================
let canvasCtx = null;
// animParticles 保留用于未来扩展，当前绘制函数使用内联粒子生成
let animParticles = [];
let resizeHandler = null; // 保存resize事件处理器引用

function initSimulationCanvas() {
  const canvas = document.getElementById('simCanvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  console.log('Initializing canvas...', canvas);
  
  canvasCtx = canvas.getContext('2d');
  
  // 移除旧的resize监听器（如果存在）
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }
  
  // 创建新的resize处理器
  resizeHandler = () => {
    resizeCanvas();
  };
  window.addEventListener('resize', resizeHandler);
  
  // 延迟设置尺寸，确保DOM已渲染
  setTimeout(() => {
    resizeCanvas();
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
  }, 100);
  
  // 初始化粒子
  initParticles();
  
  // 立即绘制一次
  setTimeout(() => {
    drawSimulationCanvas();
    console.log('Canvas drawn');
  }, 150);
  
  // 注意：不在这里启动绘制循环，由runSimulation统一控制
}

function resizeCanvas() {
  const canvas = document.getElementById('simCanvas');
  if (!canvas) {
    console.error('Canvas not found in resizeCanvas');
    return;
  }
  
  const container = canvas.parentElement;
  if (!container) {
    console.error('Canvas parent not found');
    return;
  }
  
  // 使用offsetWidth和offsetHeight，它们会返回实际渲染的尺寸
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  
  // 确保尺寸有效
  if (width > 0 && height > 0) {
    canvas.width = width;
    canvas.height = height;
    console.log('Canvas resized to:', canvas.width, 'x', canvas.height);
  } else {
    console.warn('Container has no size:', width, 'x', height);
    // 如果容器还没有尺寸，稍后重试
    setTimeout(resizeCanvas, 100);
  }
}

function initParticles() {
  animParticles = [];
  const exp = AppState.currentExperiment;
  
  if (exp === 'newton') {
    for (let i = 0; i < 50; i++) {
      animParticles.push({
        x: Math.random() * 800,
        y: Math.random() * 400,
        speed: Math.random() * 2 + 1
      });
    }
  } else if (exp === 'poiseuille') {
    for (let i = 0; i < 80; i++) {
      animParticles.push({
        x: Math.random() * 800,
        y: Math.random() * 400,
        speed: Math.random() * 3 + 1
      });
    }
  } else if (exp === 'stokes') {
    animParticles.push({
      x: 400,
      y: 0,
      speed: 0
    });
  }
}

// drawCanvasLoop 已移除，统一由 runSimulation 控制绘制循环

function drawSimulationCanvas() {
  if (!canvasCtx) {
    console.error('Canvas context is null');
    return;
  }
  
  const canvas = document.getElementById('simCanvas');
  if (!canvas) {
    console.error('Canvas element not found in drawSimulationCanvas');
    return;
  }
  
  const w = canvas.width;
  const h = canvas.height;
  const exp = AppState.currentExperiment;
  
  if (!exp) {
    console.error('No experiment selected');
    return;
  }
  
  console.log('Drawing simulation:', exp, 'Size:', w, 'x', h);
  
  const isDark = document.body.classList.contains('dark-theme');
  canvasCtx.fillStyle = isDark ? '#0a0a0f' : '#ffffff';
  canvasCtx.fillRect(0, 0, w, h);
  
  if (exp === 'newton') {
    drawNewtonSimulation(w, h, isDark);
  } else if (exp === 'poiseuille') {
    drawPoiseuilleSimulation(w, h, isDark);
  } else if (exp === 'stokes') {
    drawStokesSimulation(w, h, isDark);
  }
}

function drawNewtonSimulation(w, h, isDark) {
  const params = getParamValues();
  
  // 配置参数（与 Python CanvasConfig.Newton 完全一致）
  const MARGIN_LEFT = 80;
  const MARGIN_RIGHT = 100;
  const MARGIN_TOP = 60;
  const MARGIN_BOTTOM = 120;
  const MAX_VELOCITY = 5.0;
  const MAX_DISTANCE = 0.05;
  const GRID_LINES = 11;
  const NUM_LAYERS = 12;
  
  const cw = w - MARGIN_LEFT - MARGIN_RIGHT;
  const ch = h - MARGIN_TOP - MARGIN_BOTTOM;
  const sx = MARGIN_LEFT;
  const sy = MARGIN_TOP;
  
  const velocity = params.velocity || 1;
  const viscosity = params.viscosity || 0.001;
  const distance = params.distance || 0.01;
  
  // 物理计算
  const grad = velocity / distance;
  const tau = viscosity * grad;
  
  // 1. 绘制网格
  const gridColor = isDark ? 'rgba(42, 42, 58, 0.3)' : 'rgba(220, 225, 236, 0.7)';
  canvasCtx.strokeStyle = gridColor;
  canvasCtx.lineWidth = 1;
  for (let i = 0; i <= GRID_LINES; i++) {
    const y = sy + (i / GRID_LINES) * ch;
    canvasCtx.beginPath();
    canvasCtx.moveTo(sx, y);
    canvasCtx.lineTo(sx + cw, y);
    canvasCtx.stroke();
    
    const x = sx + (i / GRID_LINES) * cw;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, sy);
    canvasCtx.lineTo(x, sy + ch);
    canvasCtx.stroke();
  }
  
  // 2. 坐标轴
  const axisColor = isDark ? '#2a2a3a' : '#666666';
  canvasCtx.strokeStyle = axisColor;
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  canvasCtx.moveTo(sx, sy);
  canvasCtx.lineTo(sx, sy + ch);
  canvasCtx.lineTo(sx + cw, sy + ch);
  canvasCtx.stroke();
  
  // 3. 刻度
  const tickColor = isDark ? '#606070' : '#999999';
  canvasCtx.fillStyle = tickColor;
  canvasCtx.font = '9px Consolas';
  canvasCtx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    const val = (i / 5) * MAX_VELOCITY;
    const x = sx + (i / 5) * cw;
    canvasCtx.fillText(val.toFixed(1), x, sy + ch + 20);
  }
  
  canvasCtx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const val = (i / 5) * MAX_DISTANCE;
    const y = sy + ch - (i / 5) * ch;
    canvasCtx.fillText(val.toFixed(3), sx - 10, y + 4);
  }
  
  // 4. 轴标签
  const labelColor = isDark ? '#a0a0b0' : '#666666';
  canvasCtx.fillStyle = labelColor;
  canvasCtx.font = '11px Microsoft YaHei';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText('速度 u (m/s)', sx + cw / 2, sy + ch + 45);
  
  canvasCtx.save();
  canvasCtx.translate(sx - 50, sy + ch / 2);
  canvasCtx.rotate(-Math.PI / 2);
  canvasCtx.fillText('距离 y (m)', 0, 0);
  canvasCtx.restore();
  
  // 5. 速度分布曲线
  const curveColor = isDark ? '#00D4FF' : '#1a3c7c';
  canvasCtx.strokeStyle = curveColor;
  canvasCtx.lineWidth = 3;
  canvasCtx.beginPath();
  
  for (let i = 0; i <= 100; i++) {
    const yn = i / 100;
    const yVal = yn * MAX_DISTANCE;
    const vVal = (yVal / distance) * velocity;
    const xRatio = vVal / MAX_VELOCITY;
    const x = sx + xRatio * cw;
    const y = sy + ch - yn * ch;
    
    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
  }
  canvasCtx.stroke();
  
  // 6. 上下平板（圆角矩形）
  const plateGrad1 = canvasCtx.createLinearGradient(sx, sy - 15, sx, sy - 5);
  if (isDark) {
    plateGrad1.addColorStop(0, '#808090');
    plateGrad1.addColorStop(1, '#505060');
  } else {
    plateGrad1.addColorStop(0, '#b0b0c0');
    plateGrad1.addColorStop(1, '#808090');
  }
  
  const plateGrad2 = canvasCtx.createLinearGradient(sx, sy + ch + 5, sx, sy + ch + 15);
  if (isDark) {
    plateGrad2.addColorStop(0, '#505060');
    plateGrad2.addColorStop(1, '#808090');
  } else {
    plateGrad2.addColorStop(0, '#808090');
    plateGrad2.addColorStop(1, '#b0b0c0');
  }
  
  canvasCtx.fillStyle = plateGrad1;
  canvasCtx.fillRect(sx - 15, sy - 15, cw + 30, 10);
  canvasCtx.fillStyle = plateGrad2;
  canvasCtx.fillRect(sx - 15, sy + ch + 5, cw + 30, 10);
  
  // 7. 上平板箭头
  const arrowColor = isDark ? '#00FF88' : '#2ecc71';
  canvasCtx.strokeStyle = arrowColor;
  canvasCtx.lineWidth = 2;
  const ax = sx + cw - 50;
  const ay = sy - 22;
  canvasCtx.beginPath();
  canvasCtx.moveTo(ax, ay);
  canvasCtx.lineTo(ax + 30, ay);
  canvasCtx.lineTo(ax + 25, ay - 5);
  canvasCtx.moveTo(ax + 30, ay);
  canvasCtx.lineTo(ax + 25, ay + 5);
  canvasCtx.stroke();
  
  canvasCtx.fillStyle = arrowColor;
  canvasCtx.font = '10px Microsoft YaHei';
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText(`v = ${velocity.toFixed(1)} m/s`, ax - 10, ay - 10);
  
  // 8. 切应力标注
  const tauColor = isDark ? '#FF4D4D' : '#e74c3c';
  canvasCtx.strokeStyle = tauColor;
  canvasCtx.lineWidth = 2;
  const tx = sx + cw + 20;
  const ty = sy + ch / 2;
  canvasCtx.beginPath();
  canvasCtx.moveTo(tx, ty - 40);
  canvasCtx.lineTo(tx, ty + 40);
  canvasCtx.lineTo(tx - 5, ty - 35);
  canvasCtx.moveTo(tx, ty - 45);
  canvasCtx.lineTo(tx + 5, ty - 35);
  canvasCtx.moveTo(tx, ty + 35);
  canvasCtx.lineTo(tx - 5, ty + 45);
  canvasCtx.moveTo(tx, ty + 35);
  canvasCtx.lineTo(tx + 5, ty + 45);
  canvasCtx.stroke();
  
  canvasCtx.fillStyle = tauColor;
  canvasCtx.font = '11px Microsoft YaHei';
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText(`τ = ${tau.toFixed(3)} Pa`, tx + 10, ty + 5);
  
  // 9. 粘度信息
  const infoColor = '#00D4FF';
  canvasCtx.fillStyle = infoColor;
  canvasCtx.font = '10px Microsoft YaHei';
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText(`μ = ${viscosity.toFixed(4)} Pa·s`, sx + 10, sy + 25);
  
  // 10. 粘度指示
  const viscosityFactor = 1.0 / (1.0 + Math.log10(Math.max(viscosity / 0.001, 0.01)) * 0.3);
  const clampedFactor = Math.max(0.1, Math.min(viscosityFactor, 2.0));
  
  if (clampedFactor < 0.5) {
    canvasCtx.fillStyle = '#e74c3c';
    canvasCtx.fillText('高粘度 - 流动缓慢', sx + 10, sy + 42);
  } else if (clampedFactor > 1.2) {
    canvasCtx.fillStyle = '#2ecc71';
    canvasCtx.fillText('低粘度 - 流动快速', sx + 10, sy + 42);
  } else {
    canvasCtx.fillStyle = '#f39c12';
    canvasCtx.fillText('中等粘度', sx + 10, sy + 42);
  }
  
  // 11. 动态粒子和流线
  const t = AppState.simTime * 2;
  const vFactor = 1.0 / (1.0 + Math.log10(Math.max(viscosity / 0.001, 0.01)) * 0.3);
  const clampedVFactor = Math.max(0.1, Math.min(vFactor, 2.0));
  
  for (let i = 0; i < NUM_LAYERS; i++) {
    const layerYn = i / (NUM_LAYERS - 1);
    const layerV = layerYn * velocity;
    const yp = sy + ch - layerYn * ch;
    
    // 速度映射颜色
    const ratio = Math.min(Math.abs(layerV) / MAX_VELOCITY, 1.0);
    const r = Math.floor(255 * ratio);
    const g = Math.floor(100 * (1 - ratio));
    const b = Math.floor(200 * (1 - ratio));
    const color = `rgb(${r}, ${g}, ${b})`;
    
    // 流线（波浪形虚线）
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 2;
    canvasCtx.globalAlpha = 0.6;
    canvasCtx.beginPath();
    
    const animatedV = layerV * clampedVFactor;
    for (let seg = 0; seg < cw; seg += 4) {
      const offset = (seg / 15 + t * animatedV * 5) % (2 * Math.PI);
      const wave = yp + Math.sin(offset) * 3;
      if (seg === 0) {
        canvasCtx.moveTo(sx + seg, wave);
      } else {
        canvasCtx.lineTo(sx + seg, wave);
      }
    }
    canvasCtx.stroke();
    canvasCtx.globalAlpha = 1.0;
    
    // 粒子（每层3个）
    canvasCtx.fillStyle = color;
    for (let pi = 0; pi < 3; pi++) {
      const px = sx + ((t * animatedV * 60 + pi * cw / 3) % cw);
      canvasCtx.beginPath();
      canvasCtx.arc(px, yp, 4, 0, Math.PI * 2);
      canvasCtx.fill();
    }
  }
}

function drawPoiseuilleSimulation(w, h, isDark) {
  const params = getParamValues();
  
  // 配置参数
  const PIPE_RADIUS_RATIO = 0.28;
  const PIPE_LENGTH_RATIO = 2.2;
  const PROFILE_WIDTH = 100;
  const ANIMATION_SPEED = 8.0;
  
  const cx = w / 2 - 40;
  const cy = h / 2;
  const pipeR = Math.min(w, h) * PIPE_RADIUS_RATIO;
  const pipeLen = pipeR * PIPE_LENGTH_RATIO;
  
  // 物理计算
  const calc = PhysicsEngine.poiseuille(params.radius, params.length, params.pressure, params.viscosity, params.density);
  const maxV = Math.max(calc.vmax, 1e-10);
  
  // 流体颜色（根据密度）
  const rhoNormalized = Math.min(Math.max((params.density - 0.5) / (2000 - 0.5), 0), 1);
  const fluidAlpha = 10 + rhoNormalized * 90;
  const fluidR = 26 + rhoNormalized * 20;
  const fluidG = 60 - rhoNormalized * 30;
  const fluidB = 124 + rhoNormalized * 80;
  
  // 1. 管道背景渐变
  const pipeGrad = canvasCtx.createLinearGradient(cx - pipeR, 0, cx + pipeR, 0);
  pipeGrad.addColorStop(0, `rgba(${fluidR}, ${fluidG}, ${fluidB}, ${fluidAlpha / 255})`);
  pipeGrad.addColorStop(0.5, `rgba(${fluidR}, ${fluidG}, ${fluidB}, ${fluidAlpha / 2 / 255})`);
  pipeGrad.addColorStop(1, `rgba(${fluidR}, ${fluidG}, ${fluidB}, ${fluidAlpha / 255})`);
  canvasCtx.fillStyle = pipeGrad;
  canvasCtx.fillRect(cx - pipeR, cy - pipeLen / 2, pipeR * 2, pipeLen);
  
  // 2. 管壁
  const wallColor = isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(26, 60, 124, 0.6)';
  canvasCtx.strokeStyle = wallColor;
  canvasCtx.lineWidth = 3;
  canvasCtx.beginPath();
  canvasCtx.moveTo(cx - pipeR, cy - pipeLen / 2);
  canvasCtx.lineTo(cx - pipeR, cy + pipeLen / 2);
  canvasCtx.moveTo(cx + pipeR, cy - pipeLen / 2);
  canvasCtx.lineTo(cx + pipeR, cy + pipeLen / 2);
  canvasCtx.stroke();
  
  // 3. 端面椭圆（透视效果）
  const ellipseColor = isDark ? 'rgba(0, 212, 255, 0.4)' : 'rgba(26, 60, 124, 0.7)';
  canvasCtx.strokeStyle = ellipseColor;
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  canvasCtx.ellipse(cx, cy - pipeLen / 2, pipeR, pipeR * 0.25, 0, 0, Math.PI * 2);
  canvasCtx.stroke();
  canvasCtx.beginPath();
  canvasCtx.ellipse(cx, cy + pipeLen / 2, pipeR, pipeR * 0.25, 0, 0, Math.PI * 2);
  canvasCtx.stroke();
  
  // 4. 速度剖面（右侧抛物线）
  const profX = cx + pipeR + 50;
  const profColor = isDark ? '#00FF88' : '#2ecc71';
  canvasCtx.strokeStyle = profColor;
  canvasCtx.lineWidth = 3;
  canvasCtx.beginPath();
  
  for (let i = 0; i <= 60; i++) {
    const yn = i / 60;
    const r = (yn - 0.5) * 2;
    const v = maxV * (1 - r * r);
    const x = profX + (v / maxV) * PROFILE_WIDTH;
    const y = cy - pipeLen / 2 + yn * pipeLen;
    
    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
  }
  canvasCtx.stroke();
  
  // 填充剖面
  canvasCtx.lineTo(profX, cy + pipeLen / 2);
  canvasCtx.lineTo(profX, cy - pipeLen / 2);
  canvasCtx.closePath();
  canvasCtx.fillStyle = isDark ? 'rgba(0, 255, 136, 0.08)' : 'rgba(46, 204, 113, 0.1)';
  canvasCtx.fill();
  
  // 剖面标签
  canvasCtx.fillStyle = profColor;
  canvasCtx.font = '11px Microsoft YaHei';
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText('v(r)', profX + PROFILE_WIDTH + 10, cy + pipeLen / 2 + 22);
  
  // 5. 压强箭头
  const arrowColor = isDark ? '#00D4FF' : '#1a3c7c';
  canvasCtx.strokeStyle = arrowColor;
  canvasCtx.lineWidth = 2;
  
  // 入口箭头
  canvasCtx.beginPath();
  canvasCtx.moveTo(cx - pipeR - 70, cy - pipeLen / 2);
  canvasCtx.lineTo(cx - pipeR - 25, cy - pipeLen / 2);
  canvasCtx.lineTo(cx - pipeR - 30, cy - pipeLen / 2 - 5);
  canvasCtx.moveTo(cx - pipeR - 25, cy - pipeLen / 2);
  canvasCtx.lineTo(cx - pipeR - 30, cy - pipeLen / 2 + 5);
  canvasCtx.stroke();
  
  // 出口箭头
  canvasCtx.beginPath();
  canvasCtx.moveTo(cx + pipeR + 70, cy + pipeLen / 2);
  canvasCtx.lineTo(cx + pipeR + 25, cy + pipeLen / 2);
  canvasCtx.lineTo(cx + pipeR + 30, cy + pipeLen / 2 - 5);
  canvasCtx.moveTo(cx + pipeR + 25, cy + pipeLen / 2);
  canvasCtx.lineTo(cx + pipeR + 30, cy + pipeLen / 2 + 5);
  canvasCtx.stroke();
  
  // 压强标签
  canvasCtx.fillStyle = arrowColor;
  canvasCtx.font = '10px Microsoft YaHei';
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText(`P₁ = ${params.pressure.toFixed(0)} Pa`, cx - pipeR - 80, cy - pipeLen / 2 - 12);
  canvasCtx.fillText('P₂ = 0 Pa', cx + pipeR + 25, cy + pipeLen / 2 + 22);
  
  // 6. 管道参数标签
  const labelColor = isDark ? '#606070' : '#999999';
  canvasCtx.fillStyle = labelColor;
  canvasCtx.font = '10px Microsoft YaHei';
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText(`R = ${(params.radius * 1000).toFixed(1)} mm`, cx - 30, cy + pipeLen / 2 + 65);
  canvasCtx.fillText(`L = ${params.length.toFixed(1)} m`, cx - 30, cy + pipeLen / 2 + 85);
  
  // 密度标签
  const densityColor = isDark ? '#00D4FF' : '#f39c12';
  canvasCtx.fillStyle = densityColor;
  canvasCtx.fillText(`ρ = ${params.density.toFixed(1)} kg/m³`, cx - 40, cy + pipeLen / 2 + 105);
  
  // 7. 动态粒子（400个，透视效果）
  const t = AppState.simTime * ANIMATION_SPEED;
  
  // 使用固定种子确保可重复性
  const particles = [];
  for (let i = 0; i < 400; i++) {
    // 伪随机数生成（基于索引）
    const rNorm = ((i * 7919 + 104729) % 100000) / 100000;
    const angle = ((i * 65537 + 104729) % 100000) / 100000 * Math.PI * 2;
    const r = rNorm * pipeR * 0.88;
    
    // 抛物线速度分布
    const v = maxV * (1 - rNorm * rNorm);
    const vAnim = Math.sqrt(v / maxV) * maxV;
    
    // 流动偏移
    const flowOff = (t * vAnim * 50 + i * 7) % pipeLen;
    const z = cy + pipeLen / 2 - flowOff;
    
    // 只绘制在管道范围内的粒子
    if (z < cy - pipeLen / 2 || z > cy + pipeLen / 2) continue;
    
    // 透视缩放
    const scale = 0.3 + (z - (cy - pipeLen / 2)) / pipeLen * 0.7;
    const px = cx + Math.cos(angle) * r * 0.25 * scale;
    
    // 颜色（根据速度）
    const ratio = Math.min(v / (maxV * 1.1), 1);
    const pr = Math.floor(255 * ratio);
    const pg = Math.floor(100 * (1 - ratio));
    const pb = Math.floor(200 * (1 - ratio));
    const alpha = Math.floor(255 * (0.6 + scale * 0.3) * (0.4 + rhoNormalized * 0.5));
    
    particles.push({ x: px, y: z, radius: 2.5 * scale, color: `rgba(${pr}, ${pg}, ${pb}, ${alpha / 255})` });
  }
  
  // 批量绘制粒子
  particles.forEach(p => {
    canvasCtx.fillStyle = p.color;
    canvasCtx.beginPath();
    canvasCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    canvasCtx.fill();
  });
}

function drawStokesSimulation(w, h, isDark) {
  const params = getParamValues();
  
  // 配置参数
  const CONTAINER_WIDTH_RATIO = 0.4;
  const CONTAINER_HEIGHT_RATIO = 0.7;
  const CONTAINER_MAX_WIDTH = 280;
  const CONTAINER_MAX_HEIGHT = 480;
  const BALL_RADIUS_SCALE = 8000;
  const MIN_BALL_RADIUS = 10;
  const STREAM_LINE_RANGE = 6;
  const STREAM_LINE_STEP = 3;
  const FORCE_SCALE = 80;
  const MAX_FORCE_LENGTH = 120;
  
  const cx = w / 2;
  const contW = Math.min(w * CONTAINER_WIDTH_RATIO, CONTAINER_MAX_WIDTH);
  const contH = Math.min(h * CONTAINER_HEIGHT_RATIO, CONTAINER_MAX_HEIGHT);
  const sx = cx - contW / 2;
  const sy = (h - contH) / 2;
  
  // 物理计算
  const calc = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
  
  // 1. 容器背景渐变
  const containerGrad = canvasCtx.createLinearGradient(sx, sy, sx + contW, sy + contH);
  containerGrad.addColorStop(0, 'rgba(26, 60, 124, 0.05)');
  containerGrad.addColorStop(0.5, 'rgba(26, 60, 124, 0.08)');
  containerGrad.addColorStop(1, 'rgba(26, 60, 124, 0.05)');
  canvasCtx.fillStyle = containerGrad;
  canvasCtx.fillRect(sx + 2, sy + 2, contW - 4, contH - 4);
  
  // 2. 液面
  canvasCtx.fillStyle = 'rgba(26, 60, 124, 0.15)';
  canvasCtx.fillRect(sx + 2, sy + 2, contW - 4, 20);
  
  // 3. 容器边框
  canvasCtx.strokeStyle = 'rgba(26, 60, 124, 0.6)';
  canvasCtx.lineWidth = 3;
  canvasCtx.strokeRect(sx, sy, contW, contH);
  
  // 4. 小球位置和大小
  const ballR = Math.max(MIN_BALL_RADIUS, params.ballRadius * BALL_RADIUS_SCALE);
  const ballX = cx;
  
  // 小球下落动画（使用解析解）
  let ballY;
  if (AppState.simulationRunning && !AppState.simulationPaused) {
    const vt = (isNaN(calc.vt) || !isFinite(calc.vt)) ? 0 : Math.max(calc.vt, 0); // 确保收尾速度为正且有效
    
    // 计算时间常数 τ = m / (6πμr)
    let tau;
    if (params.viscosity > 0 && params.ballRadius > 0) {
      tau = calc.mass / (6 * Math.PI * params.viscosity * params.ballRadius);
    } else {
      tau = 1.0; // 默认值
    }
    
    // 使用解析解增量更新速度：v_new = vt - (vt - v_old) * e^(-dt/τ)
    const dt = 0.016; // 16ms per frame
    if (tau > 0) {
      const decay = Math.exp(-dt / tau);
      AppState.stokesBallV = vt - (vt - AppState.stokesBallV) * decay;
    } else {
      AppState.stokesBallV = vt;
    }
    
    // 确保速度不为负
    AppState.stokesBallV = Math.max(AppState.stokesBallV, 0);
    
    // 更新位置
    AppState.stokesBallY = AppState.stokesBallY + AppState.stokesBallV * dt;
    AppState.stokesBallY = Math.min(AppState.stokesBallY, 1.0);
    
    // 到达底部后停止
    if (AppState.stokesBallY >= 1.0) {
      AppState.stokesBallV = 0;
    }
    
    ballY = sy + 30 + AppState.stokesBallY * (contH - 60);
  } else {
    // 仿真未运行或已暂停，使用当前状态（不更新）
    ballY = sy + 30 + AppState.stokesBallY * (contH - 60);
  }
  
  // 5. 流线（绕过小球）
  canvasCtx.strokeStyle = 'rgba(26, 60, 124, 0.3)';
  canvasCtx.lineWidth = 1;
  
  for (let i = -STREAM_LINE_RANGE; i <= STREAM_LINE_RANGE; i++) {
    if (i === 0) continue;
    
    const streamY = ballY + i * ballR * 1.8;
    if (streamY < sy + 5 || streamY > sy + contH - 5) continue;
    
    canvasCtx.beginPath();
    for (let xOff = -contW / 2; xOff < contW / 2; xOff += STREAM_LINE_STEP) {
      const dx = xOff;
      const dy = streamY - ballY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const deflect = dist > ballR ? (ballR * ballR * dx) / (dist * dist) : 0;
      const px = ballX + xOff;
      const py = streamY - deflect * 0.4;
      
      if (xOff === -contW / 2) {
        canvasCtx.moveTo(px, py);
      } else {
        canvasCtx.lineTo(px, py);
      }
    }
    canvasCtx.stroke();
  }
  
  // 6. 小球渐变
  const ballGrad = canvasCtx.createRadialGradient(ballX - ballR / 3, ballY - ballR / 3, 0, ballX, ballY, ballR);
  ballGrad.addColorStop(0, '#ff8a8a');
  ballGrad.addColorStop(0.7, '#e03131');
  ballGrad.addColorStop(1, '#a91e2c');
  canvasCtx.fillStyle = ballGrad;
  canvasCtx.beginPath();
  canvasCtx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
  canvasCtx.fill();
  
  canvasCtx.strokeStyle = 'rgba(255, 135, 135, 0.8)';
  canvasCtx.lineWidth = 1.5;
  canvasCtx.stroke();
  
  // 7. 力矢量
  // 重力Fg
  if (calc.Fg > 0) {
    const gLen = Math.min(calc.Fg * FORCE_SCALE, MAX_FORCE_LENGTH);
    canvasCtx.strokeStyle = '#e74c3c';
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.moveTo(ballX, ballY + ballR + 5);
    canvasCtx.lineTo(ballX, ballY + ballR + 5 + gLen);
    canvasCtx.lineTo(ballX - 6, ballY + ballR + gLen);
    canvasCtx.moveTo(ballX, ballY + ballR + 5 + gLen);
    canvasCtx.lineTo(ballX + 6, ballY + ballR + gLen);
    canvasCtx.stroke();
    
    canvasCtx.fillStyle = '#e74c3c';
    canvasCtx.font = '10px Microsoft YaHei';
    canvasCtx.textAlign = 'left';
    canvasCtx.fillText('Fg', ballX + 12, ballY + ballR + 10 + gLen / 2);
  }
  
  // 浮力Fb
  if (calc.Fb > 0) {
    const bLen = Math.min(calc.Fb * FORCE_SCALE, MAX_FORCE_LENGTH);
    canvasCtx.strokeStyle = '#3498db';
    canvasCtx.lineWidth = 3;
    const bx = ballX - ballR - 12;
    canvasCtx.beginPath();
    canvasCtx.moveTo(bx, ballY);
    canvasCtx.lineTo(bx, ballY - bLen);
    canvasCtx.lineTo(bx - 5, ballY - bLen + 6);
    canvasCtx.moveTo(bx, ballY - bLen);
    canvasCtx.lineTo(bx + 5, ballY - bLen + 6);
    canvasCtx.stroke();
    
    canvasCtx.fillStyle = '#3498db';
    canvasCtx.font = '10px Microsoft YaHei';
    canvasCtx.textAlign = 'right';
    canvasCtx.fillText('Fb', bx - 8, ballY - bLen / 2);
  }
  
  // 阻力Fd
  const Fd = PhysicsEngine.stokesDrag(params.viscosity, params.ballRadius, calc.vt);
  if (Fd > 0.0001) {
    const dLen = Math.min(Fd * FORCE_SCALE * 15, MAX_FORCE_LENGTH);
    canvasCtx.strokeStyle = '#f39c12';
    canvasCtx.lineWidth = 3;
    const dx = ballX + ballR + 12;
    canvasCtx.beginPath();
    canvasCtx.moveTo(dx, ballY);
    canvasCtx.lineTo(dx, ballY - dLen);
    canvasCtx.lineTo(dx - 5, ballY - dLen + 6);
    canvasCtx.moveTo(dx, ballY - dLen);
    canvasCtx.lineTo(dx + 5, ballY - dLen + 6);
    canvasCtx.stroke();
    
    canvasCtx.fillStyle = '#f39c12';
    canvasCtx.font = '10px Microsoft YaHei';
    canvasCtx.textAlign = 'left';
    canvasCtx.fillText('Fd', dx + 8, ballY - dLen / 2);
  }
  
  // 8. 速度标注
  canvasCtx.fillStyle = '#2ecc71';
  canvasCtx.font = '12px Consolas';
  canvasCtx.textAlign = 'left';
  const vtDisplay = (isNaN(calc.vt) || !isFinite(calc.vt)) ? 0 : calc.vt;
  canvasCtx.fillText(`v = ${vtDisplay.toFixed(4)} m/s`, cx - 60, sy + contH + 25);
  
  // 9. 到达底部提示
  if (AppState.stokesBallY >= 0.99) {
    canvasCtx.fillStyle = 'rgba(46, 204, 113, 0.15)';
    canvasCtx.fillRect(sx + 5, sy + contH / 2 - 15, contW - 10, 30);
    
    canvasCtx.fillStyle = '#2ecc71';
    canvasCtx.font = '12px Microsoft YaHei';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('小球已到达底部', cx, sy + contH / 2 + 5);
  }
}

function getParamValues() {
  const exp = EXPERIMENTS[AppState.currentExperiment];
  if (!exp) return {};
  
  const values = {};
  
  exp.params.forEach(param => {
    const slider = document.getElementById(param.id);
    if (slider) {
      values[param.id] = parseFloat(slider.value);
    } else {
      // 如果滑块不存在，使用默认值
      values[param.id] = param.value;
    }
  });
  
  return values;
}

// ========================================
// 数据面板更新
// ========================================
function updateDataDisplay() {
  const exp = AppState.currentExperiment;
  const params = getParamValues();
  const container = document.getElementById('dataContainer');
  
  if (!container) return;
  
  let results = {};
  
  if (exp === 'newton') {
    results = PhysicsEngine.newtonViscosity(params.velocity, params.viscosity, params.distance);
  } else if (exp === 'poiseuille') {
    results = PhysicsEngine.poiseuille(params.radius, params.length, params.pressure, params.viscosity, params.density);
  } else if (exp === 'stokes') {
    results = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
  }
  
  container.innerHTML = Object.entries(results).map(([key, value]) => {
    const varName = EXPERIMENTS[exp].variables[key] || key;
    let displayValue;
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        displayValue = '0.0000e+0';
      } else {
        displayValue = value.toExponential(4);
      }
    } else {
      displayValue = value;
    }
    return `
      <div class="data-card">
        <div class="data-label">${key}</div>
        <div class="data-value">
          ${displayValue}
          <span class="data-unit">${getUnit(key)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function getUnit(key) {
  const units = {
    'grad': 's⁻¹',
    'tau': 'Pa',
    'Q': 'm³/s',
    'vmax': 'm/s',
    'Rf': 'Pa·s/m³',
    'Re': '',
    'v_avg': 'm/s',
    'Fg': 'N',
    'Fb': 'N',
    'vt': 'm/s',
    's': 's',
    'volume': 'm³',
    'mass': 'kg'
  };
  return units[key] || '';
}

// ========================================
// 实时图表功能
// ========================================
function initRealtimeChart() {
  const ctx = document.getElementById('realtimeChart');
  if (!ctx) {
    console.error('realtimeChart canvas not found');
    return;
  }
  
  const isDark = document.body.classList.contains('dark-theme');
  
  // 根据实验类型确定图表配置
  const exp = AppState.currentExperiment;
  let chartConfig = {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: getChartLabel(exp),
        data: [],
        borderColor: getChartColor(exp),
        backgroundColor: getChartColor(exp) + '25',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '时间 (s)',
            color: isDark ? '#606070' : '#666666',
            font: { size: 10 }
          },
          ticks: {
            color: isDark ? '#606070' : '#666666',
            font: { size: 9 },
            maxTicksLimit: 6
          },
          grid: {
            color: isDark ? '#2a2a3a' : '#e0e5ec',
            lineWidth: 0.5
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: getChartYLabel(exp),
            color: isDark ? '#606070' : '#666666',
            font: { size: 10 }
          },
          ticks: {
            color: isDark ? '#606070' : '#666666',
            font: { size: 9 }
          },
          grid: {
            color: isDark ? '#2a2a3a' : '#e0e5ec',
            lineWidth: 0.5
          }
        }
      }
    }
  };
  
  AppState.chartInstance = new Chart(ctx, chartConfig);
}

function getChartLabel(exp) {
  const labels = {
    'newton': '切应力 τ',
    'poiseuille': '体积流量 Q',
    'stokes': '速度 v'
  };
  return labels[exp] || '数据';
}

function getChartColor(exp) {
  const colors = {
    'newton': '#1a3c7c',
    'poiseuille': '#2ecc71',
    'stokes': '#f39c12'
  };
  return colors[exp] || '#3381ff';
}

function getChartYLabel(exp) {
  const labels = {
    'newton': 'τ (Pa)',
    'poiseuille': 'Q (×10⁻⁶ m³/s)',
    'stokes': 'v (m/s)'
  };
  return labels[exp] || '值';
}

function updateRealtimeChart() {
  if (!AppState.chartInstance) return;
  
  const exp = AppState.currentExperiment;
  const params = getParamValues();
  
  // 计算当前数据点
  let currentValue = 0;
  let refLine = null;
  
  if (exp === 'newton') {
    const calc = PhysicsEngine.newtonViscosity(params.velocity, params.viscosity, params.distance);
    currentValue = calc.tau;
  } else if (exp === 'poiseuille') {
    const calc = PhysicsEngine.poiseuille(params.radius, params.length, params.pressure, params.viscosity, params.density);
    currentValue = calc.Q * 1e6; // 转换为 ×10⁻⁶ m³/s
  } else if (exp === 'stokes') {
    const calc = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
    currentValue = AppState.stokesBallV || 0;
    refLine = calc.vt; // 终端速度参考线
  }
  
  // 添加数据到历史
  AppState.dataHistory.push(currentValue);
  AppState.timeHistory.push(AppState.simTime);
  
  // 限制历史数据长度（最多显示20秒）
  const maxTime = 20;
  while (AppState.timeHistory.length > 0 && 
         AppState.timeHistory[AppState.timeHistory.length - 1] - AppState.timeHistory[0] > maxTime) {
    AppState.dataHistory.shift();
    AppState.timeHistory.shift();
  }
  
  // 更新图表
  const chart = AppState.chartInstance;
  chart.data.labels = AppState.timeHistory.map(t => t.toFixed(1));
  chart.data.datasets[0].data = AppState.dataHistory;
  
  // 更新参考线（仅斯托克斯实验）
  if (exp === 'stokes' && refLine !== null) {
    // Chart.js 不直接支持参考线，使用注释插件或第二个数据集
    if (chart.data.datasets.length < 2) {
      chart.data.datasets.push({
        label: '终端速度',
        data: [],
        borderColor: '#e74c3c',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });
    }
    chart.data.datasets[1].data = AppState.timeHistory.map(() => refLine);
  }
  
  chart.update('none'); // 'none' 模式禁用动画，提高性能
}

// ========================================
// 仿真控制
// ========================================
function startSimulation() {
  if (AppState.simulationRunning && AppState.simulationPaused) {
    AppState.simulationPaused = false;
    runSimulation();
    return;
  }
  
  // 如果是第一次启动（未运行过），重置小球状态
  if (!AppState.simulationRunning) {
    AppState.stokesBallY = 0.05;  // 重置位置到顶部
    AppState.stokesBallV = 0;     // 重置速度为0
  }
  
  AppState.simulationRunning = true;
  AppState.simulationPaused = false;
  runSimulation();
}

function runSimulation() {
  if (!AppState.simulationRunning || AppState.simulationPaused) return;
  
  // 更新仿真时间（使用固定时间步长以保持物理模拟的稳定性）
  AppState.simTime += 0.016; // 16ms per frame
  
  updateDataDisplay();
  
  // 更新实时图表
  updateRealtimeChart();
  
  // 绘制Canvas动画
  if (canvasCtx) {
    drawSimulationCanvas();
  }
  
  // 使用requestAnimationFrame进行下一次迭代
  AppState.animFrameId = requestAnimationFrame(runSimulation);
}

function pauseSimulation() {
  AppState.simulationPaused = true;
}

function resetSimulation() {
  Navigation.stopSimulation();
  
  // 重置状态
  AppState.simTime = 0;
  AppState.stokesBallY = 0.05;
  AppState.stokesBallV = 0;
  AppState.dataHistory = [];
  AppState.timeHistory = [];
  
  // 重置粒子
  initParticles();
  
  // 重绘画布
  if (canvasCtx) {
    drawSimulationCanvas();
  }
  
  updateDataDisplay();
  
  // 重置图表
  if (AppState.chartInstance) {
    AppState.chartInstance.data.labels = [];
    AppState.chartInstance.data.datasets[0].data = [];
    if (AppState.chartInstance.data.datasets.length > 1) {
      AppState.chartInstance.data.datasets[1].data = [];
    }
    AppState.chartInstance.update('none');
  }
  
  // 更新按钮状态为“开始”
  const playPauseBtn = document.getElementById('playPauseBtn');
  if (playPauseBtn) {
    playPauseBtn.innerHTML = '▶ 开始';
    playPauseBtn.className = 'ctrl-btn play-pause';
  }
}

// ========================================
// 事件监听初始化
// ========================================
function setupEventListeners() {
  // 实验卡片点击
  document.querySelectorAll('.experiment-card').forEach(card => {
    card.addEventListener('click', () => {
      const expType = card.dataset.experiment;
      Navigation.goToExperiment(expType);
    });
  });
  
  // 返回首页按钮
  document.getElementById('backBtn').addEventListener('click', () => {
    Navigation.goToHome();
  });
  
  // 菜单项点击
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      Navigation.switchSubPage(page);
    });
  });
  
  // 折叠菜单按钮
  document.getElementById('toggleSidebar').addEventListener('click', () => {
    Navigation.toggleSidebar();
  });
  
  // 主题切换
  ThemeManager.init();
}

// ========================================
// 初始化应用
// ========================================
function init() {
  setupEventListeners();
  console.log('黏性现象仿真模拟器 - 网页版已启动');
}

// 等待 DOM 加载完成后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM 已经加载完成
  init();
}
