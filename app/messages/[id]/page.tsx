import { Metadata, ResolvingMetadata } from "next";
import { Message } from "../../../components/message";
import { prisma } from "../../../lib/prisma";

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // read route params
  const id = params.id;
  const message = await prisma.messages.findUnique({
    where: {
      id: id,
    },
  });

  const userDataRes = await fetch(
    `${process.env.HUB_URL}/v1/userDataByFid?fid=${message?.authorFid}&user_data_type=6`
  );
  const userDataRaw = await userDataRes.json();
  const username = userDataRaw?.data?.userDataBody.value;

  const fcMetadata: Record<string, string> = {
    "fc:frame": "vNext",
    "fc:frame:post_url": `${process.env["NEXT_PUBLIC_URL"]}/api/fetch?id=${id}`,
    "fc:frame:image": `${process.env["NEXT_PUBLIC_URL"]}/api/image?id=${id}`,
    "fc:frame:button:1": "View",
  };

  return {
    title: `Private message by ${username}`,
    openGraph: {
      title: `Private message by ${username}`,
      images: [`/api/image?id=${id}`],
    },
    other: {
      ...fcMetadata,
    },
    metadataBase: new URL(process.env["NEXT_PUBLIC_URL"] || ""),
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen py-2">
        <main className="flex flex-col items-center justify-center flex-1 px-4 sm:px-20 text-center">
          <Message></Message>
        </main>
      </div>
    </>
  );
}
