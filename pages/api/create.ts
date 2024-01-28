import { getServerSession } from "next-auth/next";
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import crypto from "crypto";
import { authOptions } from "./auth/[...nextauth]";
import { generateMessage } from "../../lib/util";
import { GateType } from "@prisma/client";

async function createMessage({
  authorFid,
  content,
  gates,
}: {
  authorFid: number;
  content: string;
  gates: GateType[];
}) {
  const contentHash = crypto
    .createHash("sha256")
    .update(content + process.env.SALT_VALUE)
    .digest("hex");

  const message = await prisma.messages.create({
    data: {
      authorFid,
      content,
      contentHash,
      gateType: gates,
    },
  });

  return message;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.send({
      error:
        "You must be signed in to view the protected content on this page.",
    });
  }

  if (req.method === "POST") {
    const { content, gates } = JSON.parse(req.body);
    const { id: fid } = session?.user;

    console.log({ content, fid, gates });

    if (!content || !fid) {
      return res.send({
        error: "Missing content or fid",
      });
    }

    console.log({ fid, content });

    const message = await createMessage({
      authorFid: parseInt(fid),
      content,
      gates,
    });

    res.send({
      message,
      text: generateMessage(gates, session.user.name!),
    });
  }
}
