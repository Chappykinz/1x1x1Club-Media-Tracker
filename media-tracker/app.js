const USERS = ["Andrew", "Tom", "Ross", "Sean"];
const MEDIA_TYPES = ["game", "movie", "book"];

const USER_COLORS = {
    [USERS[0] || 'User1']: '#ff6b6b', // Red-ish
    [USERS[1] || 'User2']: '#4ecdc4', // Teal
    [USERS[2] || 'User3']: '#ffe66d', // Yellow
    [USERS[3] || 'User4']: '#c7f464'  // Light Green
};

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
        // Inject 2025 historic data if it's not already in the state
        if (typeof historicData !== 'undefined') {
            let dataAdded = false;
            historicData.forEach(hd => {
                // Check if month already exists by sortKey or name
                const existingIndex = state.months.findIndex(m => m.sortKey === hd.sortKey || m.name === hd.name);
                if (existingIndex >= 0) {
                    // Retain the existing ID to prevent breaking currentMonthId reference
                    const oldId = state.months[existingIndex].id;
                    // Deep copy or reassign
                    state.months[existingIndex] = JSON.parse(JSON.stringify(hd));
                    state.months[existingIndex].id = oldId;
                    dataAdded = true;
                } else {
                    state.months.push(hd);
                    dataAdded = true;
                }
            });
            if (dataAdded) {
                if (!state.currentMonthId) {
                    state.currentMonthId = historicData[historicData.length - 1].id;
                }
                saveData();
            }
        }
    } else {
        // Initialize with default empty state if first time
        state = {
            months: typeof historicData !== 'undefined' ? historicData : [],
            currentMonthId: typeof historicData !== 'undefined' ? "init_6" : null,
            viewMode: "month"
        };
    }

    // Force currentMonthId to the most recent month if there are months
    if (state.months && state.months.length > 0) {
        const sorted = [...state.months].sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
        state.currentMonthId = sorted[sorted.length - 1].id;
        state.viewMode = 'month';
    }

    saveData();
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

    // Prevent duplicates
    if (state.months.some(m => m.sortKey === sortKey)) {
        alert(`${name} has already been added!`);
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
            book: { title: mode === 'dictator' ? '' : '', imageUrl: '', rating: '', thoughts: '', author: '' }
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

    if (state.months.length === 0) return;

    // Sort months chronologically by sortKey for nav
    const sortedMonths = [...state.months].sort((a, b) => {
        // Fallback for old data without sortKey
        const keyA = a.sortKey || parseInt(a.id);
        const keyB = b.sortKey || parseInt(b.id);
        return keyA - keyB;
    });

    const currentMonthIndex = sortedMonths.findIndex(m => m.id === state.currentMonthId);
    if (currentMonthIndex === -1) return;

    // The current active month
    const currentMonth = state.months.find(m => m.id === state.currentMonthId);

    const activeMonthContainer = document.createElement('div');
    activeMonthContainer.style.display = 'flex';
    activeMonthContainer.style.flexDirection = 'column';
    activeMonthContainer.style.alignItems = 'center';
    activeMonthContainer.style.gap = '0.2rem';

    const currA = document.createElement('a');
    currA.className = `nav-link ${state.viewMode === 'month' ? 'active' : ''}`;
    currA.textContent = currentMonth.name;
    currA.onclick = () => {
        state.viewMode = 'month';
        render();
    };
    activeMonthContainer.appendChild(currA);

    const returnBtn = document.createElement('button');
    returnBtn.className = 'btn-secondary';
    returnBtn.style.padding = '0.2rem 0.6rem';
    returnBtn.style.fontSize = '0.75rem';
    returnBtn.style.background = 'transparent';
    returnBtn.style.border = 'none';
    returnBtn.style.color = 'var(--text-secondary)';
    returnBtn.style.textDecoration = 'underline';
    returnBtn.style.cursor = 'pointer';
    returnBtn.textContent = 'Return to Current Month';
    returnBtn.onclick = () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthNum = now.getMonth() + 1;
        const currentSortKey = currentYear * 100 + currentMonthNum;
        const monthMatch = state.months.find(m => m.sortKey === currentSortKey);
        if (monthMatch) {
            state.currentMonthId = monthMatch.id;
            state.viewMode = 'month';
            saveData();
            render();
        } else {
            alert("This chronological month hasn't been created yet!");
        }
    };
    activeMonthContainer.appendChild(returnBtn);

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

    // We need to know previous and next months for navigation buttons
    const sortedMonths = [...state.months].sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
    const currentIndex = sortedMonths.findIndex(m => m.id === state.currentMonthId);

    const prevMonth = currentIndex > 0 ? sortedMonths[currentIndex - 1] : null;
    const nextMonth = currentIndex < sortedMonths.length - 1 ? sortedMonths[currentIndex + 1] : null;

    let html = `
        <div class="month-header" style="display:flex; flex-direction:column; align-items:flex-start; gap:1rem;">
            <div style="display:flex; justify-content:space-between; width:100%; align-items:flex-end;">
                <div class="month-title">
                    <h1>${month.name}</h1>
                    <div class="month-meta">
                        ${month.mode === 'regular' ? 'Regular Month' : `Dictator Month (Dictator: ${month.dictator})`}
                    </div>
                </div>
                ${month.mode === 'dictator' ? `<button class="btn-primary" onclick="editGlobalPicks('${month.id}')">Edit Global Picks</button>` : ''}
            </div>
            
            <div class="month-nav-buttons" style="display:flex; gap:0.5rem;">
                <button class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;" 
                    ${!prevMonth ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : `onclick="goToMonth('${prevMonth?.id}')"`}>
                    &laquo; Previous Month
                </button>
                <button class="btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;" 
                    ${!nextMonth ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : `onclick="goToMonth('${nextMonth?.id}')"`}>
                    Next Month &raquo;
                </button>
            </div>
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
        const loggedInUser = localStorage.getItem('loggedInUser') || '';
        const canEdit = user.toLowerCase() === loggedInUser.toLowerCase();

        html += `
            <div class="user-card" id="user-card-${user}">
                <div class="user-card-header">
                    <div class="avatar" style="background: ${USER_COLORS[user] || 'var(--primary-gradient)'}; color: #000;">${user[0]}</div>
                    <div class="user-name">${user}</div>
                    ${canEdit ? `<button class="btn-secondary" style="margin-left:auto; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="startEdit('${user}')">Edit</button>` : ''}
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
    `;

    mainContent.innerHTML = html;
    setTimeout(loadVisibleCovers, 0);
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
                <div class="form-group" style="position: relative;">
                    <div class="media-type">${label}</div>
                    ${month.mode === 'regular' ? `<input type="text" id="edit-${user}-${type}-title" placeholder="Title" value="${entry.title}" style="margin-bottom:0.5rem;" oninput="handleTitleInput('${user}', '${type}', this)" autocomplete="off" />` : `<div><em>${month.globalPicks[type] || 'No global pick set'}</em></div>`}
                    <div id="autocomplete-${user}-${type}" class="autocomplete-dropdown hidden"></div>
                    ${type === 'book' && month.mode === 'regular' ? `<input type="text" id="edit-${user}-book-author" placeholder="Author" value="${entry.author || ''}" style="margin-bottom:0.5rem;" />` : ''}
                    <div class="rating-input-group">
                        <label>Rating (1-10)</label>
                        <input type="number" id="edit-${user}-${type}-rating" min="1" max="10" placeholder="/10" value="${entry.rating}" />
                    </div>
                    <textarea id="edit-${user}-${type}-thoughts" placeholder="Thoughts..." rows="3" style="margin-top:0.5rem;">${entry.thoughts}</textarea>
                </div>
            `;
        } else {
            const hasThoughts = entry.thoughts && entry.thoughts.trim() !== '';
            html += `
                <div class="media-item">
                    <div class="media-type">${label}</div>
                    <div class="media-content-wrapper" style="display: flex; justify-content: space-between; gap: 1rem; align-items: stretch;">
                        <div class="media-text-content" style="flex: 1; display:flex; flex-direction:column; justify-content:space-between;">
                            <div class="media-title-row">
                                <div class="media-title">${titleDisplay}${type === 'book' && entry.author ? ` <span style="font-size: 0.8em; font-weight: normal; color: var(--text-secondary)">by ${entry.author}</span>` : ''}</div>
                                ${entry.rating ? `<div class="media-rating">${entry.rating}/10</div>` : ''}
                            </div>
                            
                            <!-- Auto Cover Image -->
                            <img class="fetched-cover" data-type="${type}" data-title="${titleDisplay}" style="max-height: 120px; width: auto; max-width: 100px; border-radius: 6px; margin: 0.8rem 0; display: none; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.3);" src="" alt="Cover" />

                            <div style="margin-top:0.5rem;">
                                ${hasThoughts ? `<button class="btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="openReviewModal('${user}', '${type}')">Read Review</button>` : `<span style="font-size:0.8rem; color:var(--text-secondary);">No review entered</span>`}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    return html;
}

const coverCache = JSON.parse(localStorage.getItem('coverCache') || '{}');

let autocompleteTimeout = null;

window.handleTitleInput = function (user, type, inputEl) {
    clearTimeout(autocompleteTimeout);
    const query = inputEl.value.trim();
    const dropdown = document.getElementById(`autocomplete-${user}-${type}`);

    if (query.length < 3) {
        dropdown.classList.add('hidden');
        return;
    }

    autocompleteTimeout = setTimeout(async () => {
        let suggestions = [];
        try {
            if (type === 'movie') {
                const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=movie&limit=5`);
                const data = await res.json();
                if (data.results) {
                    suggestions = data.results.map(r => ({
                        title: r.trackName || r.collectionName || query,
                        author: r.directorName || '',
                        image: r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '300x300') : null
                    }));
                }
            } else if (type === 'book') {
                const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query)}&maxResults=5`);
                const data = await res.json();
                if (data.items) {
                    suggestions = data.items.map(r => {
                        const info = r.volumeInfo || {};
                        return {
                            title: info.title || query,
                            author: info.authors ? info.authors.join(', ') : '',
                            image: info.imageLinks && info.imageLinks.thumbnail ? info.imageLinks.thumbnail.replace('http:', 'https:') : null
                        };
                    });
                }
            } else if (type === 'game') {
                const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " video game")}&utf8=&format=json&origin=*`);
                const data = await res.json();
                if (data.query && data.query.search) {
                    suggestions = data.query.search.slice(0, 5).map(r => ({
                        title: r.title.replace(/ \((video )?game\)/i, ''),
                        author: 'Video Game',
                        image: null,
                        wikiTitle: r.title
                    }));
                }
            }
        } catch (e) {
            console.error("Autocomplete fetch failed", e);
        }

        if (suggestions.length > 0) {
            dropdown.innerHTML = suggestions.map((s, i) => `
                <div class="autocomplete-item" onclick="selectSuggestion('${user}', '${type}', ${i})" style="display:flex; align-items:center; gap: 10px; padding: 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    ${s.image ? `<img src="${s.image}" style="width: 40px; height: 60px; object-fit: cover; border-radius: 4px;" />` : `<div style="width: 40px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 4px;"></div>`}
                    <div style="flex:1;text-align:left;">
                        <div style="font-weight: bold; font-size: 0.95rem;">${s.title}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${s.author}</div>
                    </div>
                </div>
            `).join('');

            // Store suggestions temporarily onto the dropdown element to access on click
            dropdown.dataset.suggestions = JSON.stringify(suggestions);
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    }, 400);
};

window.selectSuggestion = async function (user, type, index) {
    const dropdown = document.getElementById(`autocomplete-${user}-${type}`);
    const suggestions = JSON.parse(dropdown.dataset.suggestions || '[]');
    const textInput = user === 'global' ? document.getElementById(`global-${type}`) : document.getElementById(`edit-${user}-${type}-title`);
    const selection = suggestions[index];

    if (!selection) return;

    if (textInput) textInput.value = selection.title;
    if (type === 'book' && user !== 'global') {
        const authorInput = document.getElementById(`edit-${user}-book-author`);
        if (authorInput) authorInput.value = selection.author;
    }

    // Cache the image early if we have it
    let finalImageUrl = selection.image;
    if (type === 'game' && selection.wikiTitle) {
        // Fetch wiki image dynamically
        finalImageUrl = await getWikiCover(selection.wikiTitle);
    }

    if (finalImageUrl) {
        const cacheKey = `${type}-${selection.title.toLowerCase()}`;
        coverCache[cacheKey] = finalImageUrl;
        localStorage.setItem('coverCache', JSON.stringify(coverCache));
    }

    dropdown.classList.add('hidden');
};

async function getWikiCover(query) {
    try {
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`);
        const searchData = await searchRes.json();

        if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
            const bestHit = searchData.query.search[0].title;
            const thumbRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(bestHit)}&prop=pageimages&pithumbsize=300&format=json&origin=*`);
            const thumbData = await thumbRes.json();

            if (thumbData.query && thumbData.query.pages) {
                const pages = thumbData.query.pages;
                const pageId = Object.keys(pages)[0];
                if (pages[pageId] && pages[pageId].thumbnail) {
                    return pages[pageId].thumbnail.source;
                }
            }
        }
    } catch (e) {
        console.error("Wiki search failed", e);
    }
    return null;
}

async function getCoverImage(type, title) {
    if (!title || title === 'Not entered yet' || title === 'Not set') return null;
    const cacheKey = `${type}-${title.toLowerCase()}`;
    if (coverCache[cacheKey] !== undefined) {
        return coverCache[cacheKey];
    }

    let url = null;
    try {
        if (type === 'movie') {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=movie&limit=1`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                url = data.results[0].artworkUrl100.replace('100x100', '300x300');
            }
            if (!url) url = await getWikiCover(title + " film");
        } else if (type === 'book') {
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}`);
            const data = await res.json();
            if (data.items && data.items.length > 0 && data.items[0].volumeInfo.imageLinks) {
                url = data.items[0].volumeInfo.imageLinks.thumbnail.replace('http:', 'https:');
            }
            if (!url) url = await getWikiCover(title + " book");
        } else if (type === 'game') {
            url = await getWikiCover(title + " video game");
            if (!url) url = await getWikiCover(title);
        }
    } catch (e) {
        console.error("Failed to fetch cover", e);
    }

    coverCache[cacheKey] = url;
    localStorage.setItem('coverCache', JSON.stringify(coverCache));
    return url;
}

window.loadVisibleCovers = async function () {
    const images = document.querySelectorAll('.fetched-cover:not(.loaded)');
    for (const img of images) {
        img.classList.add('loaded');
        const type = img.getAttribute('data-type');
        const title = img.getAttribute('data-title');
        getCoverImage(type, title).then(url => {
            if (url) {
                img.src = url;
                img.style.display = 'block';
            }
        });
    }
};

// --- Interaction Logic ---
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
            if (type === 'book') {
                month.entries[user][type].author = document.getElementById(`edit-${user}-book-author`).value;
            }
        }
        month.entries[user][type].rating = document.getElementById(`edit-${user}-${type}-rating`).value;
        month.entries[user][type].thoughts = document.getElementById(`edit-${user}-${type}-thoughts`).value;
    });

    saveData();
    renderContent();
};

window.openReviewModal = function (userId, type) {
    const month = state.months.find(m => m.id === state.currentMonthId);
    if (!month) return;
    const entry = month.entries[userId][type];
    if (!entry) return;

    let titleDisplay = entry.title;
    if (month.mode === 'dictator' && !titleDisplay) {
        titleDisplay = month.globalPicks[type];
    }

    document.getElementById('review-modal-title').textContent = titleDisplay || `${type} Review`;
    document.getElementById('review-modal-rating').textContent = entry.rating ? `${entry.rating}/10` : '';
    document.getElementById('review-modal-author').textContent = `Review by ${userId}`;
    document.getElementById('review-modal-content').innerHTML = (entry.thoughts || '').replace(/\n/g, '<br>');
    document.getElementById('read-review-modal').classList.remove('hidden');
};

window.closeReviewModal = function () {
    document.getElementById('read-review-modal').classList.add('hidden');
};

window.editGlobalPicks = function (monthId) {
    const month = state.months.find(m => m.id === monthId);
    if (!month) return;

    const modal = document.getElementById('global-picks-modal');
    // Map existing users for dictator dropdown
    const dictatorOptions = USERS.map(u => `<option value="${u}" ${month.dictator === u ? 'selected' : ''}>${u}</option>`).join('');

    modal.innerHTML = `
        <div class="modal-content glass-panel">
            <h2>Set Dictator Picks</h2>
            <div class="form-group">
                <label>Dictator</label>
                <select id="global-dictator">
                    ${dictatorOptions}
                </select>
            </div>
            <div class="form-group" style="position: relative;">
                <label>Video Game</label>
                <input type="text" id="global-game" value="${month.globalPicks.game || ''}" oninput="handleTitleInput('global', 'game', this)" autocomplete="off" />
                <div id="autocomplete-global-game" class="autocomplete-dropdown hidden"></div>
            </div>
            <div class="form-group" style="position: relative;">
                <label>Movie</label>
                <input type="text" id="global-movie" value="${month.globalPicks.movie || ''}" oninput="handleTitleInput('global', 'movie', this)" autocomplete="off" />
                <div id="autocomplete-global-movie" class="autocomplete-dropdown hidden"></div>
            </div>
            <div class="form-group" style="position: relative;">
                <label>Book</label>
                <input type="text" id="global-book" value="${month.globalPicks.book || ''}" oninput="handleTitleInput('global', 'book', this)" autocomplete="off" />
                <div id="autocomplete-global-book" class="autocomplete-dropdown hidden"></div>
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

    month.dictator = document.getElementById('global-dictator').value;
    month.globalPicks.game = document.getElementById('global-game').value;
    month.globalPicks.movie = document.getElementById('global-movie').value;
    month.globalPicks.book = document.getElementById('global-book').value;

    saveData();
    document.getElementById('global-picks-modal').classList.add('hidden');
    renderContent();
};

window.goToMonth = function (monthId) {
    if (!monthId) return;
    state.currentMonthId = monthId;
    state.viewMode = 'month';
    saveData();
    render();
};

// --- Statistics ---
function getAllRatings() {
    const ratings = [];
    state.months.forEach(month => {
        const yearMatch = month.name.match(/\d{4}$/);
        const year = yearMatch ? yearMatch[0] : 'Unknown';

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
                            monthName: month.name,
                            year: year,
                            monthMode: month.mode,
                            dictator: month.dictator
                        });
                    }
                }
            });
        });
    });
    return ratings;
}

window.renderStats = function (yearFilter = 'ALL', personFilter = 'ALL', highLowMediaFilter = 'ALL', avgPersonFilter = 'ALL', avgMediaFilter = 'ALL', dictMediaFilter = 'ALL') {
    const allRatings = getAllRatings();

    const years = [...new Set(allRatings.map(r => r.year))].sort((a, b) => b.localeCompare(a));
    const yearOptions = years.map(y => `<option value="${y}" ${yearFilter === y ? 'selected' : ''}>${y}</option>`).join('');

    let ratings = allRatings;
    if (yearFilter !== 'ALL') {
        ratings = ratings.filter(r => r.year === yearFilter);
    }

    // Filters for High/Low and Top 5
    let highLowRatings = ratings;
    if (personFilter !== 'ALL') {
        highLowRatings = highLowRatings.filter(r => r.user === personFilter);
    }
    if (highLowMediaFilter !== 'ALL') {
        highLowRatings = highLowRatings.filter(r => r.type === highLowMediaFilter);
    }

    // Sort descending by rating
    highLowRatings.sort((a, b) => b.rating - a.rating);

    let highest = null;
    let lowest = null;
    let top5 = [];
    if (highLowRatings.length > 0) {
        highest = highLowRatings[0];
        lowest = highLowRatings[highLowRatings.length - 1];
        top5 = highLowRatings.slice(0, 5);
    }

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

    // Dictator Stats
    const dictatorPicks = [];
    const dMonths = state.months.filter(m => m.mode === 'dictator' && (yearFilter === 'ALL' || m.name.endsWith(yearFilter)));
    dMonths.forEach(m => {
        const typesToProcess = dictMediaFilter === 'ALL' ? MEDIA_TYPES : [dictMediaFilter];
        typesToProcess.forEach(type => {
            const title = m.globalPicks[type];
            if (!title) return;
            let sum = 0, count = 0;
            USERS.forEach(u => {
                const entry = m.entries[u][type];
                if (entry && entry.rating) {
                    sum += parseFloat(entry.rating);
                    count++;
                }
            });
            if (count > 0) {
                dictatorPicks.push({
                    dictator: m.dictator,
                    title: title,
                    type: type,
                    monthName: m.name,
                    avgRating: +(sum / count).toFixed(2)
                });
            }
        });
    });

    let benevolant = null;
    let evil = null;
    if (dictatorPicks.length > 0) {
        benevolant = dictatorPicks.reduce((max, p) => p.avgRating > max.avgRating ? p : max, dictatorPicks[0]);
        evil = dictatorPicks.reduce((min, p) => p.avgRating < min.avgRating ? p : min, dictatorPicks[0]);
    }

    // Build the user options
    const userOptions = USERS.map(u => `<option value="${u}">${u}</option>`).join('');

    // Selected states
    const selPerson = p => p === personFilter ? 'selected' : '';
    const selHLMedia = m => m === highLowMediaFilter ? 'selected' : '';
    const selAvgPerson = p => p === avgPersonFilter ? 'selected' : '';
    const selAvgMedia = m => m === avgMediaFilter ? 'selected' : '';
    const selDictMedia = m => m === dictMediaFilter ? 'selected' : '';

    let html = `
        <div class="month-header" style="display: flex; justify-content: space-between; align-items: flex-end; width:100%;">
            <div class="month-title">
                <h1>Club Statistics</h1>
                <div class="month-meta">Overview of all ratings over time</div>
            </div>
            <div style="margin-bottom: 0.5rem; display: flex; align-items: center;">
                <label style="color: var(--text-secondary); margin-right: 0.5rem; font-weight: bold;">Year:</label>
                <select id="stat-year-filter" onchange="updateStats()" style="width: auto; min-width:100px;">
                    <option value="ALL">All Time</option>
                    ${yearOptions}
                </select>
            </div>
        </div>

        <div class="user-grid">
            <!-- Highest/Lowest & Top 5 Combined Row -->
            <div class="user-card" style="grid-column: 1 / -1; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1rem;">
                    <h3 style="margin: 0;">Extremes & Top 5</h3>
                    <div style="display:flex; gap: 1rem;">
                        <div>
                            <label style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:0.2rem;">Person</label>
                            <select id="stat-highlow-person" onchange="updateStats()">
                                <option value="ALL" ${selPerson('ALL')}>All Members</option>
                                ${userOptions.replace(/value="([^"]+)"/g, (match, p1) => match + (p1 === personFilter ? ' selected' : ''))}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:0.2rem;">Media Type</label>
                            <select id="stat-highlow-media" onchange="updateStats()">
                                <option value="ALL" ${selHLMedia('ALL')}>All Media</option>
                                <option value="game" ${selHLMedia('game')}>Games</option>
                                <option value="movie" ${selHLMedia('movie')}>Movies</option>
                                <option value="book" ${selHLMedia('book')}>Books</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <!-- Highest -->
                    <div>
                        <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Highest Rated</h4>
                        ${highest ? `
                            <div class="media-item">
                                <div class="media-type">${highest.type.toUpperCase()}</div>
                                <div class="media-title">${highest.title}</div>
                                <div style="color: var(--accent); font-weight: bold; font-size: 1.5rem; margin-top: 0.5rem;">${highest.rating}/10</div>
                                <div class="media-thoughts" style="margin-top:0.5rem">Rated by ${highest.user} in ${highest.monthName}</div>
                            </div>
                        ` : `<p style="color:var(--text-secondary);">No data available yet.</p>`}
                    </div>

                    <!-- Lowest -->
                    <div>
                        <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Lowest Rated</h4>
                        ${lowest ? `
                            <div class="media-item">
                                <div class="media-type">${lowest.type.toUpperCase()}</div>
                                <div class="media-title">${lowest.title}</div>
                                <div style="color: var(--primary-gradient); font-weight: bold; font-size: 1.5rem; margin-top: 0.5rem;">${lowest.rating}/10</div>
                                <div class="media-thoughts" style="margin-top:0.5rem">Rated by ${lowest.user} in ${lowest.monthName}</div>
                            </div>
                        ` : `<p style="color:var(--text-secondary);">No data available yet.</p>`}
                    </div>
                </div>

                <!-- Top 5 List -->
                <div style="margin-top: 2rem; background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 8px;">
                    <h4 style="margin-bottom: 1rem; color: var(--text-primary);">Top 5 Ranked</h4>
                    ${top5.length > 0 ? `
                        <ol style="padding-left: 1.5rem; color: var(--text-secondary); line-height: 1.8;">
                            ${top5.map(r => `<li><strong style="color: white;">${r.title}</strong> (${r.type.toUpperCase()}) &mdash; <span style="color:var(--accent)">${r.rating}/10</span> by ${r.user} <span style="font-size: 0.85em; opacity:0.7">in ${r.monthName}</span></li>`).join('')}
                        </ol>
                    ` : `<p style="color:var(--text-secondary);">No data available yet.</p>`}
                </div>
            </div>

            <!-- Dictator Stats Combined Row -->
            <div class="user-card" style="grid-column: 1 / -1; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1rem;">
                    <h3 style="margin: 0;">Dictator Performance</h3>
                    <div>
                        <label style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:0.2rem;">Media Type</label>
                        <select id="stat-dict-media" onchange="updateStats()">
                            <option value="ALL" ${selDictMedia('ALL')}>All Media</option>
                            <option value="game" ${selDictMedia('game')}>Games</option>
                            <option value="movie" ${selDictMedia('movie')}>Movies</option>
                            <option value="book" ${selDictMedia('book')}>Books</option>
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <!-- Benevolent Dictator -->
                    <div style="display:flex; flex-direction:column; align-items:center; text-align:center;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Lee_Kuan_Yew_1969.jpg/300px-Lee_Kuan_Yew_1969.jpg" alt="Lee Kuan Yew" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 0.5rem; border: 2px solid var(--glass-border); box-shadow: 0 4px 10px rgba(0,0,0,0.5);" />
                        <h4 style="color: #4CAF50; margin-bottom: 0.5rem; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">Benevolent Dictator</h4>
                        ${benevolant ? `
                            <div class="media-item">
                                <div class="media-type">${benevolant.type.toUpperCase()}</div>
                                <div class="media-title">${benevolant.title}</div>
                                <div style="color: var(--accent); font-weight: bold; font-size: 1.5rem; margin-top: 0.5rem;">${benevolant.avgRating}/10 Avg</div>
                                <div class="media-thoughts" style="margin-top:0.5rem">Picked by ${benevolant.dictator} in ${benevolant.monthName}</div>
                            </div>
                        ` : `<p style="color:var(--text-secondary);">No dictator data available.</p>`}
                    </div>

                    <!-- Evil Dictator -->
                    <div style="display:flex; flex-direction:column; align-items:center; text-align:center;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Muammar_al-Gaddafi_at_the_2009_African_Union_summit.jpg/300px-Muammar_al-Gaddafi_at_the_2009_African_Union_summit.jpg" alt="Muammar Gaddafi" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 0.5rem; border: 2px solid var(--glass-border); box-shadow: 0 4px 10px rgba(0,0,0,0.5);" />
                        <h4 style="color: #ff4c4c; margin-bottom: 0.5rem; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">Evil Dictator</h4>
                        ${evil ? `
                            <div class="media-item">
                                <div class="media-type">${evil.type.toUpperCase()}</div>
                                <div class="media-title">${evil.title}</div>
                                <div style="color: var(--primary-gradient); font-weight: bold; font-size: 1.5rem; margin-top: 0.5rem;">${evil.avgRating}/10 Avg</div>
                                <div class="media-thoughts" style="margin-top:0.5rem">Picked by ${evil.dictator} in ${evil.monthName}</div>
                            </div>
                        ` : `<p style="color:var(--text-secondary);">No dictator data available.</p>`}
                    </div>
                </div>
            </div>

            <!-- Average Scores Row -->
            <div class="user-card" style="grid-column: 1 / -1;">
                <h3 style="margin-bottom: 1rem;">Average Score</h3>
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
                <div class="media-thoughts" style="text-align: center; margin-top: 0.5rem; margin-bottom: 2rem;">
                    Based on ${avgRatings.length} ratings
                </div>
            </div>

            <!-- Graphs Row -->
            <div class="user-card" style="grid-column: 1 / -1; display:flex; flex-direction:column;">
                <h3 style="margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">Trends (${yearFilter === 'ALL' ? 'All Time' : yearFilter})</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                    <div>
                        <canvas id="booksChart" width="100" height="100"></canvas>
                    </div>
                    <div>
                        <canvas id="moviesChart" width="100" height="100"></canvas>
                    </div>
                    <div>
                        <canvas id="gamesChart" width="100" height="100"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    mainContent.innerHTML = html;

    // Render Charts
    setTimeout(() => {
        // Collect chart months based on year filter
        let chartMonths = yearFilter === 'ALL' ? state.months : state.months.filter(m => m.name.endsWith(yearFilter));

        // Optional default if somehow no months
        if (chartMonths.length === 0) return;

        const labels = chartMonths.map(m => m.name.split(' ')[0].substring(0, 3) + " " + m.name.split(' ')[1].substring(2, 4));

        const buildDatasets = (type) => {
            return USERS.map(user => {
                const dataPoints = chartMonths.map(m => {
                    const entry = m.entries[user][type];
                    return (entry && entry.rating) ? parseFloat(entry.rating) : null;
                });
                const customTitles = chartMonths.map(m => {
                    return m.mode === 'dictator' ? m.globalPicks[type] : (m.entries[user][type]?.title || '');
                });
                const customUrls = chartMonths.map(m => {
                    const title = m.mode === 'dictator' ? m.globalPicks[type] : (m.entries[user][type]?.title || '');
                    return localStorage.getItem(`cover_${title}`) || '';
                });

                return {
                    label: user,
                    data: dataPoints,
                    customTitles,
                    customUrls,
                    borderColor: USER_COLORS[user] || '#fff',
                    backgroundColor: USER_COLORS[user] || '#fff',
                    tension: 0.3,
                    borderWidth: 2,
                    spanGaps: true // draw lines over missing data
                };
            });
        };

        const externalTooltipHandler = (context) => {
            let tooltipEl = document.getElementById('chartjs-tooltip');
            if (!tooltipEl) {
                tooltipEl = document.createElement('div');
                tooltipEl.id = 'chartjs-tooltip';
                tooltipEl.innerHTML = '<table></table>';
                document.body.appendChild(tooltipEl);
            }

            const tooltipModel = context.tooltip;
            if (tooltipModel.opacity === 0) {
                tooltipEl.style.opacity = 0;
                return;
            }

            tooltipEl.classList.remove('above', 'below', 'no-transform');
            if (tooltipModel.yAlign) {
                tooltipEl.classList.add(tooltipModel.yAlign);
            } else {
                tooltipEl.classList.add('no-transform');
            }

            if (tooltipModel.body) {
                const titleLines = tooltipModel.title || [];
                const bodyLines = tooltipModel.body.map(bItem => bItem.lines);

                const dataIndex = tooltipModel.dataPoints[0].dataIndex;

                let innerHtml = '<thead>';
                titleLines.forEach(function (title) {
                    innerHtml += '<tr><th style="padding-bottom:10px; font-weight:bold; border-bottom:1px solid rgba(255,255,255,0.2);">' + title + '</th></tr>';
                });
                innerHtml += '</thead><tbody>';

                bodyLines.forEach(function (body, i) {
                    const colors = tooltipModel.labelColors[i];
                    let style = 'background:' + colors.backgroundColor + ';';
                    style += ' border-color:' + colors.borderColor + ';';
                    style += ' border-width: 2px;';
                    style += ' display: inline-block; width: 10px; height: 10px; margin-right: 5px; border-radius:50%;';
                    const span = '<span style="' + style + '"></span>';

                    const dp = tooltipModel.dataPoints[i];
                    const itemUrl = dp.dataset.customUrls[dataIndex];
                    const itemTitle = dp.dataset.customTitles[dataIndex];

                    // Don't show data points that are empty
                    if (!itemTitle) return;

                    innerHtml += '<tr><td style="padding-top:10px;">' + span + body + '</td></tr>';
                    innerHtml += '<tr><td style="font-size:0.8rem; font-weight:bold; color:var(--accent);">' + itemTitle + '</td></tr>';
                    if (itemUrl) {
                        innerHtml += '<tr><td><img src="' + itemUrl + '" style="max-height:80px; border-radius:4px; margin-top:5px; box-shadow:0 2px 5px rgba(0,0,0,0.5);"></td></tr>';
                    }
                });
                innerHtml += '</tbody>';

                let tableRoot = tooltipEl.querySelector('table');
                tableRoot.innerHTML = innerHtml;
            }

            const position = context.chart.canvas.getBoundingClientRect();

            tooltipEl.style.opacity = 1;
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
            tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
            tooltipEl.style.padding = tooltipModel.padding + 'px ' + tooltipModel.padding + 'px';
            tooltipEl.style.pointerEvents = 'none';
            tooltipEl.style.background = 'rgba(0,0,0,0.9)';
            tooltipEl.style.backdropFilter = 'blur(10px)';
            tooltipEl.style.borderRadius = '8px';
            tooltipEl.style.color = 'white';
            tooltipEl.style.zIndex = '1000';
            tooltipEl.style.transition = 'all .1s ease';
            tooltipEl.style.transform = 'translate(-50%, 0)';
            tooltipEl.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: { min: 1, max: 10, ticks: { color: "rgba(255,255,255,0.5)" } },
                x: { ticks: { color: "rgba(255,255,255,0.5)" } }
            },
            plugins: {
                legend: { labels: { color: '#fff', boxWidth: 12, font: { size: 10 } } },
                tooltip: {
                    enabled: false,
                    external: externalTooltipHandler
                }
            }
        };

        const drawChart = (ctxId, title, mediaType) => {
            const ctx = document.getElementById(ctxId);
            if (!ctx) return;
            // Destory potentially existing Chart instances on these canvases
            const existingChart = Chart.getChart(ctx);
            if (existingChart) existingChart.destroy();

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: buildDatasets(mediaType)
                },
                options: {
                    ...chartOptions,
                    plugins: {
                        ...chartOptions.plugins,
                        title: { display: true, text: title, color: '#fff', font: { size: 14 } }
                    }
                }
            });
        };

        // Draw the 3 charts

        drawChart('booksChart', 'Books Trend', 'book');
        drawChart('moviesChart', 'Movies Trend', 'movie');
        drawChart('gamesChart', 'Games Trend', 'game');
    }, 50);
};

window.updateStats = function () {
    const yearF = document.getElementById('stat-year-filter')?.value || 'ALL';
    const personF = document.getElementById('stat-highlow-person')?.value || 'ALL';
    const hlMediaF = document.getElementById('stat-highlow-media')?.value || 'ALL';
    const avgPersonF = document.getElementById('stat-avg-person')?.value || 'ALL';
    const avgMediaF = document.getElementById('stat-avg-media')?.value || 'ALL';
    const dictMediaF = document.getElementById('stat-dict-media')?.value || 'ALL';
    renderStats(yearF, personF, hlMediaF, avgPersonF, avgMediaF, dictMediaF);
};

// Initial load
const savedUser = localStorage.getItem('loggedInUser');
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

if (savedUser) {
    loginOverlay.style.display = 'none';
    appContainer.style.display = 'block';

    // Update Header UI
    const headerLabel = document.getElementById('header-username-label');
    if (headerLabel) {
        // Capitalize for display
        const displayUser = savedUser.charAt(0).toUpperCase() + savedUser.slice(1).toLowerCase();
        headerLabel.textContent = `User: ${displayUser}`;
    }

    loadData();
    render();
}

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username').value.trim();
        const passwordInput = document.getElementById('login-password').value;

        // Perform case-insensitive check against USERS array
        const isValidUser = USERS.some(u => u.toLowerCase() === usernameInput.toLowerCase());

        if (isValidUser && passwordInput === 'LPP') {
            localStorage.setItem('loggedInUser', usernameInput);
            loginOverlay.style.display = 'none';
            appContainer.style.display = 'block';
            loginError.style.display = 'none';

            // Update Header UI
            const headerLabel = document.getElementById('header-username-label');
            if (headerLabel) {
                // Capitalize for display
                const displayUser = usernameInput.charAt(0).toUpperCase() + usernameInput.slice(1).toLowerCase();
                headerLabel.textContent = `User: ${displayUser}`;
            }

            loadData();
            render();
        } else {
            loginError.style.display = 'block';
        }
    });

    // Handle logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            // Hide app container, show login overlay
            appContainer.style.display = 'none';
            loginOverlay.style.display = 'flex';

            // Clear inputs
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            loginError.style.display = 'none';
        });
    }
}
