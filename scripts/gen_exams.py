"""Tạo đề LUYỆN TẬP HSK 2.0 (không phải đề thi chính thức).
 - HSK 1: theo barem trong ảnh mẫu (Nghe 4 phần: nghe chọn hình / chọn câu / nối hình / hội thoại; Đọc 4 phần: nối hình / nối câu / điền từ / đọc đoạn).
 - HSK 2–6: tạo từ dữ liệu từ vựng của website (chia phần theo dạng bài).
Chạy:  python3 scripts/gen_exams.py [seed]   ->  supabase/exam_seed/hsk{1..6}.sql  (mỗi cấp 2 đề: seed và seed+1)"""
import json, random, re, sys, uuid, os
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 1
W = json.load(open('src/data/words.json'))
STRUCT = {1: (20, 20, 0, 40, 200, 120), 2: (35, 25, 0, 55, 200, 120), 3: (40, 30, 10, 90, 300, 180),
          4: (45, 40, 15, 105, 300, 180), 5: (45, 45, 10, 125, 300, 180), 6: (50, 50, 1, 140, 300, 180)}
SENT_RATIO = {2: .4, 3: .55, 4: .7, 5: .8, 6: .9}

# ======================= NGÂN HÀNG HSK 1 (soạn tay) =======================
# (câu, hình emoji, nghĩa tiếng Việt)
SCENES = [
 ('他在喝水。', '💧', 'Anh ấy đang uống nước.'), ('她在吃米饭。', '🍚', 'Cô ấy đang ăn cơm.'), ('他们在跑步。', '🏃', 'Họ đang chạy bộ.'),
 ('他是医生。', '🧑‍⚕️', 'Anh ấy là bác sĩ.'), ('他们是好朋友。', '🤝', 'Họ là bạn tốt.'), ('她在打电话。', '📞', 'Cô ấy đang gọi điện thoại.'),
 ('我在看电视。', '📺', 'Tôi đang xem tivi.'), ('她想买一件衣服。', '👗', 'Cô ấy muốn mua một cái áo.'), ('他在骑自行车。', '🚲', 'Anh ấy đang đi xe đạp.'),
 ('我想买一双鞋。', '👟', 'Tôi muốn mua một đôi giày.'), ('他在用电脑。', '💻', 'Anh ấy đang dùng máy tính.'), ('她在商店买东西。', '🛒', 'Cô ấy mua đồ ở cửa hàng.'),
 ('我喝茶。', '🍵', 'Tôi uống trà.'), ('今天下雨。', '🌧️', 'Hôm nay trời mưa.'), ('我们坐出租车去。', '🚕', 'Chúng tôi đi bằng taxi.'),
 ('她在看书。', '📖', 'Cô ấy đang đọc sách.'), ('他在睡觉。', '😴', 'Anh ấy đang ngủ.'), ('我有一只猫。', '🐱', 'Tôi có một con mèo.'),
 ('我家有一只狗。', '🐶', 'Nhà tôi có một con chó.'), ('我喜欢吃苹果。', '🍎', 'Tôi thích ăn táo.'), ('他在做饭。', '🍳', 'Anh ấy đang nấu cơm.'),
 ('孩子们在唱歌。', '🎤', 'Bọn trẻ đang hát.'), ('今天天气很热。', '☀️', 'Hôm nay trời rất nóng.'), ('今天天气很冷。', '🥶', 'Hôm nay trời rất lạnh.'),
 ('我在写字。', '✍️', 'Tôi đang viết chữ.'), ('她坐飞机去北京。', '✈️', 'Cô ấy đi máy bay đến Bắc Kinh.'),
]
# Nghe phần 2: (câu nghe, [2 câu sai], nghĩa)
TRIPLETS = [
 ('我姐姐正在打电话。', ['不是，是我姐姐的。', '这是他的新电脑。'], 'Chị tôi đang gọi điện thoại.'), ('这是他的新电脑。', ['我姐姐正在打电话。', '这是我的书。'], 'Đây là máy tính mới của anh ấy.'),
 ('他在北京工作。', ['他在北京学习。', '他住在上海。'], 'Anh ấy làm việc ở Bắc Kinh.'), ('我喜欢喝茶。', ['我喜欢喝咖啡。', '我不喜欢喝水。'], 'Tôi thích uống trà.'),
 ('今天天气很好。', ['今天下雨了。', '昨天天气很好。'], 'Hôm nay thời tiết rất đẹp.'), ('我有两个儿子。', ['我有两个女儿。', '我没有孩子。'], 'Tôi có hai con trai.'),
 ('她想买一件衣服。', ['她想买一双鞋。', '她不想买东西。'], 'Cô ấy muốn mua một cái áo.'), ('我家有四口人。', ['我家有三口人。', '我家有五口人。'], 'Nhà tôi có bốn người.'),
 ('他明天去学校。', ['他昨天去学校。', '他明天去医院。'], 'Ngày mai anh ấy đến trường.'), ('我在商店买苹果。', ['我在商店买水。', '我在学校买苹果。'], 'Tôi mua táo ở cửa hàng.'),
]
# Nghe phần 4: (lời thoại, câu hỏi, [đáp án đúng, sai, sai], nghĩa)
DIALOGS = [
 ('这件衣服多少钱？八十块。', '这件衣服多少钱？', ['八十块', '七十块', '六十块'], 'Cái áo này bao nhiêu tiền? Tám mươi đồng.'),
 ('你几点起床？我六点起床。', '她几点起床？', ['六点', '五点', '七点'], 'Bạn mấy giờ dậy? Tôi dậy lúc sáu giờ.'),
 ('你家有几口人？我家有四口人。', '她家有几口人？', ['四口人', '三口人', '五口人'], 'Nhà bạn có mấy người? Nhà tôi có bốn người.'),
 ('你去哪儿？我去医院。', '她去哪儿？', ['医院', '商店', '学校'], 'Bạn đi đâu? Tôi đến bệnh viện.'),
 ('你喝什么？我喝茶。', '她喝什么？', ['茶', '咖啡', '水'], 'Bạn uống gì? Tôi uống trà.'),
 ('今天星期几？今天星期三。', '今天星期几？', ['星期三', '星期二', '星期四'], 'Hôm nay thứ mấy? Hôm nay thứ Tư.'),
 ('你叫什么名字？我叫王小云。', '她叫什么名字？', ['王小云', '李小云', '王小明'], 'Bạn tên là gì? Tôi tên Vương Tiểu Vân.'),
 ('你在做什么？我在看书。', '她在做什么？', ['看书', '看电视', '打电话'], 'Bạn đang làm gì? Tôi đang đọc sách.'),
 ('你怎么去学校？我坐出租车去。', '她怎么去学校？', ['坐出租车', '走路', '骑自行车'], 'Bạn đến trường bằng gì? Tôi đi taxi.'),
 ('你想吃什么？我想吃米饭。', '她想吃什么？', ['米饭', '面条', '苹果'], 'Bạn muốn ăn gì? Tôi muốn ăn cơm.'),
]
# Đọc phần 2: (câu hỏi, câu trả lời, nghĩa)
QA = [
 ('你妹妹今年多大？', '她今年十八岁，在大学学习。', 'Em gái bạn năm nay bao nhiêu tuổi? Em 18 tuổi, đang học đại học.'),
 ('你什么时候去机场？', '我明天下午去。', 'Khi nào bạn đi sân bay? Chiều mai tôi đi.'),
 ('这是谁的雨伞？', '不是我的，是我姐姐的。', 'Đây là ô của ai? Không phải của tôi, là của chị tôi.'),
 ('这件衣服怎么样？', '有点儿大，不过很好看。', 'Cái áo này thế nào? Hơi rộng, nhưng rất đẹp.'),
 ('你家有几口人？', '我家有四口人。', 'Nhà bạn có mấy người? Nhà tôi có bốn người.'),
 ('你在哪儿工作？', '我在医院工作。', 'Bạn làm việc ở đâu? Tôi làm ở bệnh viện.'),
 ('你想喝什么？', '我想喝一杯茶。', 'Bạn muốn uống gì? Tôi muốn uống một cốc trà.'),
 ('你叫什么名字？', '我叫小明。', 'Bạn tên là gì? Tôi tên Tiểu Minh.'),
 ('今天天气怎么样？', '今天天气很好。', 'Hôm nay thời tiết thế nào? Hôm nay thời tiết rất đẹp.'),
 ('你喜欢吃什么？', '我喜欢吃米饭。', 'Bạn thích ăn gì? Tôi thích ăn cơm.'),
 ('你想买什么？', '我想买一双鞋。', 'Bạn muốn mua gì? Tôi muốn mua một đôi giày.'),
 ('他是谁？', '他是我的老师。', 'Anh ấy là ai? Anh ấy là thầy giáo của tôi.'),
]
# Đọc phần 3: mỗi bộ có 5 từ cho sẵn và 5 câu điền
FILL_SETS = [
 (['在', '有', '想', '很', '吗'], [('我家＿＿四口人。', '有', 'Nhà tôi có bốn người.'), ('他＿＿学校学习。', '在', 'Anh ấy học ở trường.'), ('我＿＿喝茶。', '想', 'Tôi muốn uống trà.'),
                               ('今天天气＿＿好。', '很', 'Hôm nay thời tiết rất đẹp.'), ('你是学生＿＿？', '吗', 'Bạn là học sinh à?')]),
 (['谁', '什么', '哪儿', '几', '多少'], [('你叫＿＿名字？', '什么', 'Bạn tên là gì?'), ('他是＿＿？', '谁', 'Anh ấy là ai?'), ('你去＿＿？', '哪儿', 'Bạn đi đâu?'),
                                      ('你家有＿＿口人？', '几', 'Nhà bạn có mấy người?'), ('这个＿＿钱？', '多少', 'Cái này bao nhiêu tiền?')]),
]
# Đọc phần 4: (đoạn văn, câu hỏi, [đúng, sai, sai], nghĩa)
PASSAGES = [
 ('爸爸喜欢吃面条，妈妈喜欢吃米饭，我最喜欢吃饺子。', '说话人喜欢吃什么？', ['饺子', '面条', '米饭'], 'Bố thích mì, mẹ thích cơm, tôi thích nhất là bánh chẻo.'),
 ('我住在北京，我的朋友住在上海。我们常常打电话。', '说话人住在哪儿？', ['北京', '上海', '中国'], 'Tôi sống ở Bắc Kinh, bạn tôi sống ở Thượng Hải. Chúng tôi thường gọi điện.'),
 ('今天星期六，我不上班。我和朋友去商店买东西。', '今天星期几？', ['星期六', '星期五', '星期日'], 'Hôm nay thứ Bảy, tôi không đi làm. Tôi và bạn đi cửa hàng mua đồ.'),
 ('我有一个哥哥和两个妹妹。', '说话人有几个妹妹？', ['两个', '一个', '三个'], 'Tôi có một anh trai và hai em gái.'),
 ('现在是下午三点。我在学校学习汉语。', '现在几点？', ['三点', '两点', '四点'], 'Bây giờ là ba giờ chiều. Tôi đang học tiếng Trung ở trường.'),
 ('我喜欢苹果，不喜欢茶。', '说话人喜欢什么？', ['苹果', '茶', '水'], 'Tôi thích táo, không thích trà.'),
 ('小明八岁，他的姐姐十二岁。', '小明的姐姐多大？', ['十二岁', '八岁', '十岁'], 'Tiểu Minh tám tuổi, chị anh ấy mười hai tuổi.'),
 ('我家离学校很近，我每天走路去学校。', '说话人怎么去学校？', ['走路', '坐车', '骑自行车'], 'Nhà tôi gần trường, mỗi ngày tôi đi bộ đến trường.'),
 ('明天我想去医院看朋友。他生病了。', '朋友怎么了？', ['生病了', '工作了', '学习了'], 'Ngày mai tôi muốn đến bệnh viện thăm bạn. Anh ấy bị ốm.'),
 ('这个杯子五块，那个杯子八块。', '那个杯子多少钱？', ['八块', '五块', '十块'], 'Cái cốc này năm đồng, cái cốc kia tám đồng.'),
]

SEC = {'listening': ('Phần 1: Nghe hiểu (听力)', 'Mỗi câu được nghe tối đa 2 lần. Nghe rồi chọn đáp án đúng.', 2),
       'reading': ('Phần 2: Đọc hiểu (阅读)', 'Đọc kỹ rồi chọn đáp án, điền từ hoặc nối.', 0),
       'writing': ('Phần 3: Viết (书写)', 'Sắp xếp từ thành câu, điền từ hoặc viết đoạn văn theo yêu cầu.', 0)}
PASSAGE6 = ("在现代社会，越来越多的人习惯于用手机阅读新闻、观看视频、与朋友交流。手机给我们的生活带来了极大的方便：我们可以随时查找资料，也可以不出家门就完成购物和付款。"
            "然而，长时间使用手机也带来了不少问题。首先，许多人每天盯着屏幕，视力明显下降；其次，人们面对面交流的时间越来越少，家人之间、朋友之间的感情有时反而变得疏远；"
            "再次，大量零碎的信息让人难以集中注意力，学习和工作的效率受到影响。\n专家建议，我们应该合理安排使用手机的时间，比如吃饭时把手机放在一边，睡觉前一小时不再看屏幕，"
            "每周留出固定的时间和家人一起活动。只有主动控制自己，才能让科技真正为生活服务，而不是被科技控制。")

def mq(rng, prompt, ans, wrong, expl, topic, part, **kw):
    opts = [ans] + list(wrong); assert len(set(opts)) == len(opts) >= 3, opts; rng.shuffle(opts)
    return dict(qtype='mcq', prompt=prompt, options=opts, answer=ans, explanation=expl, topic=topic, points=1, part=part, **kw)
def group(rng, key, pool_vals, rows, part, instruction):
    """rows: [(prompt, answer, audio_text, explanation, topic)] dùng chung một bảng đáp án A–E."""
    pool = list(pool_vals); assert len(set(pool)) == len(pool); rng.shuffle(pool); out = []
    for i, (prompt, ans, audio, expl, topic) in enumerate(rows):
        assert ans in pool
        out.append(dict(qtype='mcq', prompt=prompt, options=pool, answer=ans, explanation=expl, topic=topic, points=1, part=part, group_key=key,
                        audio_text=audio, passage=instruction if i == 0 else None))
    return out

def gen_hsk1(rng):
    sc = SCENES[:]; rng.shuffle(sc); take = lambda n: [sc.pop() for _ in range(n)]
    L, R = [], []
    for zh, e, vi in take(5):   # Nghe P1: nghe, chọn 1 trong 3 hình
        others = rng.sample([x for x in SCENES if x[1] != e], 2)
        L.append(mq(rng, 'Nghe và chọn hình phù hợp.', 'img:' + e, ['img:' + o[1] for o in others], f'{zh} — {vi}', zh, 1, audio_text=zh))
    for heard, wrong, vi in rng.sample(TRIPLETS, 5):   # Nghe P2: nghe, chọn câu
        L.append(mq(rng, 'Nghe và chọn câu đúng với nội dung bạn nghe được.', heard, wrong, f'{heard} — {vi}', heard, 2, audio_text=heard))
    s3 = take(5)   # Nghe P3: 5 đoạn nghe nối với 5 hình
    L += group(rng, 'L-P3', ['img:' + e for _, e, _ in s3], [(f'Câu {i + 1}', 'img:' + e, zh, f'{zh} — {vi}', zh) for i, (zh, e, vi) in enumerate(s3)], 3,
               'Nghe 5 đoạn rồi chọn hình phù hợp cho mỗi đoạn (A–E).')
    for script, q, opts, vi in rng.sample(DIALOGS, 5):   # Nghe P4: hội thoại + câu hỏi
        L.append(mq(rng, 'Nghe đoạn hội thoại và chọn đáp án đúng.', opts[0], opts[1:], f'{script} — {vi}', q, 4, audio_text=f'{script} 问：{q}'))
    s5 = take(5)   # Đọc P1: 5 câu nối 5 hình
    R += group(rng, 'R-P1', ['img:' + e for _, e, _ in s5], [(zh, 'img:' + e, None, f'{zh} — {vi}', zh) for zh, e, vi in s5], 1, 'Đọc 5 câu rồi chọn hình phù hợp cho mỗi câu (A–E).')
    qa = rng.sample(QA, 5)   # Đọc P2: 5 câu hỏi nối 5 câu trả lời
    R += group(rng, 'R-P2', [a for _, a, _ in qa], [(q, a, None, vi, q) for q, a, vi in qa], 2, 'Chọn câu trả lời phù hợp cho mỗi câu hỏi (A–E).')
    bank, items = FILL_SETS[(SEED_NOW - 1) % len(FILL_SETS)]   # Đọc P3: điền từ
    R += group(rng, 'R-P3', bank, [(s, a, None, f'{s.replace("＿＿", a)} — {vi}', a) for s, a, vi in items], 3, 'Chọn từ thích hợp điền vào chỗ trống (A–E).')
    for text, q, opts, vi in rng.sample(PASSAGES, 5):   # Đọc P4: đọc đoạn, chọn đáp án
        R.append(mq(rng, '★ ' + q, opts[0], opts[1:], f'{text} — {vi}', opts[0], 4, passage=text))
    return {'listening': L, 'reading': R, 'writing': []}

# ======================= HSK 2–6: tạo từ dữ liệu từ vựng =======================
CJK = re.compile(r'^[\u4e00-\u9fff]+$'); PUNCT = r'[，。！？、；：“”‘’（）…—\s,.!?;:"\'()]'
DICT = {w['zh'] for w in W if CJK.match(w['zh'])}
def tokenize(s):
    s = re.sub(PUNCT, '', s)
    if not CJK.match(s): return None
    out, i = [], 0
    while i < len(s):
        for n in range(min(5, len(s) - i), 0, -1):
            if s[i:i + n] in DICT or n == 1: out.append(s[i:i + n]); break
        i += len(out[-1])
    return out if ''.join(out) == s else None
def blank(w): return w['exZh'].replace(w['zh'], '＿＿', 1)
def expl(w): return f"{w['zh']} ({w['py']}): {w['vi']}." + (f" Ví dụ: {w['exZh']} — {w['exVi']}" if w['exVi'] else '')

def gen_generic(lv, rng):
    L, R, Wn, mins, mx, ps = STRUCT[lv]
    pool = [w for w in W if w['level'] == lv and w['vi'] and w['py']]
    sent = [w for w in pool if w['exZh'] and w['exVi'] and w['zh'] in w['exZh']]
    rng.shuffle(pool); rng.shuffle(sent); used = set()
    def take(src):
        for w in src:
            if w['id'] not in used: used.add(w['id']); return w
        return rng.choice(src)
    def distract(w, key, src, n=3):
        vals = []
        for x in rng.sample(src, min(len(src), 60)):
            v = x[key]
            if x['id'] != w['id'] and v and v != w[key] and v not in vals: vals.append(v)
            if len(vals) == n: break
        return vals
    Q = {'listening': [], 'reading': [], 'writing': []}
    sr = SENT_RATIO[lv]
    weights = [('pick', .25), ('sent', sr * .75), ('word', (1 - sr) * .6), ('py', (1 - sr) * .4)]
    ltypes = rng.choices([k for k, _ in weights], [v for _, v in weights], k=L)
    for t in sorted(ltypes, key=['pick', 'word', 'py', 'sent'].index):
        part = {'pick': 1, 'word': 2, 'py': 3, 'sent': 4}[t]
        if t in ('pick', 'sent') and len(sent) > 12:
            w = take(sent)
            if t == 'pick': Q['listening'].append(mq(rng, 'Nghe và chọn câu đúng với nội dung bạn nghe được.', w['exZh'], distract(w, 'exZh', sent), expl(w), w['zh'], part, audio_text=w['exZh']))
            else: Q['listening'].append(mq(rng, 'Nghe câu và chọn nghĩa tiếng Việt đúng.', w['exVi'], distract(w, 'exVi', sent), expl(w), w['zh'], part, audio_text=w['exZh']))
        elif t == 'py':
            w = take(pool); Q['listening'].append(mq(rng, 'Nghe và chọn Pinyin đúng.', w['py'], distract(w, 'py', pool), expl(w), w['zh'], part, audio_text=w['zh']))
        else:
            w = take(pool); Q['listening'].append(mq(rng, 'Nghe và chọn nghĩa đúng của từ bạn nghe được.', w['vi'], distract(w, 'vi', pool), expl(w), w['zh'], part, audio_text=w['zh']))
    nmatch = max(1, R // 10); rtypes = ['match'] * nmatch + [rng.choice(['word', 'fill', 'sent']) for _ in range(R - nmatch)]
    for t in sorted(rtypes, key=['word', 'fill', 'sent', 'match'].index):
        part = {'word': 1, 'fill': 2, 'sent': 3, 'match': 4}[t]
        if t == 'match':
            ws, seen = [], set()
            for x in rng.sample(pool, min(len(pool), 40)):
                if x['vi'] not in seen and x['zh'] not in seen: ws.append(x); seen |= {x['vi'], x['zh']}
                if len(ws) == 4: break
            for x in ws: used.add(x['id'])
            Q['reading'].append(dict(qtype='match', prompt='Nối mỗi từ với nghĩa tiếng Việt đúng.', options={'left': [x['zh'] for x in ws], 'right': [x['vi'] for x in ws]}, part=part,
                                     answer={x['zh']: x['vi'] for x in ws}, explanation='; '.join(f"{x['zh']} = {x['vi']}" for x in ws), topic=ws[0]['zh'], points=1))
        elif t == 'sent' and len(sent) > 12:
            w = take(sent); Q['reading'].append(mq(rng, f"Chọn nghĩa đúng của câu: {w['exZh']}", w['exVi'], distract(w, 'exVi', sent), expl(w), w['zh'], part))
        elif t == 'fill' and len(sent) > 12:
            w = take(sent); q = mq(rng, 'Chọn từ điền vào chỗ trống: ' + blank(w), w['zh'], distract(w, 'zh', pool), expl(w), w['zh'], part)
            if lv <= 3: q['passage'] = 'Nghĩa của câu: ' + w['exVi']
            Q['reading'].append(q)
        else:
            w = take(pool); Q['reading'].append(mq(rng, f"Chọn nghĩa đúng của từ「{w['zh']}」", w['vi'], distract(w, 'vi', pool), expl(w), w['zh'], 1))
    def order_q(w):
        t = tokenize(w['exZh'])
        if not t or not (4 <= len(t) <= 10): return None
        sh = t[:]
        for _ in range(10):
            rng.shuffle(sh)
            if sh != t: break
        return dict(qtype='order', prompt='Sắp xếp các từ thành câu đúng (không cần dấu câu).', passage='Nghĩa của câu: ' + (w['exVi'] or ''), options=sh, answer=[''.join(t)],
                    explanation=f"Câu đúng: {w['exZh']} — {w['exVi']}", topic=w['zh'], points=1, part=1)
    n_ord = {3: 6, 4: 10, 5: 8}.get(lv, 0); n_fill = {3: 4, 4: 5}.get(lv, 0)
    cand = [w for w in sent]; rng.shuffle(cand)
    for w in cand:
        if len(Q['writing']) >= n_ord: break
        q = order_q(w)
        if q: Q['writing'].append(q)
    assert len(Q['writing']) == n_ord, (lv, len(Q['writing']), n_ord)
    for _ in range(n_fill):
        w = take(sent); Q['writing'].append(dict(qtype='fill', prompt='Điền từ còn thiếu vào chỗ trống (gõ chữ Hán): ' + blank(w), passage=f"Gợi ý: {w['py']} — {w['vi']}", options=None,
                                                  answer=[w['zh']], explanation=expl(w), topic=w['zh'], points=1, part=2))
    if lv == 5:
        for _ in range(2):
            ws = rng.sample(pool, 5)
            Q['writing'].append(dict(qtype='essay', prompt='Dùng các từ sau để viết một đoạn văn ngắn (khoảng 80 chữ Hán): ' + '、'.join(x['zh'] for x in ws), passage=None, options=None, answer=None,
                                     explanation='Bài tự luận được admin chấm thủ công.', topic=ws[0]['zh'], points=4, part=3))
    if lv == 6:
        Q['writing'].append(dict(qtype='essay', prompt='Đọc đoạn văn dưới đây rồi viết bản tóm tắt khoảng 100 chữ Hán bằng lời của bạn. (Đề thật yêu cầu đọc khoảng 1000 chữ và viết khoảng 400 chữ; đây là đoạn mẫu rút gọn.)',
                                 passage=PASSAGE6, options=None, answer=None, explanation='Bài tóm tắt được admin chấm thủ công.', topic='viết tóm tắt', points=10, part=1))
    return Q

SEED_NOW = SEED
def gen(lv):
    rng = random.Random(lv * 7919 + SEED_NOW)
    Q = gen_hsk1(rng) if lv == 1 else gen_generic(lv, rng)
    for k, n in (('listening', STRUCT[lv][0]), ('reading', STRUCT[lv][1]), ('writing', STRUCT[lv][2])): assert len(Q[k]) == n, (lv, k, len(Q[k]), n)
    for k in Q:   # đánh số lại phần cho liên tục 1..n
        seen = sorted({q['part'] for q in Q[k]}); m = {p: i + 1 for i, p in enumerate(seen)}
        for q in Q[k]: q['part'] = m[q['part']]
    return Q

def d(s): return '$q$' + str(s).replace('$q$', '') + '$q$'
def j(o): return d(json.dumps(o, ensure_ascii=False)) + '::jsonb'
def sql(lv):
    Q = gen(lv); L, R, Wn, mins, mx, ps = STRUCT[lv]
    ns = uuid.UUID(int=(0x4b5e0000 + lv * 1000 + SEED_NOW) << 64); eid = uuid.uuid5(ns, 'exam')
    title = f'Đề luyện tập HSK {lv} – Đề {SEED_NOW}' + (' (theo barem đề thi)' if lv == 1 else '')
    o = [f"-- {title}: đề luyện tập HSK 2.0 do hệ thống tạo, không phải đề thi chính thức.",
         f"insert into exams(id,title,level,description,scopes,duration_min,max_score,pass_score,shuffle_questions,is_practice,published,format) values ('{eid}',{d(title)},{lv},"
         f"{d('Đề luyện tập do hệ thống cung cấp theo cấu trúc HSK 2.0. Không phải đề thi chính thức.')},'{{main,thuy}}',{mins},{mx},{ps},false,true,true,'HSK 2.0') on conflict (id) do nothing;"]
    qrows, krows = [], []
    for si, kind in enumerate(('listening', 'reading', 'writing')):
        if not Q[kind]: continue
        sid = uuid.uuid5(ns, kind); t, ins, plays = SEC[kind]
        o.append(f"insert into exam_sections(id,exam_id,kind,position,title,instructions,max_plays) values ('{sid}','{eid}','{kind}',{si + 1},{d(t)},{d(ins)},{plays}) on conflict (id) do nothing;")
        for pi, q in enumerate(Q[kind], 1):
            qid = uuid.uuid5(ns, f'{kind}-{pi}')
            qrows.append(f"('{qid}','{sid}',{pi},'{q['qtype']}',{d(q['prompt'])},{d(q['passage']) if q.get('passage') else 'null'},null,{d(q['audio_text']) if q.get('audio_text') else 'null'},"
                         f"{j(q['options']) if q['options'] is not None else 'null'},{q['points']},{d(q['topic'])},{q['part']},{d(q['group_key']) if q.get('group_key') else 'null'},null)")
            krows.append(f"('{qid}',{j(q['answer']) if q['answer'] is not None else 'null'},{d(q['explanation'])})")
    for i in range(0, len(qrows), 40):
        o.append("insert into exam_questions(id,section_id,position,qtype,prompt,passage,audio_url,audio_text,options,points,topic,part,group_key,image) values\n" + ",\n".join(qrows[i:i + 40]) + "\non conflict (id) do nothing;")
    for i in range(0, len(krows), 40):
        o.append("insert into exam_answer_keys(question_id,answer,explanation) values\n" + ",\n".join(krows[i:i + 40]) + "\non conflict (question_id) do nothing;")
    return "\n".join(o), Q

if __name__ == '__main__':
    os.makedirs('supabase/exam_seed', exist_ok=True)
    for lv in range(1, 7):
        parts = []
        for sd in (SEED, SEED + 1):
            SEED_NOW = sd; text, Q = sql(lv); parts.append(text)
            print(f"HSK{lv} đề {sd}: nghe {len(Q['listening'])} đọc {len(Q['reading'])} viết {len(Q['writing'])}")
        out = "\n\n".join(parts); open(f'supabase/exam_seed/hsk{lv}.sql', 'w', encoding='utf-8').write(out)
        print(f"  -> hsk{lv}.sql {len(out.encode()) // 1024} KB")
