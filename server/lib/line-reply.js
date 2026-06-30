export async function replyLineMessage(channelAccessToken, replyToken, messages) {
  if (!channelAccessToken || !replyToken || !messages?.length) {
    return { skipped: true };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: messages.slice(0, 5)
    })
  });

  const body = await response.text();

  if (!response.ok) {
    console.error(`LINE reply failed: ${response.status} ${body}`);
    return { skipped: false, error: body || response.statusText };
  }

  return { skipped: false };
}

export function quickReplyText(text, options) {
  return {
    type: "text",
    text,
    quickReply: {
      items: options.slice(0, 13).map((option) => ({
        type: "action",
        action: {
          type: "message",
          label: option.label,
          text: option.text || option.label
        }
      }))
    }
  };
}

