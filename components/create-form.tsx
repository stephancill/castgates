import { GateType } from "@prisma/client";
import { useEffect, useState } from "react";
import { generateMessage } from "../lib/util";

const gateLabels: Record<GateType, string> = {
  [GateType.IS_FOLLOWING]: "Following you",
  [GateType.FOLLOWED_BY]: "Followed by you",
  [GateType.LIKE]: "Like",
  [GateType.RECAST]: "Recast",
};

function GateCheckbox({
  name,
  label,
  isChecked,
  onChange,
}: {
  name: string;
  label: string;
  isChecked: boolean;
  onChange: (name: string) => void;
}) {
  return (
    <label>
      <input
        type="checkbox"
        name={name}
        checked={isChecked}
        onChange={() => onChange(name)}
      />
      {label}
    </label>
  );
}

export function CreateForm() {
  const [content, setContent] = useState("");
  const [selectedGates, setSelectedGates] = useState<string[]>([]);
  const [responseData, setResponseData] = useState<any>(null);

  const handleCheckboxChange = (gate: string) => {
    setSelectedGates((prev) => {
      if (prev.includes(gate)) {
        return prev.filter((item) => item !== gate);
      } else {
        return [...prev, gate];
      }
    });
  };

  useEffect(() => {
    console.log(selectedGates);
  }, [selectedGates]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch("/api/create", {
      method: "POST",
      body: JSON.stringify({ content, gates: selectedGates }),
    });
    const data = await res.json();
    setResponseData(data);
    console.log(data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "80%",
        maxWidth: "300px",
      }}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter your message here"
      />
      {Object.values(GateType).map((gate) => (
        <GateCheckbox
          key={gate}
          name={gate}
          label={gateLabels[gate]}
          isChecked={selectedGates.includes(gate)}
          onChange={handleCheckboxChange}
        />
      ))}

      <div>{generateMessage(selectedGates as GateType[], "you")}</div>

      <button>Send</button>
      {responseData && (
        <a
          href={`https://warpcast.com/~/compose?embeds%5B%5D=${encodeURIComponent(
            `${process.env.NEXT_PUBLIC_URL}/messages/${responseData.message.id}`
          )}`}
        >
          Cast
        </a>
      )}
    </form>
  );
}
