const USERS = ["Andrew", "Tom", "Ross", "Sean"];
const MEDIA_TYPES = ["game", "movie", "book"];

// --- Data Management ---
let state = {
    months: [],
    currentMonthId: null,
    viewMode: 'month' // 'month' or 'stats'
};

function loadData() {
    const saved = localStorage.getItem('mediaTrackerState');
    if (saved) {
        state = JSON.parse(saved);
    } else {
        // Initialize with default empty state if first time
        state = {
            months: [],
            currentMonthId: null
        };
        saveData();
    }
}

function saveData() {
    localStorage.setItem('mediaTrackerState', JSON.stringify(state));
}

// --- DOM Elements ---
const nav = document.getElementById('month-nav');
const addMonthBtn = document.getElementById('add-month-btn');
const newMonthModal = document.getElementById('new-month-modal');
const newMonthForm = document.getElementById('new-month-form');
const cancelNewMonthBtn = document.getElementById('cancel-new-month');
const modeSelect = document.getElementById('month-mode-input');
const dictatorGroup = document.getElementById('dictator-select-group');
const mainContent = document.getElementById('main-content');
const statsBtn = document.getElementById('stats-btn');

// --- Event Listeners ---
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

        // Dropdown for past months
        const otherMonths = sortedMonths.filter(m => m.id !== state.currentMonthId);
        if (otherMonths.length > 0) {
            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'dropdown';

            const dropdownBtn = document.createElement('button');
            dropdownBtn.className = 'btn-secondary';
            dropdownBtn.textContent = 'Past Months ▼';
            dropdownBtn.style.padding = '0.5rem 1rem';
            dropdownBtn.onclick = (e) => {
                e.stopPropagation();
                const content = document.getElementById('past-months-dropdown-content');
                content.classList.toggle('hidden');
            };

            const dropdownContent = document.createElement('div');
            dropdownContent.id = 'past-months-dropdown-content';
            dropdownContent.className = 'dropdown-content hidden';

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                const content = document.getElementById('past-months-dropdown-content');
                if (content) content.classList.add('hidden');
            });

            // Add other months reversed so newest is on top
            [...otherMonths].reverse().forEach(month => {
                const a = document.createElement('a');
                a.textContent = month.name;
                a.style.cursor = 'pointer';
                a.onclick = () => {
                    state.viewMode = 'month';
                    state.currentMonthId = month.id;
                    saveData();
                    render();
                };
                dropdownContent.appendChild(a);
            });

            dropdownContainer.appendChild(dropdownBtn);
            dropdownContainer.appendChild(dropdownContent);
            nav.appendChild(dropdownContainer);
        }
    }
}

function renderContent() {
    if (state.viewMode === 'stats') {
        renderStats();
        return;
    }

    if (!state.currentMonthId) {
        mainContent.innerHTML = `<div class="glass-panel" style="text-align: center; margin-top: 50px;">
            <h2>Welcome to the Media Tracker Club</h2>
            <p>Click "+ New Month" to get started.</p>
        </div>`;
        return;
    }

    const month = state.months.find(m => m.id === state.currentMonthId);
    if (!month) return;

    let html = `
        <div class="month-header">
            <div class="month-title">
                <h1>${month.name}</h1>
                <div class="month-meta">
                    ${month.mode === 'regular' ? 'Regular Month' : `Dictator Month (Dictator: ${month.dictator})`}
                </div>
            </div>
            ${month.mode === 'dictator' ? `<button class="btn-primary" onclick="editGlobalPicks('${month.id}')">Edit Global Picks</button>` : ''}
        </div>
    `;

    // Global Picks Header for Dictator Mode
    if (month.mode === 'dictator') {
        html += `
            <div class="glass-panel" style="margin-bottom: 2rem;">
                <h3>The Dictator's Picks</h3>
                <div style="display: flex; gap: 2rem; margin-top: 1rem;">
                    <div><strong>Game:</strong> ${month.globalPicks.game || 'Not set'}</div>
                    <div><strong>Movie:</strong> ${month.globalPicks.movie || 'Not set'}</div>
                    <div><strong>Book:</strong> ${month.globalPicks.book || 'Not set'}</div>
                </div>
            </div>
        `;
    }

    html += `<div class="user-grid">`;

    USERS.forEach(user => {
        html += `
            <div class="user-card" id="user-card-${user}">
                <div class="user-card-header">
                    <div class="avatar">${user[0]}</div>
                    <div class="user-name">${user}</div>
                    ${currentUser === user ? `<button class="btn-secondary" style="margin-left:auto; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="startEdit('${user}')">Edit</button>` : '<div style="margin-left:auto;"></div>'}
                </div>
                <div class="media-section" id="view-mode-${user}">
                    ${renderMediaItemsForUser(month, user, false)}
                </div>
                <div class="media-section edit-form hidden" id="edit-mode-${user}">
                    ${renderMediaItemsForUser(month, user, true)}
                    <div class="edit-actions">
                        <button class="btn-primary" onclick="saveEdit('${user}')">Save</button>
                        <button class="btn-secondary" onclick="cancelEdit('${user}')">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;

    // Add a container for global picks modal if needed
    html += `
        <div id="global-picks-modal" class="modal hidden">
            <!-- Modal content injected via JS when editing -->
        </div>
        <div id="review-modal" class="modal hidden" style="z-index: 2000;">
            <div class="modal-content glass-panel" style="max-width: 500px; padding: 2rem;">
                <h3 style="margin-top:0;">Thoughts & Review</h3>
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
    const entries = month.entries[user];
    let html = '';

    MEDIA_TYPES.forEach(type => {
        const entry = entries[type] || { title: '', imageUrl: '', rating: '', thoughts: '' };
        const label = type.charAt(0).toUpperCase() + type.slice(1);

        let titleDisplay = entry.title || 'Not entered yet';
        // If dictator mode, the title might be locked to the global pick (or entered automatically)
        if (month.mode === 'dictator' && !isEdit) {
            titleDisplay = month.globalPicks[type] || 'Not set';
        }

        if (isEdit) {
            html += `
                <div class="form-group">
                    <div class="media-type">${label}</div>
                    ${month.mode === 'regular' ? `<input type="text" id="edit-${user}-${type}-title" placeholder="Title" value="${entry.title}" style="margin-bottom:0.5rem;" />` : `<div><em>${month.globalPicks[type] || 'No global pick set'}</em></div>`}
                    <input type="text" id="edit-${user}-${type}-image" placeholder="Image URL (optional)" value="${entry.imageUrl || ''}" style="margin-bottom:0.5rem; font-size: 0.8rem;" />
                    <div class="rating-input-group">
                        <label>Rating (1-10)</label>
                        <input type="number" id="edit-${user}-${type}-rating" min="1" max="10" placeholder="/10" value="${entry.rating}" />
                    </div>
                    <textarea id="edit-${user}-${type}-thoughts" placeholder="Thoughts..." rows="3" style="margin-top:0.5rem;">${entry.thoughts}</textarea>
                </div>
            `;
        } else {
            html += `
                <div class="media-item">
                    <div class="media-type">${label}</div>
                    <div class="media-content-wrapper" style="display: flex; justify-content: space-between; gap: 1rem;">
                        <div class="media-text-content" style="flex: 1;">
                            <div class="media-title-row">
                                <div class="media-title">${titleDisplay}</div>
                                ${entry.rating ? `<div class="media-rating">${entry.rating}/10</div>` : ''}
                            </div>
                            ${entry.thoughts ? `<div style="margin-top:0.5rem;"><a class="read-review-link" style="color:var(--accent); cursor:pointer; font-size: 0.9rem; text-decoration:underline;" onclick="showReviewModal(this)" data-thoughts="${entry.thoughts.replace(/"/g, '&quot;')}">Read Review</a></div>` : ''}
                        </div>
                        ${entry.imageUrl ? `<img src="${entry.imageUrl}" alt="Cover" class="media-thumbnail" />` : ''}
                    </div>
                </div>
            `;
        }
    });

    return html;
}

// --- Interaction Logic ---
window.showReviewModal = function (element) {
    const text = element.getAttribute('data-thoughts');
    const modal = document.getElementById('review-modal');
    document.getElementById('review-modal-text').textContent = text;
    modal.classList.remove('hidden');
};
window.startEdit = function (user) {
    document.getElementById(`view-mode-${user}`).classList.add('hidden');
    document.getElementById(`edit-mode-${user}`).classList.remove('hidden');
};

window.cancelEdit = function (user) {
    document.getElementById(`view-mode-${user}`).classList.remove('hidden');
    document.getElementById(`edit-mode-${user}`).classList.add('hidden');
    // We re-render to wipe out any unsaved changes in the DOM
    renderContent();
};

window.saveEdit = function (user) {
    const month = state.months.find(m => m.id === state.currentMonthId);
    if (!month) return;

    MEDIA_TYPES.forEach(type => {
        if (month.mode === 'regular') {
            month.entries[user][type].title = document.getElementById(`edit-${user}-${type}-title`).value;
        }
        month.entries[user][type].imageUrl = document.getElementById(`edit-${user}-${type}-image`).value;
        month.entries[user][type].rating = document.getElementById(`edit-${user}-${type}-rating`).value;
        month.entries[user][type].thoughts = document.getElementById(`edit-${user}-${type}-thoughts`).value;
    });

    saveData();
    renderContent();
};

window.editGlobalPicks = function (monthId) {
    const month = state.months.find(m => m.id === monthId);
    if (!month) return;

    const modal = document.getElementById('global-picks-modal');
    modal.innerHTML = `
        <div class="modal-content glass-panel">
            <h2>Set Dictator Picks</h2>
            <div class="form-group">
                <label>Video Game</label>
                <input type="text" id="global-game" value="${month.globalPicks.game || ''}" />
            </div>
            <div class="form-group">
                <label>Movie</label>
                <input type="text" id="global-movie" value="${month.globalPicks.movie || ''}" />
            </div>
            <div class="form-group">
                <label>Book</label>
                <input type="text" id="global-book" value="${month.globalPicks.book || ''}" />
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="document.getElementById('global-picks-modal').classList.add('hidden')">Cancel</button>
                <button class="btn-primary" onclick="saveGlobalPicks('${monthId}')">Save</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.saveGlobalPicks = function (monthId) {
    const month = state.months.find(m => m.id === monthId);
    if (!month) return;

    month.globalPicks.game = document.getElementById('global-game').value;
    month.globalPicks.movie = document.getElementById('global-movie').value;
    month.globalPicks.book = document.getElementById('global-book').value;

    saveData();
    document.getElementById('global-picks-modal').classList.add('hidden');
    renderContent();
};

// --- Statistics ---
function getAllRatings() {
    const ratings = [];
    state.months.forEach(month => {
        USERS.forEach(user => {
            MEDIA_TYPES.forEach(type => {
                const entry = month.entries[user][type];
                if (entry && entry.rating) {
                    let title = entry.title;
                    if (month.mode === 'dictator') {
                        title = month.globalPicks[type];
                    }
                    if (title && entry.rating) {
                        ratings.push({
                            user: user,
                            type: type,
                            title: title,
                            rating: parseFloat(entry.rating),
                            monthName: month.name
                        });
                    }
                }
            });
        });
    });
    return ratings;
}

window.renderStats = function (personFilter = 'ALL', avgPersonFilter = 'ALL', avgMediaFilter = 'ALL') {
    const ratings = getAllRatings();

    // Filters for High/Low
    let highLowRatings = ratings;
    if (personFilter !== 'ALL') {
        highLowRatings = ratings.filter(r => r.user === personFilter);
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
        const sum = avgRatings.reduce((acc, r) => acc + r.rating, 0);
        averageScore = (sum / avgRatings.length).toFixed(1);
    }

    // Dictator Stats Logic
    const dictatorStats = {};
    USERS.forEach(u => dictatorStats[u] = { count: 0, totalScore: 0 });

    state.months.forEach(month => {
        if (month.mode === 'dictator' && month.dictator) {
            let monthTotal = 0;
            let ratingCount = 0;
            USERS.forEach(user => {
                MEDIA_TYPES.forEach(type => {
                    const entry = month.entries[user][type];
                    if (entry && entry.rating) {
                        monthTotal += parseFloat(entry.rating);
                        ratingCount++;
                    }
                });
            });
            if (ratingCount > 0) {
                dictatorStats[month.dictator].totalScore += (monthTotal / ratingCount);
                dictatorStats[month.dictator].count++;
            }
        }
    });

    let bestDictator = null;
    let worstDictator = null;
    let bestAvg = 0;
    let worstAvg = 10;

    for (let d in dictatorStats) {
        if (dictatorStats[d].count > 0) {
            const avg = dictatorStats[d].totalScore / dictatorStats[d].count;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestDictator = d;
            }
            if (avg < worstAvg) {
                worstAvg = avg;
                worstDictator = d;
            }
        }
    }

    // Build the user options
    const userOptions = USERS.map(u => `<option value="${u}">${u}</option>`).join('');

    // Selected states
    const selPerson = p => p === personFilter ? 'selected' : '';
    const selAvgPerson = p => p === avgPersonFilter ? 'selected' : '';
    const selAvgMedia = m => m === avgMediaFilter ? 'selected' : '';

    const html = `
        <div class="month-header">
            <div class="month-title">
                <h1>Club Statistics</h1>
                <div class="month-meta">Overview of all ratings over time</div>
            </div>
            
            <div class="dropdown">
                <button class="btn-secondary" style="background:var(--card-bg); border: 1px solid var(--accent); color: var(--accent);">Scoring Rubric ℹ️</button>
                <div class="dropdown-content glass-panel" style="right: 0; min-width: 300px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; z-index: 1000;">
                    <h3 style="margin-top:0; color:var(--text-color);">Rating Scale</h3>
                    <ul style="list-style:none; padding:0; margin:0; font-size:0.9rem; line-height: 1.6; color:var(--text-secondary);">
                        <li><strong style="color:#4caf50;">10</strong> - Masterpiece. Must consume.</li>
                        <li><strong style="color:#8bc34a;">9</strong> - Incredible. Highly recommended.</li>
                        <li><strong style="color:#cddc39;">8</strong> - Great. Very enjoyable.</li>
                        <li><strong style="color:#ffeb3b;">7</strong> - Good. Solid experience.</li>
                        <li><strong style="color:#ffc107;">6</strong> - Okay. Above average but flawed.</li>
                        <li><strong style="color:#ff9800;">5</strong> - Mediocre. Exactly average.</li>
                        <li><strong style="color:#ff5722;">4</strong> - Subpar. Mostly didn't enjoy it.</li>
                        <li><strong style="color:#f44336;">3</strong> - Bad. Hard to finish.</li>
                        <li><strong style="color:#e91e63;">2</strong> - Terrible. Complete waste of time.</li>
                        <li><strong style="color:#9c27b0;">1</strong> - Abysmal. Actively harmful.</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="user-grid">
            <!-- Top 5 Highest Rated -->
            <div class="user-card" style="grid-column: span 1;">
                <h3>Highest Rated</h3>
                <div style="margin-bottom: 1rem;">
                    <select id="stat-highlow-person" onchange="updateStats()">
                        <option value="ALL" ${selPerson('ALL')}>All Members</option>
                        ${userOptions.replace(/value="([^"]+)"/g, (match, p1) => match + (p1 === personFilter ? ' selected' : ''))}
                    </select>
                </div>
                ${top5Highest.length > 0 ? top5Highest.map((item, idx) => `
                    <div class="media-item" style="padding: 0.8rem; margin-bottom: 0.5rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span style="color:var(--text-secondary); font-size:0.8rem; font-weight:bold;">#${idx + 1}</span>
                                <strong>${item.title}</strong>
                                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;">${item.type.toUpperCase()} • ${item.user} • ${item.monthName}</div>
                            </div>
                            <div style="color: var(--accent); font-weight: 800; font-size: 1.2rem;">${item.rating}</div>
                        </div>
                    </div>
                `).join('') : '<p>No data available yet.</p>'}
            </div>

            <!-- Top 5 Lowest Rated -->
            <div class="user-card" style="grid-column: span 1;">
                <h3>Lowest Rated</h3>
                <div style="visibility: hidden; margin-bottom: 1rem;">
                    <select><option>Spacer</option></select>
                </div>
                ${top5Lowest.length > 0 ? top5Lowest.map((item, idx) => `
                    <div class="media-item" style="padding: 0.8rem; margin-bottom: 0.5rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span style="color:var(--text-secondary); font-size:0.8rem; font-weight:bold;">#${idx + 1}</span>
                                <strong>${item.title}</strong>
                                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;">${item.type.toUpperCase()} • ${item.user} • ${item.monthName}</div>
                            </div>
                            <div style="color: var(--primary-gradient); font-weight: 800; font-size: 1.2rem;">${item.rating}</div>
                        </div>
                    </div>
                `).join('') : '<p>No data available yet.</p>'}
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
                            <option value="ALL" ${selAvgMedia('ALL')}>All Media Types</option>
                            <option value="game" ${selAvgMedia('game')}>Games</option>
                            <option value="movie" ${selAvgMedia('movie')}>Movies</option>
                            <option value="book" ${selAvgMedia('book')}>Books</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 2rem;">
                    <div style="font-size: 4rem; font-weight: 800; font-family: var(--font-heading);" class="gradient-text">
                        ${avgRatings.length > 0 ? averageScore : '-'}
                        <span style="font-size: 1.5rem; color: var(--text-secondary); -webkit-text-fill-color: initial;">/10</span>
                    </div>
                </div>
                <div class="media-thoughts" style="text-align: center; margin-top: 0.5rem;">
                    Based on ${avgRatings.length} ratings
                </div>
            </div>
            
            <!-- Dictator Performance -->
            <div class="user-card" style="grid-column: 1 / -1; margin-top: 2rem;">
                <h2 style="text-align:center; margin-bottom: 2rem;">Dictator Performance</h2>
                <div style="display: flex; justify-content: center; gap: 4rem; flex-wrap: wrap;">
                    
                    <!-- Benevolent Dictator -->
                    <div style="display:flex; flex-direction:column; align-items:center; text-align:center;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/e/eb/Lee_Kuan_Yew_1965_Standard_Restoration.jpg" style="width:120px; height:120px; border-radius:50%; object-fit:cover; margin-bottom:1rem; border: 3px solid #4CAF50;">
                        <h3 style="color:#4CAF50; margin:0;">Benevolent Dictator</h3>
                        <p style="color:var(--text-secondary); font-size:0.9rem; margin-top:0.3rem;">Highest rated global picks</p>
                        ${bestDictator ? `
                            <div style="font-size:1.5rem; font-weight:bold; margin-top:1rem;">${bestDictator}</div>
                            <div style="color:var(--text-secondary);">${bestAvg.toFixed(1)}/10 avg score</div>
                        ` : `<div style="margin-top:1rem; color:var(--text-secondary);">No dictator data yet</div>`}
                    </div>

                    <!-- Evil Dictator -->
                    <div style="display:flex; flex-direction:column; align-items:center; text-align:center;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/21/Muammar_al-Gaddafi_at_the_AU_summit.jpg" style="width:120px; height:120px; border-radius:50%; object-fit:cover; margin-bottom:1rem; border: 3px solid #F44336;">
                        <h3 style="color:#F44336; margin:0;">Evil Dictator</h3>
                        <p style="color:var(--text-secondary); font-size:0.9rem; margin-top:0.3rem;">Lowest rated global picks</p>
                        ${worstDictator ? `
                            <div style="font-size:1.5rem; font-weight:bold; margin-top:1rem;">${worstDictator}</div>
                            <div style="color:var(--text-secondary);">${worstAvg.toFixed(1)}/10 avg score</div>
                        ` : `<div style="margin-top:1rem; color:var(--text-secondary);">No dictator data yet</div>`}
                    </div>

                </div>
            </div>

        </div>
    `;

    mainContent.innerHTML = html;
};

window.updateStats = function () {
    const personF = document.getElementById('stat-highlow-person').value;
    const avgPersonF = document.getElementById('stat-avg-person').value;
    const avgMediaF = document.getElementById('stat-avg-media').value;
    renderStats(personF, avgPersonF, avgMediaF);
};

// Initial load
loadData();
render();

// --- Authentication ---
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.querySelector('.app-container');
const headerUsernameLabel = document.getElementById('header-username-label');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = localStorage.getItem('mediaTrackerUser');

window.loginAs = function (user) {
    const pwdInput = document.getElementById('login-password');
    if (pwdInput && pwdInput.value !== 'LPP') {
        alert('Incorrect password!');
        return;
    }
    currentUser = user;
    if (pwdInput) pwdInput.value = ''; // clear out the field
    localStorage.setItem('mediaTrackerUser', user);
    loginOverlay.style.display = 'none';
    appContainer.style.display = 'block';
    headerUsernameLabel.textContent = `User: ${user}`;
    renderContent(); // re-render to reflect the user if viewing a month
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

