"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function Message() {
  const session = useSession();

  return (
    <div>
      {session.data?.user ? (
        <div>message</div>
      ) : (
        <div>sign in to see message</div>
      )}
    </div>
  );
}
