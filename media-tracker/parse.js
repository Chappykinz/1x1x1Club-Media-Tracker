const fs = require('fs');

const raw = fs.readFileSync('data.txt', 'utf-8');
const lines = raw.split('\n').map(l => l.trim()).filter(l => l);

const monthsData = [];
let currentMonth = null;

const monthMap = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
};

let section = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for month header (e.g., "January 2025")
    if (/^[A-Z][a-z]+ \d{4}$/.test(line)) {
        const [mMonth, mYear] = line.split(' ');
        const sortKey = parseInt(mYear) * 100 + monthMap[mMonth];
        currentMonth = {
            id: Date.now().toString() + i,
            name: line,
            sortKey: sortKey,
            mode: 'regular',
            dictator: null,
            globalPicks: { game: '', movie: '', book: '' },
            entries: {
                "Andrew": {
                    game: { title: '', imageUrl: '', rating: '', thoughts: '' },
                    movie: { title: '', imageUrl: '', rating: '', thoughts: '' },
                    book: { title: '', imageUrl: '', rating: '', thoughts: '' }
                },
                "Ross": {
                    game: { title: '', imageUrl: '', rating: '', thoughts: '' },
                    movie: { title: '', imageUrl: '', rating: '', thoughts: '' },
                    book: { title: '', imageUrl: '', rating: '', thoughts: '' }
                },
                "Sean": {
                    game: { title: '', imageUrl: '', rating: '', thoughts: '' },
                    movie: { title: '', imageUrl: '', rating: '', thoughts: '' },
                    book: { title: '', imageUrl: '', rating: '', thoughts: '' }
                },
                "Tom": {
                    game: { title: '', imageUrl: '', rating: '', thoughts: '' },
                    movie: { title: '', imageUrl: '', rating: '', thoughts: '' },
                    book: { title: '', imageUrl: '', rating: '', thoughts: '' }
                }
            }
        };
        monthsData.push(currentMonth);
        section = '';
        continue;
    }

    if (!currentMonth) continue;

    if (line.startsWith('Scoring Data')) {
        section = 'scoring';
        continue;
    } else if (line.startsWith('Book Reviews')) {
        section = 'book';
        continue;
    } else if (line.startsWith('Movie Reviews')) {
        section = 'movie';
        continue;
    } else if (line.startsWith('Game Reviews')) {
        section = 'game';
        continue;
    }

    if (line.startsWith('Member\t') || line.startsWith('Member\tAverage')) {
        continue;
    }

    const parts = line.split('\t');
    let user = parts[0];
    if (user === 'Chap') user = 'Andrew';
    if (!['Andrew', 'Ross', 'Sean', 'Tom'].includes(user)) continue;

    if (section === 'scoring') {
        const bookTitle = parts[1] || '';
        const bookScore = parts[2] || '';
        const movieTitle = parts[3] || '';
        const movieScore = parts[4] || '';
        const gameTitle = parts[5] || '';
        const gameScore = parts[6] || '';

        currentMonth.entries[user].book.title = bookTitle;
        currentMonth.entries[user].book.rating = bookScore;
        currentMonth.entries[user].movie.title = movieTitle;
        currentMonth.entries[user].movie.rating = movieScore;
        currentMonth.entries[user].game.title = gameTitle;
        currentMonth.entries[user].game.rating = gameScore;

    } else if (section === 'book' || section === 'movie' || section === 'game') {
        const thoughts = parts.slice(1).join('\t');
        if (currentMonth.entries[user] && currentMonth.entries[user][section]) {
            currentMonth.entries[user][section].thoughts = thoughts;
        }
    }
}

for (const month of monthsData) {
    const bTitles = new Set(Object.values(month.entries).map(e => e.book.title).filter(t => t));
    const mTitles = new Set(Object.values(month.entries).map(e => e.movie.title).filter(t => t));
    const gTitles = new Set(Object.values(month.entries).map(e => e.game.title).filter(t => t));

    if (bTitles.size === 1 && mTitles.size === 1 && gTitles.size === 1) {
        month.mode = 'dictator';
        month.dictator = 'Andrew';
        month.globalPicks = {
            book: [...bTitles][0],
            movie: [...mTitles][0],
            game: [...gTitles][0]
        };
        for (const user of Object.keys(month.entries)) {
            month.entries[user].book.title = '';
            month.entries[user].movie.title = '';
            month.entries[user].game.title = '';
        }
    }
}

fs.writeFileSync('initialData.json', JSON.stringify(monthsData, null, 2));
