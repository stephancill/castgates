import { Message, getSSLHubRpcClient } from "@farcaster/hub-nodejs";
import { GateType } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import { getHash } from "../../lib/util";

const HUB_URL = "nemes.farcaster.xyz:2283";
const HUB_HTTP_URL = process.env.HUB_URL;
const client = getSSLHubRpcClient(HUB_URL);

type GateReqArgs = { castFid: number; requesterFid: number; castHash: string };
const gates: Record<string, (args: GateReqArgs) => Promise<boolean>> = {
  [GateType.LIKE]: ({ castFid, requesterFid, castHash }: GateReqArgs) =>
    fetch(
      `${HUB_HTTP_URL}/v1/reactionById?fid=${requesterFid}&reaction_type=1&target_fid=${castFid}&target_hash=0x${castHash}`
    ).then((res) => res.ok),
  [GateType.RECAST]: ({ castFid, requesterFid, castHash }: GateReqArgs) =>
    fetch(
      `${HUB_HTTP_URL}/v1/reactionById?fid=${requesterFid}&reaction_type=2&target_fid=${castFid}&target_hash=0x${castHash}`
    ).then((res) => res.ok),
  [GateType.FOLLOWED_BY]: ({ castFid, requesterFid }: GateReqArgs) =>
    fetch(
      `${HUB_HTTP_URL}/v1/linkById?fid=${castFid}&target_fid=${requesterFid}&link_type=follow`
    ).then((res) => res.ok || requesterFid === castFid),
  [GateType.IS_FOLLOWING]: ({ castFid, requesterFid }: GateReqArgs) =>
    fetch(
      `${HUB_HTTP_URL}/v1/linkById?fid=${requesterFid}&target_fid=${castFid}&link_type=follow`
    ).then((res) => res.ok || requesterFid === castFid),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const messageId = req.query["id"];
      if (!messageId) {
        return res.status(400).send("Missing message ID");
      }

      let validatedMessage: Message | undefined = undefined;
      try {
        const {
          trustedData: { messageBytes },
        } = req.body;
        const frameMessage = Message.decode(Buffer.from(messageBytes, "hex"));
        const result = await client.validateMessage(frameMessage);
        if (result.isOk() && result.value.valid) {
          validatedMessage = result.value.message;
        } else {
          console.error(`Failed to validate message: ${result}`);
          return res.status(400).send(`Failed to validate message: ${result}`);
        }
      } catch (e) {
        console.error(`Failed to validate message: ${e}`);
        return res.status(400).send(`Failed to validate message: ${e}`);
      }

      const requesterFid = validatedMessage?.data?.fid || 0;
      const castId = validatedMessage?.data?.frameActionBody?.castId;

      if (!castId) {
        return res.status(400).send("Missing cast ID");
      }

      if (!requesterFid) {
        return res.status(400).send("Missing fid");
      }

      const castHash = Buffer.from(castId.hash).toString("hex");

      const message = await prisma.messages.findUnique({
        where: {
          id: messageId as string,
        },
      });

      if (!message) {
        return res.status(404).send("Message not found");
      }

      console.log({
        requesterFid,
        authorFid: castId.fid,
      });

      const gateResults = await Promise.all(
        message.gateType.map((gate) =>
          gates[gate]({
            castFid: message.authorFid,
            castHash,
            requesterFid,
          })
        )
      );

      console.log({ gateResults });

      const pass =
        gateResults.every((result) => result) &&
        message.authorFid === castId.fid;

      const messageHash = getHash(message.content);

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
            pass ? "Success" : "Failed (try again)"
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
