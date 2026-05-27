// ========================================
// 黏性现象仿真模拟器 - 完整网页版
// 功能完全对应Python桌面版本
// ========================================

// Three.js 3D场景变量（泊肃叶实验）
// 注意：THREE 对象已从 index.html 中的 CDN 加载
let poiseuille3DScene = null;
let poiseuille3DCamera = null;
let poiseuille3DRenderer = null;
let poiseuille3DPipe = null;
let poiseuille3DParticles = [];
let poiseuille3DGrid = null;
let poiseuille3DControls = null;  // 轨道控制器，用于自由调整视角
let poiseuille3DInitialParticlePositions = [];  // 保存粒子的初始位置，用于重置

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
  stokesBallY: 0,  // 初始位置在顶部（0米）
  stokesBallV: 0,
  stokesBallDistance: 0,  // 初始下落距离0米
  stokesBallStartTime: null,  // 小球开始下落时间
  stokesBallFd: 0,  // 阻力（用于实时显示）
  newtonGradientLineStartTime: null,  // 牛顿实验虚线开始时间
  chartInstance: null,
  animFrameId: null,
  dataHistory: [],  // 历史数据
  timeHistory: [],   // 时间轴数据
  // 事件监听器引用，用于清理
  eventListeners: {
    experimentCards: [],
    presetGrid: null
  }
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
    formula: 'F = -η × A × (du/dz)',
    description: '探索牛顿黏性定律，理解剪切应力与速度梯度的关系',
    variables: {
      'F': '粘性力 (N)',
      'τ': '剪切应力 (Pa)',
      'grad': '速度梯度 (s⁻¹)'
    },
    params: [
      { id: 'distance', name: '板间距 z', symbol: 'z', unit: 'mm', min: 1, max: 50, step: 1, value: 50 },
      { id: 'velocity', name: '上板速度 u', symbol: 'u', unit: 'm/s', min: 0.01, max: 1.0, step: 0.01, value: 0.1 },
      { id: 'area', name: '板面积 A', symbol: 'A', unit: 'm²', min: 0.01, max: 1.0, step: 0.01, value: 0.1 },
      { id: 'viscosity', name: '动力黏度 η', symbol: 'η', unit: 'Pa·s', min: 0.00005, max: 2.0, step: 0.00005, value: 0.001, useFluidPreset: true }
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
      { id: 'radius', name: '管道半径 R', symbol: 'R', unit: 'm', min: 0.0005, max: 0.005, step: 0.0001, value: 0.002 },
      { id: 'length', name: '管道长度 L', symbol: 'L', unit: 'm', min: 0.1, max: 2.0, step: 0.05, value: 1.0 },
      { id: 'pressure', name: '压强差 ΔP', symbol: 'ΔP', unit: 'Pa', min: 102, max: 105, step: 0.01, value: 1000 },
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
  newtonViscosity(v, mu, z, A = 0.1) {
    // 参数验证和默认值
    if (!z || z === 0 || isNaN(z) || !isFinite(z)) z = 0.01;
    if (!mu || mu === 0 || isNaN(mu) || !isFinite(mu)) mu = 0.00001;
    if (!v || isNaN(v) || !isFinite(v)) v = 0;
    if (!A || A === 0 || isNaN(A) || !isFinite(A)) A = 0.1;
    
    // 将板间距从 mm 转换为 m
    const z_m = z / 1000;
    
    const grad = v / z_m;  // 速度梯度 (s⁻¹)
    const tau = mu * grad;  // 剪切应力 (Pa)
    const F = tau * A;  // 粘性力 (N)
    
    // 防止NaN和Infinity
    return { 
      grad: isFinite(grad) ? grad : 0, 
      tau: isFinite(tau) ? tau : 0,
      F: isFinite(F) ? F : 0
    };
  },

  // 泊肃叶定律
  poiseuille(R, L, dP, mu, rho) {
    // 参数验证和默认值
    if (!mu || mu === 0 || isNaN(mu) || !isFinite(mu)) mu = 0.00001; // 防止除以零
    if (!L || L === 0 || isNaN(L) || !isFinite(L)) L = 0.1;
    if (!R || R === 0 || isNaN(R) || !isFinite(R)) R = 0.001;
    if (!rho || rho === 0 || isNaN(rho) || !isFinite(rho)) rho = 1000;
    if (!dP || dP < 0 || isNaN(dP) || !isFinite(dP)) dP = 100;
    
    const R4 = Math.pow(R, 4);
    const Q = (Math.PI * R4 * dP) / (8 * mu * L);
    const vmax = (dP * R * R) / (4 * mu * L);
    const Rf = (8 * mu * L) / (Math.PI * R4);
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
    // 参数验证和默认值
    if (!mu || mu === 0 || isNaN(mu) || !isFinite(mu)) mu = 0.00001; // 防止除以零
    if (!r || r === 0 || isNaN(r) || !isFinite(r)) r = 0.0001;
    if (!rhos || rhos === 0 || isNaN(rhos) || !isFinite(rhos)) rhos = 1000;
    if (!rhof || rhof === 0 || isNaN(rhof) || !isFinite(rhof)) rhof = 1000;
    if (!g || g === 0 || isNaN(g) || !isFinite(g)) g = 9.8;
    
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
// 工具函数
// ========================================

// 安全获取元素
function safeGetElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with id '${id}' not found`);
  }
  return element;
}

// 安全设置元素样式
function safeSetStyle(element, styles) {
  if (element && styles) {
    Object.assign(element.style, styles);
  }
}

// 主题颜色工具函数
const ThemeColors = {
  getColors() {
    const isDark = AppState.isDarkTheme;
    return {
      titleColor: isDark ? '#00D4FF' : '#1a3c7c',
      textColor: isDark ? '#ffffff' : '#495057',
      bgColor: isDark ? '#1a1a25' : '#f8fbff',
      borderColor: isDark ? '#2a2a3a' : '#e1e8f0'
    };
  }
};

// ========================================
// 主题管理
// ========================================
const ThemeManager = {
  init() {
    const toggle = safeGetElement('themeToggle');
    if (!toggle) return;
    
    toggle.addEventListener('change', (e) => {
      AppState.isDarkTheme = e.target.checked;
      this.applyTheme();
      // 主题切换后重新渲染当前页面
      this.onThemeChanged();
    });
  },

  applyTheme() {
    if (AppState.isDarkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  },
  
  // 主题切换后的处理
  onThemeChanged() {
    // 如果当前在实验页面，重新渲染原理页面
    if (AppState.currentPage === 'experiment' && AppState.currentSubPage === 'principle') {
      renderPrinciplePage();
    }
    
    // 重新初始化图表（如果存在）- 销毁旧图表并创建新图表以完全应用新主题
    if (AppState.chartInstance) {
      // 销毁旧图表实例
      AppState.chartInstance.destroy();
      AppState.chartInstance = null;
      
      // 重新初始化图表
      setTimeout(() => {
        initRealtimeChart();
        // 如果有历史数据，更新图表
        if (AppState.dataHistory.length > 0) {
          updateRealtimeChart();
        }
      }, 50);
    }
    
    // 更新泊肃叶3D场景的背景颜色
    if (poiseuille3DScene) {
      const isDark = AppState.isDarkTheme;
      const bgColor = isDark ? 0x1a1a25 : 0xf0f4f8;
      poiseuille3DScene.background = new THREE.Color(bgColor);
      if (poiseuille3DRenderer) {
        poiseuille3DRenderer.setClearColor(bgColor, 1);
      }
    }
  },
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
    
    // 注意：不清理实验卡片的事件监听器，它们需要保持可点击状态
    // 只清理实验内部的事件监听器（如流体预设按钮）
    cleanupExperimentInternalListeners();
  },

  goToExperiment(expType) {
    // 获取被点击的卡片
    const clickedCard = document.querySelector(`.experiment-card[data-experiment="${expType}"]`);
    const allCards = document.querySelectorAll('.experiment-card');
    const cardsContainer = document.querySelector('.experiment-cards');
      
    // 添加展开动画类
    if (clickedCard) {
      clickedCard.classList.add('expanding');
      cardsContainer.classList.add('has-expanding');
    }
      
    // 等待动画播放完毕后切换页面（缩短到200ms，卡片刚扩大到1.2倍时）
    setTimeout(() => {
      AppState.currentPage = 'experiment';
      AppState.currentExperiment = expType;
        
      // 清除图表历史数据
      AppState.dataHistory = [];
      AppState.timeHistory = [];
        
      // 重置斯托克斯小球状态（顶部位置，0米）
      AppState.stokesBallY = 0;
      AppState.stokesBallV = 0;
      AppState.stokesBallDistance = 0;
        
      // 清理之前的Canvas资源
      cleanupCanvas();
        
      // 切换页面显示
      document.getElementById('homePage').style.display = 'none';
      const experimentPage = document.getElementById('experimentPage');
      experimentPage.style.display = 'block';
        
      // 添加淡入动画
      experimentPage.classList.add('fade-in');
        
      const exp = EXPERIMENTS[expType];
      document.getElementById('experimentTitle').textContent = exp.name;
        
      Navigation.switchSubPage('principle');
            
      // 泊肃叶实验：先应用预设，再渲染页面（避免雷诺数警告误报）
      if (expType === 'poiseuille') {
        // 立即应用预设，不延迟
        applyFluidPreset('蓖麻油 (20°C)');
      }
            
      renderPrinciplePage();
      renderLineSimPage();
        
      // 动画结束后移除类，以便下次使用（缩短到500ms）
      setTimeout(() => {
        experimentPage.classList.remove('fade-in');
        // 重置所有卡片状态
        allCards.forEach(card => {
          card.classList.remove('expanding');
        });
        cardsContainer.classList.remove('has-expanding');
      }, 500);
    }, 200);  // 缩短等待时间，卡片刚扩大到1.2倍时切换
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
      'lineSim': 'lineSimPage'
    };
    
    document.getElementById(pageMap[pageName]).classList.add('active');
    
    // 如果切换到线图模拟页面，需要确保Canvas已初始化
    if (pageName === 'lineSim') {
      setTimeout(() => {
        const canvas = document.getElementById('simCanvas');
        if (canvas && !canvasCtx) {
          // Canvas元素存在但context未初始化，说明是首次切换
          initSimulationCanvas();
        } else if (canvas && canvasCtx) {
          // Canvas已初始化，但可能需要重新调整尺寸
          resizeCanvas();
          // 重新绘制
          drawSimulationCanvas();
        }
      }, 100);
    }
  },

  toggleSidebar() {
    AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    
    sidebar.classList.toggle('collapsed');
    
    // 在CSS过渡动画期间持续更新3D场景尺寸，防止拉伸变形
    // 使用requestAnimationFrame循环监听，直到动画结束
    let animationId = null;
    const startTime = Date.now();
    const duration = 350;  // CSS过渡300ms + 50ms余量
    
    const updateDuringTransition = () => {
      const elapsed = Date.now() - startTime;
      
      if (resizeHandler) {
        resizeHandler();
      }
      
      // 如果动画还未结束，继续下一帧
      if (elapsed < duration) {
        animationId = requestAnimationFrame(updateDuringTransition);
      }
    };
    
    // 开始监听
    animationId = requestAnimationFrame(updateDuringTransition);
    
    // 动画结束后再执行一次最终调整
    setTimeout(() => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (resizeHandler) {
        resizeHandler();
      }
    }, duration);
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
  const container = safeGetElement('principlePage');
  if (!container) return;
  
  const colors = ThemeColors.getColors();
  
  // 根据实验类型生成不同的原理内容
  let principleContent = '';
  
  if (AppState.currentExperiment === 'newton') {
    principleContent = `
      <div class="principle-content">
        <h2 style="color: ${colors.titleColor}">${exp.icon} ${exp.name}</h2>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">实验简介</h3>
          <p style="color: ${colors.textColor}">牛顿粘性定律实验是研究流体黏性的经典实验。通过在流体中移动平板，测量所需的力，可以得出流体的黏性系数，并验证牛顿黏性定律。</p>
        </div>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">牛顿黏性定律</h3>
          <p style="color: ${colors.textColor}">牛顿黏性定律指出：流体中的剪切应力 τ 与速度梯度 du/dy 成正比。</p>
          <div class="formula-box">${exp.formula}</div>
          <p style="color: ${colors.textColor}"><strong>其中：</strong></p>
          <ul class="variable-list">
            ${Object.entries(exp.variables).map(([symbol, desc]) => `<li><strong>${symbol}</strong>: ${desc}</li>`).join('')}
          </ul>
        </div>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">实验装置</h3>
          <p style="color: ${colors.textColor}">实验装置主要包括：</p>
          <ol style="color: ${colors.textColor}; padding-left: 20px;">
            <li>两块平行平板，其间充满待测流体</li>
            <li>上板固定，下板可移动</li>
            <li>力传感器，用于测量移动下板所需的力</li>
            <li>速度控制系统，控制下板的移动速度</li>
          </ol>
        </div>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">关键概念</h3>
          <p style="color: ${colors.textColor}">• <strong>黏度</strong>：流体抵抗剪切变形的能力</p>
          <p style="color: ${colors.textColor}">• <strong>剪切应力</strong>：单位面积上的切向力</p>
          <p style="color: ${colors.textColor}">• <strong>速度梯度</strong>：速度在垂直于流动方向上的变化率</p>
          <p style="color: ${colors.textColor}">• <strong>牛顿流体</strong>：满足牛顿黏性定律的流体</p>
        </div>
      </div>
    `;
  } else if (AppState.currentExperiment === 'poiseuille') {
    principleContent = `
      <div class="principle-content">
        <h2 style="color: ${colors.titleColor}">${exp.icon} ${exp.name}</h2>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">实验简介</h3>
          <p style="color: ${colors.textColor}">泊肃叶定律描述了不可压缩黏性流体在圆管中做层流运动时的流量规律。该定律在医学（血液流动）、工程（管道设计）等领域有重要应用。</p>
        </div>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">泊肃叶定律</h3>
          <div class="formula-box">${exp.formula}</div>
          <p style="color: ${colors.textColor}"><strong>其中：</strong></p>
          <ul class="variable-list">
            ${Object.entries(exp.variables).map(([symbol, desc]) => `<li><strong>${symbol}</strong>: ${desc}</li>`).join('')}
          </ul>
        </div>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">实验装置</h3>
          <p style="color: ${colors.textColor}">实验装置主要包括：</p>
          <ol style="color: ${colors.textColor}; padding-left: 20px;">
            <li>水平圆管，透明材质便于观察</li>
            <li>压力源，提供稳定的压差</li>
            <li>流量计，测量流体流量</li>
            <li>压力计，测量管道两端压力</li>
          </ol>
        </div>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">关键概念</h3>
          <p style="color: ${colors.textColor}">• <strong>层流</strong>：流体分层流动，各层互不混合</p>
          <p style="color: ${colors.textColor}">• <strong>雷诺数</strong>：判断流动状态的无量纲数</p>
          <p style="color: ${colors.textColor}">• <strong>速度分布</strong>：圆管中层流的速度呈抛物线分布</p>
          <p style="color: ${colors.textColor}">• <strong>压降</strong>：流体流动过程中压力的损失</p>
        </div>
      </div>
    `;
  } else if (AppState.currentExperiment === 'stokes') {
    principleContent = `
      <div class="principle-content">
        <h2 style="color: ${colors.titleColor}">${exp.icon} ${exp.name}</h2>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">实验简介</h3>
          <p style="color: ${colors.textColor}">斯托克斯定律描述了小球在黏性流体中缓慢运动时所受的阻力。通过观察球体的沉降过程，可以测量流体的黏度。</p>
        </div>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">斯托克斯定律</h3>
          <p style="color: ${colors.textColor}">斯托克斯阻力公式：</p>
          <div class="formula-box">${exp.formula}</div>
          <p style="color: ${colors.textColor}">终端速度公式：</p>
          <div class="formula-box">v = (2 · r² · g · (ρs - ρf)) / (9 · μ)</div>
          <p style="color: ${colors.textColor}"><strong>其中：</strong></p>
          <ul class="variable-list">
            ${Object.entries(exp.variables).map(([symbol, desc]) => `<li><strong>${symbol}</strong>: ${desc}</li>`).join('')}
          </ul>
        </div>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">实验装置</h3>
          <p style="color: ${colors.textColor}">实验装置主要包括：</p>
          <ol style="color: ${colors.textColor}; padding-left: 20px;">
            <li>透明圆柱形容器，装满待测流体</li>
            <li>不同材质和大小的小球</li>
            <li>计时装置，测量沉降时间</li>
            <li>刻度尺，测量沉降距离</li>
          </ol>
        </div>
        
        <div class="principle-section" style="background: ${colors.bgColor}; border-color: ${colors.borderColor};">
          <h3 style="color: ${colors.titleColor}">关键概念</h3>
          <p style="color: ${colors.textColor}">• <strong>终端速度</strong>：球体达到受力平衡时的恒定速度</p>
          <p style="color: ${colors.textColor}">• <strong>阻力</strong>：流体对运动物体的阻碍力</p>
          <p style="color: ${colors.textColor}">• <strong>浮力</strong>：流体对浸入其中物体的向上托力</p>
          <p style="color: ${colors.textColor}">• <strong>雷诺数</strong>：需小于1，确保层流条件</p>
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
        <div id="reynoldsWarning" style="display: none; margin-bottom: 10px;"></div>
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
  
  // 使用ResizeObserver确保容器有尺寸后再初始化Canvas
  const canvasArea = document.querySelector('.canvas-area');
  if (canvasArea) {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // 容器有尺寸了，初始化Canvas
          initSimulationCanvas();
          observer.disconnect(); // 只触发一次
        }
      }
    });
    observer.observe(canvasArea);
  } else {
    // 降级方案：使用延迟
    setTimeout(() => {
      initSimulationCanvas();
    }, 50);
  }
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
        <span class="param-value" id="${param.id}Value">${formatScientific(param.value)}</span>
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
    const presetHandler = (e) => {
      if (e.target.classList.contains('preset-btn')) {
        const fluidName = e.target.dataset.fluid;
        applyFluidPreset(fluidName);
      }
    };
    presetGrid.addEventListener('click', presetHandler);
    
    // 存储事件监听器引用
    AppState.eventListeners.presetGrid = { element: presetGrid, handler: presetHandler };
  }
  
  // 参数滑块事件
  exp.params.forEach(param => {
    const slider = document.getElementById(param.id);
    const valueDisplay = document.getElementById(`${param.id}Value`);
    
    if (!slider) return; // 跳过不存在的滑块
    
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      if (valueDisplay) {
        valueDisplay.textContent = formatScientific(value);
      }
      updateDataDisplay();
      
      // 实时重绘画布，让所有参数变化都能立即反映到动画中
      // 包括仿真运行时（特别是板间距、粘度等参数的视觉效果）
      drawSimulationCanvas();
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
  
  // 使用ResizeObserver确保图表容器有尺寸后再初始化
  const chartContainer = document.querySelector('.chart-container');
  if (chartContainer) {
    const chartObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // 容器有尺寸了，初始化图表
          initRealtimeChart();
          chartObserver.disconnect(); // 只触发一次
        }
      }
    });
    chartObserver.observe(chartContainer);
  } else {
    // 降级方案：使用延迟
    setTimeout(() => {
      initRealtimeChart();
    }, 200);
  }
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
          if (valueDisplay) {
            valueDisplay.textContent = formatScientific(fluid.mu);
          }
        }
      }
      if (param.id === 'density' || param.id === 'rho' || param.id === 'fluidDensity') {
        const sliderId = param.id === 'density' ? 'density' : 'fluidDensity';
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(`${sliderId}Value`);
        if (slider) {
          slider.value = fluid.rho;
          if (valueDisplay) {
            valueDisplay.textContent = formatScientific(fluid.rho);
          }
        }
      }
    }
  });
  
  updateDataDisplay();
}

// 清理实验内部的事件监听器（不包括实验卡片）
function cleanupExperimentInternalListeners() {
  // 清理流体预设网格事件监听器
  if (AppState.eventListeners.presetGrid) {
    const { element, handler } = AppState.eventListeners.presetGrid;
    if (element && handler) {
      element.removeEventListener('click', handler);
    }
    AppState.eventListeners.presetGrid = null;
  }
}

// 清理所有事件监听器，防止内存泄漏（包括实验卡片）
function cleanupEventListeners() {
  // 清理实验卡片事件监听器
  AppState.eventListeners.experimentCards.forEach(({ element, handler }) => {
    if (element && handler) {
      element.removeEventListener('click', handler);
    }
  });
  AppState.eventListeners.experimentCards = [];
  
  // 清理流体预设网格事件监听器
  cleanupExperimentInternalListeners();
}

// ========================================
// 动画画布实现
// ========================================
let canvasCtx = null;
// animParticles 保留用于未来扩展，当前绘制函数使用内联粒子生成
let animParticles = [];
let resizeHandler = null; // 保存resize事件处理器引用

// 清理Canvas资源
function cleanupCanvas() {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  canvasCtx = null;
  
  // 清理泊肃叶3D场景
  if (poiseuille3DScene) {
    cleanupPoiseuille3D();
  }
  
  animParticles = [];
}

// 根据速度因子获取粒子颜色（快=红色，慢=蓝色，中间=紫色）
function getParticleColor(velocityFactor) {
  // velocityFactor: 0 (边缘，慢) ~ 1 (中心，快)
  
  // 慢速：蓝色 (0x0066ff)
  // 中速：紫色 (0xaa44cc)
  // 快速：红色 (0xff0044)
  
  const r = Math.floor(velocityFactor * 255); // 0 ~ 255
  const g = Math.floor(68 - velocityFactor * 68); // 68 ~ 0
  const b = Math.floor(255 - velocityFactor * 211); // 255 ~ 44
  
  return (r << 16) | (g << 8) | b;
}

// 泊肃叶3D场景初始化
function initPoiseuille3D(canvas) {
  const container = canvas.parentElement;
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  
  // 创建场景
  poiseuille3DScene = new THREE.Scene();
  // 根据主题设置背景颜色
  const isDark = document.body.classList.contains('dark-theme');
  const bgColor = isDark ? 0x1a1a25 : 0xf0f4f8;
  poiseuille3DScene.background = new THREE.Color(bgColor);
  
  // 创建相机（从侧面观察横向管道）
  poiseuille3DCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  // 相机位置：从Z轴方向观察，放大视角（拉近）
  poiseuille3DCamera.position.set(0, 0, 4.0);
  
  // 创建渲染器
  poiseuille3DRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  poiseuille3DRenderer.setSize(width, height);
  poiseuille3DRenderer.setPixelRatio(window.devicePixelRatio);
  poiseuille3DRenderer.setClearColor(bgColor, 1); // 设置清除颜色
  
  // 完全禁用控制器（锁定视角）
  // OrbitControls 在 r128 中是全局 THREE 对象的一部分
  if (THREE.OrbitControls) {
    poiseuille3DControls = new THREE.OrbitControls(poiseuille3DCamera, poiseuille3DRenderer.domElement);
    // 完全禁用所有交互
    poiseuille3DControls.enableDamping = false;
    poiseuille3DControls.enableZoom = false;
    poiseuille3DControls.enablePan = false;
    poiseuille3DControls.enableRotate = false;
    // 设置观察点：看向管道中心
    poiseuille3DControls.target.set(0, 0, 0);
    poiseuille3DCamera.lookAt(poiseuille3DControls.target);
    poiseuille3DControls.update();
    console.log('✅ 视角已完全锁定 - 相机位置:', poiseuille3DCamera.position);
  } else {
    console.warn('⚠️ OrbitControls not available');
  }
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  poiseuille3DScene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(5, 5, 5);
  poiseuille3DScene.add(directionalLight);
  
  const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
  backLight.position.set(-5, -5, -5);
  poiseuille3DScene.add(backLight);
  
  // 添加额外的顶部光源
  const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
  topLight.position.set(0, 10, 0);
  poiseuille3DScene.add(topLight);
  
  // 创建玻璃管道
  createGlassPipe();
  
  // 创建流体粒子
  createFluidParticles();
  
  // 创建网格地面
  createGridFloor();
  
  // 添加resize监听器
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }
  resizeHandler = () => {
    if (!container || !poiseuille3DRenderer || !poiseuille3DCamera) return;
    
    const newWidth = container.offsetWidth;
    const newHeight = container.offsetHeight;
    
    // 只有当尺寸有效时才更新
    if (newWidth > 10 && newHeight > 10) {
      poiseuille3DCamera.aspect = newWidth / newHeight;
      poiseuille3DCamera.updateProjectionMatrix();
      poiseuille3DRenderer.setSize(newWidth, newHeight);
      
      // 立即渲染一帧，防止黑屏
      if (poiseuille3DScene) {
        poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
      }
    }
  };
  window.addEventListener('resize', resizeHandler);
  
  // 立即更新并渲染一次，确保初始视角和粒子位置正确显示
  if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
    // 预加载第一帧：让粒子先流动一次，然后保存状态并重置
    // 临时设置为运行状态
    const wasRunning = AppState.simulationRunning;
    AppState.simulationRunning = true;
    AppState.simulationPaused = false;
    
    // 执行一次粒子更新（移动一帧）
    updatePoiseuille3D();
    
    // 保存移动后的粒子位置作为初始状态
    poiseuille3DInitialParticlePositions = poiseuille3DParticles.map(p => ({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      radius: p.userData.radius,
      angle: p.userData.angle
    }));
    
    // 重置粒子到这个状态
    resetPoiseuilleParticles();
    
    // 恢复原来的运行状态
    AppState.simulationRunning = wasRunning;
    AppState.simulationPaused = false;
    
    console.log('Poiseuille 3D initial render complete with camera at:', poiseuille3DCamera.position);
  }
  
  console.log('Poiseuille 3D scene initialized');
}

// 创建玻璃管道（水平横向，沿X轴方向）
function createGlassPipe() {
  const pipeLength = 4;  // 管道长度（横向，沿X轴）
  const pipeRadius = 0.5;
  const wallThickness = 0.08;  // 增加管壁厚度（原0.03）
  
  // 创建管道几何体（横向圆柱，沿X轴）
  const pipeGeometry = new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeLength, 64, 1, true);
  // 旋转90度，让管道沿X轴方向（横向）
  pipeGeometry.rotateZ(Math.PI / 2);
  
  // 高质量玻璃材质（几乎无反光）
  const pipeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.7,  // 增加不透明度，让管壁更明显（原0.55）
    roughness: 0.9,  // 非常高粗糙度，几乎无反光（原0.3）
    metalness: 0.0,  // 无金属度
    transmission: 0.4,  // 降低透光率，让管壁更明显（原0.55）
    thickness: 0.8,     // 增加玻璃厚度（原0.5）
    ior: 1.5,           // 折射率
    envMapIntensity: 0.0,  // 完全关闭环境光反射（原0.5）
    clearcoat: 0.0,  // 完全关闭清漆层（原0.3）
    clearcoatRoughness: 1.0,  // 最大粗糙度（原0.4）
    side: THREE.DoubleSide
  });
  
  poiseuille3DPipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
  poiseuille3DScene.add(poiseuille3DPipe);
}

// 创建流体粒子（符合泊肃叶定律：中间快，边缘慢，横向流动）
function createFluidParticles() {
  const particleCount = 500; // 增加粒子数量以更好显示层流效果
  const pipeLength = 4;  // 管道长度（横向，沿X轴）
  const pipeRadius = 0.47; // 略小于管道内径（0.5 - 0.03 = 0.47）
  
  // 层流效果：创建多个同心圆层
  const layers = 8; // 8个同心圆层
  const particlesPerLayer = Math.floor(particleCount / layers);
  
  poiseuille3DParticles = [];
  
  for (let layer = 0; layer < layers; layer++) {
    // 计算当前层的半径（从中心到管壁均匀分布，留出适当余量）
    // 使用0.90因子，确保粒子在管道内部但蓝色层仍然可见
    const layerRadius = (layer / (layers - 1)) * pipeRadius * 0.90;
    
    // 根据泊肃叶定律计算该层的速度因子：v(r) = v_max * (1 - (r/R)^2)
    const rRatio = layerRadius / pipeRadius;
    const velocityFactor = 1 - rRatio * rRatio; // 抛物线分布
    
    // 为该层创建粒子
    for (let i = 0; i < particlesPerLayer; i++) {
      // 在层内均匀分布角度
      const angle = (i / particlesPerLayer) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      
      // X方向随机分布（横向）
      const x = (Math.random() - 0.5) * pipeLength;
      
      // 计算Y和Z坐标（在圆上）
      let y = layerRadius * Math.cos(angle);
      let z = layerRadius * Math.sin(angle);
      
      // 安全检查：确保粒子在管道内部
      const checkRadius = Math.sqrt(y * y + z * z);
      if (checkRadius > pipeRadius - 0.05) {
        const scale = (pipeRadius - 0.06) / checkRadius;
        y = y * scale;
        z = z * scale;
      }
      
      // 根据速度因子计算颜色（快=红色，慢=蓝色）
      const color = getParticleColor(velocityFactor);
      
      // 中心层粒子稍大，边缘层粒子稍小
      const particleSize = 0.02 + velocityFactor * 0.015;
      
      const particleGeometry = new THREE.SphereGeometry(particleSize, 8, 8);
      const particleMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        emissive: color,
        emissiveIntensity: 0.15 + velocityFactor * 0.25 // 速度越快自发光越强
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(x, y, z);
      
      // 存储层信息
      particle.userData = {
        layer: layer,
        radius: layerRadius,
        angle: angle,
        velocityFactor: velocityFactor
      };
      
      poiseuille3DScene.add(particle);
      poiseuille3DParticles.push(particle);
    }
  }
  
  // 保存粒子的初始位置，用于后续重置
  poiseuille3DInitialParticlePositions = poiseuille3DParticles.map(p => ({
    x: p.position.x,
    y: p.position.y,
    z: p.position.z,
    radius: p.userData.radius,
    angle: p.userData.angle
  }));
}

// 重置泊肃叶粒子位置（不清理整个场景）
function resetPoiseuilleParticles() {
  if (!poiseuille3DScene || poiseuille3DParticles.length === 0) return;
  
  // 使用保存的初始位置重置粒子
  poiseuille3DParticles.forEach((particle, index) => {
    if (index < poiseuille3DInitialParticlePositions.length) {
      const initialPos = poiseuille3DInitialParticlePositions[index];
      particle.position.x = initialPos.x;
      particle.position.y = initialPos.y;
      particle.position.z = initialPos.z;
      particle.userData.radius = initialPos.radius;
      particle.userData.angle = initialPos.angle;
    }
  });
  
  // 立即渲染一次
  if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
    poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
  }
}

// 创建网格地面（已禁用）
function createGridFloor() {
  // 不创建网格，保持干净背景
  // const gridSize = 10;
  // const gridDivisions = 20;
  // const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0xcccccc);
  // gridHelper.position.y = -1.5;
  // poiseuille3DGrid = gridHelper;
  // poiseuille3DScene.add(gridHelper);
}

// 清理泊肃叶3D场景
function cleanupPoiseuille3D() {
  // 清理控制器
  if (poiseuille3DControls) {
    poiseuille3DControls.dispose();
    poiseuille3DControls = null;
  }
  
  // 清理粒子
  poiseuille3DParticles.forEach(particle => {
    poiseuille3DScene.remove(particle);
    particle.geometry.dispose();
    particle.material.dispose();
  });
  poiseuille3DParticles = [];
  poiseuille3DInitialParticlePositions = [];  // 清空初始位置
  
  // 清理管道
  if (poiseuille3DPipe) {
    poiseuille3DScene.remove(poiseuille3DPipe);
    poiseuille3DPipe.geometry.dispose();
    poiseuille3DPipe.material.dispose();
    poiseuille3DPipe = null;
  }
  
  // 清理网格
  if (poiseuille3DGrid) {
    poiseuille3DScene.remove(poiseuille3DGrid);
    poiseuille3DGrid = null;
  }
  
  // 清理渲染器
  if (poiseuille3DRenderer) {
    poiseuille3DRenderer.dispose();
    poiseuille3DRenderer = null;
  }
  
  // 清理场景和相机
  if (poiseuille3DScene) {
    // 移除所有光源
    while(poiseuille3DScene.children.length > 0){ 
      poiseuille3DScene.remove(poiseuille3DScene.children[0]); 
    }
    poiseuille3DScene = null;
  }
  poiseuille3DCamera = null;
  
  // 清理resize监听器
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  
  console.log('Poiseuille 3D scene cleaned up');
}

// 更新泊肃叶3D动画（根据参数动态调整）
function updatePoiseuille3D() {
  if (!poiseuille3DScene || !poiseuille3DRenderer || !poiseuille3DCamera) return;
  
  const pipeLength = 4;  // 3D显示的管道长度（横向，沿X轴）
  const pipeRadius = 0.47; // 3D管道内径
  
  // 获取当前参数值，用于管道的细微视觉变化
  const params = getParamValues();
  
  // 根据管道长度和半径参数，对管道进行细微的视觉缩放
  // 不是严格按比例，而是在原有基础上有变化感
  const baseLength = 2.0;  // 默认管道长度（m）
  const baseRadius = 0.02; // 默认管道半径（m）
  
  // 长度变化：基础缩放 ±20%（避免变化太大）
  const lengthRatio = params.length / baseLength;
  const lengthScale = 1 + (lengthRatio - 1) * 0.2;  // 只变化20%
  
  // 半径变化：基础缩放 ±15%（避免变化太大）
  const radiusRatio = params.radius / baseRadius;
  const radiusScale = 1 + (radiusRatio - 1) * 0.15;  // 只变化15%
  
  // 应用缩放到管道（只在管道存在时）
  if (poiseuille3DPipe) {
    poiseuille3DPipe.scale.set(lengthScale, radiusScale, radiusScale);
  }
  
  // 更新控制器（阻尼效果需要每帧更新）
  if (poiseuille3DControls) {
    poiseuille3DControls.update();
  }
  
  // 完全禁用WASD相机移动（视角已锁定）
  // updateCameraMovement();  // 已注释，不再允许移动
  
  // 只在仿真运行时移动粒子
  if (AppState.simulationRunning && !AppState.simulationPaused) {
    // 获取当前参数值
    const params = getParamValues();
    
    // 根据泊肃叶定律计算物理速度
    const physicsCalc = PhysicsEngine.poiseuille(
      params.radius,     // 管道半径 (m)
      params.length,     // 管道长度 (m)
      params.pressure,   // 压强差 (Pa)
      params.viscosity,  // 动力黏度 (Pa·s)
      params.density     // 流体密度 (kg/m³)
    );
    
    // 将物理速度映射到3D动画速度
    // vmax (m/s) -> 3D速度（像素/帧）
    // 使用缩放因子让动画速度适中
    const speedScale = 5; // 降低速度缩放因子（原20）
    const maxSpeed3D = Math.min(physicsCalc.vmax * speedScale, 0.05); // 降低最大速度限制（原0.1）
    
    // 计算缩放后的实际管道尺寸
    const actualPipeLength = pipeLength * lengthScale;
    const actualPipeRadius = pipeRadius * radiusScale;
    
    // 更新每个粒子的速度（根据泊肃叶定律）
    poiseuille3DParticles.forEach(particle => {
      // 根据粒子所在层的半径计算速度因子：v(r) = vmax * (1 - (r/R)^2)
      // 注意：使用固定的pipeRadius而不是actualPipeRadius，因为粒子的radius是相对于原始管道的
      const rRatio = particle.userData.radius / pipeRadius;
      const velocityFactor = Math.max(0, 1 - rRatio * rRatio); // 确保不为负数
      const speed = maxSpeed3D * velocityFactor;
      
      // 粒子沿X轴从左到右流动（横向）
      particle.position.x += speed;
      
      // 当粒子流出管道右端时，重新生成在左端
      // 使用缩放后的实际长度
      if (particle.position.x > actualPipeLength / 2) {
        // 重置到管道左端
        particle.position.x = -actualPipeLength / 2;
        
        // 保持原有的径向位置和角度（层流效果：粒子保持在各自的层内）
        const r = particle.userData.radius;
        const angle = particle.userData.angle;
        particle.position.y = r * Math.cos(angle);
        particle.position.z = r * Math.sin(angle);
      }
      
      // 层流效果：禁用径向振荡，保持粒子在各自层内稳定流动
      // 完全移除径向扰动，确保粒子不会穿模
      // particle.position.y += Math.sin(time * 0.5 + particle.userData.angle * 10) * tinyOscillation;
      // particle.position.z += Math.cos(time * 0.5 + particle.userData.angle * 10) * tinyOscillation;
      
      // 安全检查：确保粒子在管道内部
      // 使用缩放后的实际半径
      const currentRadius = Math.sqrt(particle.position.y ** 2 + particle.position.z ** 2);
      if (currentRadius > actualPipeRadius - 0.02) {  // 留出0.02的余量
        // 将粒子拉回管道内部
        const scale = (actualPipeRadius - 0.03) / currentRadius;
        particle.position.y *= scale;
        particle.position.z *= scale;
      }
    });
  }
  
  // 渲染场景
  poiseuille3DRenderer.render(poiseuille3DScene, poiseuille3DCamera);
}

function initSimulationCanvas() {
  const canvas = document.getElementById('simCanvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  console.log('Initializing canvas...', canvas);
  
  // 如果是泊肃叶实验，初始化3D场景
  if (AppState.currentExperiment === 'poiseuille') {
    initPoiseuille3D(canvas);
    // 立即渲染一次，让开始前的画面与开始后一致
    setTimeout(() => {
      if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
        updatePoiseuille3D();
        console.log('Poiseuille 3D scene initial render complete');
      }
    }, 150);
    return;
  }
  
  // 其他实验使用2D Canvas
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
    // 不重试，等待ResizeObserver触发
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
  const exp = AppState.currentExperiment;
  
  if (!exp) {
    console.error('No experiment selected');
    return;
  }
  
  // 泊肃叶实验使用3D渲染
  if (exp === 'poiseuille') {
    if (poiseuille3DRenderer && poiseuille3DScene && poiseuille3DCamera) {
      updatePoiseuille3D();
    }
    return;
  }
  
  // 其他实验使用2D Canvas
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
  
  console.log('Drawing simulation:', exp, 'Size:', w, 'x', h);
  
  const isDark = document.body.classList.contains('dark-theme');
  canvasCtx.fillStyle = isDark ? '#0a0a0f' : '#ffffff';
  canvasCtx.fillRect(0, 0, w, h);
  
  if (exp === 'newton') {
    drawNewtonSimulation(w, h, isDark);
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
  const MAX_DISTANCE_MM = 50;  // mm（与滑块最大值对应）
  const GRID_LINES = 5;  // 竖直网格线数量，与x轴刻度对应（6条线：0~5）
  const NUM_LAYERS = 12;
  
  // x轴显示范围：0~1米
  const MAX_X_DISTANCE = 1.0;  // x轴最大显示距离（米）
  
  const cw = w - MARGIN_LEFT - MARGIN_RIGHT;
  const ch = h - MARGIN_TOP - MARGIN_BOTTOM;
  const sx = MARGIN_LEFT;
  const sy = MARGIN_TOP;
  
  // 速度缩放因子（控制粒子移动速度，让x轴像素与物理距离对应）
  // x轴范围0~MAX_X_DISTANCE米，对应画布宽度cw像素
  // 粒子1秒移动的距离（像素）应该 = velocity（m/s）* (cw / MAX_X_DISTANCE)
  // 例如：velocity=0.5m/s, cw=600px, MAX_X_DISTANCE=1.0m → 移动300像素
  const VELOCITY_SCALE_FACTOR = cw / MAX_X_DISTANCE / 2;  // 除以2是因为t=simTime*2
  
  const velocity = params.velocity || 0.1;
  const viscosity = params.viscosity || 0.001;
  const distance = (params.distance || 10) / 1000;  // 将 mm 转换为 m
  const area = params.area || 0.1;
  
  // 根据板间距动态调整动画中的板距离（1:1严格比例映射）
  // 定义比例因子：1mm = 多少像素
  // 画布可用高度为ch，板间距范围1-50mm，留出上下各20%的边距
  const marginRatio = 0.2;  // 上下各留20%边距
  const availableHeight = ch * (1 - 2 * marginRatio);  // 可用绘制高度
  const minDistance = 1;  // mm
  const maxDistance = 50;  // mm
  const distanceRange = maxDistance - minDistance;  // 49mm
  
  // 计算比例因子：可用高度 / 板间距范围（像素/mm）
  // 例如：如果availableHeight=400px，则pixelsPerMM = 400/49 ≈ 8.16 px/mm
  const pixelsPerMM = availableHeight / distanceRange;
  
  // 根据当前板间距计算动画中的高度（1:1严格比例）
  // 当params.distance=1mm时，animatedHeight = availableHeight * (1/49)
  // 当params.distance=50mm时，animatedHeight = availableHeight * (49/49) = availableHeight
  // 当params.distance=25.5mm时，animatedHeight = availableHeight * (24.5/49) = availableHeight * 0.5
  const animatedHeight = (params.distance - minDistance) * pixelsPerMM + availableHeight * (minDistance / distanceRange);
  
  // 使用动态高度计算实际的sy和ch
  const dynamicCh = animatedHeight;
  const dynamicSy = sy + ch * marginRatio + (availableHeight - dynamicCh) / 2;  // 从顶部边距开始，居中显示
  
  // 物理计算（使用优化后的物理引擎）
  const calc = PhysicsEngine.newtonViscosity(velocity, viscosity, params.distance || 10, area);
  const grad = calc.grad || 0;
  const tau = calc.tau || 0;
  const F = calc.F || 0;
  
  // 预计算颜色值，避免重复计算
  const gridColor = isDark ? 'rgba(42, 42, 58, 0.3)' : 'rgba(220, 225, 236, 0.7)';
  const axisColor = isDark ? '#2a2a3a' : '#666666';
  const tickColor = isDark ? '#606070' : '#999999';
  const labelColor = isDark ? '#a0a0b0' : '#666666';
  const curveColor = isDark ? '#00D4FF' : '#1a3c7c';
  const arrowColor = isDark ? '#00FF88' : '#2ecc71';
  const tauColor = isDark ? '#FF4D4D' : '#e74c3c';
  const infoColor = '#00D4FF';
  
  // 粘度指示器（仅用于显示，不影响动画）
  const viscosityRatio = viscosity / 0.001;  // 相对于水的粘度比
  
  // 1. 绘制网格
  canvasCtx.strokeStyle = gridColor;
  canvasCtx.lineWidth = 1;
  for (let i = 0; i <= GRID_LINES; i++) {
    const y = dynamicSy + (i / GRID_LINES) * dynamicCh;
    canvasCtx.beginPath();
    canvasCtx.moveTo(sx, y);
    canvasCtx.lineTo(sx + cw, y);
    canvasCtx.stroke();
    
    const x = sx + (i / GRID_LINES) * cw;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, dynamicSy);
    canvasCtx.lineTo(x, dynamicSy + dynamicCh);
    canvasCtx.stroke();
  }
  
  // 2. 坐标轴
  canvasCtx.strokeStyle = axisColor;
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  canvasCtx.moveTo(sx, dynamicSy);
  canvasCtx.lineTo(sx, dynamicSy + dynamicCh);
  canvasCtx.lineTo(sx + cw, dynamicSy + dynamicCh);
  canvasCtx.stroke();
  
  // 3. 刻度
  canvasCtx.fillStyle = tickColor;
  canvasCtx.font = '9px Consolas';
  canvasCtx.textAlign = 'center';
  // X轴刻度：位移 0~1.0 m（粒子1秒内移动的距离）
  for (let i = 0; i <= 5; i++) {
    const val = (i / 5) * MAX_X_DISTANCE;  // 0~1.0 m
    const x = sx + (i / 5) * cw;
    canvasCtx.fillText(val.toFixed(2), x, dynamicSy + dynamicCh + 20);
  }
  
  canvasCtx.textAlign = 'right';
  // Y轴刻度：板间距 0~50 mm
  for (let i = 0; i <= 5; i++) {
    const valMM = (i / 5) * MAX_DISTANCE_MM;  // mm单位
    const y = dynamicSy + dynamicCh - (i / 5) * dynamicCh;
    canvasCtx.fillText(valMM.toFixed(0), sx - 10, y + 4);
  }
  
  // 4. 轴标签
  canvasCtx.fillStyle = labelColor;
  canvasCtx.font = '11px Microsoft YaHei';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText('位移 x (m)', sx + cw / 2, dynamicSy + dynamicCh + 45);
  
  canvasCtx.save();
  canvasCtx.translate(sx - 50, dynamicSy + dynamicCh / 2);
  canvasCtx.rotate(-Math.PI / 2);
  canvasCtx.fillText('板间距 z (mm)', 0, 0);
  canvasCtx.restore();
  
  // 6. 上下平板（圆角矩形）
  const plateGrad1 = canvasCtx.createLinearGradient(sx, dynamicSy - 15, sx, dynamicSy - 5);
  if (isDark) {
    plateGrad1.addColorStop(0, '#808090');
    plateGrad1.addColorStop(1, '#505060');
  } else {
    plateGrad1.addColorStop(0, '#b0b0c0');
    plateGrad1.addColorStop(1, '#808090');
  }
  
  const plateGrad2 = canvasCtx.createLinearGradient(sx, dynamicSy + dynamicCh + 5, sx, dynamicSy + dynamicCh + 15);
  if (isDark) {
    plateGrad2.addColorStop(0, '#505060');
    plateGrad2.addColorStop(1, '#808090');
  } else {
    plateGrad2.addColorStop(0, '#808090');
    plateGrad2.addColorStop(1, '#b0b0c0');
  }
  
  canvasCtx.fillStyle = plateGrad1;
  canvasCtx.fillRect(sx - 15, dynamicSy - 15, cw + 30, 10);
  canvasCtx.fillStyle = plateGrad2;
  canvasCtx.fillRect(sx - 15, dynamicSy + dynamicCh + 5, cw + 30, 10);
  
  // 7. 上平板箭头
  canvasCtx.strokeStyle = arrowColor;
  canvasCtx.lineWidth = 2;
  const ax = sx + cw - 50;
  const ay = dynamicSy - 22;
  canvasCtx.beginPath();
  canvasCtx.moveTo(ax, ay);
  canvasCtx.lineTo(ax + 30, ay);
  canvasCtx.lineTo(ax + 25, ay - 5);
  canvasCtx.moveTo(ax + 30, ay);
  canvasCtx.lineTo(ax + 25, ay + 5);
  canvasCtx.stroke();
  
  // 11. 动态粒子和流线（添加粘度视觉效果）
  const t = AppState.simTime * 2;
  
  // 11.5. 上平板移动条纹（显示运动效果）- 需要在 t 定义之后
  // 条纹间距随板面积变化：板面积越大，间距越大
  const baseStripeSpacing = 15;  // 基础间距（增大以更明显）
  const areaScaleFactor = area / 0.1;  // 相对于默认值0.1m²的缩放因子
  const stripeSpacing = baseStripeSpacing * Math.sqrt(areaScaleFactor);  // 使用平方根避免变化过大
  const stripeWidth = stripeSpacing * 0.5;     // 条纹宽度为间距的一半
  const stripeSpeed = velocity * VELOCITY_SCALE_FACTOR;  // 条纹移动速度与上板速度成正比（放大5倍）
  const stripeOffset = (t * stripeSpeed) % stripeSpacing;  // 条纹偏移量
  
  canvasCtx.fillStyle = isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(26, 60, 124, 0.3)';
  for (let stripeX = sx - 15 + stripeOffset; stripeX < sx + cw + 15; stripeX += stripeSpacing) {
    canvasCtx.fillRect(stripeX, dynamicSy - 15, stripeWidth, 10);
  }
  
  // 计算粘度视觉因子（线性均匀分布）
  // 粘度范围：0.00005 ~ 2.0 Pa·s
  const minViscosity = 0.00005;
  const maxViscosity = 2.0;
  const normalizedViscosity = (viscosity - minViscosity) / (maxViscosity - minViscosity);  // 线性归一化到 0~1
  
  // 拖尾长度：线性均匀映射 2~25 像素
  const trailLength = 2 + normalizedViscosity * 23;
  
  // 波浪幅度：线性均匀映射 4~0.5 像素
  const waveAmplitude = 4 - normalizedViscosity * 3.5;
  
  for (let i = 0; i < NUM_LAYERS; i++) {
    const layerYn = i / (NUM_LAYERS - 1);
    const layerV = layerYn * velocity;
    const yp = dynamicSy + dynamicCh - layerYn * dynamicCh;
    
    // 速度映射颜色：快=红色，慢=蓝色
    // 使用MAX_X_DISTANCE作为速度参考值（1.0m对应1.0m/s的速度）
    const ratio = Math.min(Math.abs(layerV) / MAX_X_DISTANCE, 1.0);
    // 红色通道：速度快时增强 (0 -> 255)
    const r = Math.floor(255 * ratio);
    // 绿色通道：中间速度时最高 (0 -> 50 -> 0)
    const g = Math.floor(50 * Math.sin(ratio * Math.PI));
    // 蓝色通道：速度慢时增强 (255 -> 0)
    const b = Math.floor(255 * (1 - ratio));
    const color = `rgb(${r}, ${g}, ${b})`;
    
    // 流线（波浪形虚线）- 添加粘度影响的波浪幅度
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 2;
    canvasCtx.globalAlpha = 0.6;
    canvasCtx.beginPath();
    
    // 使用真实的层速度进行动画（符合牛顿粘性定律：速度线性分布）
    // 最上层速度 = velocity，乘以VELOCITY_SCALE_FACTOR使虚线夹角接近45°
    const animationSpeed = layerV * VELOCITY_SCALE_FACTOR;  // 放大5倍使虚线夹角接近45°
    for (let seg = 0; seg < cw; seg += 4) {
      // 波浪相位：减去时间项使波浪向右移动（与粒子速度完全一致）
      // 波浪移动速度 = 粒子移动速度 = t * animationSpeed
      const offset = (seg / 15 - t * animationSpeed / (cw / (2 * Math.PI))) % (2 * Math.PI);
      const wave = yp + Math.sin(offset) * waveAmplitude;  // 波浪幅度受粘度影响
      if (seg === 0) {
        canvasCtx.moveTo(sx + seg, wave);
      } else {
        canvasCtx.lineTo(sx + seg, wave);
      }
    }
    canvasCtx.stroke();
    canvasCtx.globalAlpha = 1.0;
    
    // 粒子（每层8个）- 添加拖尾效果，均匀分布
    canvasCtx.fillStyle = color;
    const particlesPerLayer = 8;  // 每层粒子数
    for (let pi = 0; pi < particlesPerLayer; pi++) {
      const px = sx + ((t * animationSpeed + pi * cw / particlesPerLayer) % cw);
      
      // 绘制拖尾（高粘度流体拖尾更长）
      const trailSegments = Math.floor(trailLength);
      for (let ti = 0; ti < trailSegments; ti++) {
        const trailOffset = ti * 3;  // 拖尾间隔
        const trailX = px - trailOffset;
        const trailAlpha = 1 - (ti / trailSegments);  // 渐隐效果
        const trailRadius = 4 * trailAlpha;  // 渐小效果
        
        canvasCtx.globalAlpha = trailAlpha * 0.6;
        canvasCtx.beginPath();
        canvasCtx.arc(trailX, yp, trailRadius, 0, Math.PI * 2);
        canvasCtx.fill();
      }
      
      // 绘制主粒子
      canvasCtx.globalAlpha = 1.0;
      canvasCtx.beginPath();
      canvasCtx.arc(px, yp, 4, 0, Math.PI * 2);
      canvasCtx.fill();
    }
    canvasCtx.globalAlpha = 1.0;
  }
  
  // 12. 速度梯度指示线（蓝色虚线，显示速度分布）
  // 上端：最上层（第0层）第一个小球（pi=0）
  const topLayerV = velocity * VELOCITY_SCALE_FACTOR;  // 最上层速度（像素/秒，放大5倍）
  const topParticleY = dynamicSy;  // 最上层y坐标
  
  // 下端：最下层（第NUM_LAYERS-1层）第一个小球（pi=0）
  const bottomLayerV = 0;  // 最下层速度 = 0
  const bottomParticleY = dynamicSy + dynamicCh;  // 最下层y坐标
  
  // 使用与粒子相同的时间变量 t = simTime * 2
  // 计算上端小球的x坐标（与粒子完全同步）
  let topParticleX;
  
  // 使用牛顿实验专用的计时器
  if (!AppState.newtonGradientLineStartTime) {
    AppState.newtonGradientLineStartTime = AppState.simTime;
  }
  
  // 计算虚线已经运动的时间（秒）
  const gradientLineTime = AppState.simTime - AppState.newtonGradientLineStartTime;
  
  // 判断是否已经运动了1秒
  const hasMovedForOneSecond = gradientLineTime >= 1.0;
  
  if (hasMovedForOneSecond) {
    // 运动1秒后，固定在1秒时的位置
    // 使用实际物理位移，不取模，避免回绕
    // 1秒时，粒子移动的物理距离 = velocity（m/s）* 1s = velocity 米
    // 对应的像素位置 = sx + (velocity / MAX_X_DISTANCE) * cw
    topParticleX = sx + (velocity / MAX_X_DISTANCE) * cw;
    // 限制在画布范围内
    topParticleX = Math.min(topParticleX, sx + cw);
  } else {
    // 运动1秒内，跟随小球移动（与粒子完全同步）
    // 使用实际物理位移，不取模
    // gradientLineTime秒时，移动距离 = velocity * gradientLineTime
    const physicalDistance = velocity * gradientLineTime;  // 物理距离（米）
    topParticleX = sx + (physicalDistance / MAX_X_DISTANCE) * cw;
    // 限制在画布范围内
    topParticleX = Math.min(topParticleX, sx + cw);
  }
  
  // 计算下端小球的x坐标（最下层速度为0，所以位置不变）
  const bottomParticleX = sx;  // 始终在sx位置
  
  // 绘制速度梯度线：运动时是虚线，停止后变成实线
  canvasCtx.strokeStyle = isDark ? '#00D4FF' : '#1a3c7c';
  canvasCtx.lineWidth = 2;
  
  // 根据是否停止来决定使用虚线还是实线
  if (hasMovedForOneSecond && AppState.simulationRunning && !AppState.simulationPaused) {
    // 停止后：使用实线
    canvasCtx.setLineDash([]);  // 实线
  } else {
    // 运动中：使用虚线
    canvasCtx.setLineDash([5, 5]);  // 虚线
  }
  
  canvasCtx.beginPath();
  canvasCtx.moveTo(topParticleX, topParticleY);
  canvasCtx.lineTo(bottomParticleX, bottomParticleY);
  canvasCtx.stroke();
  canvasCtx.setLineDash([]);  // 重置
  
  // 绘制两个端点的小圆
  canvasCtx.fillStyle = isDark ? '#00D4FF' : '#1a3c7c';
  canvasCtx.beginPath();
  canvasCtx.arc(topParticleX, topParticleY, 5, 0, Math.PI * 2);
  canvasCtx.fill();
  canvasCtx.beginPath();
  canvasCtx.arc(bottomParticleX, bottomParticleY, 5, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 如果已经停止，显示提示文字和速度梯度信息
  if (hasMovedForOneSecond && AppState.simulationRunning && !AppState.simulationPaused) {
    // 计算速度梯度
    const distanceM = (params.distance || 10) / 1000;  // 板间距（米）
    const velocityGradient = velocity / distanceM;  // 速度梯度 (s⁻¹)
    
    // 计算虚线与x轴的夹角
    const deltaX = topParticleX - bottomParticleX;  // x方向的差值
    const deltaY = bottomParticleY - topParticleY;  // y方向的差值（Canvas坐标系，向下为正）
    const angleRad = Math.atan2(Math.abs(deltaY), Math.abs(deltaX));  // 夹角（弧度）
    const angleDeg = angleRad * (180 / Math.PI);  // 夹角（度）
    
    // 绘制夹角弧线
    const arcRadius = 30;  // 弧线半径
    const startAngle = 0;  // x轴方向（0度）
    const endAngle = -angleRad;  // 虚线方向（Canvas坐标系，向上为负）
    
    canvasCtx.strokeStyle = isDark ? 'rgba(255, 165, 0, 0.8)' : 'rgba(243, 156, 18, 0.8)';
    canvasCtx.lineWidth = 2;
    canvasCtx.setLineDash([3, 3]);
    canvasCtx.beginPath();
    canvasCtx.arc(bottomParticleX, bottomParticleY, arcRadius, endAngle, startAngle, false);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);
    
    // 显示夹角数值（在弧线中间位置）
    const labelAngle = endAngle / 2;  // 弧线的中间角度
    const labelX = bottomParticleX + (arcRadius + 15) * Math.cos(labelAngle);
    const labelY = bottomParticleY + (arcRadius + 15) * Math.sin(labelAngle);
    
    canvasCtx.fillStyle = isDark ? 'rgba(255, 165, 0, 0.9)' : 'rgba(243, 156, 18, 0.9)';
    canvasCtx.font = 'bold 11px Microsoft YaHei';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`θ = ${angleDeg.toFixed(1)}°`, labelX, labelY);
    
    // 显示速度梯度信息（在虚线中间）
    canvasCtx.fillStyle = isDark ? 'rgba(0, 212, 255, 0.8)' : 'rgba(26, 60, 124, 0.8)';
    canvasCtx.font = 'bold 10px Microsoft YaHei';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`速度梯度: ${velocityGradient.toFixed(1)} s⁻¹`, (topParticleX + bottomParticleX) / 2, (topParticleY + bottomParticleY) / 2 - 15);
  }
}



function drawStokesSimulation(w, h, isDark) {
  const params = getParamValues();
  
  // 物理计算
  const calc = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
  const vt = (isNaN(calc.vt) || !isFinite(calc.vt)) ? 0 : Math.max(calc.vt, 0);
  
  // 计算时间常数 τ = m / (6πμr)
  let tau;
  if (params.viscosity > 0 && params.ballRadius > 0) {
    tau = calc.mass / (6 * Math.PI * params.viscosity * params.ballRadius);
  } else {
    tau = 1.0;
  }
  
  // 动态计算容器高度：确保小球有足够距离达到终端速度
  // 小球达到99%终端速度需要约5τ的时间
  // 在这5τ时间内，小球下落的距离约为：vt * 5τ - vt * τ * (1 - e^(-5))
  // 简化计算：使用 vt * 5τ 作为保守估计，再乘以1.5作为安全余量
  const timeToReachTerminal = 5 * tau;  // 达到99%终端速度所需时间
  const distanceToTerminal = vt * timeToReachTerminal;  // 达到终端速度时下落的距离
  const CONTAINER_REAL_HEIGHT = Math.max(distanceToTerminal * 1.5, 5);  // 至少5米，最多根据需要增加
  
  // 计算动画时间加速因子：确保小球在合理时间内下落到底部
  // 目标：小球在10-20秒内下落到底部（良好的视觉体验）
  const targetFallTime = 15;  // 目标下落时间（秒）
  const actualFallTime = CONTAINER_REAL_HEIGHT / (vt || 0.001);  // 实际下落时间（秒）
  const timeAcceleration = Math.max(1, actualFallTime / targetFallTime);  // 时间加速因子（至少1倍）
  
  // 配置参数 - 2.5D视角
  const CONTAINER_WIDTH = 280;  // 容器宽度
  const CONTAINER_HEIGHT = Math.min(h * 0.82, 580);  // 画布上的容器高度（像素）
  const BALL_RADIUS_SCALE = 6000;  // 小球半径缩放
  const MIN_BALL_RADIUS = 12;  // 最小小球半径
  const FORCE_SCALE = 60;  // 力矢量缩放
  const MAX_FORCE_LENGTH = 100;  // 最大力矢量长度
  
  const cx = w / 2;
  const sx = cx - CONTAINER_WIDTH / 2;
  const sy = (h - CONTAINER_HEIGHT) / 2;  // 垂直居中
  
  const ballR = Math.max(MIN_BALL_RADIUS, params.ballRadius * BALL_RADIUS_SCALE);
  
  // 小球下落动画（真实的加速过程）
  let ballY;
  if (AppState.simulationRunning && !AppState.simulationPaused) {
    // 使用解析解计算速度：v(t) = vt * (1 - e^(-t/τ))
    // t是小球开始下落后的时间（不是仿真总时间）
    const dt = 0.016; // 16ms per frame
    
    // 记录小球开始下落的时间
    if (!AppState.stokesBallStartTime) {
      AppState.stokesBallStartTime = AppState.simTime;
    }
    
    // 小球下落时间 = 当前仿真时间 - 开始下落时间
    // 应用时间加速因子，让高粘度情况下小球下落更快
    const ballFallTime = (AppState.simTime - AppState.stokesBallStartTime) * timeAcceleration;
    AppState.simTime += dt * timeAcceleration;  // 累积仿真时间（加速后）
    
    if (tau > 0 && vt > 0) {
      // 解析解：v = vt * (1 - e^(-t/τ))，t是小球下落时间（加速后）
      AppState.stokesBallV = vt * (1 - Math.exp(-ballFallTime / tau));
    } else {
      AppState.stokesBallV = vt;
    }
    
    // 确保速度不为负
    AppState.stokesBallV = Math.max(AppState.stokesBallV, 0);
    
    // 计算小球下落的物理距离（米）
    const distanceFallen = AppState.stokesBallV * dt * timeAcceleration;  // 本帧下落距离（加速后）
    AppState.stokesBallDistance = (AppState.stokesBallDistance || 0) + distanceFallen;  // 累积距离
    
    // 将物理距离映射到画布位置（0~1归一化）
    // 小球从顶部开始下落（0米），下落距离从0开始累积
    // 当前高度 = CONTAINER_REAL_HEIGHT - 累积下落距离
    const currentHeight = CONTAINER_REAL_HEIGHT - AppState.stokesBallDistance;  // 当前高度（米）
    AppState.stokesBallY = (CONTAINER_REAL_HEIGHT - currentHeight) / CONTAINER_REAL_HEIGHT;  // 转换为从顶部开始的归一化位置
    AppState.stokesBallY = Math.max(0, Math.min(AppState.stokesBallY, 1.0));
    
    // 到达底部后停止
    if (AppState.stokesBallY >= 1.0) {
      AppState.stokesBallV = 0;
    }
    
    // 计算画布上的Y坐标（直接使用容器高度，与刻度尺对齐）
    ballY = sy + AppState.stokesBallY * CONTAINER_HEIGHT;
  } else {
    // 静止状态：直接使用AppState.stokesBallY（初始值0，即顶部）
    ballY = sy + AppState.stokesBallY * CONTAINER_HEIGHT;
  }
  
  // 2.5D容器绘制 - 上下同宽
  const containerWidth = CONTAINER_WIDTH;
  const containerLeft = cx - containerWidth / 2;
  
  // 1. 容器后壁（深色背景）
  const backWallGrad = canvasCtx.createLinearGradient(containerLeft, sy, containerLeft + containerWidth, sy + CONTAINER_HEIGHT);
  if (isDark) {
    backWallGrad.addColorStop(0, 'rgba(20, 40, 80, 0.3)');
    backWallGrad.addColorStop(0.5, 'rgba(30, 60, 100, 0.4)');
    backWallGrad.addColorStop(1, 'rgba(20, 40, 80, 0.3)');
  } else {
    backWallGrad.addColorStop(0, 'rgba(26, 60, 124, 0.08)');
    backWallGrad.addColorStop(0.5, 'rgba(26, 60, 124, 0.12)');
    backWallGrad.addColorStop(1, 'rgba(26, 60, 124, 0.08)');
  }
  canvasCtx.fillStyle = backWallGrad;
  canvasCtx.fillRect(containerLeft, sy, containerWidth, CONTAINER_HEIGHT);
  
  // 2. 流体（半透明蓝色填充）
  const fluidTop = sy + 20;  // 液面位置
  const fluidGrad = canvasCtx.createLinearGradient(0, fluidTop, 0, sy + CONTAINER_HEIGHT);
  if (isDark) {
    fluidGrad.addColorStop(0, 'rgba(0, 150, 255, 0.15)');
    fluidGrad.addColorStop(1, 'rgba(0, 100, 200, 0.25)');
  } else {
    fluidGrad.addColorStop(0, 'rgba(26, 60, 124, 0.1)');
    fluidGrad.addColorStop(1, 'rgba(26, 60, 124, 0.2)');
  }
  canvasCtx.fillStyle = fluidGrad;
  canvasCtx.fillRect(containerLeft + 2, fluidTop, containerWidth - 4, CONTAINER_HEIGHT - 20);
  
  // 3. 液面（波浪效果）
  canvasCtx.strokeStyle = isDark ? 'rgba(0, 180, 255, 0.6)' : 'rgba(26, 60, 124, 0.4)';
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  for (let x = 0; x < containerWidth - 4; x += 2) {
    const wave = Math.sin(x * 0.1 + AppState.simTime * 2) * 2;
    if (x === 0) {
      canvasCtx.moveTo(containerLeft + 2 + x, fluidTop + wave);
    } else {
      canvasCtx.lineTo(containerLeft + 2 + x, fluidTop + wave);
    }
  }
  canvasCtx.stroke();
  
  // 4. 容器边框（矩形）
  canvasCtx.strokeStyle = isDark ? 'rgba(100, 150, 255, 0.6)' : 'rgba(26, 60, 124, 0.5)';
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeRect(containerLeft, sy, containerWidth, CONTAINER_HEIGHT);
  
  // 4.5 刻度尺（动态显示高度，顶部0米，底部为CONTAINER_REAL_HEIGHT米）
  canvasCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
  canvasCtx.lineWidth = 1;
  canvasCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  canvasCtx.font = '10px Microsoft YaHei';
  canvasCtx.textAlign = 'right';
  
  // 智能计算刻度间隔：确保刻度之间有至少40像素的间距
  const minPixelGap = 40;  // 刻度之间最小像素间距
  const maxTicks = Math.floor(CONTAINER_HEIGHT / minPixelGap);  // 最多能显示多少个刻度
  
  // 根据容器高度和最大刻度数计算合适的间隔
  let meterStep;
  if (CONTAINER_REAL_HEIGHT <= 5) {
    meterStep = 1;  // 5米以内，每1米一个刻度
  } else if (CONTAINER_REAL_HEIGHT <= 15) {
    meterStep = 2;  // 15米以内，每2米一个刻度
  } else if (CONTAINER_REAL_HEIGHT <= 50) {
    meterStep = 5;  // 50米以内，每5米一个刻度
  } else if (CONTAINER_REAL_HEIGHT <= 100) {
    meterStep = 10;  // 100米以内，每10米一个刻度
  } else if (CONTAINER_REAL_HEIGHT <= 500) {
    meterStep = 50;  // 500米以内，每50米一个刻度
  } else {
    meterStep = 100;  // 超过500米，每100米一个刻度
  }
  
  // 确保刻度数量不超过最大限制
  const expectedTicks = Math.ceil(CONTAINER_REAL_HEIGHT / meterStep) + 1;
  if (expectedTicks > maxTicks) {
    // 如果刻度太多，进一步增大间隔
    meterStep = Math.ceil(CONTAINER_REAL_HEIGHT / (maxTicks - 1));
    // 圆整到合理的值（1, 2, 5, 10, 20, 50, 100, 200, 500, 1000...）
    const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    for (const step of niceSteps) {
      if (step >= meterStep) {
        meterStep = step;
        break;
      }
    }
  }
  
  // 显示刻度（顶部0米，底部CONTAINER_REAL_HEIGHT米）
  for (let meter = 0; meter <= CONTAINER_REAL_HEIGHT; meter += meterStep) {
    const yPos = sy + (meter / CONTAINER_REAL_HEIGHT) * CONTAINER_HEIGHT;  // 从上到下
    
    // 刻度线
    canvasCtx.beginPath();
    canvasCtx.moveTo(containerLeft, yPos);
    canvasCtx.lineTo(containerLeft + 8, yPos);
    canvasCtx.stroke();
    
    // 刻度标签
    canvasCtx.fillText(`${meter}m`, containerLeft - 5, yPos + 3);
  }
  
  // 侧壁装饰线（增强立体感）
  canvasCtx.strokeStyle = isDark ? 'rgba(100, 150, 255, 0.15)' : 'rgba(26, 60, 124, 0.1)';
  canvasCtx.lineWidth = 1;
  // 左侧壁
  canvasCtx.beginPath();
  canvasCtx.moveTo(containerLeft + 20, sy);
  canvasCtx.lineTo(containerLeft + 20, sy + CONTAINER_HEIGHT);
  canvasCtx.stroke();
  // 右侧壁
  canvasCtx.beginPath();
  canvasCtx.moveTo(containerLeft + containerWidth - 20, sy);
  canvasCtx.lineTo(containerLeft + containerWidth - 20, sy + CONTAINER_HEIGHT);
  canvasCtx.stroke();
  
  // 5. 流线（绕过小球，增强流动感）
  canvasCtx.strokeStyle = isDark ? 'rgba(0, 180, 255, 0.25)' : 'rgba(26, 60, 124, 0.2)';
  canvasCtx.lineWidth = 1;
  
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    
    const streamY = ballY + i * ballR * 2;
    if (streamY < fluidTop || streamY > sy + CONTAINER_HEIGHT - 5) continue;
    
    canvasCtx.beginPath();
    for (let xOff = -CONTAINER_WIDTH / 2; xOff < CONTAINER_WIDTH / 2; xOff += 3) {
      const dx = xOff;
      const dy = streamY - ballY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const deflect = dist > ballR ? (ballR * ballR * dx) / (dist * dist) : 0;
      const px = cx + xOff;
      const py = streamY - deflect * 0.3;
      
      if (xOff === -CONTAINER_WIDTH / 2) {
        canvasCtx.moveTo(px, py);
      } else {
        canvasCtx.lineTo(px, py);
      }
    }
    canvasCtx.stroke();
  }
  
  // 6. 小球阴影（在地面上）
  const shadowY = sy + CONTAINER_HEIGHT - 10;
  const shadowScale = 1 - (ballY - sy) / CONTAINER_HEIGHT * 0.3;  // 距离越远阴影越小
  canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  canvasCtx.beginPath();
  canvasCtx.ellipse(cx, shadowY, ballR * shadowScale, ballR * 0.3 * shadowScale, 0, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 7. 小球3D效果
  // 外层光晕
  const glowGrad = canvasCtx.createRadialGradient(cx, ballY, ballR * 0.8, cx, ballY, ballR * 1.5);
  glowGrad.addColorStop(0, 'rgba(255, 100, 100, 0.2)');
  glowGrad.addColorStop(1, 'rgba(255, 100, 100, 0)');
  canvasCtx.fillStyle = glowGrad;
  canvasCtx.beginPath();
  canvasCtx.arc(cx, ballY, ballR * 1.5, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 主体渐变（3D球体）
  const ballGrad = canvasCtx.createRadialGradient(
    cx - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.1,
    cx, ballY, ballR
  );
  ballGrad.addColorStop(0, '#ffaaaa');
  ballGrad.addColorStop(0.3, '#ff6666');
  ballGrad.addColorStop(0.7, '#e03131');
  ballGrad.addColorStop(1, '#a91e2c');
  canvasCtx.fillStyle = ballGrad;
  canvasCtx.beginPath();
  canvasCtx.arc(cx, ballY, ballR, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 高光
  const highlightGrad = canvasCtx.createRadialGradient(
    cx - ballR * 0.3, ballY - ballR * 0.3, 0,
    cx - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.4
  );
  highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  canvasCtx.fillStyle = highlightGrad;
  canvasCtx.beginPath();
  canvasCtx.arc(cx - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.4, 0, Math.PI * 2);
  canvasCtx.fill();
  
  // 边框
  canvasCtx.strokeStyle = 'rgba(255, 135, 135, 0.6)';
  canvasCtx.lineWidth = 1.5;
  canvasCtx.beginPath();
  canvasCtx.arc(cx, ballY, ballR, 0, Math.PI * 2);
  canvasCtx.stroke();
  
  // 8. 力矢量箭头
  // 重力Fg（向下）
  if (calc.Fg > 0) {
    const gLen = Math.min(calc.Fg * FORCE_SCALE, MAX_FORCE_LENGTH);
    canvasCtx.strokeStyle = '#e74c3c';
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.moveTo(cx + ballR + 20, ballY);
    canvasCtx.lineTo(cx + ballR + 20, ballY + gLen);
    canvasCtx.lineTo(cx + ballR + 20 - 6, ballY + gLen - 8);
    canvasCtx.moveTo(cx + ballR + 20, ballY + gLen);
    canvasCtx.lineTo(cx + ballR + 20 + 6, ballY + gLen - 8);
    canvasCtx.stroke();
    
    canvasCtx.fillStyle = '#e74c3c';
    canvasCtx.font = 'bold 11px Microsoft YaHei';
    canvasCtx.textAlign = 'left';
    canvasCtx.fillText('重力 Fg', cx + ballR + 28, ballY + gLen / 2);
  }
  
  // 浮力Fb（向上）
  if (calc.Fb > 0) {
    const bLen = Math.min(calc.Fb * FORCE_SCALE, MAX_FORCE_LENGTH);
    canvasCtx.strokeStyle = '#3498db';
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.moveTo(cx - ballR - 20, ballY);
    canvasCtx.lineTo(cx - ballR - 20, ballY - bLen);
    canvasCtx.lineTo(cx - ballR - 20 - 6, ballY - bLen + 8);
    canvasCtx.moveTo(cx - ballR - 20, ballY - bLen);
    canvasCtx.lineTo(cx - ballR - 20 + 6, ballY - bLen + 8);
    canvasCtx.stroke();
    
    canvasCtx.fillStyle = '#3498db';
    canvasCtx.font = 'bold 11px Microsoft YaHei';
    canvasCtx.textAlign = 'right';
    canvasCtx.fillText('浮力 Fb', cx - ballR - 28, ballY - bLen / 2);
  }
  
  // 阻力Fd（向上）
  const Fd = PhysicsEngine.stokesDrag(params.viscosity, params.ballRadius, calc.vt);
  if (Fd > 0.0001) {
    const dLen = Math.min(Fd * FORCE_SCALE * 10, MAX_FORCE_LENGTH);
    canvasCtx.strokeStyle = '#f39c12';
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.moveTo(cx, ballY + ballR + 15);
    canvasCtx.lineTo(cx, ballY + ballR + 15 + dLen);
    canvasCtx.lineTo(cx - 6, ballY + ballR + 15 + dLen - 8);
    canvasCtx.moveTo(cx, ballY + ballR + 15 + dLen);
    canvasCtx.lineTo(cx + 6, ballY + ballR + 15 + dLen - 8);
    canvasCtx.stroke();
    
    canvasCtx.fillStyle = '#f39c12';
    canvasCtx.font = 'bold 11px Microsoft YaHei';
    canvasCtx.textAlign = 'left';
    canvasCtx.fillText('阻力 Fd', cx + 10, ballY + ballR + 15 + dLen / 2);
  }
  
  // 11. 到达底部提示
  if (AppState.stokesBallY >= 0.99) {
    canvasCtx.fillStyle = isDark ? 'rgba(0, 255, 136, 0.15)' : 'rgba(46, 204, 113, 0.15)';
    canvasCtx.fillRect(containerLeft, sy + CONTAINER_HEIGHT - 40, containerWidth, 30);
    
    canvasCtx.fillStyle = isDark ? '#00FF88' : '#27ae60';
    canvasCtx.font = 'bold 12px Microsoft YaHei';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('✓ 已到达底部', cx, sy + CONTAINER_HEIGHT - 20);
  }
  
  // 12. 显示时间加速信息（如果加速因子>1）
  if (timeAcceleration > 1.5) {
    canvasCtx.fillStyle = isDark ? 'rgba(255, 149, 0, 0.8)' : 'rgba(243, 156, 18, 0.8)';
    canvasCtx.font = 'bold 11px Microsoft YaHei';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`⏱ 动画加速: ${timeAcceleration.toFixed(1)}x`, cx, sy - 10);
  }
}

// 格式化数值为科学计数法（带Unicode上标）
function formatScientific(value, decimals = 3) {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return '0';
  }
  
  // 使用科学计数法
  const expStr = value.toExponential(decimals);
  const [mantissa, exponent] = expStr.split('e');
  
  // 转换为数字去除末尾零
  const mantissaNum = parseFloat(mantissa);
  const mantissaStr = mantissaNum.toString();
  
  // 指数转换为上标
  const expNum = parseInt(exponent);
  const superscripts = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'};
  const expSuperscript = expNum.toString().split('').map(c => superscripts[c] || c).join('');
  
  return `${mantissaStr}×10${expSuperscript}`;
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
    results = PhysicsEngine.newtonViscosity(params.velocity, params.viscosity, params.distance, params.area);
  } else if (exp === 'poiseuille') {
    results = PhysicsEngine.poiseuille(params.radius, params.length, params.pressure, params.viscosity, params.density);
  } else if (exp === 'stokes') {
    results = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
    // 添加实时阻力计算
    results.Fd = AppState.stokesBallFd || 0;
  }
  
  // 中文标签映射
  const chineseLabels = {
    'grad': '速度梯度',
    'tau': '切应力',
    'F': '粘性力',
    'Q': '体积流量',
    'vmax': '最大速度',
    'Rf': '流阻',
    'Re': '雷诺数',
    'v_avg': '平均速度',
    'Fg': '重力',
    'Fb': '浮力',
    'Fd': '阻力',
    'vt': '终端速度',
    't': '时间',
    'volume': '体积',
    'mass': '质量'
  };
  
  container.innerHTML = Object.entries(results).map(([key, value]) => {
    const label = chineseLabels[key] || key;
    const displayValue = typeof value === 'number' ? formatScientific(value) : value;
    return `
      <div class="data-card">
        <div class="data-label">${label}</div>
        <div class="data-value">
          ${displayValue}
          <span class="data-unit">${getUnit(key)}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // 泊肃叶实验：检查雷诺数并显示警告
  if (exp === 'poiseuille' && results.Re !== undefined) {
    const warningContainer = document.getElementById('reynoldsWarning');
    if (warningContainer) {
      if (results.Re > 2000) {
        warningContainer.innerHTML = `
          <div class="warning-message">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">雷诺数 Re = ${results.Re.toFixed(0)} > 2000，不满足层流条件，泊肃叶定律不适用！</span>
          </div>
        `;
        warningContainer.style.display = 'block';
      } else {
        warningContainer.style.display = 'none';
      }
    }
  }
  
  // 斯托克斯实验：检查雷诺数并显示警告
  if (exp === 'stokes' && results.Re !== undefined) {
    const warningContainer = document.getElementById('reynoldsWarning');
    if (warningContainer) {
      if (results.Re > 1) {
        warningContainer.innerHTML = `
          <div class="warning-message">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">雷诺数 Re = ${results.Re.toFixed(2)} > 1，不满足斯托克斯定律的层流条件（Re < 1）！</span>
          </div>
        `;
        warningContainer.style.display = 'block';
      } else {
        warningContainer.style.display = 'none';
      }
    }
  }
}

function getUnit(key) {
  const units = {
    'grad': 's⁻¹',
    'tau': 'Pa',
    'F': 'N',
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
  
  const parent = ctx.parentElement;
  const parentWidth = parent.offsetWidth;
  const parentHeight = parent.offsetHeight;
  
  console.log('Initializing chart, canvas element:', ctx);
  console.log('Canvas parent:', parent);
  console.log('Parent size:', parentWidth, 'x', parentHeight);
  
  // 如果父容器还没有尺寸，不初始化（调用方应确保容器有尺寸）
  if (parentWidth === 0 || parentHeight === 0) {
    console.warn('Chart container has no size, skipping initialization');
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
  console.log('Chart instance created:', AppState.chartInstance);
  console.log('Chart y-axis label:', getChartYLabel(exp));
}

function getChartLabel(exp) {
  const labels = {
    'newton': '粘性力 F',
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
    'newton': 'F (N)',
    'poiseuille': 'Q (×10⁻⁶ m³/s)',
    'stokes': 'v (m/s)'
  };
  return labels[exp] || '值';
}

function updateRealtimeChart() {
  if (!AppState.chartInstance) {
    console.warn('Chart instance not initialized');
    return;
  }
  
  const exp = AppState.currentExperiment;
  const params = getParamValues();
  
  console.log('[Chart Update] Experiment:', exp, 'Params:', params);
  
  // 计算当前数据点
  let currentValue = 0;
  let refLine = null;
  
  if (exp === 'newton') {
    const calc = PhysicsEngine.newtonViscosity(params.velocity, params.viscosity, params.distance, params.area);
    currentValue = calc.F;  // 使用粘性力 F 而不是切应力 τ
    console.log('[Chart Update] Newton - F:', currentValue, 'calc:', calc);
  } else if (exp === 'poiseuille') {
    const calc = PhysicsEngine.poiseuille(params.radius, params.length, params.pressure, params.viscosity, params.density);
    currentValue = calc.Q * 1e6; // 转换为 ×10⁻⁶ m³/s
    console.log('[Chart Update] Poiseuille - Q:', currentValue);
  } else if (exp === 'stokes') {
    const calc = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
    currentValue = AppState.stokesBallV || 0;
    refLine = calc.vt; // 终端速度参考线
    console.log('[Chart Update] Stokes - v:', currentValue);
  }
  
  // 添加数据到历史
  AppState.dataHistory.push(currentValue);
  AppState.timeHistory.push(AppState.simTime);
  
  console.log('[Chart Update] History length:', AppState.dataHistory.length, 'Time:', AppState.simTime.toFixed(1));
  
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
  
  console.log('[Chart Update] Chart data - labels:', chart.data.labels.length, 'data points:', chart.data.datasets[0].data.length);
  console.log('[Chart Update] First 5 data points:', chart.data.datasets[0].data.slice(0, 5));
  
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
  console.log('[Chart Update] Chart.update() called');
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
  
  // 如果是第一次启动（未运行过），需要先模拟一帧让粒子流动，然后保存这个状态作为初始状态
  if (!AppState.simulationRunning) {
    // 临时设置为运行状态，让粒子移动一帧
    AppState.simulationRunning = true;
    AppState.simulationPaused = false;
    
    // 执行一次粒子更新（移动一帧）
    if (AppState.currentExperiment === 'poiseuille') {
      updatePoiseuille3D();
      
      // 保存移动后的粒子位置作为新的初始状态
      poiseuille3DInitialParticlePositions = poiseuille3DParticles.map(p => ({
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
        radius: p.userData.radius,
        angle: p.userData.angle
      }));
      
      // 重置粒子到初始位置（即刚才移动后的位置）
      resetPoiseuilleParticles();
    }
    
    // 重置状态，准备真正开始
    AppState.simulationRunning = false;
    AppState.simulationPaused = false;
    
    // 重新设置小球状态
    AppState.stokesBallDistance = 0;
    AppState.stokesBallY = 0;
    AppState.stokesBallV = 0;
    AppState.stokesBallStartTime = null;
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
  
  // 更新斯托克斯阻力（用于实时显示）
  if (AppState.currentExperiment === 'stokes') {
    const params = getParamValues();
    const calc = PhysicsEngine.stokes(params.ballRadius, params.ballDensity, params.fluidDensity, params.viscosity);
    AppState.stokesBallFd = PhysicsEngine.stokesDrag(params.viscosity, params.ballRadius, AppState.stokesBallV);
  }
  
  // 绘制动画
  const exp = AppState.currentExperiment;
  if (exp === 'poiseuille') {
    // 泊肃叶实验使用3D渲染
    updatePoiseuille3D();
  } else if (canvasCtx) {
    // 其他实验使用2D Canvas
    drawSimulationCanvas();
  }
  
  // 使用requestAnimationFrame进行下一次迭代
  AppState.animFrameId = requestAnimationFrame(runSimulation);
}

function pauseSimulation() {
  AppState.simulationPaused = true;
}

function resetSimulation() {
  const exp = AppState.currentExperiment;
  
  // 停止仿真
  Navigation.stopSimulation();
  
  // 重置仿真状态
  AppState.simTime = 0;
  AppState.stokesBallDistance = 0;  // 初始下落距离0米
  AppState.stokesBallY = 0;  // 初始位置在顶部
  AppState.stokesBallV = 0;
  AppState.stokesBallStartTime = null;  // 重置小球开始时间
  AppState.newtonGradientLineStartTime = null;  // 重置牛顿实验虚线开始时间
  AppState.dataHistory = [];
  AppState.timeHistory = [];
  // 重置粒子
  if (exp === 'poiseuille') {
    // 泊肃叶实验：只重置粒子位置，不清理整个场景
    resetPoiseuilleParticles();
  } else {
    // 其他实验：重置2D粒子
    initParticles();
  }
  
  // 重绘画布
  if (canvasCtx) {
    drawSimulationCanvas();
  }
  
  // 重置参数为默认值
  const experiment = EXPERIMENTS[exp];
  if (experiment) {
    experiment.params.forEach(param => {
      const slider = document.getElementById(param.id);
      const valueDisplay = document.getElementById(`${param.id}Value`);
      if (slider) {
        slider.value = param.value;
        if (valueDisplay) {
          valueDisplay.textContent = formatScientific(param.value);
        }
      }
    });
  }
  
  // 泊肃叶实验：重置为莴麻油预设（立即应用，不延迟）
  if (exp === 'poiseuille') {
    applyFluidPreset('莴麻油 (20°C)');
  }
    
  // 更新数据
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
  
  // 更新按钮状态为"开始"
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
  const cards = document.querySelectorAll('.experiment-card');
  console.log('Found experiment cards:', cards.length);
  cards.forEach(card => {
    const handler = () => {
      const expType = card.dataset.experiment;
      console.log('Card clicked:', expType);
      Navigation.goToExperiment(expType);
    };
    card.addEventListener('click', handler);
    // 存储事件监听器引用
    AppState.eventListeners.experimentCards.push({ element: card, handler });
  });
  
  // 返回首页按钮
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      Navigation.goToHome();
    });
  }
  
  // 菜单项点击
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      Navigation.switchSubPage(page);
    });
  });
  
  // 折叠菜单按钮
  const toggleBtn = document.getElementById('toggleSidebar');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      Navigation.toggleSidebar();
    });
  }
  
  // 主题切换
  ThemeManager.init();
}

// ========================================
// 错误处理
// ========================================

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  // 可以在这里添加错误报告逻辑
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
  // 可以在这里添加错误报告逻辑
});

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
