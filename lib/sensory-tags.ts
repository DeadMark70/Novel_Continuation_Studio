export const CANONICAL_SENSORY_TAGS = [
  "乳頭刺激",
  "液體釋放",
  "觸感質地",
  "體內感",
  "溫度刺激",
  "聲音反應",
  "失控反應",
  "壓迫束縛",
  "摩擦刺激",

  // 振動 / 呼吸 / 行動 / 姿勢 / 口部
  "振動刺激",
  "呼吸壓迫",
  "行動限制",
  "姿勢強制",
  "口部填充",

  // 感官封閉 / 材質束縛
  "感官剝奪",
  "金屬拘束",
  "乳膠壓迫",
  "絲滑無抓",
  "全覆薄膜",

  // 關節 / 高潮控制
  "關節極限",
  "高潮強制",

  // 繩縛 / 蜷縮 / 穿刺 / 器官控制
  "細繩勒痕",
  "箱內蜷縮",
  "乳環寄生",
  "尿道控制",

  // 金屬切割 / 面部 / 牽引 / 意識
  "鋼琴線切割",
  "面部固定",
  "寵物牽引",
  "意識滯留",
  "夢境轉移",

  // 藥物 / 長期寸止 / 特殊開發
  "永久感度",
  "長期焦らし",
  "斯賓斯開發",
  "ポルチオ刺激",
  "返刺固定",
  "點滴強制",

  // 感官遮斷 / 公開
  "視覺遮斷",
  "公開監視",

  // 心理支配 / 高度特化訓練
  "乳首專屬焦らし",
  "胸部貞操帶",
  "素股強制",
  "公開AV威脅",
  "騎乗位墮落",
  "乳首奴隷化",
  "絕頂拒絕",

  // 膠衣 / 口腔 / 產卵 / 體液 / 暴露 / 魔法 / 變形 / 足縛 / 心理墮落
  "膠衣寄生",
  "口腔肉棒",
  "產卵填充",
  "體液媚藥",
  "公開暴露",
  "無聲魔法",
  "孕肚變形",
  "乳膠足縛",
  "墮落沉溺",
] as const;

const DEFAULT_TEMPLATE_TAG = "感官片段";
const DEFAULT_POV_CHARACTER = "通用";
const CANONICAL_TAG_SET = new Set<string>(CANONICAL_SENSORY_TAGS);
const CJK_RE = /[\u3400-\u9FFF]/;

const TAG_RULES: Array<{
  pattern: RegExp;
  value: (typeof CANONICAL_SENSORY_TAGS)[number];
}> = [
  { pattern: /(nipple|teat|areola|breast)/i, value: "乳頭刺激" },
  {
    pattern: /(fluid|liquid|release|leak|drip|cum|secretion)/i,
    value: "液體釋放",
  },
  {
    pattern: /(texture|slime|sticky|slick|rough|smooth|grit|grain)/i,
    value: "觸感質地",
  },
  {
    pattern: /(internal|somatic|inside|body.?sensation|visceral)/i,
    value: "體內感",
  },
  {
    pattern: /(temperature|cold|freeze|hot|burn|warm|chill)/i,
    value: "溫度刺激",
  },
  {
    pattern: /(sound|squelch|drip|breath|gasp|moan|whimper|pant)/i,
    value: "聲音反應",
  },
  {
    pattern: /(spasm|tremble|shiver|convuls|control.?loss|motor.?loss|slip)/i,
    value: "失控反應",
  },
  {
    pattern: /(pressure|tight|choke|strangle|bind|restraint)/i,
    value: "壓迫束縛",
  },
  { pattern: /(friction|rub|grind|scrape)/i, value: "摩擦刺激" },

  // 新增規則
  {
    pattern: /(vibrat|buzz|oscillat|vibrator|wand|egg.?vib)/i,
    value: "振動刺激",
  },
  {
    pattern:
      /(breath.?compress|corset|chest.?tight|suffocate|wheez|pant.?restrict)/i,
    value: "呼吸壓迫",
  },
  {
    pattern:
      /(movement.?restrict|hobble|immobilize|can.?t.?walk|forced.?step)/i,
    value: "行動限制",
  },
  {
    pattern: /(posture|forced.?pose|arched|contort|position.?forced)/i,
    value: "姿勢強制",
  },
  {
    pattern: /(gag|ball.?gag|oral.?fill|mouth.?stuff|mouth.?pack)/i,
    value: "口部填充",
  },
  {
    pattern:
      /(sensory.?dep|blindfold|hood|enclos|muffled|sealed.?face|mask.?silen)/i,
    value: "感官剝奪",
  },
  {
    pattern: /(metal.?restrain|steel.?cuff|magnetic.?shackle|metal.?bondage)/i,
    value: "金屬拘束",
  },
  {
    pattern: /(latex|rubber.?suit|catsuit|latex.?compress)/i,
    value: "乳膠壓迫",
  },
  {
    pattern:
      /(slippery.?glove|satin.?glove|silk.?glove|can.?t.?grip|no.?grip|slick.?hand)/i,
    value: "絲滑無抓",
  },
  {
    pattern:
      /(full.?body.?cover|encasement|sealed.?body|full.?wrap|membrane.?cover)/i,
    value: "全覆薄膜",
  },
  {
    pattern:
      /(joint.?limit|joint.?extreme|elbow.?lock|knee.?force|shoulder.?pull)/i,
    value: "關節極限",
  },
  {
    pattern:
      /(forced.?orgasm|forced.?climax|involuntary.?orgasm|climax.?chain)/i,
    value: "高潮強制",
  },
  {
    pattern: /(rope.?mark|thin.?rope|cord.?cut|rope.?bite|crotch.?rope)/i,
    value: "細繩勒痕",
  },
  {
    pattern: /(box|crate|cramped|folded.?in|enclosed.?tight|confined.?space)/i,
    value: "箱內蜷縮",
  },
  {
    pattern: /(nipple.?ring|nipple.?pierc|ring.?pierc|nipple.?parasit)/i,
    value: "乳環寄生",
  },
  {
    pattern: /(urethr|catheter|bladder.?control|urinary|pee.?control)/i,
    value: "尿道控制",
  },
  {
    pattern: /(piano.?wire|wire.?cut|wire.?tight|wire.?collar)/i,
    value: "鋼琴線切割",
  },
  {
    pattern: /(eye.?clamp|eye.?hook|mouth.?hook|face.?fix|jaw.?hook)/i,
    value: "面部固定",
  },
  {
    pattern: /(pet.?play|leash|tail.?plug|paw|crawl|doggy.?walk|cat.?walk)/i,
    value: "寵物牽引",
  },
  {
    pattern: /(consciousness.?trap|dream.?body|mind.?lag|awareness.?displace)/i,
    value: "意識滯留",
  },
  {
    pattern: /(dream.?transfer|mind.?transfer|consciousness.?shift)/i,
    value: "夢境轉移",
  },
  {
    pattern:
      /(permanent.?sensitiv|aphrodisiac|eternal.?arousal|endless.?sensitiv)/i,
    value: "永久感度",
  },
  {
    pattern:
      /(long.?term.?edge|edge.?marathon|denial.?marathon|72h|48h.?edge)/i,
    value: "長期焦らし",
  },
  {
    pattern: /(spenc|mammary.?gland|breast.?gland.?massage)/i,
    value: "斯賓斯開發",
  },
  {
    pattern: /(cervix|portio|uterine.?massage|cervical.?press)/i,
    value: "ポルチオ刺激",
  },
  {
    pattern:
      /(barb|reverse.?barb|stuck.?inside|cant.?remove|locked.?in.?place)/i,
    value: "返刺固定",
  },
  {
    pattern: /(iv.?drip|infusion|intravenous|forced.?nutrition|drug.?drip)/i,
    value: "點滴強制",
  },
  {
    pattern: /(blindfold|visual.?dep|sight.?remov|eye.?cover|dark.?hood)/i,
    value: "視覺遮斷",
  },
  {
    pattern:
      /(public.?watch|live.?stream|classroom.?expos|family.?watch|surveillance)/i,
    value: "公開監視",
  },
  {
    pattern: /(nipple.?only.?edge|nipple.?denial|nipple.?teasing.?only)/i,
    value: "乳首專屬焦らし",
  },
  {
    pattern: /(breast.?chastity|nipple.?isolat|nipple.?cage|nipple.?lock)/i,
    value: "胸部貞操帶",
  },
  {
    pattern: /(frottage|intercrural|thigh.?sex|outer.?sex|no.?penetrat)/i,
    value: "素股強制",
  },
  {
    pattern: /(av.?threat|film.?threat|record.?blackmail|stream.?coerce)/i,
    value: "公開AV威脅",
  },
  {
    pattern: /(cowgirl.?beg|riding.?beg|beg.?to.?ride|denied.?cowgirl)/i,
    value: "騎乗位墮落",
  },
  {
    pattern: /(nipple.?slav|nipple.?only.?pleasure|nipple.?dominat)/i,
    value: "乳首奴隷化",
  },
  {
    pattern:
      /(orgasm.?denied|denied.?orgasm|denial.?complete|absolute.?denial)/i,
    value: "絕頂拒絕",
  },

  // 新增 9 條
  {
    pattern:
      /(parasite.?suit|living.?suit|second.?skin|bonded.?latex|permanent.?suit)/i,
    value: "膠衣寄生",
  },
  {
    pattern: /(oral.?dildo|mouth.?cock|face.?mask.?cock|mouth.?fill.?shaft)/i,
    value: "口腔肉棒",
  },
  {
    pattern:
      /(egg.?lay|oviposit|womb.?fill|egg.?hatch|belly.?swell.?egg|spawn.?fill)/i,
    value: "產卵填充",
  },
  {
    pattern:
      /(body.?fluid.?aphrodisiac|fluid.?absorb.?drug|drink.?aphrodisiac|fluid.?cycle)/i,
    value: "體液媚藥",
  },
  {
    pattern:
      /(public.?expos|wet.?cloak|see.?through.?public|transparent.?public|rain.?expos)/i,
    value: "公開暴露",
  },
  {
    pattern:
      /(silent.?magic|suit.?magic|will.?driven.?magic|mute.?spell|latex.?magic)/i,
    value: "無聲魔法",
  },
  {
    pattern:
      /(belly.?swell|womb.?distend|abdomen.?bulge|pregnant.?deform|egg.?belly)/i,
    value: "孕肚變形",
  },
  {
    pattern:
      /(latex.?heel|heel.?deform|foot.?bind|heel.?lock|foot.?sensitiv.?bind)/i,
    value: "乳膠足縛",
  },
  {
    pattern:
      /(fall.?pleasure|surrender.?lust|resist.?to.?crave|psychological.?fall|mental.?surrender)/i,
    value: "墮落沉溺",
  },
];

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function toChineseTagInternal(
  tag: string,
  strictCanonicalOnly: boolean,
): string {
  const trimmed = tag.trim();
  if (!trimmed) {
    return "";
  }

  if (CJK_RE.test(trimmed)) {
    if (CANONICAL_TAG_SET.has(trimmed)) {
      return trimmed;
    }
    return strictCanonicalOnly ? "" : trimmed;
  }

  const normalized = normalizeTag(trimmed);
  for (const rule of TAG_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.value;
    }
  }

  return strictCanonicalOnly ? "" : DEFAULT_TEMPLATE_TAG;
}

export function isCanonicalSensoryTag(tag: string): boolean {
  return CANONICAL_TAG_SET.has(tag.trim());
}

export function normalizePovCharacter(
  value: unknown,
  fallback = DEFAULT_POV_CHARACTER,
): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized || fallback;
}

export function toChineseSensoryTag(tag: string): string {
  return toChineseTagInternal(tag, false);
}

export function toChineseSensoryTagStrict(tag: string): string {
  return toChineseTagInternal(tag, true);
}

export function sanitizeSensoryTags(value: unknown, maxTags = 8): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const mapped = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => toChineseSensoryTag(entry))
    .filter(Boolean);
  return [...new Set(mapped)].slice(0, maxTags);
}

export function sanitizeSensoryTagsStrict(
  value: unknown,
  maxTags = 8,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const mapped = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => toChineseSensoryTagStrict(entry))
    .filter((entry) => isCanonicalSensoryTag(entry));
  return [...new Set(mapped)].slice(0, maxTags);
}

export function buildHarvestTemplateName(tags: string[] | undefined): string {
  const firstTag = tags && tags.length > 0 ? tags[0].trim() : "";
  return `收割-${firstTag || DEFAULT_TEMPLATE_TAG}`;
}
