import { quickReplyText } from "../lib/line-reply.js";
import {
  ensureCustomerForLineUser,
  getCustomerProfile,
  upsertCustomerProfile
} from "../repositories/customer-store.js";

const START_COMMANDS = new Set(["เริ่ม", "สมัคร", "สมัครสมาชิก", "เริ่มโปรไฟล์", "ปรับโปรไฟล์"]);
const VIEW_COMMANDS = new Set(["ดูโปรไฟล์", "โปรไฟล์"]);

const steps = [
  {
    key: "goal",
    question: "เป้าหมายหลักคืออะไร?",
    field: "goal",
    options: [
      option("ลดไขมัน", "fat_loss"),
      option("เพิ่มกล้าม", "muscle_gain"),
      option("แข็งแรง", "strength"),
      option("สุขภาพดี", "general_health")
    ]
  },
  {
    key: "workout_days_per_week",
    question: "ซ้อมกี่วันต่อสัปดาห์?",
    field: "workout_days_per_week",
    options: [option("2 วัน", 2), option("3 วัน", 3), option("4 วัน", 4), option("5+ วัน", 5)]
  },
  {
    key: "available_minutes",
    question: "มีเวลาครั้งละกี่นาที?",
    field: "available_minutes",
    options: [option("15 นาที", 15), option("30 นาที", 30), option("45 นาที", 45), option("60 นาที", 60)]
  },
  {
    key: "equipment",
    question: "มีอุปกรณ์อะไร?",
    field: "equipment",
    options: [
      option("ไม่มี", ["bodyweight"]),
      option("ดัมเบล", ["dumbbell"]),
      option("ยางยืด", ["resistance_band"]),
      option("เข้ายิม", ["gym"])
    ]
  },
  {
    key: "food_budget_daily",
    question: "งบอาหารต่อวันประมาณเท่าไร?",
    field: "food_budget_daily",
    options: [option("100 บาท", 100), option("150 บาท", 150), option("200 บาท", 200), option("300+ บาท", 300)]
  },
  {
    key: "injuries",
    question: "มีจุดที่เจ็บไหม?",
    field: "injuries",
    options: [
      option("ไม่มีเจ็บ", []),
      option("เข่า", ["knee"]),
      option("หลัง", ["back"]),
      option("ไหล่", ["shoulder"])
    ]
  }
];

const stepByKey = new Map(steps.map((step) => [step.key, step]));

export async function buildOnboardingReply(event) {
  if (event.type !== "message" || event.message?.type !== "text" || !event.replyToken) {
    return null;
  }

  const text = normalizeText(event.message.text);
  const lineUserId = event.source?.userId;

  if (!lineUserId) return null;

  const customer = await ensureCustomerForLineUser(lineUserId);
  if (!customer) {
    return [
      {
        type: "text",
        text: "ตอนนี้ยังบันทึกโปรไฟล์ไม่ได้ ลองใหม่อีกครั้งในอีกสักครู่ครับ"
      }
    ];
  }

  const profile = await getCustomerProfile(customer.id);
  const preferences = profile?.preferences || {};
  const onboarding = preferences.onboarding || {};
  const currentStep = stepByKey.get(onboarding.step);

  if (currentStep) {
    const matchedOption = currentStep.options.find((item) => item.label === text);

    if (matchedOption) {
      return saveAnswerAndBuildNextMessage(customer.id, profile, currentStep, matchedOption);
    }

    if (!START_COMMANDS.has(text) && !VIEW_COMMANDS.has(text)) {
      return [buildQuestionMessage(currentStep, "เลือกจากปุ่มด้านล่างได้เลยครับ")];
    }
  }

  if (START_COMMANDS.has(text)) {
    return startOnboarding(customer.id, profile);
  }

  if (VIEW_COMMANDS.has(text)) {
    return [buildProfileSummary(profile)];
  }

  return null;
}

async function startOnboarding(customerId, profile) {
  const firstStep = steps[0];
  const preferences = {
    ...(profile?.preferences || {}),
    onboarding: {
      step: firstStep.key,
      answers: {},
      startedAt: new Date().toISOString()
    }
  };

  await upsertCustomerProfile(customerId, { preferences });

  return [
    buildWelcomeFlex(),
    buildQuestionMessage(firstStep)
  ];
}

async function saveAnswerAndBuildNextMessage(customerId, profile, step, selectedOption) {
  const stepIndex = steps.findIndex((item) => item.key === step.key);
  const nextStep = steps[stepIndex + 1];
  const currentPreferences = profile?.preferences || {};
  const currentOnboarding = currentPreferences.onboarding || {};
  const answers = {
    ...(currentOnboarding.answers || {}),
    [step.key]: selectedOption.label
  };
  const values = {
    [step.field]: selectedOption.value,
    preferences: {
      ...currentPreferences,
      onboarding: {
        ...currentOnboarding,
        answers,
        step: nextStep?.key || null,
        completedAt: nextStep ? currentOnboarding.completedAt : new Date().toISOString()
      }
    }
  };

  const updatedProfile = await upsertCustomerProfile(customerId, values);

  if (nextStep) {
    return [buildQuestionMessage(nextStep)];
  }

  return [
    buildCompletionFlex(updatedProfile),
    quickReplyText("โปรไฟล์พร้อมแล้ว ต่อไปเฮียโตจะใช้ข้อมูลนี้ช่วยแนะนำให้ตรงตัวขึ้น", [
      { label: "ดูโปรไฟล์" },
      { label: "ปรับโปรไฟล์", text: "ปรับโปรไฟล์" }
    ])
  ];
}

function buildQuestionMessage(step, prefix) {
  const text = prefix ? `${prefix}\n\n${step.question}` : step.question;
  return quickReplyText(text, step.options);
}

function buildWelcomeFlex() {
  return {
    type: "flex",
    altText: "เริ่มสร้างโปรไฟล์ FitFit กับเฮียโต",
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "image",
        url: publicAssetUrl("/assets/line-onboarding-hero.png"),
        size: "full",
        aspectRatio: "1:1",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        backgroundColor: "#111111",
        contents: [
          {
            type: "text",
            text: "เฮียโต FitFit",
            weight: "bold",
            size: "xl",
            color: "#FFD43B"
          },
          {
            type: "text",
            text: "ตอบสั้น ๆ 6 ข้อ แล้วเดี๋ยวเฮียโตจำโปรไฟล์ไว้ให้",
            size: "sm",
            color: "#FFFFFF",
            wrap: true
          },
          {
            type: "text",
            text: "ใช้เวลาประมาณ 30 วินาที",
            size: "xs",
            color: "#BDBDBD",
            wrap: true
          }
        ]
      }
    }
  };
}

function publicAssetUrl(pathname) {
  const publicBaseUrl =
    process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "https://fitfit-hia-to-line-trainer.onrender.com";

  return `${publicBaseUrl.replace(/\/$/, "")}${pathname}`;
}

function buildCompletionFlex(profile) {
  const summaryRows = [
    ["เป้าหมาย", labelFor("goal", profile?.goal)],
    ["วันซ้อม", profile?.workout_days_per_week ? `${profile.workout_days_per_week} วัน/สัปดาห์` : "-"],
    ["เวลา", profile?.available_minutes ? `${profile.available_minutes} นาที` : "-"],
    ["อุปกรณ์", labelsForArray("equipment", profile?.equipment)],
    ["งบอาหาร", profile?.food_budget_daily ? `${Number(profile.food_budget_daily).toLocaleString("th-TH")} บาท/วัน` : "-"],
    ["จุดที่เจ็บ", labelsForArray("injuries", profile?.injuries)]
  ];

  return {
    type: "flex",
    altText: "โปรไฟล์ FitFit พร้อมแล้ว",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "โปรไฟล์พร้อมแล้ว",
            weight: "bold",
            size: "xl",
            color: "#111111"
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: summaryRows.map(([label, value]) => ({
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: label, size: "sm", color: "#777777", flex: 3 },
                { type: "text", text: value, size: "sm", color: "#111111", wrap: true, flex: 5 }
              ]
            }))
          }
        ]
      }
    }
  };
}

function buildProfileSummary(profile) {
  if (!profile) {
    return quickReplyText("ยังไม่มีโปรไฟล์ กดเริ่มได้เลยครับ", [{ label: "เริ่มโปรไฟล์" }]);
  }

  return buildCompletionFlex(profile);
}

function option(label, value) {
  return { label, value };
}

function normalizeText(text) {
  return String(text || "").trim();
}

function labelFor(field, value) {
  const match = steps
    .find((step) => step.field === field)
    ?.options.find((item) => JSON.stringify(item.value) === JSON.stringify(value));
  return match?.label || value || "-";
}

function labelsForArray(field, value) {
  if (!Array.isArray(value) || value.length === 0) return "ไม่มี";
  const match = steps
    .find((step) => step.field === field)
    ?.options.find((item) => JSON.stringify(item.value) === JSON.stringify(value));
  return match?.label || value.join(", ");
}
