# 랭킹 계산: abacus에서 유저마다 머문 시간과 들어간 게임을 읽어 ranking.json 하나로 묶는다.
# GitHub Actions(.github/workflows/ranking.yml)가 30분마다 돌린다. abacus는 IP 하나당 10초에 30번까지라 천천히 읽는다.
#   python ranking.py 출력파일.json [namespace]
import json, sys, time, urllib.error, urllib.request

API = 'https://abacus.jasoncameron.dev'
OUT = sys.argv[1]
NS = sys.argv[2] if len(sys.argv) > 2 else 'chunjang-games'


def get(key):
    for _ in range(6):
        try:
            with urllib.request.urlopen(f'{API}/get/{NS}/{key}', timeout=20) as r:
                return json.load(r)['value']
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429:
                time.sleep(4)
                continue
            raise
        except urllib.error.URLError:
            time.sleep(4)
    return None


users = []
count = get('users') or 0
for n in range(1, count + 1):
    t = get(f'u{n}-time')
    time.sleep(0.45)
    if t:
        users.append({'n': n, 't': t, 'g': get(f'u{n}-games') or 0})
        time.sleep(0.45)
users.sort(key=lambda u: (-u['t'], u['n']))
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump({'updated': int(time.time()), 'count': count, 'users': users}, f, separators=(',', ':'))
print(f'유저 {count}명 중 {len(users)}명 기록')
