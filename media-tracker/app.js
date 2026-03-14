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

function getDefaultMonthId(months) {
    if (!months || months.length === 0) return null;
    const now = new Date();
    const currentSortKey = now.getFullYear() * 100 + (now.getMonth() + 1);
    const match = months.find(m => m.sortKey === currentSortKey);
    if (match) return match.id;
    // Fallback: most recent month
    const sorted = [...months].sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0));
    return sorted[0].id;
}

async function loadData() {
    db.ref('mediaTrackerState/months').on('value', async (snapshot) => {
        const monthsData = snapshot.val();

        if (monthsData) {
            state.months = monthsData;
            // Set current month to the current calendar month (or most recent as fallback)
            if (!state.currentMonthId && state.months.length > 0) {
                state.currentMonthId = getDefaultMonthId(state.months);
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
                state.currentMonthId = getDefaultMonthId(state.months);
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
            const authorGender = entry.authorGender || '';
            const authorColor = authorGender === 'F' ? '#f472b6' : authorGender === 'M' ? '#60a5fa' : 'var(--text-secondary)';
            extraFields = `
                <input type="text" id="edit-${user}-book-author" value="${entry.author || ''}" placeholder="Author name" style="margin-top: 0.5rem;" />
                <select id="edit-${user}-book-gender" style="margin-top: 0.4rem;">
                    <option value="" ${!authorGender ? 'selected' : ''}>Author Gender?</option>
                    <option value="M" ${authorGender === 'M' ? 'selected' : ''}>Male</option>
                    <option value="F" ${authorGender === 'F' ? 'selected' : ''}>Female</option>
                </select>`;
            if (entry.author) extraDisplay = `<div style="font-size:0.85rem; color:${authorColor}; margin-top:0.2rem;">✍ ${entry.author}</div>`;
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
            const genderEl = document.getElementById(`edit-${user}-book-gender`);
            if (authorEl) month.entries[user][type].author = authorEl.value.trim();
            if (genderEl) month.entries[user][type].authorGender = genderEl.value;
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
                <input type="text" id="global-book-author" value="${month.globalPicks.bookAuthor || ''}" placeholder="Author name" style="margin-top: 0.5rem;" />
                <select id="global-book-gender" style="margin-top: 0.4rem;">
                    <option value="" ${!month.globalPicks.bookAuthorGender ? 'selected' : ''}>Author Gender?</option>
                    <option value="M" ${month.globalPicks.bookAuthorGender === 'M' ? 'selected' : ''}>Male</option>
                    <option value="F" ${month.globalPicks.bookAuthorGender === 'F' ? 'selected' : ''}>Female</option>
                </select>
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
    const bookAuthorEl = document.getElementById('global-book-author');
    const bookGenderEl = document.getElementById('global-book-gender');
    if (bookAuthorEl) month.globalPicks.bookAuthor = bookAuthorEl.value.trim();
    if (bookGenderEl) month.globalPicks.bookAuthorGender = bookGenderEl.value;

    saveData();
    render();
};

// Admin-only: one-click seed function to patch historical Firebase data with authorGender
window.seedAuthorGenderData = function () {
    if (!confirm('This will patch all existing book entries in Firebase with known author/gender data. Run it once only. Proceed?')) return;

    // Complete mapping of book title → { author, gender }
    const BOOK_GENDER_MAP = {
        // Regular months (per-user entries) — title is the key
        "Old Man's War": { author: "John Scalzi", gender: "M" },
        "Leviathan Wakes": { author: "James S.A. Corey", gender: "M" },
        "Nevernight": { author: "Jay Kristoff", gender: "M" },
        "Educated": { author: "Tara Westover", gender: "F" },
        "Pay Any Price": { author: "James Risen", gender: "M" },
        "The Way of Kings": { author: "Brandon Sanderson", gender: "M" },
        "The Shadow of the Gods": { author: "John Gwynne", gender: "M" },
        "The Fellowship of the Ring": { author: "J.R.R. Tolkien", gender: "M" },
        "The Two Towers": { author: "J.R.R. Tolkien", gender: "M" },
        "The Return of the King": { author: "J.R.R. Tolkien", gender: "M" },
        "Dungeon Crawler Carl": { author: "Matt Dinniman", gender: "M" },
        "Sapiens": { author: "Yuval Noah Harari", gender: "M" },
        "Five Total Strangers": { author: "Natalie D. Richards", gender: "F" },
        "The Woman in the Window": { author: "A.J. Finn", gender: "M" },
        "I, Claudius": { author: "Robert Graves", gender: "M" },
        "American War": { author: "Omar El Akkad", gender: "M" },
        "With the Old Breed": { author: "Eugene Sledge", gender: "M" },
        "The Pillars of the Earth": { author: "Ken Follett", gender: "M" },
        "All the Demons Are Here": { author: "Jake Tapper", gender: "M" },
        "Razorblade Tears": { author: "S.A. Cosby", gender: "M" },
        "In Other Lands": { author: "Sarah Rees Brennan", gender: "F" },
        "The House in the Cerulean Sea": { author: "TJ Klune", gender: "M" },
        "A Prayer for Owen Meany": { author: "John Irving", gender: "M" },
        "Jurassic Park": { author: "Michael Crichton", gender: "M" },
        "Snowblind": { author: "Christopher Golden", gender: "M" },
        "The Blade Itself": { author: "Joe Abercrombie", gender: "M" },
        "The Lies of Locke Lamora": { author: "Scott Lynch", gender: "M" },
        // Dictator month global picks — title is the key
        "The Left Hand of Darkness": { author: "Ursula K. Le Guin", gender: "F" },
        "Left Hand of Darkness": { author: "Ursula K. Le Guin", gender: "F" },
        "The Fifth Season": { author: "N.K. Jemisin", gender: "F" },
        "City of Inmates": { author: "Kelly Lytle Hernández", gender: "F" },
        "Frankenstein": { author: "Mary Shelley", gender: "F" },
        "The Plot": { author: "Jean Hanff Korelitz", gender: "F" },
        "The Guns of August": { author: "Barbara Tuchman", gender: "F" },
        "Tomorrow, and Tomorrow, and Tomorrow": { author: "Gabrielle Zevin", gender: "F" },
        // Alt spellings
        "Tomorrow and Tomorrow and Tomorrow": { author: "Gabrielle Zevin", gender: "F" },
        "Freefall": { author: "Chris Miller", gender: "M" },
        "The Crusades": { author: "Thomas Asbridge", gender: "M" },
        "The Fault in Our Stars": { author: "John Green", gender: "M" },
        "Burr": { author: "Gore Vidal", gender: "M" },
        "Five Strangers": { author: "Natalie D. Richards", gender: "F" },
    };

    let patchCount = 0;

    state.months.forEach((month, mIdx) => {
        // Handle dictator-month globalPicks
        if (month.mode === 'dictator' && month.globalPicks && month.globalPicks.book) {
            const book = month.globalPicks.book;
            const match = BOOK_GENDER_MAP[book];
            if (match && !month.globalPicks.bookAuthorGender) {
                month.globalPicks.bookAuthor = match.author;
                month.globalPicks.bookAuthorGender = match.gender;
                patchCount++;
            }
        }

        // Handle regular-month per-user entries
        USERS.forEach(user => {
            const entry = month.entries?.[user]?.book;
            if (!entry) return;
            const title = entry.title;
            if (!title) return;
            const match = BOOK_GENDER_MAP[title];
            if (match && !entry.authorGender) {
                entry.author = entry.author || match.author;
                entry.authorGender = match.gender;
                patchCount++;
            }
        });
    });

    saveData();
    render();
    alert(`Done! Patched ${patchCount} book entries with author gender data.`);
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
                    if (title) {
                        // Author info: for dictator months, look at globalPicks; for regular, look at entry
                        let author = '';
                        let authorGender = '';
                        if (type === 'book') {
                            if (month.mode === 'dictator' && month.globalPicks) {
                                author = month.globalPicks.bookAuthor || entry.author || '';
                                authorGender = month.globalPicks.bookAuthorGender || entry.authorGender || '';
                            } else {
                                author = entry.author || '';
                                authorGender = entry.authorGender || '';
                            }
                        }
                        ratings.push({
                            monthId: month.id,
                            monthName: month.name,
                            year: month.name.split(' ').pop(),
                            user: user,
                            type: type,
                            title: title,
                            rating: parseFloat(entry.rating),
                            author: author,
                            authorGender: authorGender
                        });
                    }
                }
            });
        });
    });
    return ratings;
}

window.renderStats = function (personFilter = 'ALL', highLowMediaFilter = 'ALL', avgPersonFilter = 'ALL', avgMediaFilter = 'ALL', dictatorMediaFilter = 'ALL', histPersonFilter = null, histMediaFilter = null, highLowYearFilter = 'ALL', histYearFilter = 'ALL', dictatorYearFilter = 'ALL', genderPersonFilter = 'ALL') {
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

            <!-- Books by Author Gender -->
            <div class="user-card" style="grid-column: 1 / -1; margin-top: 2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.2rem;">
                    <h3 style="margin:0;">📚 Books by Author Gender</h3>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <label style="font-size:0.8rem; color:var(--text-secondary);">Person</label>
                        <select id="stat-gender-person" onchange="updateStats()">
                            <option value="ALL" ${genderPersonFilter === 'ALL' ? 'selected' : ''}>All Members</option>
                            ${USERS.map(u => `<option value="${u}" ${genderPersonFilter === u ? 'selected' : ''}>${u}</option>`).join('')}
                        </select>
                    </div>
                </div>
                ${(() => {
                    let bookRatings = ratings.filter(r => r.type === 'book');
                    if (genderPersonFilter !== 'ALL') bookRatings = bookRatings.filter(r => r.user === genderPersonFilter);

                    const femaleRatings = bookRatings.filter(r => r.authorGender === 'F');
                    const maleRatings = bookRatings.filter(r => r.authorGender === 'M');
                    const femaleCount = femaleRatings.length;
                    const maleCount = maleRatings.length;
                    const unknownCount = bookRatings.filter(r => !r.authorGender).length;
                    const total = femaleCount + maleCount + unknownCount;

                    if (total === 0) return '<p style="color:var(--text-secondary);">No book data available yet.</p>';

                    const femalePct = Math.round((femaleCount / total) * 100);
                    const malePct = Math.round((maleCount / total) * 100);
                    const unknownPct = 100 - femalePct - malePct;

                    const femaleAvg = femaleCount > 0 ? (femaleRatings.reduce((s, r) => s + r.rating, 0) / femaleCount).toFixed(1) : null;
                    const maleAvg = maleCount > 0 ? (maleRatings.reduce((s, r) => s + r.rating, 0) / maleCount).toFixed(1) : null;

                    let gradientStops = '';
                    let cursor = 0;
                    if (femaleCount > 0) { gradientStops += `#f472b6 ${cursor}% ${cursor + femalePct}%, `; cursor += femalePct; }
                    if (maleCount > 0) { gradientStops += `#60a5fa ${cursor}% ${cursor + malePct}%, `; cursor += malePct; }
                    if (unknownPct > 0) { gradientStops += `rgba(255,255,255,0.12) ${cursor}% 100%`; }
                    else { gradientStops = gradientStops.slice(0, -2); }

                    const femaleBooks = [...new Set(femaleRatings.map(r => r.title))];
                    const maleBooks = [...new Set(maleRatings.map(r => r.title))];

                    return `
                        <div style="display:flex; gap:2.5rem; align-items:center; flex-wrap:wrap;">
                            <div style="position:relative; width:160px; height:160px; flex:0 0 auto;">
                                <div style="width:160px; height:160px; border-radius:50%; background:conic-gradient(${gradientStops}); box-shadow:0 0 24px rgba(0,0,0,0.4);"></div>
                                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:80px; height:80px; border-radius:50%; background:var(--card-bg,#0d1117); display:flex; flex-direction:column; align-items:center; justify-content:center;">
                                    <div style="font-size:1.4rem; font-weight:800;">${total}</div>
                                    <div style="font-size:0.6rem; color:var(--text-secondary);">books</div>
                                </div>
                            </div>
                            <div style="flex:1; min-width:220px; display:flex; flex-direction:column; gap:1rem;">
                                <div>
                                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.3rem;">
                                        <div style="width:12px;height:12px;border-radius:3px;background:#f472b6;"></div>
                                        <span style="font-weight:700; color:#f472b6;">Female Authors</span>
                                        <span style="margin-left:auto; font-weight:700; font-size:1.1rem;">${femaleCount} <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:400;">(${femalePct}%)</span></span>
                                        ${femaleAvg ? `<span style="background:rgba(244,114,182,0.15); color:#f472b6; border-radius:6px; padding:0.1rem 0.5rem; font-size:0.85rem; font-weight:600;">avg ${femaleAvg}</span>` : ''}
                                    </div>
                                    ${femaleBooks.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-secondary); padding-left:20px;">${femaleBooks.join(' · ')}</div>` : ''}
                                </div>
                                <div>
                                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.3rem;">
                                        <div style="width:12px;height:12px;border-radius:3px;background:#60a5fa;"></div>
                                        <span style="font-weight:700; color:#60a5fa;">Male Authors</span>
                                        <span style="margin-left:auto; font-weight:700; font-size:1.1rem;">${maleCount} <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:400;">(${malePct}%)</span></span>
                                        ${maleAvg ? `<span style="background:rgba(96,165,250,0.15); color:#60a5fa; border-radius:6px; padding:0.1rem 0.5rem; font-size:0.85rem; font-weight:600;">avg ${maleAvg}</span>` : ''}
                                    </div>
                                    ${maleBooks.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-secondary); padding-left:20px;">${maleBooks.slice(0,10).join(' · ')}${maleBooks.length > 10 ? ` +${maleBooks.length-10} more` : ''}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                })()}
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

    const genderPersonElem = document.getElementById('stat-gender-person');
    const genderPersonF = genderPersonElem ? genderPersonElem.value : 'ALL';

    renderStats(personF, highLowMediaF, avgPersonF, avgMediaF, dictatorMediaF, histPersonF, histMediaF, highLowYearF, histYearF, dictatorYearF, genderPersonF);
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

// ===== BADGE SYSTEM =====

const BOOK_PAGE_COUNTS = {
    'lock in': 336, 'locked in': 336, 'lock in (john scalzi)': 336,
    'the mercy of gods': 304, 'empire of the damned': 416, 'the last honest man': 336,
    'educated': 352,
    'the way of kings': 1007, 'the way of kings (the stormlight archive)': 1007,
    'fury of the gods': 320, 'left hand of darkness': 296, 'the left hand of darkness': 296,
    'dungeon crawler carl': 464,
    'nexus: a brief history of information networks from the stone age to ai': 448, 'nexus': 448,
    'words of radiance': 1087,
    'the kind worth killing': 352, 'claudius the god': 488,
    'american war': 352, 'with the old blood': 326, 'with the old breed': 326,
    'pillars of the earth': 992, 'the pillars of the earth': 992,
    'original sin': 352,
    'the fifth season': 468, 'the fifth season (n.k. jemisin)': 468,
    'bad mexicans': 368, 'the sequel': 320, 'king of ashes': 288, 'frankenstein': 216,
    'the house on the cerulean sea': 400, 'the house in the cerulean sea': 400,
    'oathbringer': 1248, 'oathbringer (stormlight chronicles book 3)': 1248,
    'the world according to garp': 609, 'jurassic park': 400,
    'the proud tower': 528,
    'tomorrow, tomorrow, and tomorrow': 480, 'tomorrow and tomorrow and tomorrow': 480,
    'ararat': 304, 'the devils': 528,
    'lies of locke lamora': 752, 'the lies of locke lamora': 752,
    'chip wars': 464, 'the crusades': 784, 'anthropocene reviewed': 288, 'burr': 430,
    'mistborn: the final empire': 672, 'mistborn': 672,
};

const MOVIE_RUNTIMES = {
    'hit man': 115, 'sonic 3': 110, 'wicked': 160, 'dark city': 100,
    'nosferatu': 132, 'captain america: brave new world': 119,
    'ministry of ungentlemanly warfare': 120, 'parasite': 132, 'rashomon': 88,
    'the brutalist': 215, 'sinners': 137, 'no other land': 94,
    'how to train your dragon 2': 102, 'heretic': 110, 'friendship': 97,
    'the wild robot': 102, 'mickey 17': 137, 'fantastic four': 130,
    'phoenician scheme': 100, 'naked gun': 101, 'kpop demon hunters': 100,
    'formula 1': 122, 'alien': 116, 'the lighthouse': 110, '28 years later': 115,
    'one battle after another': 161, 'warfare': 95, 'weapons': 95,
    'como agua para chocolate': 105, 'frankenstein': 135, 'the substance': 140,
    'eddington': 148, 'ballerina': 100,
};

function badgeLookupPages(title) {
    return title ? (BOOK_PAGE_COUNTS[title.toLowerCase().trim()] || null) : null;
}

function badgeLookupRuntime(title) {
    return title ? (MOVIE_RUNTIMES[title.toLowerCase().trim()] || null) : null;
}

function badgeGetAllEntries() {
    const entries = [];
    state.months.forEach(month => {
        USERS.forEach(user => {
            MEDIA_TYPES.forEach(type => {
                const entry = month.entries?.[user]?.[type];
                if (!entry) return;
                let title = (month.mode === 'dictator' && month.globalPicks) ? month.globalPicks[type] : entry.title;
                if (!title || !entry.rating) return;
                let author = '', authorGender = '';
                if (type === 'book') {
                    if (month.mode === 'dictator' && month.globalPicks) {
                        author = month.globalPicks.bookAuthor || entry.author || '';
                        authorGender = month.globalPicks.bookAuthorGender || entry.authorGender || '';
                    } else {
                        author = entry.author || '';
                        authorGender = entry.authorGender || '';
                    }
                }
                entries.push({ user, type, title, rating: parseFloat(entry.rating), monthName: month.name, author, authorGender });
            });
        });
    });
    return entries;
}

function computeBadges() {
    const entries = badgeGetAllEntries();
    const books  = entries.filter(e => e.type === 'book');
    const movies = entries.filter(e => e.type === 'movie');
    const games  = entries.filter(e => e.type === 'game');
    const res = {};

    // 1. Longest Book
    { let b = null; books.forEach(e => { const p = badgeLookupPages(e.title); if (p && (!b || p > b.pages)) b = { user: e.user, title: e.title, pages: p, monthName: e.monthName }; }); res.longestBook = b; }
    // 2. Shortest Book
    { let b = null; books.forEach(e => { const p = badgeLookupPages(e.title); if (p && (!b || p < b.pages)) b = { user: e.user, title: e.title, pages: p, monthName: e.monthName }; }); res.shortestBook = b; }
    // 3. Longest Movie
    { let b = null; movies.forEach(e => { const m = badgeLookupRuntime(e.title); if (m && (!b || m > b.mins)) b = { user: e.user, title: e.title, mins: m, monthName: e.monthName }; }); res.longestMovie = b; }
    // 4. Shortest Movie
    { let b = null; movies.forEach(e => { const m = badgeLookupRuntime(e.title); if (m && (!b || m < b.mins)) b = { user: e.user, title: e.title, mins: m, monthName: e.monthName }; }); res.shortestMovie = b; }

    // 5. Feminist
    {
        const byUser = {}; USERS.forEach(u => { byUser[u] = { female: 0, total: 0 }; });
        books.forEach(e => { if (e.authorGender) { byUser[e.user].total++; if (e.authorGender === 'F') byUser[e.user].female++; } });
        let b = null;
        USERS.forEach(u => { const d = byUser[u]; if (d.total < 2) return; const pct = d.female / d.total; if (!b || pct > b.pct) b = { user: u, pct, female: d.female, total: d.total }; });
        res.feminist = b;
    }
    // 6. Completionist
    {
        const byUser = {}; USERS.forEach(u => { byUser[u] = []; });
        games.forEach(e => byUser[e.user].push(e.rating));
        let b = null;
        USERS.forEach(u => { if (byUser[u].length < 3) return; const avg = byUser[u].reduce((a,v) => a+v,0)/byUser[u].length; if (!b || avg > b.avg) b = { user: u, avg: avg.toFixed(2), count: byUser[u].length }; });
        res.completionist = b;
    }
    // 7. Cinematheque
    {
        const byUser = {}; USERS.forEach(u => { byUser[u] = []; });
        movies.forEach(e => byUser[e.user].push(e.rating));
        let b = null;
        USERS.forEach(u => { if (byUser[u].length < 3) return; const avg = byUser[u].reduce((a,v) => a+v,0)/byUser[u].length; if (!b || avg > b.avg) b = { user: u, avg: avg.toFixed(2), count: byUser[u].length }; });
        res.cinematheque = b;
    }
    // 8. Literary Critic
    {
        const byUser = {}; USERS.forEach(u => { byUser[u] = []; });
        books.forEach(e => byUser[e.user].push(e.rating));
        let b = null;
        USERS.forEach(u => { if (byUser[u].length < 3) return; const avg = byUser[u].reduce((a,v) => a+v,0)/byUser[u].length; if (!b || avg > b.avg) b = { user: u, avg: avg.toFixed(2), count: byUser[u].length }; });
        res.literaryCritic = b;
    }
    // 9. Hater
    {
        const byUser = {}; USERS.forEach(u => { byUser[u] = 0; });
        entries.forEach(e => { if (e.rating <= 4) byUser[e.user]++; });
        let b = null;
        USERS.forEach(u => { if (!b || byUser[u] > b.count) b = { user: u, count: byUser[u] }; });
        if (b && b.count === 0) b = null;
        res.hater = b;
    }
    // 10. Stan
    {
        const byUser = {}; USERS.forEach(u => { byUser[u] = 0; });
        entries.forEach(e => { if (e.rating === 10) byUser[e.user]++; });
        let b = null;
        USERS.forEach(u => { if (!b || byUser[u] > b.count) b = { user: u, count: byUser[u] }; });
        if (b && b.count === 0) b = null;
        res.stan = b;
    }
    // 11. Dictator
    {
        const byUser = {}; USERS.forEach(u => { byUser[u] = 0; });
        state.months.forEach(m => { if (m.mode === 'dictator' && m.dictator) byUser[m.dictator]++; });
        let b = null;
        USERS.forEach(u => { if (!b || byUser[u] > b.count) b = { user: u, count: byUser[u] }; });
        if (b && b.count === 0) b = null;
        res.dictator = b;
    }
    // 12. Most Controversial
    {
        const byTitle = {};
        entries.forEach(e => { const k = `${e.type}::${e.title.toLowerCase()}`; if (!byTitle[k]) byTitle[k] = []; byTitle[k].push(e); });
        const userDevs = {}; USERS.forEach(u => { userDevs[u] = { total: 0, count: 0 }; });
        Object.values(byTitle).forEach(grp => {
            if (grp.length < 2) return;
            const avg = grp.reduce((a, e) => a + e.rating, 0) / grp.length;
            grp.forEach(e => { userDevs[e.user].total += Math.abs(e.rating - avg); userDevs[e.user].count++; });
        });
        let b = null;
        USERS.forEach(u => { if (userDevs[u].count < 3) return; const avgDev = userDevs[u].total / userDevs[u].count; if (!b || avgDev > b.avgDev) b = { user: u, avgDev: avgDev.toFixed(2), count: userDevs[u].count }; });
        res.controversial = b;
    }

    return res;
}

const BADGE_DEFS = [
    { id: 'longestBook',    icon: '📚', name: 'War & Peace',         desc: 'Read the longest book by page count. Moves when someone reads a longer one.',       getStat: r => r ? `"${r.title}" — ${r.pages.toLocaleString()} pages (${r.monthName})` : null },
    { id: 'shortestBook',   icon: '🐦', name: 'Twitter Thread',      desc: 'Read the shortest book by page count. Moves when someone reads a shorter one.',      getStat: r => r ? `"${r.title}" — ${r.pages.toLocaleString()} pages (${r.monthName})` : null },
    { id: 'longestMovie',   icon: '🎞️', name: 'Butt Numb-a-Thon',   desc: 'Watched the longest movie by runtime. Moves when someone watches a longer one.',     getStat: r => r ? `"${r.title}" — ${r.mins} min (${r.monthName})` : null },
    { id: 'shortestMovie',  icon: '⚡', name: 'TikTok Brain',        desc: 'Watched the shortest movie by runtime. Moves when someone watches a shorter one.',    getStat: r => r ? `"${r.title}" — ${r.mins} min (${r.monthName})` : null },
    { id: 'feminist',       icon: '✊', name: 'The Feminist',         desc: 'Highest % of books by female authors (min 2 rated books with gender data).',         getStat: r => r ? `${r.female} of ${r.total} books by female authors (${Math.round(r.pct * 100)}%)` : null },
    { id: 'completionist',  icon: '🎮', name: 'The Completionist',   desc: 'Highest average game rating (min 3 games).',                                          getStat: r => r ? `Avg ${r.avg}/10 across ${r.count} games` : null },
    { id: 'cinematheque',   icon: '🎬', name: 'Cinematheque',        desc: 'Highest average movie rating (min 3 movies).',                                        getStat: r => r ? `Avg ${r.avg}/10 across ${r.count} movies` : null },
    { id: 'literaryCritic', icon: '📖', name: 'Literary Critic',     desc: 'Highest average book rating (min 3 books).',                                          getStat: r => r ? `Avg ${r.avg}/10 across ${r.count} books` : null },
    { id: 'hater',          icon: '👎', name: 'The Hater',           desc: 'Most ratings given that were 4 or below. Real tough crowd.',                          getStat: r => r ? `${r.count} low ratings (1–4) given` : null },
    { id: 'stan',           icon: '⭐', name: 'The Stan',            desc: 'Most perfect 10/10 ratings given.',                                                   getStat: r => r ? `${r.count} perfect 10/10 ratings given` : null },
    { id: 'dictator',       icon: '👑', name: 'The Dictator',        desc: 'Has been the club dictator the most months.',                                         getStat: r => r ? `Dictator for ${r.count} month${r.count !== 1 ? 's' : ''}` : null },
    { id: 'controversial',  icon: '🎲', name: 'Most Controversial',  desc: "Ratings deviate the most from the group average. Their taste is… polarizing.",        getStat: r => r ? `Avg ${r.avgDev} pts from group mean (${r.count} shared titles)` : null },
];

function renderBadges() {
    const modal = document.getElementById('badges-modal');
    const content = document.getElementById('badges-modal-content');
    const results = computeBadges();

    let html = '';
    BADGE_DEFS.forEach(def => {
        const r = results[def.id];
        const holder = r ? r.user : null;
        const stat = def.getStat(r);
        const earned = !!holder;
        html += `
            <div class="badge-item ${earned ? 'earned' : 'locked'}">
                <div class="badge-medal">${def.icon}</div>
                <div class="badge-ribbon"></div>
                <div class="badge-name">${def.name}</div>
                ${earned ? `<div class="badge-holder">🏅 ${holder}</div>` : `<div class="badge-locked-label">Not yet awarded</div>`}
                <div class="badge-tooltip">
                    <div class="badge-tooltip-title">${def.icon} ${def.name}</div>
                    <div class="badge-tooltip-desc">${def.desc}</div>
                    ${stat ? `<div class="badge-tooltip-stat">${stat}</div>` : ''}
                </div>
            </div>`;
    });

    content.innerHTML = `
        <div class="badge-modal-inner">
            <div class="badge-modal-header">
                <h2>🏅 Club Badges</h2>
                <button class="badge-close-btn" id="badges-close-btn" title="Close">✕</button>
            </div>
            <div class="badge-grid">${html}</div>
        </div>`;

    modal.classList.remove('hidden');
    document.getElementById('badges-close-btn').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); }, { once: true });
}

document.getElementById('badges-btn').addEventListener('click', renderBadges);

