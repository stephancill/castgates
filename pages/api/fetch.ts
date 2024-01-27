import type { NextApiRequest, NextApiResponse } from "next";
import { getSSLHubRpcClient, Message } from "@farcaster/hub-nodejs";
import { prisma } from "../../lib/prisma";
import crypto from "crypto";

const HUB_URL = process.env["HUB_URL"] || "nemes.farcaster.xyz:2283";
const client = getSSLHubRpcClient(HUB_URL);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    // Process the vote
    // For example, let's assume you receive an option in the body
    try {
      const messageId = req.query["id"];
      if (!messageId) {
        return res.status(400).send("Missing message ID");
      }

      let validatedMessage: Message | undefined = undefined;
      let fid = 0;
      let castId: any = {};
      try {
        const frameMessage = Message.decode(
          Buffer.from(req.body?.trustedData?.messageBytes || "", "hex")
        );

        console.log(Message.toJSON(frameMessage));
        const result = await client.validateMessage(frameMessage);
        if (result.isOk() && result.value.valid) {
          validatedMessage = result.value.message;
        }
        fid = frameMessage.data?.fid || 0;
        castId = frameMessage.data?.frameActionBody?.castId;
      } catch (e) {
        return res.status(400).send(`Failed to validate message: ${e}`);
      }

      console.log({ fid, castId });

      // const fid = validatedMessage?.data?.fid || 0;

      // https://acf4c9.hubs.neynar.com:2281/v1/linkById?fid=6833&target_fid=2&link_type=follow

      const message = await prisma.messages.findUnique({
        where: {
          id: messageId as string,
        },
      });

      console.log({
        fid: fid,
        authorFid: message?.authorFid,
      });

      // http://127.0.0.1:2281/v1/reactionById?fid=2&reaction_type=1&target_fid=1795&target_hash=0x7363f449bfb0e7f01c5a1cc0054768ed5146abc0
      // fid = The FID of the reaction's creator

      const [like, recast] = await Promise.all([
        fetch(
          `${HUB_URL}/v1/reactionById?fid=${fid}&reaction_type=REACTION_TYPE_LIKE&target_fid=${message?.authorFid}&target_hash=${castId?.hash}`
        ),
        fetch(
          `${HUB_URL}/v1/reactionById?fid=${fid}&reaction_type=REACTION_TYPE_RECAST&target_fid=${message?.authorFid}&target_hash=${castId?.hash}`
        ),
      ]);
      const pass = (like.ok && recast.ok) || message?.authorFid === fid;

      const messageHash = crypto
        .createHash("sha256")
        .update((message?.content || "") + process.env["SALT_VALUE"])
        .digest("hex");

      if (!message) {
        return res.status(400).send("Missing poll ID");
      }
      const imageUrl = `${process.env["NEXT_PUBLIC_URL"]}/api/image?id=${
        message.id
      }&${pass ? "preimage=" + messageHash : "failed=true"}`;

      console.log(imageUrl);

      // Return an HTML response
      res.setHeader("Content-Type", "text/html");
      res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Message Fetch Result</title>
          <meta property="og:title" content="Message Fetch Result">
          <meta property="og:image" content="${imageUrl}">
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content="${imageUrl}">
          <meta name="fc:frame:post_url" content="${
            process.env["NEXT_PUBLIC_URL"]
          }/api/fetch?id=${message.id}&preimage=${messageHash}">
          <meta name="fc:frame:button:1" content="${
            pass ? "Success" : "Failed (try again in a few seconds)"
          }">
        </head>
        <body></body>
      </html>
    `);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error generating image");
    }
  } else {
    // Handle any non-POST requests
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
