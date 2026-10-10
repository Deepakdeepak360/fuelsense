/**
 * FuelSense Industrial IoT — Interactive Client Application
 * Handles real-time telemetry simulation, Web Audio synthesis,
 * manifold management, ROI calculations, and modal workflows.
 */

(function() {
  'use strict';

  // State Management
  const state = {
    netWeight: 2.1,
    tareWeight: 15.3,
    capacity: 14.2,
    burnRate: 0.35, // kg/day
    thresholdPct: 20,
    audioEnabled: false,
    isBurning: false,
    burnInterval: null,
    activeManifold: 'B',
    audioCtx: null
  };

  // DOM Elements - Telemetry Console
  const slider = document.getElementById('weightSlider');
  const sliderVal = document.getElementById('sliderValue');
  const weightDisplay = document.getElementById('demoWeightDisplay');
  const percentageDisplay = document.getElementById('demoPercentageDisplay');
  const statusBadge = document.getElementById('demoStatusBadge');
  const grossWeightVal = document.getElementById('grossWeightVal');
  const stageGrossWeightVal = document.getElementById('stageGrossWeightVal');
  const daysRemainingVal = document.getElementById('daysRemainingVal');
  const mealsRemainingVal = document.getElementById('mealsRemainingVal');
  const thresholdSelect = document.getElementById('thresholdSelect');
  const tareSelect = document.getElementById('tareSelect');
  const progressBar = document.getElementById('demoProgressBar');
  const resetBtn = document.getElementById('resetDemoBtn');
  const autoBurnBtn = document.getElementById('autoBurnBtn');
  const flameGraphic = document.getElementById('flameSimulation');
  const liquidLevelSvg = document.getElementById('cylinderLiquidLevel');
  const audioToggle = document.getElementById('audioToggle');

  // Side alert cards
  const alertCard = document.getElementById('alertCard');
  const alertCardTitle = document.getElementById('alertCardTitle');
  const alertCardBody = document.getElementById('alertCardBody');

  // Hero Floating HUD
  const heroWeightVal = document.getElementById('heroWeightVal');
  const heroStatusBadge = document.getElementById('heroStatusBadge');
  const heroProgressBar = document.getElementById('heroProgressBar');

  // Web Audio Synthesizer
  function initAudio() {
    if (!state.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        state.audioCtx = new AudioContext();
      }
    }
  }

  function playTone(freq, duration, type = 'sine') {
    if (!state.audioEnabled || !state.audioCtx) return;
    try {
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(state.audioCtx.destination);
      osc.start();
      osc.stop(state.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  function playAlertBeep(isCritical) {
    if (!state.audioEnabled) return;
    if (isCritical) {
      playTone(880, 0.15, 'square');
      setTimeout(() => playTone(660, 0.25, 'sawtooth'), 180);
    } else {
      playTone(520, 0.12, 'sine');
      setTimeout(() => playTone(650, 0.15, 'sine'), 140);
    }
  }

  // Telemetry Calculation & DOM Update
  function updateSimulation(val, triggerAudio = false) {
    const net = parseFloat(val);
    state.netWeight = net;
    const percentage = Math.round((net / state.capacity) * 100);
    const gross = (net + state.tareWeight).toFixed(1);
    const days = Math.max(0.5, (net / state.burnRate)).toFixed(0);
    const meals = Math.max(1, Math.round(net / 0.12)); // approx 120g per standard domestic family meal
    const threshold = parseInt(thresholdSelect ? thresholdSelect.value : state.thresholdPct, 10);

    // Update Numerical DOM
    if (sliderVal) sliderVal.textContent = net.toFixed(1);
    if (weightDisplay) weightDisplay.textContent = net.toFixed(1);
    if (percentageDisplay) percentageDisplay.textContent = percentage + '%';
    if (grossWeightVal) grossWeightVal.textContent = gross + ' kg';
    if (stageGrossWeightVal) stageGrossWeightVal.textContent = gross + ' kg';
    if (daysRemainingVal) daysRemainingVal.textContent = days + (days === '1' ? ' Day' : ' Days');
    if (mealsRemainingVal) mealsRemainingVal.textContent = meals + ' Meals';

    // Update Hero HUD if present
    if (heroWeightVal) heroWeightVal.textContent = net.toFixed(1);
    if (heroProgressBar) heroProgressBar.style.width = Math.min(100, Math.max(2, percentage)) + '%';

    // Update Horizontal Progress Bar
    if (progressBar) {
      progressBar.style.width = Math.min(100, Math.max(2, percentage)) + '%';
    }

    // Update Volumetric SVG Cylinder Meniscus Fill
    if (liquidLevelSvg) {
      // Cylinder fill height in SVG coordinates (max ~130px)
      const maxSvgHeight = 120;
      const calculatedHeight = (percentage / 100) * maxSvgHeight;
      liquidLevelSvg.setAttribute('height', Math.max(4, calculatedHeight));
      liquidLevelSvg.setAttribute('y', 170 - Math.max(4, calculatedHeight));
    }

    // Update Burner Flame visualizer
    if (flameGraphic) {
      if (net <= 0.2) {
        flameGraphic.style.opacity = '0.15';
        flameGraphic.style.transform = 'scale(0.4)';
      } else if (net < 2.0) {
        flameGraphic.style.opacity = '0.7';
        flameGraphic.style.transform = 'scale(0.7)';
      } else {
        flameGraphic.style.opacity = '1';
        flameGraphic.style.transform = 'scale(1)';
      }
    }

    // Threshold Status Routing
    if (percentage > threshold) {
      // NORMAL OPERATION (Emerald/Teal)
      if (statusBadge) {
        statusBadge.textContent = 'NORMAL';
        statusBadge.className = 'status-badge-chip chip-normal';
      }
      if (heroStatusBadge) {
        heroStatusBadge.textContent = 'NORMAL';
        heroStatusBadge.className = 'status-badge-chip chip-normal';
      }
      if (progressBar) {
        progressBar.style.backgroundColor = 'var(--success)';
      }
      if (liquidLevelSvg) {
        liquidLevelSvg.setAttribute('fill', 'url(#lpgNormalGrad)');
      }
      if (alertCard) {
        alertCard.style.borderLeftColor = 'var(--success)';
        alertCardTitle.textContent = `Reserve Healthy (${percentage}%)`;
        alertCardBody.innerHTML = `Cylinder contains ample combustible gas. Estimated <strong>${days} full cooking days</strong> remaining before replenishment.`;
      }
    } else if (percentage > 8) {
      // WARNING (Amber)
      if (statusBadge) {
        statusBadge.textContent = 'LOW WARNING';
        statusBadge.className = 'status-badge-chip chip-low';
      }
      if (heroStatusBadge) {
        heroStatusBadge.textContent = 'LOW';
        heroStatusBadge.className = 'status-badge-chip chip-low';
      }
      if (progressBar) {
        progressBar.style.backgroundColor = 'var(--tertiary)';
      }
      if (liquidLevelSvg) {
        liquidLevelSvg.setAttribute('fill', 'url(#lpgWarningGrad)');
      }
      if (alertCard) {
        alertCard.style.borderLeftColor = 'var(--tertiary)';
        alertCardTitle.textContent = `FuelSense Alert: LPG Below ${threshold}%`;
        alertCardBody.innerHTML = `Only <strong>${net.toFixed(1)} kg remaining</strong>. Refill dispatch queued for registration mobile (+91 98*** 12345) via WhatsApp & SMS.`;
      }
      if (triggerAudio) playAlertBeep(false);
    } else {
      // CRITICAL FLAME CUTOFF IMMINENT (Red)
      if (statusBadge) {
        statusBadge.textContent = 'CRITICAL';
        statusBadge.className = 'status-badge-chip chip-error';
      }
      if (heroStatusBadge) {
        heroStatusBadge.textContent = 'CRITICAL';
        heroStatusBadge.className = 'status-badge-chip chip-error';
      }
      if (progressBar) {
        progressBar.style.backgroundColor = 'var(--error)';
      }
      if (liquidLevelSvg) {
        liquidLevelSvg.setAttribute('fill', 'url(#lpgCriticalGrad)');
      }
      if (alertCard) {
        alertCard.style.borderLeftColor = 'var(--error)';
        alertCardTitle.textContent = 'CRITICAL ALERT: Flame Extinction Imminent';
        alertCardBody.innerHTML = `Vessel pressure collapsing! Only <strong>${net.toFixed(1)} kg</strong> combustible reserve. Switch to secondary manifold immediately!`;
      }
      if (triggerAudio) playAlertBeep(true);
    }
  }

  // Slider Event Listeners
  if (slider) {
    slider.addEventListener('input', function(e) {
      updateSimulation(e.target.value, true);
    });
  }

  // Presets
  const presetButtons = document.querySelectorAll('[data-preset]');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const val = parseFloat(this.getAttribute('data-preset'));
      if (slider) {
        slider.value = val;
        updateSimulation(val, true);
      }
      presetButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Reset Button
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      if (slider) {
        slider.value = 2.1;
        updateSimulation(2.1, true);
      }
      presetButtons.forEach(b => b.classList.remove('active'));
      const defaultPreset = document.querySelector('[data-preset="2.1"]');
      if (defaultPreset) defaultPreset.classList.add('active');
    });
  }

  // Auto-Burn Cooking Simulation (Live burn-down)
  if (autoBurnBtn) {
    autoBurnBtn.addEventListener('click', function() {
      if (state.isBurning) {
        clearInterval(state.burnInterval);
        state.isBurning = false;
        autoBurnBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">local_fire_department</span> Simulate Cooking Burn';
        autoBurnBtn.classList.remove('btn-amber');
      } else {
        state.isBurning = true;
        autoBurnBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">pause</span> Halt Simulation';
        autoBurnBtn.classList.add('btn-amber');
        state.burnInterval = setInterval(() => {
          let current = parseFloat(slider.value);
          if (current > 0.3) {
            current = Math.max(0.2, current - 0.1);
            slider.value = current.toFixed(1);
            updateSimulation(current, false);
          } else {
            clearInterval(state.burnInterval);
            state.isBurning = false;
            autoBurnBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">local_fire_department</span> Simulate Cooking Burn';
            autoBurnBtn.classList.remove('btn-amber');
          }
        }, 350);
      }
    });
  }

  // Tare Calibration Selector
  if (tareSelect) {
    tareSelect.addEventListener('change', function() {
      state.tareWeight = parseFloat(this.value);
      const grossEqTare = document.getElementById('eqTareVal');
      if (grossEqTare) grossEqTare.textContent = state.tareWeight.toFixed(1) + ' kg';
      if (slider) updateSimulation(slider.value, false);
    });
  }

  // Threshold Selector
  if (thresholdSelect) {
    thresholdSelect.addEventListener('change', function() {
      state.thresholdPct = parseInt(this.value, 10);
      const marker = document.getElementById('thresholdMarker');
      if (marker) marker.style.left = state.thresholdPct + '%';
      if (slider) updateSimulation(slider.value, true);
    });
  }

  // Audio Toggle Button
  if (audioToggle) {
    audioToggle.addEventListener('click', function() {
      initAudio();
      state.audioEnabled = !state.audioEnabled;
      if (state.audioEnabled) {
        audioToggle.classList.add('active');
        audioToggle.innerHTML = '<span class="material-symbols-outlined text-[18px]">volume_up</span>';
        audioToggle.setAttribute('title', 'Mute Telemetry Sound');
        playTone(600, 0.1, 'sine');
      } else {
        audioToggle.classList.remove('active');
        audioToggle.innerHTML = '<span class="material-symbols-outlined text-[18px]">volume_off</span>';
        audioToggle.setAttribute('title', 'Enable Telemetry Audio Feedback');
      }
    });
  }

  // ==========================================================================
  // HARDWARE ARCHITECTURE INTERACTIVE STEPS
  // ==========================================================================
  const archCards = document.querySelectorAll('.arch-card');
  const archDetailsBox = document.getElementById('archDetailsBox');
  const archStepSpecs = {
    1: {
      title: '01: Heavy-Duty LPG Vessel',
      detail: 'Standard commercial or residential cold-rolled steel cylinder containing liquefied petroleum gas (propane/butane blend) under ~5-8 bar vapor pressure.'
    },
    2: {
      title: '02: 100 kg Shear Beam Load Cell',
      detail: 'Dual-shear aviation-grade strain gauge wired in full Wheatstone bridge configuration. Converts nanometer structural deflection into a differential microvolt reading.'
    },
    3: {
      title: '03: HX711 24-Bit Precision ADC',
      detail: 'High-precision 24-bit analog-to-digital converter with low-noise Programmable Gain Amplifier (PGA gain 128) rejecting 50/60Hz electromagnetic line interference.'
    },
    4: {
      title: '04: ESP32 IoT Microcontroller',
      detail: 'Tensilica dual-core 240MHz SoC running FreeRTOS with cryptographic hardware acceleration for TLS 1.3 telemetry encryption over dual-band 2.4GHz Wi-Fi and BLE 5.2.'
    },
    5: {
      title: '05: Dynamic Tare Compensation Algorithm',
      detail: 'Mathematical engine subtracting vessel tare weight, filtering mechanical vibration transients (anti-jitter filter), and applying thermal drift calibration curves.'
    },
    6: {
      title: '06: Instant Multi-Channel Alert Dispatch',
      detail: 'Broadcasts instant OLED display metrics on-device and fires automated webhooks to Twilio SMS and Meta WhatsApp Business Cloud APIs in under 1.2 seconds.'
    }
  };

  archCards.forEach(card => {
    card.addEventListener('click', function() {
      archCards.forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      const step = this.getAttribute('data-arch-step');
      if (archDetailsBox && archStepSpecs[step]) {
        archDetailsBox.innerHTML = `<strong>${archStepSpecs[step].title}:</strong> ${archStepSpecs[step].detail}`;
      }
      playTone(450, 0.08, 'triangle');
    });
  });

  // ==========================================================================
  // MULTI-CYLINDER MANIFOLD SWITCH & CSV EXPORT
  // ==========================================================================
  const switchManifoldBtn = document.getElementById('switchManifoldBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  if (switchManifoldBtn) {
    switchManifoldBtn.addEventListener('click', function() {
      const stationB = document.getElementById('stationCardB');
      const stationC = document.getElementById('stationCardC');
      if (state.activeManifold === 'B') {
        state.activeManifold = 'C';
        if (stationB) stationB.classList.remove('card-positive');
        if (stationC) stationC.classList.add('card-positive');
        switchManifoldBtn.textContent = 'Active: Station C (Backup) — Switch Back';
        alert('Manifold Solenoid Switched to Station C (Backup Bank). Kitchen flame continuity preserved.');
      } else {
        state.activeManifold = 'B';
        if (stationC) stationC.classList.remove('card-positive');
        if (stationB) stationB.classList.add('card-positive');
        switchManifoldBtn.textContent = 'Auto-Switch Manifold Valve';
      }
      playTone(700, 0.15, 'sine');
    });
  }

  // Export Real Telemetry CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', function() {
      const timestamp = new Date().toISOString();
      const csvContent = "data:text/csv;charset=utf-8,"
        + "Timestamp,Device_UUID,Station_Name,Gross_Weight_kg,Net_LPG_kg,Percent_Remaining,Status,Battery_Percent,RSSI_dBm\n"
        + `${timestamp},FS-HX711-BLR-089,Cylinder 01 - Main Stove,22.7,7.4,52,NORMAL,98,-54\n`
        + `${timestamp},FS-HX711-BLR-090,Cylinder 02 - Fryer Unit,17.4,2.1,15,LOW_WARNING,94,-58\n`
        + `${timestamp},FS-HX711-BLR-091,Cylinder 03 - Backup Bank,16.0,0.7,5,CRITICAL,92,-61\n`
        + `${timestamp},FS-HX711-BLR-092,Cylinder 04 - Steam Boiler,39.7,18.2,96,NORMAL,100,-49\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `FuelSense_Telemetry_Log_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playTone(550, 0.1, 'sine');
    });
  }

  // ==========================================================================
  // ROI & FUEL SAVINGS CALCULATOR
  // ==========================================================================
  const roiCylindersInput = document.getElementById('roiCylinders');
  const roiResidualInput = document.getElementById('roiResidual');
  const roiCylindersVal = document.getElementById('roiCylindersVal');
  const roiResidualVal = document.getElementById('roiResidualVal');
  const roiAnnualSavings = document.getElementById('roiAnnualSavings');
  const roiWastedFuel = document.getElementById('roiWastedFuel');
  const roiDisruptionsPrevented = document.getElementById('roiDisruptionsPrevented');

  function calculateRoi() {
    if (!roiCylindersInput || !roiResidualInput) return;
    const cylinders = parseInt(roiCylindersInput.value, 10);
    const residualKg = parseFloat(roiResidualInput.value);
    const costPerKg = 75; // Approx ₹1,065 per 14.2 kg domestic LPG ≈ ₹75/kg
    const emergencySurcharge = 250; // Late delivery emergency surcharge

    if (roiCylindersVal) roiCylindersVal.textContent = cylinders;
    if (roiResidualVal) roiResidualVal.textContent = residualKg.toFixed(1) + ' kg';

    const annualCylinders = cylinders * 12;
    const annualWastedGasKg = Math.round(annualCylinders * residualKg);
    const gasRupeesSaved = annualWastedGasKg * costPerKg;
    const surchargesSaved = Math.round(annualCylinders * 0.25) * emergencySurcharge;
    const totalAnnualSavings = gasRupeesSaved + surchargesSaved;

    if (roiAnnualSavings) roiAnnualSavings.textContent = '₹' + totalAnnualSavings.toLocaleString('en-IN');
    if (roiWastedFuel) roiWastedFuel.textContent = annualWastedGasKg + ' kg/year';
    if (roiDisruptionsPrevented) roiDisruptionsPrevented.textContent = Math.round(annualCylinders * 0.3) + ' Outages';
  }

  if (roiCylindersInput) roiCylindersInput.addEventListener('input', calculateRoi);
  if (roiResidualInput) roiResidualInput.addEventListener('input', calculateRoi);

  // ==========================================================================
  // SPECS ACCORDION
  // ==========================================================================
  const accordionBtns = document.querySelectorAll('.accordion-btn');
  accordionBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const item = this.parentElement;
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
        playTone(400, 0.05, 'sine');
      }
    });
  });

  // ==========================================================================
  // MODALS (ORDER HARDWARE KIT & COMMERCIAL TRIAL)
  // ==========================================================================
  const orderModal = document.getElementById('orderModal');
  const commercialModal = document.getElementById('commercialModal');
  const openOrderBtns = document.querySelectorAll('[data-open-order]');
  const openCommercialBtns = document.querySelectorAll('[data-open-commercial]');
  const closeModals = document.querySelectorAll('.modal-close-btn, .modal-cancel');

  openOrderBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      if (orderModal) orderModal.classList.add('active');
      playTone(500, 0.08, 'sine');
    });
  });

  openCommercialBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      if (commercialModal) commercialModal.classList.add('active');
      playTone(500, 0.08, 'sine');
    });
  });

  closeModals.forEach(btn => {
    btn.addEventListener('click', function() {
      if (orderModal) orderModal.classList.remove('active');
      if (commercialModal) commercialModal.classList.remove('active');
    });
  });

  // Close on outside click
  window.addEventListener('click', function(e) {
    if (orderModal && e.target === orderModal) orderModal.classList.remove('active');
    if (commercialModal && e.target === commercialModal) commercialModal.classList.remove('active');
  });

  // Order Form Submission Simulation
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const customerName = document.getElementById('orderName')?.value || 'Valued Customer';
      const orderCity = document.getElementById('orderCity')?.value || 'India';
      const orderQty = document.getElementById('orderQty')?.value || '1';
      const totalAmount = parseInt(orderQty, 10) * 2499;

      const modalBox = orderForm.closest('.modal-box');
      if (modalBox) {
        modalBox.innerHTML = `
          <div style="text-align: center; padding: 1.5rem 0;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--success-bg); color: var(--success); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
              <span class="material-symbols-outlined" style="font-size: 36px;">check_circle</span>
            </div>
            <h3 style="font-family: var(--font-headline); font-size: 1.5rem; margin-bottom: 0.5rem;">Hardware Kit Reserved!</h3>
            <p style="color: var(--on-surface-variant); font-size: 0.95rem; margin-bottom: 1.5rem;">
              Thank you, <strong>${customerName}</strong>! Your order for <strong>${orderQty}x FuelSense IoT Kit</strong> (₹${totalAmount.toLocaleString('en-IN')}) has been booked for dispatch to <strong>${orderCity}</strong>.
            </p>
            <div style="background: var(--surface-container-low); border-radius: var(--rounded); padding: 1rem; text-align: left; font-family: var(--font-mono); font-size: 0.8rem; margin-bottom: 1.5rem;">
              <div>Order Reference: #FS-${Math.floor(100000 + Math.random() * 900000)}</div>
              <div>Estimated Delivery: 2-3 Business Days</div>
              <div>Pre-Calibrated: 14.2 kg Domestic Profile</div>
            </div>
            <button class="btn btn-primary" onclick="window.location.reload()">Back to Dashboard</button>
          </div>
        `;
      }
      playTone(800, 0.2, 'sine');
    });
  }

  // Commercial Form Submission
  const commercialForm = document.getElementById('commercialForm');
  if (commercialForm) {
    commercialForm.addEventListener('submit', function(e) {
      e.preventDefault();
      alert('Thank you! A FuelSense industrial IoT solutions engineer will reach out to your commercial facility team within 2 business hours.');
      if (commercialModal) commercialModal.classList.remove('active');
      playTone(600, 0.1, 'sine');
    });
  }

  // ==========================================================================
  // MOBILE NAVIGATION DRAWER
  // ==========================================================================
  const mobileNavToggle = document.getElementById('mobileNavToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileDrawerOverlay = document.getElementById('mobileDrawerOverlay');
  const mobileDrawerClose = document.getElementById('mobileDrawerClose');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  function openMobileDrawer() {
    if (mobileDrawer && mobileDrawerOverlay) {
      mobileDrawer.classList.add('active');
      mobileDrawerOverlay.classList.add('active');
      mobileDrawer.setAttribute('aria-hidden', 'false');
      if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      playTone(480, 0.06, 'sine');
    }
  }

  function closeMobileDrawer() {
    if (mobileDrawer && mobileDrawerOverlay) {
      mobileDrawer.classList.remove('active');
      mobileDrawerOverlay.classList.remove('active');
      mobileDrawer.setAttribute('aria-hidden', 'true');
      if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  }

  if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = mobileDrawer && mobileDrawer.classList.contains('active');
      if (isOpen) {
        closeMobileDrawer();
      } else {
        openMobileDrawer();
      }
    });
  }

  if (mobileDrawerClose) {
    mobileDrawerClose.addEventListener('click', closeMobileDrawer);
  }

  if (mobileDrawerOverlay) {
    mobileDrawerOverlay.addEventListener('click', closeMobileDrawer);
  }

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', function() {
      closeMobileDrawer();
    });
  });

  // Close drawer or modals on Escape
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeMobileDrawer();
      if (orderModal) orderModal.classList.remove('active');
      if (commercialModal) commercialModal.classList.remove('active');
    }
  });

  // Initialize Default State
  updateSimulation(2.1, false);
  calculateRoi();

})();
