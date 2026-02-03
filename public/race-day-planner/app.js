// Race Day Planner - Core Logic

document.addEventListener('DOMContentLoaded', function() {
    // Element references
    const raceDistanceSelect = document.getElementById('raceDistance');
    const customDistanceGroup = document.getElementById('customDistanceGroup');
    const customDistanceInput = document.getElementById('customDistance');
    const generateBtn = document.getElementById('generatePlan');
    const outputSection = document.getElementById('outputSection');
    const printBtn = document.getElementById('printPlan');
    const copyBtn = document.getElementById('copyPlan');
    const shareBtn = document.getElementById('sharePlan');
    const coursePresetSelect = document.getElementById('coursePreset');

    // Show/hide custom distance field
    raceDistanceSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customDistanceGroup.classList.remove('hidden');
        } else {
            customDistanceGroup.classList.add('hidden');
        }
    });

    // Generate plan
    generateBtn.addEventListener('click', generateRacePlan);
    
    // Print functionality
    printBtn.addEventListener('click', function() {
        window.print();
    });

    // Copy to clipboard
    copyBtn.addEventListener('click', copyPlanToClipboard);

    // Share plan URL
    shareBtn.addEventListener('click', function() {
        const url = generateShareURL();
        navigator.clipboard.writeText(url).then(() => {
            this.textContent = '✓ Link Copied!';
            setTimeout(() => {
                this.textContent = '🔗 Share Plan';
            }, 2000);
        }).catch(() => {
            // Fallback for older browsers
            prompt('Copy this URL:', url);
        });
    });

    // Course preset selection
    coursePresetSelect.addEventListener('change', function() {
        if (this.value) {
            loadCoursePreset(this.value);
        }
    });

    // Auto-adjust carbs recommendation based on race distance
    raceDistanceSelect.addEventListener('change', function() {
        const distance = parseFloat(this.value === 'custom' ? customDistanceInput.value : this.value);
        const carbsInput = document.getElementById('carbsPerHour');
        
        if (distance <= 21.0975) {
            carbsInput.value = 45;
        } else if (distance <= 42.195) {
            carbsInput.value = 60;
        } else if (distance <= 100) {
            carbsInput.value = 75;
        } else {
            carbsInput.value = 80;
        }
    });

    // Load from URL if params present
    loadFromURL();
});

function generateRacePlan() {
    // Gather inputs
    const distanceSelect = document.getElementById('raceDistance').value;
    const customDistance = parseFloat(document.getElementById('customDistance').value) || 0;
    const distanceKm = distanceSelect === 'custom' ? customDistance : parseFloat(distanceSelect);
    
    const targetHours = parseInt(document.getElementById('targetHours').value) || 0;
    const targetMinutes = parseInt(document.getElementById('targetMinutes').value) || 0;
    const targetSeconds = parseInt(document.getElementById('targetSeconds').value) || 0;
    const targetTimeSeconds = (targetHours * 3600) + (targetMinutes * 60) + targetSeconds;
    
    const units = document.getElementById('units').value;
    const elevationGain = parseFloat(document.getElementById('elevationGain').value) || 0;
    const elevationUnit = document.getElementById('elevationUnit').value;
    const elevationMeters = elevationUnit === 'ft' ? elevationGain * 0.3048 : elevationGain;
    
    const bodyWeight = parseFloat(document.getElementById('bodyWeight').value) || 70;
    const weightUnit = document.getElementById('weightUnit').value;
    const bodyWeightKg = weightUnit === 'lb' ? bodyWeight * 0.453592 : bodyWeight;
    
    const carbsPerHour = parseInt(document.getElementById('carbsPerHour').value) || 60;
    const gelCarbs = parseInt(document.getElementById('gelCarbs').value) || 25;
    const caffeineStrategy = document.getElementById('caffeineStrategy').value;
    const aidStationInterval = parseFloat(document.getElementById('aidStationInterval').value) || 5;

    // Validate inputs
    if (distanceKm <= 0 || targetTimeSeconds <= 0) {
        alert('Please enter valid race distance and target time.');
        return;
    }

    // Calculate base pace (seconds per km)
    const basePaceSecsPerKm = targetTimeSeconds / distanceKm;
    
    // Adjust pace for elevation (rule of thumb: add ~12-15 sec/km per 100m of climbing per 10km)
    const elevationPenaltyPerKm = (elevationMeters / distanceKm) * 0.12; // seconds adjustment
    
    // Generate splits
    const splits = generateSplits(distanceKm, targetTimeSeconds, basePaceSecsPerKm, elevationMeters, units, aidStationInterval);
    
    // Generate nutrition plan
    const nutritionPlan = generateNutritionPlan(targetTimeSeconds, carbsPerHour, gelCarbs, caffeineStrategy, splits);
    
    // Calculate summary stats
    const avgPace = formatPace(basePaceSecsPerKm, units);
    const totalGels = nutritionPlan.gels.length;
    const totalCarbs = totalGels * gelCarbs;
    
    // Display results
    displayResults(splits, nutritionPlan, avgPace, totalGels, totalCarbs, caffeineStrategy, distanceKm, units);
    
    // Generate race tips
    generateRaceTips(distanceKm, targetTimeSeconds, elevationMeters);
    
    // Show output section
    document.getElementById('outputSection').classList.remove('hidden');
    document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth' });
}

function generateSplits(distanceKm, targetTimeSeconds, basePaceSecsPerKm, elevationMeters, units, aidStationInterval) {
    const splits = [];
    const isMetric = units === 'km';
    const splitDistance = isMetric ? 1 : 1.60934; // 1km or 1 mile
    const totalSplits = Math.ceil(distanceKm / splitDistance);
    
    // Calculate pace variation based on elevation (simplified model)
    // First half slightly faster, last third slower
    let cumulativeTime = 0;
    let cumulativeDistance = 0;
    
    for (let i = 0; i < totalSplits; i++) {
        const currentDistance = Math.min((i + 1) * splitDistance, distanceKm);
        const distanceForThisSplit = currentDistance - cumulativeDistance;
        
        // Pace adjustment based on race position
        let paceMultiplier = 1.0;
        const percentComplete = currentDistance / distanceKm;
        
        if (percentComplete < 0.25) {
            paceMultiplier = 1.02; // Start slightly conservative
        } else if (percentComplete < 0.5) {
            paceMultiplier = 0.98; // Settle into rhythm
        } else if (percentComplete < 0.75) {
            paceMultiplier = 1.0; // Maintain
        } else {
            paceMultiplier = 1.03; // Account for fatigue
        }
        
        // Additional elevation adjustment
        if (elevationMeters > 0) {
            const elevationPerKm = elevationMeters / distanceKm;
            paceMultiplier += elevationPerKm * 0.001;
        }
        
        const adjustedPace = basePaceSecsPerKm * paceMultiplier;
        const splitTime = distanceForThisSplit * adjustedPace;
        cumulativeTime += splitTime;
        cumulativeDistance = currentDistance;
        
        // Determine if this is an aid station
        const isAidStation = Math.abs(currentDistance % aidStationInterval) < 0.5 || 
                            Math.abs(currentDistance % aidStationInterval - aidStationInterval) < 0.5;
        
        // Determine milestones
        let milestone = null;
        if (Math.abs(percentComplete - 0.25) < 0.05) milestone = 'Quarter';
        if (Math.abs(percentComplete - 0.5) < 0.05) milestone = 'Halfway';
        if (Math.abs(percentComplete - 0.75) < 0.05) milestone = '3/4 Mark';
        
        splits.push({
            distance: currentDistance,
            distanceDisplay: isMetric ? currentDistance.toFixed(1) : (currentDistance / 1.60934).toFixed(1),
            splitTime: splitTime,
            cumulativeTime: cumulativeTime,
            pace: adjustedPace,
            percentComplete: percentComplete,
            isAidStation: isAidStation,
            milestone: milestone
        });
    }
    
    return splits;
}

function generateNutritionPlan(targetTimeSeconds, carbsPerHour, gelCarbs, caffeineStrategy, splits) {
    const gels = [];
    const hydration = [];
    const electrolytes = [];
    
    const totalHours = targetTimeSeconds / 3600;
    const totalCarbsNeeded = totalHours * carbsPerHour;
    const gelsNeeded = Math.ceil(totalCarbsNeeded / gelCarbs);
    
    // For races under 75 minutes, nutrition is minimal
    if (targetTimeSeconds < 4500) { // 75 minutes
        return {
            gels: [],
            hydration: ['Sip water at aid stations if thirsty'],
            electrolytes: [],
            notes: 'For races under 75 minutes, focus on hydration only. Pre-race meal is sufficient.'
        };
    }
    
    // Calculate gel timing
    // First gel around 30-45 minutes, then every 30-45 minutes
    const firstGelTime = Math.min(2400, targetTimeSeconds * 0.15); // ~40 min or 15% into race
    const gelInterval = (targetTimeSeconds - firstGelTime) / Math.max(gelsNeeded - 1, 1);
    
    for (let i = 0; i < gelsNeeded; i++) {
        const gelTime = firstGelTime + (i * gelInterval);
        const gelNumber = i + 1;
        
        // Check if this should be caffeinated
        let isCaffeinated = false;
        if (caffeineStrategy === 'start' && i === 0) isCaffeinated = true;
        if (caffeineStrategy === 'late' && gelTime >= targetTimeSeconds * 0.6) isCaffeinated = true;
        if (caffeineStrategy === 'throughout' && i % 3 === 0) isCaffeinated = true;
        
        // Find the closest split for this gel time
        const closestSplit = splits.reduce((prev, curr) => {
            return Math.abs(curr.cumulativeTime - gelTime) < Math.abs(prev.cumulativeTime - gelTime) ? curr : prev;
        });
        
        gels.push({
            number: gelNumber,
            time: gelTime,
            timeDisplay: formatTime(gelTime),
            distance: closestSplit.distance,
            isCaffeinated: isCaffeinated,
            splitIndex: splits.indexOf(closestSplit)
        });
    }
    
    // Hydration plan (sip every 15-20 minutes)
    const hydrationInterval = 1200; // 20 minutes
    for (let t = hydrationInterval; t < targetTimeSeconds; t += hydrationInterval) {
        hydration.push({
            time: t,
            timeDisplay: formatTime(t)
        });
    }
    
    // Electrolytes for races over 2 hours
    if (targetTimeSeconds > 7200) {
        const electrolyteInterval = 3600; // Every hour after first hour
        for (let t = 3600; t < targetTimeSeconds; t += electrolyteInterval) {
            electrolytes.push({
                time: t,
                timeDisplay: formatTime(t)
            });
        }
    }
    
    return { gels, hydration, electrolytes, notes: '' };
}

function displayResults(splits, nutritionPlan, avgPace, totalGels, totalCarbs, caffeineStrategy, distanceKm, units) {
    // Update summary cards
    document.getElementById('targetPace').textContent = avgPace + '/' + (units === 'km' ? 'km' : 'mi');
    document.getElementById('totalGels').textContent = totalGels > 0 ? totalGels : 'None needed';
    document.getElementById('totalCarbs').textContent = totalCarbs > 0 ? totalCarbs + 'g' : 'N/A';
    
    let caffeineText = 'None';
    if (caffeineStrategy === 'late' && totalGels > 0) caffeineText = 'Final third';
    if (caffeineStrategy === 'start') caffeineText = 'At start';
    if (caffeineStrategy === 'throughout') caffeineText = 'Every 3rd gel';
    document.getElementById('caffeineTiming').textContent = caffeineText;
    
    // Build table
    const tbody = document.getElementById('planTableBody');
    tbody.innerHTML = '';
    
    const unitLabel = units === 'km' ? 'km' : 'mi';
    
    splits.forEach((split, index) => {
        const row = document.createElement('tr');
        
        // Check for nutrition at this split
        const gelAtSplit = nutritionPlan.gels.find(g => g.splitIndex === index);
        const nutritionBadges = [];
        
        if (gelAtSplit) {
            if (gelAtSplit.isCaffeinated) {
                nutritionBadges.push('<span class="nutrition-badge badge-caffeine">☕ Gel + Caffeine</span>');
            } else {
                nutritionBadges.push('<span class="nutrition-badge badge-gel">🍯 Gel #' + gelAtSplit.number + '</span>');
            }
        }
        
        if (split.isAidStation) {
            nutritionBadges.push('<span class="nutrition-badge badge-water">💧 Water</span>');
        }
        
        // Row classes
        let rowClass = '';
        if (split.milestone) rowClass = 'milestone-row';
        else if (gelAtSplit && gelAtSplit.isCaffeinated) rowClass = 'highlight-row';
        row.className = rowClass;
        
        // Notes
        let notes = [];
        if (split.milestone) notes.push(split.milestone);
        if (split.percentComplete < 0.25) notes.push('Easy start');
        if (split.percentComplete > 0.75 && split.percentComplete < 0.9) notes.push('Stay strong');
        if (split.percentComplete >= 0.9) notes.push('Finish hard!');
        
        row.innerHTML = `
            <td><strong>${split.distanceDisplay} ${unitLabel}</strong></td>
            <td>${formatTime(split.splitTime)}</td>
            <td>${formatTime(split.cumulativeTime)}</td>
            <td>${formatPace(split.pace, units)}/${unitLabel}</td>
            <td>${nutritionBadges.join(' ') || '-'}</td>
            <td>${notes.join(', ') || '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Build nutrition checklist
    const checklist = document.getElementById('nutritionChecklist');
    checklist.innerHTML = '';
    
    if (nutritionPlan.notes) {
        checklist.innerHTML = `<p>${nutritionPlan.notes}</p>`;
    } else {
        nutritionPlan.gels.forEach(gel => {
            const item = document.createElement('div');
            item.className = 'checklist-item' + (gel.isCaffeinated ? ' caffeine' : '');
            item.innerHTML = `
                <span>${gel.isCaffeinated ? '☕' : '🍯'}</span>
                <span>Gel #${gel.number} at <strong>${gel.timeDisplay}</strong> (~${gel.distance.toFixed(1)} ${unitLabel})</span>
            `;
            checklist.appendChild(item);
        });
    }
}

function generateRaceTips(distanceKm, targetTimeSeconds, elevationMeters) {
    const tips = [];
    
    // Distance-specific tips
    if (distanceKm <= 10) {
        tips.push({
            icon: '🚀',
            title: 'Short Race Strategy',
            text: 'For races under 10K, focus on a strong finish. Start controlled, build through the middle, and leave nothing in the tank for the last km.'
        });
    } else if (distanceKm <= 21.0975) {
        tips.push({
            icon: '⚖️',
            title: 'Half Marathon Pacing',
            text: 'Run the first 5K at target pace or slightly slower. The race really starts at 15K - save your energy for when it counts.'
        });
    } else if (distanceKm <= 42.195) {
        tips.push({
            icon: '🎯',
            title: 'Marathon Discipline',
            text: 'The marathon is run in two halves: the first 32km and the last 10km. Run the first half with your head, the second with your heart.'
        });
    } else {
        tips.push({
            icon: '🔋',
            title: 'Ultra Mindset',
            text: 'In ultras, problems will come. When they do, slow down, address the issue, and keep moving. Walking is not failing - stopping is.'
        });
    }
    
    // Nutrition tips
    if (targetTimeSeconds > 5400) { // Over 90 minutes
        tips.push({
            icon: '🍯',
            title: 'Nutrition is Key',
            text: 'Start fueling BEFORE you feel hungry. By the time you feel depleted, it\'s often too late to recover. Stick to your gel schedule.'
        });
    }
    
    // Hydration
    tips.push({
        icon: '💧',
        title: 'Hydration Strategy',
        text: 'Drink to thirst, not to a schedule. Over-hydrating is as dangerous as under-hydrating. Sip, don\'t gulp at aid stations.'
    });
    
    // Elevation tips
    if (elevationMeters > distanceKm * 10) { // Significant elevation
        tips.push({
            icon: '⛰️',
            title: 'Hill Strategy',
            text: 'Shorten your stride on climbs, increase your cadence. On descents, let gravity work but stay controlled to save your quads.'
        });
    }
    
    // Mental tips
    tips.push({
        icon: '🧠',
        title: 'Mental Checkpoints',
        text: 'Break the race into thirds mentally. Focus only on the section you\'re in. "Just get to halfway" then "just get to 3/4" then "finish strong".'
    });
    
    // Display tips
    const tipsContainer = document.getElementById('raceTips');
    tipsContainer.innerHTML = tips.map(tip => `
        <div class="tip-item">
            <span class="tip-icon">${tip.icon}</span>
            <div class="tip-content">
                <h4>${tip.title}</h4>
                <p>${tip.text}</p>
            </div>
        </div>
    `).join('');
}

// Utility functions
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(secondsPerKm, units) {
    let pace = secondsPerKm;
    if (units === 'mi') {
        pace = secondsPerKm * 1.60934;
    }
    
    const mins = Math.floor(pace / 60);
    const secs = Math.round(pace % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function copyPlanToClipboard() {
    const outputSection = document.getElementById('outputSection');
    
    // Build text version
    let text = "RACE DAY PLAN\n";
    text += "=============\n\n";
    
    // Summary
    text += "Target Pace: " + document.getElementById('targetPace').textContent + "\n";
    text += "Total Gels: " + document.getElementById('totalGels').textContent + "\n";
    text += "Total Carbs: " + document.getElementById('totalCarbs').textContent + "\n";
    text += "Caffeine: " + document.getElementById('caffeineTiming').textContent + "\n\n";
    
    // Table
    text += "SPLITS & NUTRITION\n";
    text += "-".repeat(50) + "\n";
    
    const rows = document.querySelectorAll('#planTableBody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const distance = cells[0].textContent;
        const elapsed = cells[2].textContent;
        const pace = cells[3].textContent;
        const nutrition = cells[4].textContent.replace(/\s+/g, ' ').trim();
        
        text += `${distance.padEnd(10)} | ${elapsed.padEnd(10)} | ${pace.padEnd(10)} | ${nutrition}\n`;
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyPlan');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

// === COURSE PRESETS ===

const COURSE_PRESETS = {
    'london-marathon': {
        name: 'London Marathon',
        distance: 42.195,
        elevationGain: 49,
        aidStations: 5,
        notes: 'Fast, flat course. Small rise at miles 3 and 23.',
        tips: [
            'Start in waves — don\'t go out too fast chasing faster groups',
            'Mile 12-13 (Tower Bridge) — crowd energy spike, stay controlled',
            'Mile 21-23 — quiet section through Docklands, mentally prepare'
        ]
    },
    'berlin-marathon': {
        name: 'Berlin Marathon',
        distance: 42.195,
        elevationGain: 40,
        aidStations: 5,
        notes: 'One of the flattest, fastest courses in the world.',
        tips: [
            'PB course — go for it if trained',
            'Tiergarten section (km 35-40) can feel long',
            'Final 2km are fast through Brandenburg Gate — finish strong'
        ]
    },
    'brighton-marathon': {
        name: 'Brighton Marathon',
        distance: 42.195,
        elevationGain: 120,
        aidStations: 5,
        notes: 'Undulating with a tough power station loop. Sea breeze can be a factor.',
        tips: [
            'Don\'t underestimate the power station loop (miles 17-22)',
            'Sea breeze from mile 23 can be a headwind',
            'Great crowd support on the seafront finish'
        ]
    },
    'paris-marathon': {
        name: 'Paris Marathon',
        distance: 42.195,
        elevationGain: 105,
        aidStations: 5,
        notes: 'Beautiful but undulating. Start on Champs-Élysées, finish at Avenue Foch.',
        tips: [
            'Bois de Vincennes (km 25-35) is quiet and exposed — stay focused',
            'Small but punchy hills through the course',
            'Start conservative — it\'s easy to get carried away on the Champs-Élysées'
        ]
    },
    'manchester-marathon': {
        name: 'Manchester Marathon',
        distance: 42.195,
        elevationGain: 80,
        aidStations: 5,
        notes: 'Flat, fast, excellent PB course.',
        tips: [
            'Old Trafford area has great support',
            'Final 5K along the canal — can feel isolated'
        ]
    },
    'sdw100': {
        name: 'South Downs Way 100',
        distance: 161,
        elevationGain: 4100,
        aidStations: 16,
        notes: 'Challenging but runnable. Weather dependent. West to East.',
        tips: [
            'First 30 miles: bank time but don\'t blow up',
            'Washington to Botolphs is exposed — sun/wind',
            'Alfriston (mile 38) is often make-or-break mentally',
            'Queen Elizabeth CP onwards: dig deep, you\'re nearly there'
        ]
    },
    'centurion-ndw100': {
        name: 'North Downs Way 100',
        distance: 166,
        elevationGain: 3400,
        aidStations: 15,
        notes: 'Technical sections, chalky descents. Poles helpful.',
        tips: [
            'Box Hill descent requires care',
            'Navigation easier than SDW100',
            'Night section through Surrey can be lonely'
        ]
    }
};

function loadCoursePreset(courseId) {
    const course = COURSE_PRESETS[courseId];
    if (!course) return;
    
    const distanceSelect = document.getElementById('raceDistance');
    
    // Check if this matches a standard distance
    const standardDistances = {
        42.195: '42.195',
        21.0975: '21.0975',
        50: '50',
        100: '100',
        160.934: '160.934'
    };
    
    if (standardDistances[course.distance]) {
        distanceSelect.value = standardDistances[course.distance];
        document.getElementById('customDistanceGroup').classList.add('hidden');
    } else {
        distanceSelect.value = 'custom';
        document.getElementById('customDistanceGroup').classList.remove('hidden');
        document.getElementById('customDistance').value = course.distance;
    }
    
    // Set elevation
    document.getElementById('elevationGain').value = course.elevationGain;
    document.getElementById('elevationUnit').value = 'm';
    
    // Set aid station interval
    document.getElementById('aidStationInterval').value = course.aidStations;
    
    // Auto-adjust carbs
    const carbsInput = document.getElementById('carbsPerHour');
    if (course.distance <= 21.0975) carbsInput.value = 45;
    else if (course.distance <= 42.195) carbsInput.value = 60;
    else if (course.distance <= 100) carbsInput.value = 75;
    else carbsInput.value = 80;
}

// === URL SHARING ===

function generateShareURL() {
    const params = new URLSearchParams({
        d: document.getElementById('raceDistance').value,
        cd: document.getElementById('customDistance').value || '',
        h: document.getElementById('targetHours').value,
        m: document.getElementById('targetMinutes').value,
        s: document.getElementById('targetSeconds').value,
        u: document.getElementById('units').value,
        e: document.getElementById('elevationGain').value,
        eu: document.getElementById('elevationUnit').value,
        w: document.getElementById('bodyWeight').value,
        wu: document.getElementById('weightUnit').value,
        c: document.getElementById('carbsPerHour').value,
        g: document.getElementById('gelCarbs').value,
        cf: document.getElementById('caffeineStrategy').value,
        ps: document.getElementById('pacingStrategy').value,
        a: document.getElementById('aidStationInterval').value
    });
    
    // Remove empty params
    for (const [key, value] of [...params.entries()]) {
        if (!value) params.delete(key);
    }
    
    return window.location.origin + window.location.pathname + '?' + params.toString();
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('d')) return; // No URL params, skip
    
    if (params.has('d')) {
        document.getElementById('raceDistance').value = params.get('d');
        if (params.get('d') === 'custom' && params.has('cd')) {
            document.getElementById('customDistance').value = params.get('cd');
            document.getElementById('customDistanceGroup').classList.remove('hidden');
        }
    }
    if (params.has('h')) document.getElementById('targetHours').value = params.get('h');
    if (params.has('m')) document.getElementById('targetMinutes').value = params.get('m');
    if (params.has('s')) document.getElementById('targetSeconds').value = params.get('s');
    if (params.has('u')) document.getElementById('units').value = params.get('u');
    if (params.has('e')) document.getElementById('elevationGain').value = params.get('e');
    if (params.has('eu')) document.getElementById('elevationUnit').value = params.get('eu');
    if (params.has('w')) document.getElementById('bodyWeight').value = params.get('w');
    if (params.has('wu')) document.getElementById('weightUnit').value = params.get('wu');
    if (params.has('c')) document.getElementById('carbsPerHour').value = params.get('c');
    if (params.has('g')) document.getElementById('gelCarbs').value = params.get('g');
    if (params.has('cf')) document.getElementById('caffeineStrategy').value = params.get('cf');
    if (params.has('ps')) document.getElementById('pacingStrategy').value = params.get('ps');
    if (params.has('a')) document.getElementById('aidStationInterval').value = params.get('a');
    
    // Auto-generate if URL has enough params
    if (params.has('d') && params.has('h')) {
        generateRacePlan();
    }
}
