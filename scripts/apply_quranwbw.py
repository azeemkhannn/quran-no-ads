"""Puts the QuranWBW IndoPak v5.4 text into assets/data/quran.json, word for word.

The page layout (which words go on each of the 13 lines) comes from QUL layout 313 and refers to QUL's
word numbers 1..83,668. This script replaces the text of every one of those words with QuranWBW's
IndoPak v5.4 text, which is used with QuranWBW's permission and must not be modified.

The two word lists line up ayah by ayah. The only difference: in three places v5.4 writes
"بَعْدَ مَا" as one entry where QUL counts two words. There the entry is split at its space, so the
layout still works. No character of the text is added, removed or changed.

Usage:
    python -I scripts/apply_quranwbw.py "<path to the 'Indopak v5.4 Hanafi/Data' folder>"

It fails unless every ayah lines up exactly and the joined text equals the original v5.4 text.
"""
import json
import os
import sys
from collections import OrderedDict

DATA = "assets/data/quran.json"
SPLIT_ALLOWED = "بَعْدَ مَا"


def read_lines(path):
    with open(path, encoding="utf-8-sig") as f:
        return f.read().splitlines()


def main(src):
    words = [w.strip() for w in read_lines(os.path.join(src, "Word by Word", "IP-H-WA.txt"))]
    markers = [m.strip() for m in read_lines(os.path.join(src, "Word by Word", "IP-H-A.txt"))]
    refs = [r.split("\t", 1)[0] for r in read_lines(os.path.join(src, "Ayah by Ayah", "IP-H-ABA-N.txt"))]
    if not (len(markers) == len(refs) == 6236):
        sys.exit(f"expected 6,236 ayahs, got {len(markers)} markers and {len(refs)} references")

    # v5.4 entries per ayah: each ayah ends with its own ayah-number marker.
    v54 = OrderedDict()
    i, cur = 0, []
    for w in words:
        cur.append(w)
        if i < len(markers) and w == markers[i]:
            s, a = map(int, refs[i].split(":"))
            v54[(s, a)] = cur
            cur, i = [], i + 1
    if cur or i != 6236:
        sys.exit("could not split the v5.4 words into 6,236 ayahs")

    with open(DATA, encoding="utf-8") as f:
        data = json.load(f)
    qul = OrderedDict()
    for n, loc in enumerate(data["wordLoc"]):
        qul.setdefault((loc // 1_000_000, (loc % 1_000_000) // 1000), []).append(n)
    if list(qul) != list(v54):
        sys.exit("the ayah order differs between QUL and v5.4")

    new_text = [None] * len(data["wordText"])
    splits = []
    for key, ids in qul.items():
        entries = v54[key]
        if len(entries) != len(ids):
            # Split "بَعْدَ مَا" (only) where QUL counts it as two words.
            fixed = []
            for e in entries:
                if e == SPLIT_ALLOWED and len(entries) + 1 == len(ids):
                    fixed.extend(e.split(" "))
                    splits.append(key)
                else:
                    fixed.append(e)
            entries = fixed
        if len(entries) != len(ids):
            sys.exit(f"{key}: QUL has {len(ids)} words, v5.4 has {len(entries)}")
        for n, e in zip(ids, entries):
            new_text[n] = e

    # Safety net: per ayah, the words joined with spaces are exactly the v5.4 ayah text.
    for key, ids in qul.items():
        if " ".join(new_text[n] for n in ids) != " ".join(v54[key]):
            sys.exit(f"{key}: text changed while mapping")

    data["wordText"] = new_text
    data["source"] = "Layout: QUL Indopak 13 lines (Taj company). Text: QuranWBW IndoPak v5.4 (Hanafi), unmodified."
    # Each para's first word, as shown in lists.
    first_id = {}
    for n, loc in enumerate(data["wordLoc"]):
        first_id.setdefault((loc // 1_000_000, (loc % 1_000_000) // 1000), n)
    data["juz"] = [[s, a, page, new_text[first_id[(s, a)]]] for s, a, page, _ in data["juz"]]

    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {DATA}: {len(new_text)} words; split 'بَعْدَ مَا' in {splits}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
