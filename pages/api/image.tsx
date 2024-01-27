import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
// import {kv} from "@vercel/kv";
import satori from "satori";
import { join } from "path";
import * as fs from "fs";
import { prisma } from "../../lib/prisma";

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

    const userDataRes = await fetch(
      `${process.env.HUB_URL}/v1/userDataByFid?fid=${message?.authorFid}&user_data_type=6`
    );
    const userDataRaw = await userDataRes.json();
    const username = userDataRaw?.data?.userDataBody.value;

    const preimage = req.query["preimage"];

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
          {preimage ? (
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
              Mutuals of @{username} can view this secret message
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
    const pngBuffer = await sharp(Buffer.from(svg)).toFormat("png").toBuffer();

    // Set the content type to PNG and send the response
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "max-age=10");
    res.send(pngBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
}
