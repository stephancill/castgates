import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import * as fs from "fs";
import { join } from "path";
import satori from "satori";
import { prisma } from "../../lib/prisma";
import { generateMessage } from "../../lib/util";

const fontPath = join(process.cwd(), "Roboto-Regular.ttf");
let fontData = fs.readFileSync(fontPath);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const messageId = req.query["id"];
    if (!messageId) {
      return res.status(400).send("Missing message ID");
    }

    const message = await prisma.messages.findUnique({
      where: {
        id: messageId as string,
      },
    });

    if (!message) {
      return res.status(400).send("Missing message ID");
    }

    const userDataRes = await fetch(
      `${process.env.HUB_URL}/v1/userDataByFid?fid=${message?.authorFid}&user_data_type=6`
    );
    const userDataRaw = await userDataRes.json();
    const username = userDataRaw?.data?.userDataBody.value;

    const preimage = req.query["preimage"];
    const pass = preimage === message?.contentHash;

    // if (message.gateType === GateType.LIKE) {
    //   imageText = "Like this cast to reveal its contents";
    // } else {
    // }

    const imageText = generateMessage(message.gateType, username);

    const svg = await satori(
      <div
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "f4f4f4",
          padding: 50,
          lineHeight: 1.2,
          fontSize: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 20,
          }}
        >
          {pass ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h2 style={{ textAlign: "center", color: "lightgray" }}>
                {message?.content}
              </h2>
              <p style={{ textAlign: "center", color: "lightgray" }}>
                @{username}
              </p>
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "lightgray" }}>
              {imageText}
            </p>
          )}
        </div>
      </div>,
      {
        width: 600,
        height: 400,
        fonts: [
          {
            data: fontData,
            name: "Roboto",
            style: "normal",
            weight: 400,
          },
        ],
      }
    );

    // Convert SVG to PNG using Sharp
    let pngBuffer = await sharp(Buffer.from(svg)).toFormat("png").toBuffer();

    // If content is a url, fetch it and overlay it on the image
    if (
      pass &&
      message?.content.startsWith("http") &&
      (message?.content.endsWith(".png") || message?.content.endsWith(".jpg"))
    ) {
      pngBuffer = await sharp(
        await (await fetch(message?.content)).arrayBuffer()
      )
        .resize(600, 400)
        .toFormat("png")
        .toBuffer();
    }

    // Set the content type to PNG and send the response
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "max-age=10");
    res.send(pngBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
}
