import { useState } from "react";

export function CreateForm() {
  const [content, setContent] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch("/api/create", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    console.log(data);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button>Send</button>
      </form>
    </div>
  );
}
