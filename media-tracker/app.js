const USERS = ["Andrew", "Tom", "Ross", "Sean"];
const MEDIA_TYPES = ["game", "movie", "book"];

const USER_COLORS = {
    "Andrew": "#FF6B6B",
    "Tom": "#4ECDC4",
    "Ross": "#FFE66D",
    "Sean": "#845EC2"
};

// Google Custom Search config
const GOOGLE_SEARCH_KEY = "AIzaSyA0cwsJVUkP4qu5JAgPGMXvdxOVnI_gZ8E";
const GOOGLE_SEARCH_CX = "d320397d89639490a";

// --- Firebase Setup ---
const firebaseConfig = {
    apiKey: "AIzaSyA0cwsJVUkP4qu5JAgPGMXvdxOVnI_gZ8E",
    authDomain: "x1x1club-tracking.firebaseapp.com",
    databaseURL: "https://x1x1club-tracking-default-rtdb.firebaseio.com",
    projectId: "x1x1club-tracking",
    storageBucket: "x1x1club-tracking.firebasestorage.app",
    messagingSenderId: "743826958343",
    appId: "1:743826958343:web:b09f02da3c2cc160e3a2a2"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// --- Data Management ---
let state = {
    months: [],
    currentMonthId: null,
    viewMode: 'month' // 'month' or 'stats'
};

async function loadData() {
    db.ref('mediaTrackerState/months').on('value', async (snapshot) => {
        const monthsData = snapshot.val();

        if (monthsData) {
            state.months = monthsData;
            // Set current month to the latest if null
            if (!state.currentMonthId && state.months.length > 0) {
                state.currentMonthId = state.months[state.months.length - 1].id;
            }
            render();
        } else {
            // Firebase is empty, attempt to migrate local data up
            const saved = localStorage.getItem('mediaTrackerState');
            if (saved) {
                const parsed = JSON.parse(saved);
                state.months = parsed.months || [];
                db.ref('mediaTrackerState/months').set(state.months);
            } else {
                try {
                    const response = await fetch('data.json');
                    if (response.ok) {
                        const parsedJson = await response.json();
                        state.months = parsedJson.months || [];
                        db.ref('mediaTrackerState/months').set(state.months);
                    }
                } catch (e) {
                    console.log("No initial data found.");
                }
            }
            if (!state.currentMonthId && state.months.length > 0) {
                state.currentMonthId = state.months[state.months.length - 1].id;
            }
            render();
        }
    });
}

function saveData() {
    // Save months to Firebase
    db.ref('mediaTrackerState/months').set(state.months);
}

window.getRatingColor = function (rating) {
    if (!rating && rating !== 0) return 'var(--text-secondary)';
    const r = parseFloat(rating);
    if (r >= 10) return '#4caf50';
    if (r >= 9) return '#8bc34a';
    if (r >= 8) return '#cddc39';
    if (r >= 7) return '#ffeb3b';
    if (r >= 6) return '#ffc107';
    if (r >= 5) return '#ff9800';
    if (r >= 4) return '#ff5722';
    if (r >= 3) return '#f44336';
    if (r >= 2) return '#e91e63';
    return '#9c27b0';
}

// --- DOM Elements ---
const nav = document.getElementById('month-nav');
const adminMenuContainer = document.getElementById('admin-menu-container');
const adminDropdownBtn = document.getElementById('admin-dropdown-btn');
const adminDropdownContent = document.getElementById('admin-dropdown-content');
const addMonthBtn = document.getElementById('add-month-btn');
const deleteMonthBtn = document.getElementById('delete-month-btn');
const newMonthModal = document.getElementById('new-month-modal');
const newMonthForm = document.getElementById('new-month-form');
const cancelNewMonthBtn = document.getElementById('cancel-new-month');
const modeSelect = document.getElementById('month-mode-input');
const dictatorGroup = document.getElementById('dictator-select-group');
const mainContent = document.getElementById('main-content');
const statsBtn = document.getElementById('stats-btn');

// --- Event Listeners ---
if (adminDropdownBtn) {
    adminDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        adminDropdownContent.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!adminMenuContainer.contains(e.target)) {
            adminDropdownContent.classList.add('hidden');
        }
    });
}
deleteMonthBtn.addEventListener('click', () => {
    if (!state.currentMonthId) return;
    const month = state.months.find(m => m.id === state.currentMonthId);
    if (!month) return;

    if (confirm(`Are you sure you want to delete ${month.name}? This action cannot be undone.`)) {
        state.months = state.months.filter(m => m.id !== state.currentMonthId);
        if (state.months.length > 0) {
            state.currentMonthId = state.months[state.months.length - 1].id;
            state.viewMode = 'month';
        } else {
            state.currentMonthId = null;
        }
        saveData();
        render();
    }
});

statsBtn.addEventListener('click', () => {
    state.viewMode = 'stats';
    render();
});

addMonthBtn.addEventListener('click', () => {
    newMonthModal.classList.remove('hidden');
});

cancelNewMonthBtn.addEventListener('click', () => {
    newMonthModal.classList.add('hidden');
    newMonthForm.reset();
    dictatorGroup.classList.add('hidden');
});

modeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'dictator') {
        dictatorGroup.classList.remove('hidden');
    } else {
        dictatorGroup.classList.add('hidden');
    }
});

newMonthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const monthSelect = document.getElementById('month-select-input');
    const yearSelect = document.getElementById('year-select-input');
    const monthName = monthSelect.options[monthSelect.selectedIndex].text;
    const year = yearSelect.value;
    const name = `${monthName} ${year}`;
    const sortKey = parseInt(year) * 100 + parseInt(monthSelect.value);

    // Prevent duplicate months
    if (state.months.some(m => m.name === name)) {
        alert(`The month "${name}" has already been tracked. Please select a different month or year.`);
        return;
    }

    const mode = document.getElementById('month-mode-input').value;
    const dictator = document.getElementById('dictator-name-input').value;

    // Create new month object
    const newMonth = {
        id: Date.now().toString(),
        name: name,
        sortKey: sortKey,
        mode: mode,
        dictator: mode === 'dictator' ? dictator : null,
        globalPicks: mode === 'dictator' ? { game: '', movie: '', book: '' } : null,
        entries: {}
    };

    // Initialize empty entries for all users
    USERS.forEach(user => {
        newMonth.entries[user] = {
            game: { title: mode === 'dictator' ? '' : '', imageUrl: '', rating: '', thoughts: '' },
            movie: { title: mode === 'dictator' ? '' : '', imageUrl: '', rating: '', thoughts: '' },
            book: { title: mode === 'dictator' ? '' : '', imageUrl: '', rating: '', thoughts: '' }
        };
    });

    state.months.push(newMonth);
    state.currentMonthId = newMonth.id;
    saveData();

    newMonthModal.classList.add('hidden');
    newMonthForm.reset();
    dictatorGroup.classList.add('hidden');

    render();
});

// --- Rendering ---
function render() {
    renderNav();
    renderContent();

    if (currentUser === 'Andrew') {
        adminMenuContainer.classList.remove('hidden');
        if (state.viewMode === 'month' && state.months.length > 0) {
            deleteMonthBtn.classList.remove('hidden');
        } else {
            deleteMonthBtn.classList.add('hidden');
        }
    } else {
        adminMenuContainer.classList.add('hidden');
    }
}

function renderNav() {
    nav.innerHTML = '';

    // Sort months chronologically by sortKey for nav
    const sortedMonths = [...state.months].sort((a, b) => {
        // Fallback for old data without sortKey
        const keyA = a.sortKey || parseInt(a.id);
        const keyB = b.sortKey || parseInt(b.id);
        return keyA - keyB;
    });

    const currentMonthIndex = sortedMonths.findIndex(m => m.id === state.currentMonthId);
    if (currentMonthIndex === -1 && sortedMonths.length > 0) return;

    if (sortedMonths.length > 0) {
        const currentMonth = sortedMonths[currentMonthIndex];
        const prevMonth = currentMonthIndex > 0 ? sortedMonths[currentMonthIndex - 1] : null;
        const nextMonth = currentMonthIndex < sortedMonths.length - 1 ? sortedMonths[currentMonthIndex + 1] : null;

        const activeMonthContainer = document.createElement('div');
        activeMonthContainer.style.display = 'flex';
        activeMonthContainer.style.alignItems = 'center';
        activeMonthContainer.style.gap = '0.5rem';

        if (prevMonth) {
            const leftBtn = document.createElement('button');
            leftBtn.innerHTML = '&larr;';
            leftBtn.style.cssText = 'background:transparent; border:none; color:var(--text-secondary); cursor:pointer; padding: 0.5rem; font-size: 1.2rem;';
            leftBtn.onclick = () => {
                state.currentMonthId = prevMonth.id;
                state.viewMode = 'month';
                saveData();
                render();
            };
            activeMonthContainer.appendChild(leftBtn);
        }

        const centerCol = document.createElement('div');
        centerCol.style.display = 'flex';
        centerCol.style.flexDirection = 'column';
        centerCol.style.alignItems = 'center';

        const currA = document.createElement('a');
        currA.className = `nav-link active`;
        currA.textContent = currentMonth.name;
        currA.onclick = () => {
            state.viewMode = 'month';
            render();
        };
        centerCol.appendChild(currA);

        const returnBtn = document.createElement('a');
        returnBtn.textContent = 'Return to Current Month';
        returnBtn.style.cssText = 'font-size: 0.8rem; color: var(--accent); cursor: pointer; text-decoration: underline; margin-top: 0.2rem;';
        returnBtn.onclick = () => {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentM = now.getMonth() + 1;
            const currentSortKey = currentYear * 100 + currentM;
            const target = state.months.find(m => m.sortKey === currentSortKey);
            if (target) {
                state.currentMonthId = target.id;
                state.viewMode = 'month';
                saveData();
                render();
            } else {
                alert("This chronological month hasn't been created yet!");
            }
        };
        centerCol.appendChild(returnBtn);

        activeMonthContainer.appendChild(centerCol);

        if (nextMonth) {
            const rightBtn = document.createElement('button');
            rightBtn.innerHTML = '&rarr;';
            rightBtn.style.cssText = 'background:transparent; border:none; color:var(--text-secondary); cursor:pointer; padding: 0.5rem; font-size: 1.2rem;';
            rightBtn.onclick = () => {
                state.currentMonthId = nextMonth.id;
                state.viewMode = 'month';
                saveData();
                render();
            };
            activeMonthContainer.appendChild(rightBtn);
        }

        nav.appendChild(activeMonthContainer);
    }

    // Historical Months Dropdown Feature
    if (sortedMonths.length > 0) {
        const dropdownContainer = document.createElement('div');
        dropdownContainer.style.position = 'relative';
        dropdownContainer.style.display = 'inline-block';
        dropdownContainer.style.marginLeft = '1rem';

        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'btn-secondary';
        dropdownBtn.style.padding = '0.4rem 0.8rem';
        dropdownBtn.style.fontSize = '0.9rem';
        dropdownBtn.innerHTML = 'Past Months <span style="font-size:0.7em;">▼</span>';

        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'dropdown-content hidden';

        // Add all months except the current one chronologically descending
        const reversedList = [...sortedMonths].reverse();
        reversedList.forEach(m => {
            if (m.id !== state.currentMonthId) {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = m.name;
                item.onclick = () => {
                    state.currentMonthId = m.id;
                    state.viewMode = 'month';
                    dropdownContent.classList.add('hidden');
                    saveData();
                    render();
                };
                dropdownContent.appendChild(item);
            }
        });

        // Toggle dropdown
        dropdownBtn.onclick = (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle('hidden');
        };

        // Close when clicking outside
        document.addEventListener('click', () => {
            dropdownContent.classList.add('hidden');
        }, { once: false });

        dropdownContainer.appendChild(dropdownBtn);
        dropdownContainer.appendChild(dropdownContent);
        nav.appendChild(dropdownContainer);
    }
}

function renderContent() {
    if (state.viewMode === 'stats') {
        renderStats('ALL', 'ALL', 'ALL', 'ALL', 'ALL');
        return;
    }

    if (state.months.length === 0) {
        mainContent.innerHTML = `<div style="text-align:center; padding: 4rem; color:var(--text-secondary);">No months tracked yet. Click "New Month" to start!</div>`;
        return;
    }

    const month = state.months.find(m => m.id === state.currentMonthId);
    if (!month) return;

    const sortedMonths = [...state.months].sort((a, b) => {
        const keyA = a.sortKey || parseInt(a.id);
        const keyB = b.sortKey || parseInt(b.id);
        return keyA - keyB;
    });
    const currentMonthIndex = sortedMonths.findIndex(m => m.id === state.currentMonthId);
    const prevMonth = currentMonthIndex > 0 ? sortedMonths[currentMonthIndex - 1] : null;
    const nextMonth = currentMonthIndex < sortedMonths.length - 1 ? sortedMonths[currentMonthIndex + 1] : null;

    let html = `
        <div class="month-header" style="flex-direction: column; align-items: center; justify-content: center; gap: 1rem;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 1.5rem; width: 100%;">
                ${prevMonth ? `<button class="btn-secondary" style="padding: 0.5rem; border: none;" onclick="state.currentMonthId = '${prevMonth.id}'; saveData(); render();">&larr; Prev</button>` : '<div style="width: 60px;"></div>'}
                <div class="month-title" style="text-align: center; margin: 0;">
                    <h2 style="margin: 0;">${month.name}</h2>
                    <div class="month-meta">
                        ${month.mode === 'regular' ? 'Regular Month' : `Dictator Month (Dictator: ${month.dictator})`}
                    </div>
                </div>
                ${nextMonth ? `<button class="btn-secondary" style="padding: 0.5rem; border: none;" onclick="state.currentMonthId = '${nextMonth.id}'; saveData(); render();">Next &rarr;</button>` : '<div style="width: 60px;"></div>'}
            </div>
            ${month.mode === 'dictator' && currentUser === month.dictator ? `<button class="btn-primary" onclick="showGlobalPicksModal()">Set Dictator Picks</button>` : ''}
        </div>
    `;

    if (month.mode === 'dictator' && (!month.globalPicks || !month.globalPicks.game)) {
        html += `<div style="background: rgba(255, 107, 107, 0.1); border: 1px solid rgba(255, 107, 107, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 2rem; color: #FF6B6B; text-align: center;">Waiting for ${month.dictator} to set the picks for this month.</div>`;
    }

    html += `<div class="user-grid">`;

    USERS.forEach(user => {
        html += `
            <div class="user-card" id="user-card-${user}">
                <div class="user-card-header">
                    <div class="avatar" style="background: ${USER_COLORS[user] || 'var(--card-hover)'};">${user[0]}</div>
                    <div class="user-name">${user}</div>
                    ${currentUser === user ? `<button class="btn-secondary" style="margin-left:auto; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="startEdit('${user}')">Edit</button>` : '<div style="margin-left:auto;"></div>'}
                </div>
                <div class="media-section" id="view-mode-${user}">
                    ${renderMediaItemsForUser(month, user, false)}
                </div>
                <div class="media-section hidden" id="edit-mode-${user}">
                    ${renderMediaItemsForUser(month, user, true)}
                </div>
            </div>
        `;
    });

    html += `</div>
        <div id="global-picks-modal" class="modal hidden">
            <!-- Modal content injected via JS when editing -->
        </div>
        <div id="review-modal" class="modal hidden" style="z-index: 2000;">
            <div class="modal-content glass-panel" style="max-width: 500px; padding: 2rem;">
                <h3 style="margin-top:0;">Thoughts & Review</h3>
                <div id="review-modal-image-container" style="text-align: center; margin-bottom: 1rem; display: none;">
                    <img id="review-modal-image" src="" style="max-width: 150px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);" />
                </div>
                <div id="review-modal-text" style="white-space: pre-wrap; margin: 1rem 0; line-height: 1.5; color: var(--text-color);"></div>
                <div style="text-align: right; margin-top: 1.5rem;">
                    <button class="btn-primary" onclick="document.getElementById('review-modal').classList.add('hidden')">Close</button>
                </div>
            </div>
        </div>
    `;

    mainContent.innerHTML = html;
}

function renderMediaItemsForUser(month, user, isEdit) {
    let output = '';
    const userEntries = month.entries[user];

    MEDIA_TYPES.forEach(type => {
        const entry = userEntries[type];
        // In Dictator Mode, the title comes from Global Picks (except for Dictators filling their own sheet if they want)
        const isDictatorMode = month.mode === 'dictator';
        const globalTitle = isDictatorMode && month.globalPicks ? month.globalPicks[type] : '';
        const globalImage = isDictatorMode && month.globalPicks ? month.globalPicks[type + 'Image'] : '';
        const displayTitle = isDictatorMode ? globalTitle : entry.title;
        const displayImage = isDictatorMode ? (globalImage || entry.imageUrl) : entry.imageUrl;
        const titlePlaceholder = type.charAt(0).toUpperCase() + type.slice(1) + ' Title';

        let extraFields = '';
        let extraDisplay = '';
        if (type === 'book') {
            extraFields = `<input type="text" id="edit-${user}-book-author" value="${entry.author || ''}" placeholder="Author" style="margin-top: 0.5rem;" />`;
            if (entry.author) extraDisplay = `<div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.2rem;">by ${entry.author}</div>`;
        } else if (type === 'game') {
            extraFields = `
                <select id="edit-${user}-game-platform" style="margin-top: 0.5rem; width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                    <option value="" ${!entry.platform ? 'selected' : ''}>Played on...</option>
                    <option value="PC (Keyboard)" ${entry.platform === 'PC (Keyboard)' ? 'selected' : ''}>PC (Keyboard)</option>
                    <option value="PC (Controller)" ${entry.platform === 'PC (Controller)' ? 'selected' : ''}>PC (Controller)</option>
                    <option value="Console - Playstation" ${entry.platform === 'Console - Playstation' ? 'selected' : ''}>Console - Playstation</option>
                    <option value="Console - Nintendo" ${entry.platform === 'Console - Nintendo' ? 'selected' : ''}>Console - Nintendo</option>
                    <option value="Console - Xbox" ${entry.platform === 'Console - Xbox' ? 'selected' : ''}>Console - Xbox</option>
                    <option value="Handheld" ${entry.platform === 'Handheld' ? 'selected' : ''}>Handheld</option>
                    <option value="Multiple" ${entry.platform === 'Multiple' ? 'selected' : ''}>Multiple</option>
                </select>
            `;
            if (entry.platform) extraDisplay = `<div style="font-size:0.85rem; color:var(--accent); margin-top:0.2rem;">🎮 ${entry.platform}</div>`;
        }

        if (isEdit) {
            output += `
                <div class="form-group">
                    <div style="font-size: 0.85rem; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.3rem;">${type}</div>
                    ${isDictatorMode ? `<div style="font-size: 0.9rem; margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 4px;">${globalTitle || 'Wait for Dictator Pick...'}</div>` :
                    `<input type="text" id="edit-${user}-${type}-title" value="${entry.title || ''}" placeholder="${titlePlaceholder}" />`
                }
                    ${extraFields}
                    <div style="display: flex; margin-top: 0.5rem;">
                        <input type="text" id="edit-${user}-${type}-image" value="${displayImage || ''}" placeholder="Cover Image URL (Optional)" style="flex:1; border-top-right-radius: 0; border-bottom-right-radius: 0;" />
                        <button type="button" class="btn-secondary" style="border-top-left-radius: 0; border-bottom-left-radius: 0; padding: 0 1rem; border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);" onclick="autoFetchImage('${user}', '${type}', ${isDictatorMode})" title="Auto-find Image based on Title">🔍 Fetch</button>
                    </div>
                    <input type="number" id="edit-${user}-${type}-rating" value="${entry.rating || ''}" placeholder="Rating (1-10)" min="1" max="10" step="0.5" style="margin-top: 0.5rem;" />
                    <textarea id="edit-${user}-${type}-thoughts" placeholder="Your thoughts..." rows="3" style="margin-top: 0.5rem;">${entry.thoughts || ''}</textarea>
                </div>
            `;
        } else {
            const titleDisplay = displayTitle ? `<strong>${displayTitle}</strong>${extraDisplay}` : `<span style="opacity: 0.3">No ${type} added</span>`;
            output += `
                <div class="user-item">
                    <div class="media-type">${type.toUpperCase()}</div>
                    <div class="media-content">
                        <div class="media-text-content" style="flex: 1;">
                            <div class="media-title-row">
                                <div class="media-title" style="flex:1;">${titleDisplay}</div>
                                ${entry.rating ? `<div class="media-rating" style="color: ${getRatingColor(entry.rating)}; align-self: flex-start;">${entry.rating}/10</div>` : ''}
                            </div>
                            ${entry.thoughts ? `<div style="margin-top:0.5rem;"><a class="read-review-link" style="color:var(--accent); cursor:pointer; font-size: 0.9rem; text-decoration:underline;" onclick="showReviewModal(this)" data-image="${displayImage || ''}" data-thoughts="${entry.thoughts.replace(/"/g, '&quot;')}">Read Review</a></div>` : ''}
                        </div>
                        ${displayImage ? `<img src="${displayImage}" alt="Cover" class="media-thumbnail" style="cursor: zoom-in;" onclick="document.getElementById('image-lightbox-img').src=this.src; document.getElementById('image-lightbox-modal').classList.remove('hidden');" />` : ''}
                    </div>
                </div>
            `;
        }
    });

    if (isEdit) {
        output += `
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn-primary" style="flex:1" onclick="saveEdit('${user}')">Save</button>
                <button class="btn-secondary" style="flex:1" onclick="cancelEdit('${user}')">Cancel</button>
            </div>
        `;
    }

    return output;
}

// --- Interaction Logic ---
window.showReviewModal = function (element) {
    const text = element.getAttribute('data-thoughts');
    const image = element.getAttribute('data-image');
    const modal = document.getElementById('review-modal');

    document.getElementById('review-modal-text').textContent = text;

    const imgContainer = document.getElementById('review-modal-image-container');
    const imgEl = document.getElementById('review-modal-image');
    if (image) {
        imgEl.src = image;
        imgContainer.style.display = 'block';
    } else {
        imgContainer.style.display = 'none';
        imgEl.src = '';
    }

    modal.classList.remove('hidden');
};

window.startEdit = function (user) {
    document.getElementById(`view-mode-${user}`).classList.add('hidden');
    document.getElementById(`edit-mode-${user}`).classList.remove('hidden');
};

window.cancelEdit = function (user) {
    document.getElementById(`view-mode-${user}`).classList.remove('hidden');
    document.getElementById(`edit-mode-${user}`).classList.add('hidden');
};

window.saveEdit = function (user) {
    const month = state.months.find(m => m.id === state.currentMonthId);
    if (!month) return;

    MEDIA_TYPES.forEach(type => {
        if (month.mode === 'regular') {
            month.entries[user][type].title = document.getElementById(`edit-${user}-${type}-title`).value.trim();
        }
        month.entries[user][type].imageUrl = document.getElementById(`edit-${user}-${type}-image`).value.trim();
        month.entries[user][type].rating = document.getElementById(`edit-${user}-${type}-rating`).value;
        month.entries[user][type].thoughts = document.getElementById(`edit-${user}-${type}-thoughts`).value.trim();

        if (type === 'book') {
            const authorEl = document.getElementById(`edit-${user}-book-author`);
            if (authorEl) month.entries[user][type].author = authorEl.value.trim();
        } else if (type === 'game') {
            const platformEl = document.getElementById(`edit-${user}-game-platform`);
            if (platformEl) month.entries[user][type].platform = platformEl.value;
        }
    });

    saveData();
    render();
};

window.showGlobalPicksModal = function () {
    const month = state.months.find(m => m.id === state.currentMonthId);
    if (!month) return;

    const modal = document.getElementById('global-picks-modal');
    modal.innerHTML = `
        <div class="modal-content glass-panel">
            <h2>Set Dictator Picks</h2>
            <div class="form-group">
                <label>Video Game</label>
                <input type="text" id="global-game-title" value="${month.globalPicks.game || ''}" placeholder="Game Title..." />
                <div style="display: flex; margin-top: 0.5rem;">
                    <input type="text" id="global-game-image" value="${month.globalPicks.gameImage || ''}" placeholder="Cover Image URL (Optional)" style="flex:1; border-top-right-radius: 0; border-bottom-right-radius: 0;" />
                    <button type="button" class="btn-secondary" style="border-top-left-radius: 0; border-bottom-left-radius: 0; padding: 0 1rem; border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);" onclick="autoFetchGlobalImage('game')" title="Auto-find Image based on Title">🔍 Fetch</button>
                </div>
            </div>
            <div class="form-group">
                <label>Movie</label>
                <input type="text" id="global-movie-title" value="${month.globalPicks.movie || ''}" placeholder="Movie Title..." />
                <div style="display: flex; margin-top: 0.5rem;">
                    <input type="text" id="global-movie-image" value="${month.globalPicks.movieImage || ''}" placeholder="Cover Image URL (Optional)" style="flex:1; border-top-right-radius: 0; border-bottom-right-radius: 0;" />
                    <button type="button" class="btn-secondary" style="border-top-left-radius: 0; border-bottom-left-radius: 0; padding: 0 1rem; border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);" onclick="autoFetchGlobalImage('movie')" title="Auto-find Image based on Title">🔍 Fetch</button>
                </div>
            </div>
            <div class="form-group">
                <label>Book</label>
                <input type="text" id="global-book-title" value="${month.globalPicks.book || ''}" placeholder="Book Title..." />
                <div style="display: flex; margin-top: 0.5rem;">
                    <input type="text" id="global-book-image" value="${month.globalPicks.bookImage || ''}" placeholder="Cover Image URL (Optional)" style="flex:1; border-top-right-radius: 0; border-bottom-right-radius: 0;" />
                    <button type="button" class="btn-secondary" style="border-top-left-radius: 0; border-bottom-left-radius: 0; padding: 0 1rem; border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);" onclick="autoFetchGlobalImage('book')" title="Auto-find Image based on Title">🔍 Fetch</button>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="document.getElementById('global-picks-modal').classList.add('hidden')">Cancel</button>
                <button class="btn-primary" onclick="saveGlobalPicks()">Save Picks</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.saveGlobalPicks = function () {
    const monthId = state.currentMonthId;
    const month = state.months.find(m => m.id === monthId);
    if (!month) return;

    month.globalPicks.game = document.getElementById('global-game-title').value;
    month.globalPicks.gameImage = document.getElementById('global-game-image').value;
    month.globalPicks.movie = document.getElementById('global-movie-title').value;
    month.globalPicks.movieImage = document.getElementById('global-movie-image').value;
    month.globalPicks.book = document.getElementById('global-book-title').value;
    month.globalPicks.bookImage = document.getElementById('global-book-image').value;

    saveData();
    render();
};

// --- Statistics Rendering ---
function getAllRatings() {
    let ratings = [];
    state.months.forEach(month => {
        USERS.forEach(user => {
            MEDIA_TYPES.forEach(type => {
                const entry = month.entries[user][type];
                if (entry && entry.rating) {
                    let title = entry.title;
                    if (month.mode === 'dictator' && month.globalPicks && month.globalPicks[type]) {
                        title = month.globalPicks[type];
                    }
                    if (title) { // Only include if it has a title and a rating
                        ratings.push({
                            monthId: month.id,
                            monthName: month.name,
                            year: month.name.split(' ').pop(),
                            user: user,
                            type: type,
                            title: title,
                            rating: parseFloat(entry.rating)
                        });
                    }
                }
            });
        });
    });
    return ratings;
}

window.renderStats = function (personFilter = 'ALL', highLowMediaFilter = 'ALL', avgPersonFilter = 'ALL', avgMediaFilter = 'ALL', dictatorMediaFilter = 'ALL', histPersonFilter = null, histMediaFilter = null, highLowYearFilter = 'ALL', histYearFilter = 'ALL', dictatorYearFilter = 'ALL') {
    const ratings = getAllRatings();

    if (histPersonFilter) window.histogramPersonFilter = histPersonFilter;
    if (histMediaFilter) window.histogramMediaFilter = histMediaFilter;
    if (histYearFilter) window.histogramYearFilter = histYearFilter;

    // Filters for High/Low
    let highLowRatings = ratings;
    if (personFilter !== 'ALL') {
        highLowRatings = highLowRatings.filter(r => r.user === personFilter);
    }
    if (highLowMediaFilter !== 'ALL') {
        highLowRatings = highLowRatings.filter(r => r.type === highLowMediaFilter);
    }
    if (highLowYearFilter !== 'ALL') {
        highLowRatings = highLowRatings.filter(r => r.year === highLowYearFilter);
    }

    // Sort into top 5
    const sortedDesc = [...highLowRatings].sort((a, b) => b.rating - a.rating);
    const sortedAsc = [...highLowRatings].sort((a, b) => a.rating - b.rating);
    const top5Highest = sortedDesc.slice(0, 5);
    const top5Lowest = sortedAsc.slice(0, 5);

    // Filter for Averages
    let avgRatings = ratings;
    if (avgPersonFilter !== 'ALL') {
        avgRatings = avgRatings.filter(r => r.user === avgPersonFilter);
    }
    if (avgMediaFilter !== 'ALL') {
        avgRatings = avgRatings.filter(r => r.type === avgMediaFilter);
    }

    let averageScore = 0;
    if (avgRatings.length > 0) {
        const sum = avgRatings.reduce((acc, curr) => acc + curr.rating, 0);
        averageScore = (sum / avgRatings.length).toFixed(1);
    }

    // Dictator Stats Logic
    let bestDictatorItem = null;
    let worstDictatorItem = null;

    state.months.forEach(month => {
        const monthYear = month.name.split(' ').pop();
        if (dictatorYearFilter !== 'ALL' && monthYear !== dictatorYearFilter) return;

        if (month.mode === 'dictator' && month.dictator) {
            MEDIA_TYPES.forEach(type => {
                if (dictatorMediaFilter !== 'ALL' && type !== dictatorMediaFilter) return;

                let itemTotal = 0;
                let itemCount = 0;
                USERS.forEach(user => {
                    const entry = month.entries[user][type];
                    if (entry && entry.rating) {
                        itemTotal += parseFloat(entry.rating);
                        itemCount++;
                    }
                });

                if (itemCount > 0) {
                    const avgScore = itemTotal / itemCount;
                    const itemName = month.globalPicks[type] || 'Unknown Item';

                    if (!bestDictatorItem || avgScore > bestDictatorItem.score) {
                        bestDictatorItem = { dictator: month.dictator, itemName, score: avgScore, type };
                    }
                    if (!worstDictatorItem || avgScore < worstDictatorItem.score) {
                        worstDictatorItem = { dictator: month.dictator, itemName, score: avgScore, type };
                    }
                }
            });
        }
    });

    // Build the user options
    const userOptions = USERS.map(u => `<option value="${u}">${u}</option>`).join('');

    const selPerson = p => p === personFilter ? 'selected' : '';
    const selHighLowMedia = m => m === highLowMediaFilter ? 'selected' : '';
    const selHighLowYear = y => y === highLowYearFilter ? 'selected' : '';
    const selAvgPerson = p => p === avgPersonFilter ? 'selected' : '';
    const selAvgMedia = m => m === avgMediaFilter ? 'selected' : '';
    const selDictatorMedia = m => m === dictatorMediaFilter ? 'selected' : '';
    const selDictatorYear = y => y === dictatorYearFilter ? 'selected' : '';

    const html = `
        <div class="month-header">
            <div class="month-title">
                <h2>1x1x1Club Statistics</h2>
                <div class="month-meta">Aggregated data across all tracked months</div>
            </div>
        </div>

        <div class="user-grid">
            <!-- Top 5 Highest & Lowest Rated Combo -->
            <div class="user-card" style="grid-column: 1 / -1;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                    <h3 style="margin:0;">Highest & Lowest Rated</h3>
                    <div style="display:flex; gap:1rem; flex-wrap: wrap;">
                        <select id="stat-highlow-year" onchange="updateStats()">
                            <option value="ALL" ${selHighLowYear('ALL')}>All Years</option>
                            <option value="2025" ${selHighLowYear('2025')}>2025</option>
                            <option value="2026" ${selHighLowYear('2026')}>2026</option>
                        </select>
                        <select id="stat-highlow-person" onchange="updateStats()">
                            <option value="ALL" ${selPerson('ALL')}>All Members</option>
                            ${userOptions.replace(/value="([^"]+)"/g, (match, p1) => match + (p1 === personFilter ? ' selected' : ''))}
                        </select>
                        <select id="stat-highlow-media" onchange="updateStats()">
                            <option value="ALL" ${selHighLowMedia('ALL')}>All Media Types</option>
                            <option value="game" ${selHighLowMedia('game')}>Games</option>
                            <option value="movie" ${selHighLowMedia('movie')}>Movies</option>
                            <option value="book" ${selHighLowMedia('book')}>Books</option>
                        </select>
                    </div>
                </div>
                
                <div style="display:flex; gap: 2rem; flex-wrap: wrap;">
                    <div style="flex:1; min-width: 280px;">
                        <h4 style="color:var(--text-secondary); margin-bottom:0.8rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem;">Top 5 Highest</h4>
                        ${top5Highest.length > 0 ? top5Highest.map((item, idx) => `
                            <div class="media-item" style="padding: 0.8rem; margin-bottom: 0.5rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <span style="color:var(--text-secondary); font-size:0.8rem; font-weight:bold;">#${idx + 1}</span>
                                        <strong>${item.title}</strong>
                                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;">${item.type.toUpperCase()} • ${item.user} • ${item.monthName}</div>
                                    </div>
                                    <div style="color: ${getRatingColor(item.rating)}; font-weight: 800; font-size: 1.2rem;">${item.rating}</div>
                                </div>
                            </div>
                        `).join('') : '<p>No data available yet.</p>'}
                    </div>
                    
                    <div style="flex:1; min-width: 280px;">
                        <h4 style="color:var(--text-secondary); margin-bottom:0.8rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem;">Top 5 Lowest</h4>
                        ${top5Lowest.length > 0 ? top5Lowest.map((item, idx) => `
                            <div class="media-item" style="padding: 0.8rem; margin-bottom: 0.5rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <span style="color:var(--text-secondary); font-size:0.8rem; font-weight:bold;">#${idx + 1}</span>
                                        <strong>${item.title}</strong>
                                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;">${item.type.toUpperCase()} • ${item.user} • ${item.monthName}</div>
                                    </div>
                                    <div style="color: ${getRatingColor(item.rating)}; font-weight: 800; font-size: 1.2rem;">${item.rating}</div>
                                </div>
                            </div>
                        `).join('') : '<p>No data available yet.</p>'}
                    </div>
                </div>
            </div>

            <!-- Average Scores (Centered) -->
            <div class="user-card" style="grid-column: 1 / -1; max-width: 600px; margin: 0 auto; width: 100%;">
                <h3 style="text-align:center;">Average Score</h3>
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div style="flex:1;">
                        <label style="font-size:0.8rem; color:var(--text-secondary);">Person</label>
                        <select id="stat-avg-person" onchange="updateStats()">
                            <option value="ALL" ${selAvgPerson('ALL')}>All Members</option>
                            ${userOptions.replace(/value="([^"]+)"/g, (match, p1) => match + (p1 === avgPersonFilter ? ' selected' : ''))}
                        </select>
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.8rem; color:var(--text-secondary);">Media Type</label>
                        <select id="stat-avg-media" onchange="updateStats()">
                            <option value="ALL" ${selAvgMedia('ALL')}>All Media</option>
                            <option value="game" ${selAvgMedia('game')}>Games</option>
                            <option value="movie" ${selAvgMedia('movie')}>Movies</option>
                            <option value="book" ${selAvgMedia('book')}>Books</option>
                        </select>
                    </div>
                </div>
                
                <div style="text-align: center; color: ${getRatingColor(averageScore)}; font-weight: 900; font-size: 4rem; line-height: 1; margin: 1.5rem 0; text-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    ${averageScore > 0 ? averageScore : '-'}
                </div>
                <div style="text-align:center; font-size: 0.9rem; color: var(--text-secondary);">
                    Based on ${avgRatings.length} ratings
                </div>
            </div>

            <!-- Chart.js Line Chart -->
            <div class="user-card" style="grid-column: 1 / -1; margin-top: 2rem;">
                <h3 style="text-align:center; margin-bottom: 1rem;">Average Rating Trends Over Time</h3>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="ratingChart"></canvas>
                </div>
            </div>

            <!-- Histogram Chart -->
            <div class="user-card" style="grid-column: 1 / -1; margin-top: 2rem;">
                <h3 style="text-align:center; margin-bottom: 1rem;">Score Frequency Histogram</h3>
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem; justify-content: center;">
                    <div>
                        <label style="font-size:0.8rem; color:var(--text-secondary);">Person</label>
                        <select id="stat-hist-person" onchange="updateStats()">
                            <option value="ALL">All Members</option>
                            ${userOptions}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.8rem; color:var(--text-secondary);">Media</label>
                        <select id="stat-hist-media" onchange="updateStats()">
                            <option value="ALL">All Media</option>
                            <option value="game">Games</option>
                            <option value="movie">Movies</option>
                            <option value="book">Books</option>
                        </select>
                    </div>
                </div>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="histogramChart"></canvas>
                </div>
            </div>
            
            <!-- Dictator Performance -->
            <div class="user-card" style="grid-column: 1 / -1; margin-top: 2rem;">
                <h2 style="text-align:center; margin-bottom: 1rem;">Dictator Performance</h2>
                 <div style="text-align: center; margin-bottom: 2rem; display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
                     <div>
                         <label style="font-size:0.8rem; color:var(--text-secondary); display:block;">Year</label>
                         <select id="stat-dictator-year" onchange="updateStats()">
                             <option value="ALL" ${selDictatorYear('ALL')}>All Years</option>
                             <option value="2025" ${selDictatorYear('2025')}>2025</option>
                             <option value="2026" ${selDictatorYear('2026')}>2026</option>
                         </select>
                     </div>
                     <div>
                         <label style="font-size:0.8rem; color:var(--text-secondary); display:block;">Media Type</label>
                         <select id="stat-dictator-media" onchange="updateStats()">
                             <option value="ALL" ${selDictatorMedia('ALL')}>All Media</option>
                             <option value="game" ${selDictatorMedia('game')}>Games</option>
                             <option value="movie" ${selDictatorMedia('movie')}>Movies</option>
                             <option value="book" ${selDictatorMedia('book')}>Books</option>
                         </select>
                     </div>
                 </div>
                <div style="display: flex; justify-content: center; gap: 4rem; flex-wrap: wrap;">
                    
                    <!-- Benevolent Dictator -->
                    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; max-width: 250px;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/e/eb/Lee_Kuan_Yew_1965_Standard_Restoration.jpg" style="width:120px; height:120px; border-radius:50%; object-fit:cover; margin-bottom:1rem; border: 3px solid #4CAF50;">
                        <h3 style="color:#4CAF50; margin:0;">Benevolent Dictator</h3>
                        <p style="color:var(--text-secondary); font-size:0.9rem; margin-top:0.3rem;">Highest rated global pick</p>
                        ${bestDictatorItem ? `
                            <div style="font-size:1.5rem; font-weight:bold; margin-top:1rem;">${bestDictatorItem.dictator}</div>
                            <div style="font-size:1.1rem; color:var(--text-primary); margin-top:0.5rem; font-weight: 600;">${bestDictatorItem.itemName}</div>
                            <div style="color:var(--text-secondary); margin-top:0.2rem;">${bestDictatorItem.score.toFixed(1)}/10 avg score</div>
                        ` : `<div style="margin-top:1rem; color:var(--text-secondary);">No data yet</div>`}
                    </div>

                    <!-- Evil Dictator -->
                    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; max-width: 250px;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/21/Muammar_al-Gaddafi_at_the_AU_summit.jpg" style="width:120px; height:120px; border-radius:50%; object-fit:cover; margin-bottom:1rem; border: 3px solid #F44336;">
                        <h3 style="color:#F44336; margin:0;">Evil Dictator</h3>
                        <p style="color:var(--text-secondary); font-size:0.9rem; margin-top:0.3rem;">Lowest rated global pick</p>
                        ${worstDictatorItem ? `
                            <div style="font-size:1.5rem; font-weight:bold; margin-top:1rem;">${worstDictatorItem.dictator}</div>
                            <div style="font-size:1.1rem; color:var(--text-primary); margin-top:0.5rem; font-weight: 600;">${worstDictatorItem.itemName}</div>
                            <div style="color:var(--text-secondary); margin-top:0.2rem;">${worstDictatorItem.score.toFixed(1)}/10 avg score</div>
                        ` : `<div style="margin-top:1rem; color:var(--text-secondary);">No data yet</div>`}
                    </div>

                </div>
            </div>

        </div>
    `;

    mainContent.innerHTML = html;

    // Initialize Chart.js
    setTimeout(() => {
        const ctx = document.getElementById('ratingChart');
        if (ctx && window.Chart) {
            // Sort state.months by sortKey chronologically
            const chronologicalMonths = [...state.months].sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
            const labels = chronologicalMonths.map(m => m.name);

            // Chart Colors matching the users
            const chartColors = USER_COLORS;

            const datasets = USERS.map(user => {
                const dataPoints = chronologicalMonths.map(month => {
                    let totalRating = 0;
                    let count = 0;

                    MEDIA_TYPES.forEach(type => {
                        const entry = month.entries[user]?.[type];
                        if (entry && entry.rating) {
                            totalRating += parseFloat(entry.rating);
                            count++;
                        }
                    });

                    return count > 0 ? (totalRating / count).toFixed(1) : null;
                });

                return {
                    label: user,
                    data: dataPoints,
                    borderColor: chartColors[user] || '#ffffff',
                    backgroundColor: chartColors[user] || '#ffffff',
                    tension: 0.3,
                    spanGaps: true
                };
            });

            // Destroy previous chart instance if it exists to prevent overlap
            if (window.myRatingChart) {
                window.myRatingChart.destroy();
            }

            window.myRatingChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#e6edf3' } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 10,
                            ticks: { color: '#8b949e' },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        },
                        x: {
                            ticks: { color: '#8b949e' },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        }
                    }
                },
                plugins: [{
                    id: 'dictatorLines',
                    beforeDraw(chart, args, options) {
                        const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
                        chart.data.labels.forEach((label, index) => {
                            const monthInfo = chronologicalMonths[index];
                            if (monthInfo && monthInfo.mode === 'dictator' && monthInfo.dictator) {
                                const xPos = x.getPixelForTick(index);
                                ctx.save();
                                ctx.beginPath();
                                ctx.strokeStyle = USER_COLORS[monthInfo.dictator] || '#ffffff';
                                ctx.lineWidth = 2;
                                ctx.setLineDash([5, 5]);
                                ctx.moveTo(xPos, top);
                                ctx.lineTo(xPos, bottom);
                                ctx.stroke();
                                ctx.restore();
                            }
                        });
                    }
                }]
            });

            // Render Histogram
            const histCtx = document.getElementById('histogramChart');
            if (histCtx) {
                const histPersonF = document.getElementById('stat-hist-person');
                const histMediaF = document.getElementById('stat-hist-media');
                const histYearF = document.getElementById('stat-hist-year');

                if (histPersonF && window.histogramPersonFilter) {
                    histPersonF.value = window.histogramPersonFilter;
                }
                if (histMediaF && window.histogramMediaFilter) {
                    histMediaF.value = window.histogramMediaFilter;
                }
                if (histYearF && window.histogramYearFilter) {
                    histYearF.value = window.histogramYearFilter;
                }

                const histPerson = histPersonF ? histPersonF.value : 'ALL';
                const histMedia = histMediaF ? histMediaF.value : 'ALL';
                const histYear = histYearF ? histYearF.value : 'ALL';

                window.histogramPersonFilter = histPerson;
                window.histogramMediaFilter = histMedia;
                window.histogramYearFilter = histYear;

                let histRatings = ratings;
                if (histPerson !== 'ALL') histRatings = histRatings.filter(r => r.user === histPerson);
                if (histMedia !== 'ALL') histRatings = histRatings.filter(r => r.type === histMedia);
                if (histYear !== 'ALL') histRatings = histRatings.filter(r => r.year === histYear);

                const scoreCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };

                histRatings.forEach(r => {
                    const rounded = Math.round(r.rating);
                    if (rounded >= 1 && rounded <= 10) {
                        scoreCounts[rounded]++;
                    }
                });

                const histData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => scoreCounts[s]);
                const histColors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => getRatingColor(s));

                if (window.myHistogramChart) {
                    window.myHistogramChart.destroy();
                }

                window.myHistogramChart = new Chart(histCtx, {
                    type: 'bar',
                    data: {
                        labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                        datasets: [{
                            label: 'Frequency',
                            data: histData,
                            backgroundColor: histColors,
                            borderColor: histColors,
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#8b949e', stepSize: 1 },
                                grid: { color: 'rgba(255,255,255,0.05)' }
                            },
                            x: {
                                ticks: { color: '#8b949e' },
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        }
    }, 100);
};

window.updateStats = function () {
    const personF = document.getElementById('stat-highlow-person').value;
    const highLowMediaF = document.getElementById('stat-highlow-media').value;
    const avgPersonF = document.getElementById('stat-avg-person').value;
    const avgMediaF = document.getElementById('stat-avg-media').value;
    const dictatorMediaF = document.getElementById('stat-dictator-media').value;

    const histPersonElem = document.getElementById('stat-hist-person');
    const histMediaElem = document.getElementById('stat-hist-media');
    const histPersonF = histPersonElem ? histPersonElem.value : null;
    const histMediaF = histMediaElem ? histMediaElem.value : null;

    const highLowYearElem = document.getElementById('stat-highlow-year');
    const highLowYearF = highLowYearElem ? highLowYearElem.value : 'ALL';

    const histYearElem = document.getElementById('stat-hist-year');
    const histYearF = histYearElem ? histYearElem.value : 'ALL';

    const dictatorYearElem = document.getElementById('stat-dictator-year');
    const dictatorYearF = dictatorYearElem ? dictatorYearElem.value : 'ALL';

    renderStats(personF, highLowMediaF, avgPersonF, avgMediaF, dictatorMediaF, histPersonF, histMediaF, highLowYearF, histYearF, dictatorYearF);
};

// --- Authentication ---
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.querySelector('.app-container');
const headerUsernameLabel = document.getElementById('header-username-label');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = localStorage.getItem('mediaTrackerUser');

window.attemptLogin = function () {
    const userInp = document.getElementById('login-username').value.trim();
    const pwdInp = document.getElementById('login-password').value;

    if (!userInp) {
        alert('Please enter your name.');
        return;
    }

    const formattedUser = userInp.charAt(0).toUpperCase() + userInp.slice(1).toLowerCase();

    if (!USERS.includes(formattedUser)) {
        alert('Invalid user. ');
        return;
    }

    if (pwdInp !== 'LPP') {
        alert('Incorrect password!');
        return;
    }

    currentUser = formattedUser;

    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';

    localStorage.setItem('mediaTrackerUser', currentUser);
    loginOverlay.style.display = 'none';
    appContainer.style.display = 'block';
    headerUsernameLabel.textContent = `User: ${currentUser}`;
    render();
};

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('mediaTrackerUser');
    appContainer.style.display = 'none';
    loginOverlay.style.display = 'flex';
});

if (currentUser) {
    loginOverlay.style.display = 'none';
    appContainer.style.display = 'block';
    headerUsernameLabel.textContent = `User: ${currentUser}`;
}

// Initial load
loadData();

// --- Scroll Behavior ---
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
    const header = document.querySelector('.glass-header');
    if (!header) return;

    if (window.scrollY > lastScrollY && window.scrollY > 100) {
        // Scrolling down
        header.classList.add('hidden-scroll');
    } else {
        // Scrolling up
        header.classList.remove('hidden-scroll');
    }
    lastScrollY = window.scrollY;
});

// --- Image Auto-Fetch ---
window.autoFetchImage = async function (user, type, isDictatorMode) {
    let title = '';
    if (isDictatorMode) {
        const month = state.months.find(m => m.id === state.currentMonthId);
        title = month.globalPicks[type];
    } else {
        const titleEl = document.getElementById(`edit-${user}-${type}-title`);
        title = titleEl ? titleEl.value.trim() : '';
    }

    const imageEl = document.getElementById(`edit-${user}-${type}-image`);

    if (!title) {
        alert("Please enter a title first to search for an image.");
        return;
    }

    // For books, optionally append author to narrow the search
    let bookQuery = encodeURIComponent(title);
    if (type === 'book' && !isDictatorMode) {
        const authorEl = document.getElementById(`edit-${user}-book-author`);
        if (authorEl && authorEl.value.trim()) {
            bookQuery += '+' + encodeURIComponent(authorEl.value.trim());
        }
    }

    const originalPlaceholder = imageEl.placeholder;
    imageEl.placeholder = "Searching for images...";

    let imageUrls = [];

    try {
        // --- Primary: Google Custom Image Search ---
        try {
            const q = type === 'book' ? bookQuery : encodeURIComponent(title + ' ' + type + ' cover');
            const googleRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_KEY}&cx=${GOOGLE_SEARCH_CX}&searchType=image&q=${q}&num=10`);
            const googleData = await googleRes.json();
            if (googleData.items) {
                googleData.items.forEach(item => {
                    if (item.link) imageUrls.push(item.link);
                });
            }
        } catch (e) { console.warn('Google image search failed, using fallbacks.', e); }

        if (type === 'book') {
            const res = await fetch(`https://openlibrary.org/search.json?q=${bookQuery}&limit=10`);
            const data = await res.json();
            if (data.docs) {
                data.docs.forEach(doc => {
                    if (doc.cover_i && !imageUrls.includes(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`)) {
                        imageUrls.push(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`);
                    }
                });
            }
        } else if (type === 'movie') {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=movie&limit=10`);
            const data = await res.json();
            if (data.results) {
                data.results.forEach(r => {
                    if (r.artworkUrl100) {
                        imageUrls.push(r.artworkUrl100.replace('100x100bb', '600x600bb'));
                    }
                });
            }

            // Supplement with Wikipedia
            try {
                const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(title + ' film')}&gsrlimit=5&prop=pageimages&pithumbsize=500&format=json&origin=*`);
                const wikiData = await wikiRes.json();
                if (wikiData.query && wikiData.query.pages) {
                    Object.values(wikiData.query.pages).forEach(p => {
                        if (p.thumbnail && p.thumbnail.source) imageUrls.push(p.thumbnail.source);
                    });
                }
            } catch (e) { }

        } else if (type === 'game') {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=software&limit=5`);
            const data = await res.json();
            if (data.results) {
                data.results.forEach(r => {
                    let url = r.artworkUrl512 || r.artworkUrl100;
                    if (url) imageUrls.push(url);
                });
            }

            // Supplement with Wikipedia
            try {
                const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(title + ' video game')}&gsrlimit=5&prop=pageimages&pithumbsize=500&format=json&origin=*`);
                const wikiData = await wikiRes.json();
                if (wikiData.query && wikiData.query.pages) {
                    Object.values(wikiData.query.pages).forEach(p => {
                        if (p.thumbnail && p.thumbnail.source) imageUrls.push(p.thumbnail.source);
                    });
                }
            } catch (e) { }
        }

        // Remove duplicates
        imageUrls = [...new Set(imageUrls)];

        if (imageUrls.length > 0) {
            showImageSelectModal(imageUrls, imageEl.id);
        } else {
            alert(`Couldn't find automatic images for "${title}". You may need to paste a URL manually.`);
        }
    } catch (e) {
        console.error("Error auto-fetching image:", e);
        alert("There was an error trying to fetch the image. Please try manually.");
    } finally {
        imageEl.placeholder = originalPlaceholder;
    }
};

window.showImageSelectModal = function (urls, targetInputId) {
    const modal = document.getElementById('image-select-modal');
    const grid = document.getElementById('image-select-grid');
    grid.innerHTML = '';

    urls.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width: 100%; height: 180px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: border 0.2s ease;';
        img.onmouseover = () => img.style.borderColor = 'var(--accent)';
        img.onmouseout = () => img.style.borderColor = 'transparent';
        img.onclick = () => {
            document.getElementById(targetInputId).value = url;
            modal.classList.add('hidden');
        };
        grid.appendChild(img);
    });

    modal.classList.remove('hidden');
};

window.autoFetchGlobalImage = async function (type) {
    const titleEl = document.getElementById(`global-${type}-title`);
    const title = titleEl ? titleEl.value.trim() : '';

    const imageEl = document.getElementById(`global-${type}-image`);

    if (!title) {
        alert("Please enter a title first to search for an image.");
        return;
    }

    // For global book search, check if author title field has content
    let bookQuery = encodeURIComponent(title);
    if (type === 'book') {
        // Try to grab author from the title element label context
        const authorEl = document.querySelector('#global-book-image');
        // We just use the title itself here since global picks don't have a dedicated author field
    }

    const originalPlaceholder = imageEl.placeholder;
    imageEl.placeholder = "Searching for images...";

    let imageUrls = [];

    try {
        // --- Primary: Google Custom Image Search ---
        try {
            const q = encodeURIComponent(title + ' ' + type + ' cover');
            const googleRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_KEY}&cx=${GOOGLE_SEARCH_CX}&searchType=image&q=${q}&num=10`);
            const googleData = await googleRes.json();
            if (googleData.items) {
                googleData.items.forEach(item => {
                    if (item.link) imageUrls.push(item.link);
                });
            }
        } catch (e) { console.warn('Google image search failed, using fallbacks.', e); }

        if (type === 'book') {
            const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=10`);
            const data = await res.json();
            if (data.docs) {
                data.docs.forEach(doc => {
                    if (doc.cover_i && !imageUrls.includes(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`)) {
                        imageUrls.push(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`);
                    }
                });
            }
        } else if (type === 'movie') {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=movie&limit=10`);
            const data = await res.json();
            if (data.results) {
                data.results.forEach(r => {
                    if (r.artworkUrl100) {
                        imageUrls.push(r.artworkUrl100.replace('100x100bb', '600x600bb'));
                    }
                });
            }
            try {
                const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(title + ' film')}&gsrlimit=5&prop=pageimages&pithumbsize=500&format=json&origin=*`);
                const wikiData = await wikiRes.json();
                if (wikiData.query && wikiData.query.pages) {
                    Object.values(wikiData.query.pages).forEach(p => {
                        if (p.thumbnail && p.thumbnail.source) imageUrls.push(p.thumbnail.source);
                    });
                }
            } catch (e) { }
        } else if (type === 'game') {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=software&limit=5`);
            const data = await res.json();
            if (data.results) {
                data.results.forEach(r => {
                    let url = r.artworkUrl512 || r.artworkUrl100;
                    if (url) imageUrls.push(url);
                });
            }
            try {
                const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(title + ' video game')}&gsrlimit=5&prop=pageimages&pithumbsize=500&format=json&origin=*`);
                const wikiData = await wikiRes.json();
                if (wikiData.query && wikiData.query.pages) {
                    Object.values(wikiData.query.pages).forEach(p => {
                        if (p.thumbnail && p.thumbnail.source) imageUrls.push(p.thumbnail.source);
                    });
                }
            } catch (e) { }
        }

        imageUrls = [...new Set(imageUrls)];

        if (imageUrls.length > 0) {
            showImageSelectModal(imageUrls, imageEl.id);
        } else {
            alert(`Couldn't find automatic images for "${title}". You may need to paste a URL manually.`);
        }
    } catch (e) {
        console.error("Error auto-fetching image:", e);
        alert("There was an error trying to fetch the image. Please try manually.");
    } finally {
        imageEl.placeholder = originalPlaceholder;
    }
};
