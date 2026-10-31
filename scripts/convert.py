"""Chuyển file Excel từ vựng -> src/data/words.json + supabase/seed.sql (giữ nguyên nội dung, thứ tự STT)."""
import openpyxl, json, sys
SRC = sys.argv[1]; SIZE = 20
wb = openpyxl.load_workbook(SRC, read_only=True)
words = []
q = lambda s: 'null' if s is None else "'" + str(s).replace("'", "''") + "'"
for lv, ws in enumerate(wb, 1):
    for r in ws.iter_rows(min_row=3, max_col=7, values_only=True):
        if not isinstance(r[0], int): continue
        words.append(dict(id=f"{lv}-{r[0]}", level=lv, stt=r[0], zh=r[1], py=r[2], vi=r[3], exZh=r[4], exPy=r[5], exVi=r[6]))
json.dump(words, open('src/data/words.json', 'w'), ensure_ascii=False, separators=(',', ':'))
out = ["-- Seed tự sinh từ file Excel. Chạy sau schema.sql"]
for lv in range(1, 7):
    out.append(f"insert into courses(id,title) values({lv},'HSK{lv}');")
    n_lv = len([w for w in words if w['level'] == lv])
    for n in range(1, (n_lv + SIZE - 1) // SIZE + 1):
        out.append(f"insert into lessons(id,course_id,position,title) values('{lv}-{n}',{lv},{n},'Bài {n}');")
for w in words:
    n = (w['stt'] - 1) // SIZE + 1
    out.append("insert into vocabulary(id,lesson_id,position,hanzi,pinyin,meaning_vi,example_zh,example_pinyin,example_vi) values(%s);" %
               ",".join([q(w['id']), q(f"{w['level']}-{n}"), str(w['stt']), q(w['zh']), q(w['py']), q(w['vi']), q(w['exZh']), q(w['exPy']), q(w['exVi'])]))
open('supabase/seed.sql', 'w').write("\n".join(out))
print(len(words), 'từ')
