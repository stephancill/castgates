import { GateType } from "@prisma/client";
import crypto from "crypto";

export function getHash(message: string) {
  return crypto
    .createHash("sha256")
    .update(message + process.env["SALT_VALUE"])
    .digest("hex");
}

export function generateMessage(
  conditions: GateType[],
  username?: string
): string {
  // Define the mapping of conditions to messages
  if (conditions.length === 0) {
    return "This message is public";
  }

  const conditionMessages: Record<GateType, string> = {
    [GateType.IS_FOLLOWING]: `follow @${username}`,
    [GateType.FOLLOWED_BY]: `are followed by @${username}`,
    [GateType.LIKE]: `like this cast`,
    [GateType.RECAST]: `recast this cast`,
  };

  const priority: Record<GateType, number> = {
    [GateType.IS_FOLLOWING]: 1,
    [GateType.FOLLOWED_BY]: 2,
    [GateType.LIKE]: 3,
    [GateType.RECAST]: 4,
  };

  conditions.sort((a, b) => priority[a] - priority[b]);

  let message = ``;
  if (
    conditions.length === 2 &&
    conditions.includes(GateType.IS_FOLLOWING) &&
    conditions.includes(GateType.FOLLOWED_BY)
  ) {
    message += `Only mutuals of @${username}`;
  } else {
    // Generate the message
    message += `Only people who `;
    for (let i = 0; i < conditions.length; i++) {
      message += conditionMessages[conditions[i]];
      if (i < conditions.length - 2) {
        message += ", ";
      } else if (i === conditions.length - 2) {
        message += " and ";
      }
    }
  }

  message += " can see the contents of this cast";
  return message;
}
