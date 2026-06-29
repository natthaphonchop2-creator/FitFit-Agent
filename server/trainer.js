const exerciseLibrary = [
  {
    name: "วิดพื้น",
    focus: "อก ไหล่หน้า หลังแขน",
    equipment: "bodyweight",
    level: "beginner",
    plan: "3 เซ็ต x 8-12 ครั้ง",
    note: "เกร็งลำตัวและให้ศอกเฉียงประมาณ 45 องศา"
  },
  {
    name: "สควอต",
    focus: "ต้นขาหน้า ก้น แกนกลาง",
    equipment: "bodyweight",
    level: "beginner",
    plan: "3 เซ็ต x 12-15 ครั้ง",
    note: "เข่าชี้ตามปลายเท้า น้ำหนักลงกลางเท้า"
  },
  {
    name: "แพลงก์",
    focus: "หน้าท้อง แกนกลาง",
    equipment: "bodyweight",
    level: "beginner",
    plan: "3 เซ็ต x 30-45 วินาที",
    note: "หลังตรง ไม่แอ่นเอว"
  },
  {
    name: "ดัมเบลโรว์",
    focus: "หลังกลาง ปีก หน้าแขน",
    equipment: "dumbbell",
    level: "intermediate",
    plan: "3 เซ็ต x 10-12 ครั้ง/ข้าง",
    note: "ดึงศอกไปด้านหลัง ไม่ยกไหล่"
  },
  {
    name: "ดัมเบลชอลเดอร์เพรส",
    focus: "ไหล่ หลังแขน",
    equipment: "dumbbell",
    level: "intermediate",
    plan: "3 เซ็ต x 8-10 ครั้ง",
    note: "คุมช่วงลง อย่ากระแทกข้อศอก"
  },
  {
    name: "กลูตบริดจ์",
    focus: "ก้น หลังขา แกนกลาง",
    equipment: "bodyweight",
    level: "beginner",
    plan: "3 เซ็ต x 12-15 ครั้ง",
    note: "บีบก้นด้านบน 1 วินาที"
  }
];

const mealIdeas = [
  {
    budget: 80,
    meals: ["ไข่ต้ม 2 ฟอง + อกไก่ย่าง + ข้าวครึ่งจาน", "ข้าวกะเพราไก่ไม่ติดหนัง + ไข่ต้ม", "ทูน่ากระป๋องในน้ำแร่ + กล้วย 1 ลูก"]
  },
  {
    budget: 150,
    meals: ["ข้าวอกไก่ + ไข่ + ผักลวก", "สุกี้น้ำไก่/ทะเล เพิ่มไข่", "ข้าวปลา/ไก่ย่าง + ต้มจืด"]
  },
  {
    budget: 250,
    meals: ["แซลมอน/ปลาย่าง + ข้าว + ผัก", "อกไก่/เนื้อไม่ติดมัน + สลัด + โยเกิร์ตกรีก", "ชาบูเลือกเนื้อไม่ติดมัน เน้นผัก ลดน้ำจิ้ม"]
  }
];

const defaultProfile = {
  goal: "สุขภาพดีและลดไขมัน",
  daysPerWeek: 3,
  availableMinutes: 30,
  equipment: ["bodyweight"],
  foodBudget: 120,
  injuries: []
};

export function createTrainerReply(text, userState = {}) {
  const message = normalizeText(text);
  const profile = { ...defaultProfile, ...(userState.profile || {}) };

  if (!message) {
    return introReply();
  }

  if (hasAny(message, ["เริ่ม", "สมัคร", "โปรไฟล์", "profile"])) {
    return profileReply(profile);
  }

  if (hasAny(message, ["วันนี้", "เล่นอะไร", "ตาราง", "workout", "ออกกำลัง", "ออกกำลังกาย"])) {
    return workoutReply(profile);
  }

  if (hasAny(message, ["จดการซ้อม", "บันทึกการซ้อม"])) {
    return logPromptReply();
  }

  if (hasAny(message, ["จด", "บันทึก", "เซ็ต", "ครั้ง", "kg", "กิโล", "reps"])) {
    return logReply(text);
  }

  if (hasAny(message, ["กิน", "อาหาร", "เมนู", "งบ", "โปรตีน", "calorie", "แคล"])) {
    return mealReply(profile, message);
  }

  if (hasAny(message, ["เจ็บ", "ปวด", "เข่า", "หลัง", "ไหล่", "ข้อมือ"])) {
    return safetyReply();
  }

  if (hasAny(message, ["กล้าม", "โฟกัส", "โดนส่วนไหน", "muscle"])) {
    return focusReply(profile);
  }

  return introReply();
}

export function buildInitialProfile(profilePatch = {}) {
  return {
    ...defaultProfile,
    ...profilePatch
  };
}

export function parseWorkoutLog(text) {
  return {
    type: "workout",
    rawText: text,
    createdAt: new Date().toISOString()
  };
}

export function shouldPersistWorkoutLog(text) {
  const message = normalizeText(text);
  if (!message || hasAny(message, ["จดการซ้อม", "บันทึกการซ้อม"])) {
    return false;
  }

  return ["จด", "บันทึก", "เซ็ต", "ครั้ง", "kg", "กิโล", "reps"].some((keyword) => message.includes(keyword));
}

function introReply() {
  return [
    "ฟิตกับเฮียโตได้เลยครับ พิมพ์สั้น ๆ มาแบบนี้ได้",
    "",
    "• วันนี้เล่นอะไรดี",
    "• จด วิดพื้น 12 ครั้ง 3 เซ็ต",
    "• งบ 120 กินอะไรดี",
    "• เจ็บเข่า เปลี่ยนท่าให้หน่อย"
  ].join("\n");
}

function profileReply(profile) {
  return [
    "ตั้งต้นโปรไฟล์ให้ก่อนครับ",
    `เป้าหมาย: ${profile.goal}`,
    `เวลา: ${profile.availableMinutes} นาที/ครั้ง`,
    `ความถี่: ${profile.daysPerWeek} วัน/สัปดาห์`,
    `อุปกรณ์: ${profile.equipment.join(", ")}`,
    `งบอาหาร: ${profile.foodBudget} บาท/วัน`,
    "",
    "ต่อไปพิมพ์ข้อมูลจริงได้ เช่น: เป้าหมายลดไขมัน เล่น 4 วัน มีดัมเบล งบ 150"
  ].join("\n");
}

function workoutReply(profile) {
  const picks = chooseExercises(profile);
  const list = picks.map((exercise, index) => {
    return `${index + 1}. ${exercise.name} - ${exercise.plan}\n   โฟกัส: ${exercise.focus}\n   คิว: ${exercise.note}`;
  });

  return [
    `จัดให้ครับ วันนี้ฟิตกับเฮีย ${profile.availableMinutes} นาที เน้น ${profile.goal}`,
    "",
    ...list,
    "",
    "พักระหว่างเซ็ต 60-90 วิ ถ้าง่ายไปเพิ่ม 2 ครั้ง/เซ็ต ถ้าหนักไปลด 1 เซ็ตก่อนครับ"
  ].join("\n");
}

function logReply(text) {
  return [
    "จดให้แล้วครับ เดี๋ยวเฮียโตจำไว้ให้",
    `รายการ: ${text}`,
    "",
    "ถ้าต้องการละเอียดขึ้น พิมพ์แบบนี้ได้: จด สควอต 15 ครั้ง 3 เซ็ต เหนื่อย 7/10"
  ].join("\n");
}

function logPromptReply() {
  return [
    "ได้ครับ ส่งรายการซ้อมมาได้เลย เดี๋ยวเฮียโตจดให้",
    "",
    "ตัวอย่าง:",
    "จด วิดพื้น 12 ครั้ง 3 เซ็ต เหนื่อย 7/10",
    "จด สควอต 15 ครั้ง 4 เซ็ต น้ำหนักตัว"
  ].join("\n");
}

function mealReply(profile, message) {
  const budget = extractBudget(message) || profile.foodBudget;
  const tier = mealIdeas.find((idea) => budget <= idea.budget) || mealIdeas.at(-1);

  return [
    `งบ ${budget} บาท วันนี้กินให้ตรงเป้าแบบไม่ยุ่งยากได้ครับ`,
    "",
    ...tier.meals.map((meal, index) => `${index + 1}. ${meal}`),
    "",
    "หลักจำง่าย: โปรตีน 1 ฝ่ามือ + ผัก 1-2 กำมือ + คาร์บตามแรงซ้อม"
  ].join("\n");
}

function safetyReply() {
  return [
    "ถ้ามีอาการเจ็บ เฮียโตให้ลดแรงกดก่อนครับ",
    "",
    "วันนี้เลี่ยงท่าที่เจ็บ แล้วเปลี่ยนเป็นท่าเบา เช่น เดินชัน, แพลงก์สั้น, กลูตบริดจ์ หรือ upper body ที่ไม่กระตุ้นจุดเจ็บ",
    "",
    "ถ้าเจ็บแปลบ ชา บวม หรือเจ็บต่อเนื่อง ควรให้แพทย์/นักกายภาพดูอาการก่อนซ้อมหนักครับ"
  ].join("\n");
}

function focusReply(profile) {
  const picks = chooseExercises(profile);
  const focus = picks.map((exercise) => `• ${exercise.name}: ${exercise.focus}`).join("\n");
  return ["เซ็ตวันนี้จะโดนกล้ามเนื้อหลักประมาณนี้ครับ", "", focus].join("\n");
}

function chooseExercises(profile) {
  const hasDumbbell = profile.equipment.some((item) => item.toLowerCase().includes("dumbbell") || item.includes("ดัมเบล"));
  const candidates = exerciseLibrary.filter((exercise) => {
    if (exercise.equipment === "dumbbell") return hasDumbbell;
    return true;
  });

  return candidates.slice(0, 4);
}

function normalizeText(text) {
  return String(text || "").trim().toLowerCase();
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function extractBudget(text) {
  const match = text.match(/(\d{2,4})/);
  return match ? Number(match[1]) : null;
}
