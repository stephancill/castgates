import { getServerSession } from "next-auth/next";
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import crypto from "crypto";
import { authOptions } from "./auth/[...nextauth]";

async function createMessage({
  authorFid,
  content,
}: {
  authorFid: number;
  content: string;
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
    const { content } = JSON.parse(req.body);
    const { id: fid } = session?.user;

    console.log({ content, fid });

    if (!content || !fid) {
      return res.send({
        error: "Missing content or fid",
      });
    }

    console.log({ fid, content });

    const message = await createMessage({
      authorFid: parseInt(fid),
      content,
    });

    res.send({
      message,
    });
  }
}
