import json

with open("data.txt", "r", encoding="utf-8") as f:
    lines = [l.strip() for l in f if l.strip()]

months_data = []
current_month = None

month_map = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
}

section = ''

for i, line in enumerate(lines):
    parts = line.split()
    if len(parts) == 2 and parts[0] in month_map and parts[1].isdigit():
        m_month, m_year = parts
        sort_key = int(m_year) * 100 + month_map[m_month]
        current_month = {
            "id": "init_" + str(i),
            "name": line,
            "sortKey": sort_key,
            "mode": "regular",
            "dictator": None,
            "globalPicks": {"game": "", "movie": "", "book": ""},
            "entries": {
                "Andrew": {"game": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""},
                           "movie": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""},
                           "book": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""}},
                "Ross": {"game": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""},
                         "movie": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""},
                         "book": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""}},
                "Sean": {"game": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""},
                         "movie": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""},
                         "book": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""}},
                "Tom": {"game": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""},
                        "movie": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""},
                        "book": {"title": "", "imageUrl": "", "rating": "", "thoughts": ""}},
            }
        }
        months_data.append(current_month)
        section = ''
        continue

    if not current_month:
        continue

    if line.startswith('Scoring Data'):
        section = 'scoring'
        continue
    elif line.startswith('Book Reviews'):
        section = 'book'
        continue
    elif line.startswith('Movie Reviews'):
        section = 'movie'
        continue
    elif line.startswith('Game Reviews'):
        section = 'game'
        continue

    if line.startswith('Member\t') or line.startswith('Member\tAverage'):
        continue

    parts = line.split('\t')
    user = parts[0]
    if user == 'Chap':
        user = 'Andrew'
    if user not in ['Andrew', 'Ross', 'Sean', 'Tom']:
        continue

    if section == 'scoring':
        book_title = parts[1] if len(parts) > 1 else ''
        book_score = parts[2] if len(parts) > 2 else ''
        movie_title = parts[3] if len(parts) > 3 else ''
        movie_score = parts[4] if len(parts) > 4 else ''
        game_title = parts[5] if len(parts) > 5 else ''
        game_score = parts[6] if len(parts) > 6 else ''

        current_month['entries'][user]['book']['title'] = book_title
        current_month['entries'][user]['book']['rating'] = book_score
        current_month['entries'][user]['movie']['title'] = movie_title
        current_month['entries'][user]['movie']['rating'] = movie_score
        current_month['entries'][user]['game']['title'] = game_title
        current_month['entries'][user]['game']['rating'] = game_score
    elif section in ['book', 'movie', 'game']:
        thoughts = '\t'.join(parts[1:])
        current_month['entries'][user][section]['thoughts'] = thoughts

for month in months_data:
    b_titles = set(e['book']['title'] for e in month['entries'].values() if e['book']['title'])
    m_titles = set(e['movie']['title'] for e in month['entries'].values() if e['movie']['title'])
    g_titles = set(e['game']['title'] for e in month['entries'].values() if e['game']['title'])

    if len(b_titles) == 1 and len(m_titles) == 1 and len(g_titles) == 1:
        month['mode'] = 'dictator'
        month['dictator'] = 'Andrew'
        month['globalPicks'] = {
            'book': list(b_titles)[0],
            'movie': list(m_titles)[0],
            'game': list(g_titles)[0]
        }
        for u in month['entries'].values():
            u['book']['title'] = ''
            u['movie']['title'] = ''
            u['game']['title'] = ''

with open("initialData.json", "w", encoding="utf-8") as f:
    json.dump(months_data, f, indent=2)
