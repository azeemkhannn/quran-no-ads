"""Build the app's bundled Quran data from the QUL (Quranic Universal Library) downloads.

Inputs (unzipped QUL downloads, all in one folder):
  indopak-13-lines-taj-company.db     mushaf layout (pages table)
  indopak-nastaleeq.db                IndoPak word-by-word script (words table)
  quran-metadata-surah-name.sqlite    surah names (chapters table)
  quran-metadata-juz.sqlite           para/juz boundaries (juz table)

Output: assets/data/quran.json (compact arrays, see src/data/quran.ts for the format)

Usage: python -I scripts/build_data.py <qul_folder> <out.json>
The script fails loudly if any validation check does not pass.
"""
import json
import sqlite3
import sys
from collections import defaultdict

TYPE_CODE = {"ayah": 0, "surah_name": 1, "basmallah": 2}


def die(msg):
    sys.exit(f"VALIDATION FAILED: {msg}")


def as_int(v):
    return int(v) if v not in ("", None) else 0


def main():
    src, out = sys.argv[1], sys.argv[2]
    layout = sqlite3.connect(f"{src}/indopak-13-lines-taj-company.db")
    wdb = sqlite3.connect(f"{src}/indopak-nastaleeq.db")
    sdb = sqlite3.connect(f"{src}/quran-metadata-surah-name.sqlite")
    jdb = sqlite3.connect(f"{src}/quran-metadata-juz.sqlite")

    name, n_pages, lines_per_page, font = layout.execute("select * from info").fetchone()
    print(f"layout: {name}, {n_pages} pages x {lines_per_page} lines, font {font}")

    # ---- words ----
    words = wdb.execute("select id, surah, ayah, word, text from words order by id").fetchall()
    if [w[0] for w in words] != list(range(1, len(words) + 1)):
        die("word ids are not contiguous from 1")
    word_text = [w[4] for w in words]
    word_loc = [w[1] * 1_000_000 + w[2] * 1000 + w[3] for w in words]
    ayahs = {(w[1], w[2]) for w in words}
    if len(ayahs) != 6236:
        die(f"expected 6236 ayahs, got {len(ayahs)}")
    if len({w[1] for w in words}) != 114:
        die("expected 114 surahs in words")

    # ---- layout lines ----
    rows = layout.execute(
        "select page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number "
        "from pages order by page_number, line_number"
    ).fetchall()
    lines = []  # [page, line, type, centered, surah, firstWord, lastWord]
    per_page = defaultdict(list)
    expected_next_word = 1
    surah_start_page = {}
    for page, line, ltype, centered, first, last, surah in rows:
        if ltype not in TYPE_CODE:
            die(f"unknown line type {ltype!r} on page {page}")
        first, last, surah = as_int(first), as_int(last), as_int(surah)
        if ltype == "ayah":
            if first != expected_next_word or last < first:
                die(f"page {page} line {line}: words {first}-{last}, expected to start at {expected_next_word}")
            expected_next_word = last + 1
        if ltype == "surah_name":
            if surah in surah_start_page:
                die(f"surah {surah} header appears twice")
            surah_start_page[surah] = page
        per_page[page].append(line)
        lines.append([page, line, TYPE_CODE[ltype], int(centered), surah, first, last])

    if expected_next_word != len(words) + 1:
        die(f"layout covers words up to {expected_next_word - 1}, but there are {len(words)}")
    if sorted(per_page) != list(range(1, n_pages + 1)):
        die("pages are not 1..N without gaps")
    for page, nums in per_page.items():
        if len(nums) > lines_per_page or nums != list(range(1, len(nums) + 1)):
            die(f"page {page} has line numbers {nums}")
    if len(surah_start_page) != 114:
        die(f"expected 114 surah headers, got {len(surah_start_page)}")
    basm = sum(1 for l in lines if l[2] == 2)
    if basm != 112:
        die(f"expected 112 separate bismillah lines (Al-Fatihah's is ayah 1; At-Tawbah has none), got {basm}")

    # ---- page of every ayah's first word, for juz start pages ----
    word_page = [0] * (len(words) + 1)
    for page, _line, t, _c, _s, first, last in lines:
        if t == 0:
            for wid in range(first, last + 1):
                word_page[wid] = page
    first_word_of_ayah = {}
    for w in words:
        first_word_of_ayah.setdefault((w[1], w[2]), w[0])

    # ---- surahs ----
    surahs = []
    for sid, name_en, name_simple, name_ar, _order, place, verses, _bism in sdb.execute(
        "select * from chapters order by id"
    ):
        surahs.append([name_ar, name_simple, verses, place, surah_start_page[sid]])
    if len(surahs) != 114:
        die("expected 114 chapters")

    # ---- juz ----
    juz = []
    for number, _count, first_key, _last_key, _mapping in jdb.execute("select * from juz order by juz_number"):
        s, a = map(int, first_key.split(":"))
        wid = first_word_of_ayah[(s, a)]
        # first word of the para's opening ayah: IndoPak para names (e.g. الٓمّٓ, سَيَقُولُ) come from it
        juz.append([s, a, word_page[wid], word_text[wid - 1]])
    if len(juz) != 30:
        die("expected 30 juz")

    data = {
        "v": 1,
        "source": f"QUL: {name} + IndoPak Nastaleeq word-by-word",
        "pages": n_pages,
        "linesPerPage": lines_per_page,
        "lines": lines,
        "wordText": word_text,
        "wordLoc": word_loc,
        "surahs": surahs,
        "juz": juz,
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"OK: {len(lines)} lines, {len(words)} words, 6236 ayahs, 114 surahs, 30 juz -> {out}")
    print("juz start pages:", [j[2] for j in juz])


if __name__ == "__main__":
    main()
