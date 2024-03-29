import "@farcaster/auth-kit/styles.css";

import {
  AuthKitProvider,
  SignInButton,
  StatusAPIResponse,
} from "@farcaster/auth-kit";
import { getCsrfToken, signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { CreateForm } from "../components/create-form";

const config = {
  relay: "https://relay.farcaster.xyz",
  rpcUrl: "https://mainnet.optimism.io",
  siweUri: "http://example.com/login",
  domain: "example.com",
};

export default function Home() {
  const [error, setError] = useState(false);
  const { data: session } = useSession();

  const getNonce = useCallback(async () => {
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Unable to generate nonce");
    return nonce;
  }, []);

  const handleSuccess = useCallback(
    (res: StatusAPIResponse) => {
      signIn("credentials", {
        message: res.message,
        signature: res.signature,
        name: res.username,
        pfp: res.pfpUrl,
        redirect: false,
      });
    },
    [signIn]
  );

  return (
    <main style={{ fontFamily: "Inter, sans-serif" }}>
      <AuthKitProvider config={config}>
        <div>
          <div style={{ position: "fixed", top: "12px", right: "12px" }}>
            <SignInButton
              nonce={getNonce}
              onSuccess={handleSuccess}
              onError={() => setError(true)}
              onSignOut={() => signOut()}
            />
            {error && <div>Unable to sign in at this time.</div>}
          </div>
          <div
            style={{
              paddingTop: "33vh",
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {session ? (
              <div style={{ fontFamily: "sans-serif" }}>
                <p>Signed in as {session.user?.name}</p>
                <p>
                  <button
                    type="button"
                    style={{ padding: "6px 12px", cursor: "pointer" }}
                    onClick={() => signOut()}
                  >
                    Click here to sign out
                  </button>
                  <CreateForm></CreateForm>
                </p>
              </div>
            ) : (
              <p>
                Click the "Sign in with Farcaster" button above, then scan the
                QR code to sign in.
              </p>
            )}
          </div>
        </div>
      </AuthKitProvider>
    </main>
  );
}
